"""Coherent Vessel-Pattern model (CVP): a conditional Ising / Boltzmann distribution over coronary
disease patterns.

Why not four independent classifiers (the XGBoost default)?
  The clinical question is a *pattern* — which of LAD / LCX / RCA are stenotic, and how many — and
  the labels are logically linked (CAD = any vessel stenotic in 302/303 rows). Independent models
  cannot express that link: in cross-validation the per-target XGBoost models returned
  P(CAD) < max P(vessel) — a logically impossible output — for ~20 % of patients, and give no
  calibrated answer to "single- or multi-vessel disease?".

Model (y ∈ {0,1}³ is the vessel pattern; x the standardised clinical features):

    P(y | x) = exp(−E(y, x)) / Z(x),   Z(x) = Σ_{y'∈{0,1}³} exp(−E(y', x))      (8 states: exact)
   −E(y, x)  = Σ_v h_v(x)·y_v  +  Σ_{v<w} J_vw·y_v·y_w  +  g(x)·1[any y_v = 1]
    h_v(x)   = (w₀ + Δ_v)·x + b_v        shared atherosclerotic-burden weights + vessel-specific deviations
    g(x)     = u·x + c                   explicit "any disease" term so P(CAD) is fitted directly

Training minimises the exact negative log-likelihood + λ₀‖w₀‖² + λ_Δ Σ‖Δ_v‖² + λ_u‖u‖² + 0.1‖J‖²
(convex: log-linear in the parameters with an exactly enumerated partition function), by L-BFGS.

Every output is a marginal of ONE distribution, so they are coherent by construction:
  P(CAD) = 1 − P(000) ≥ P(any single vessel);  P(k diseased vessels) sums to 1.
Uncertainty: split-conformal (LAC) prediction sets over the 8 patterns at 90 % target coverage.
Applicability: Ledoit-Wolf Mahalanobis distance vs the 99th percentile of training patients.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from app.cardiotwin.core__app_cardiotwin__features import (
    ENCODED_NAMES,
    ENCODED_TO_RAW,
    encode_record,
)

VESSELS = ("LAD", "LCX", "RCA")
STATES = np.array(list(itertools.product([0, 1], repeat=3)), dtype=float)  # 8 x 3, row k = pattern bits
PAIRS = ((0, 1), (0, 2), (1, 2))
PAIR_NAMES = ("LAD-LCX", "LAD-RCA", "LCX-RCA")
STATE_PAIRS = np.stack([STATES[:, i] * STATES[:, j] for i, j in PAIRS], axis=1)
STATE_ANY = (STATES.sum(axis=1) > 0).astype(float)
STATE_COUNT = STATES.sum(axis=1).astype(int)
STATE_LABELS = tuple("+".join(v for v, b in zip(VESSELS, s, strict=True) if b) or "none" for s in STATES)
ARTIFACT_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "cvp_ising_v1.json"
BENCHMARK_PATH = ARTIFACT_PATH.parent / "riskflow_benchmark.json"
DEMO_ROWS_PATH = ARTIFACT_PATH.parent / "riskflow_demo_rows.json"
J_PENALTY = 0.1


def logsumexp(a: np.ndarray, axis: int = 1) -> np.ndarray:
    """Numerically stable log Σ exp (numpy only: serving must not need scipy)."""
    m = np.max(a, axis=axis, keepdims=True)
    return np.squeeze(m, axis=axis) + np.log(np.sum(np.exp(a - m), axis=axis))


def pattern_index(y: np.ndarray) -> np.ndarray:
    return (np.asarray(y) @ np.array([4, 2, 1])).astype(int)


class CVPIsing:
    def __init__(self, lam_shared: float = 100.0, lam_vessel: float = 100.0, lam_any: float = 10.0):
        self.lam = (float(lam_shared), float(lam_vessel), float(lam_any))
        self.theta: np.ndarray | None = None
        self.d = 0
        self.converged = False

    # -- parameter layout -------------------------------------------------------
    def _unpack(self, th: np.ndarray) -> tuple[np.ndarray, ...]:
        d = self.d
        return (th[:d], th[d:4 * d].reshape(3, d), th[4 * d:5 * d], th[5 * d:5 * d + 3],
                th[5 * d + 3:5 * d + 6], th[5 * d + 6:5 * d + 7])

    def energies(self, z: np.ndarray, th: np.ndarray | None = None) -> np.ndarray:
        """Unnormalised log-probabilities (−E) for each of the 8 states, shape (n, 8)."""
        theta = self.theta if th is None else th
        if theta is None:
            raise RuntimeError("model is not fitted")
        w0, dv, u, b, j, c = self._unpack(theta)
        fields = z @ (w0[None] + dv).T + b
        gate = z @ u + c[0]
        return fields @ STATES.T + STATE_PAIRS @ j + gate[:, None] * STATE_ANY[None]

    def objective(self, th: np.ndarray, z: np.ndarray, yi: np.ndarray) -> tuple[float, np.ndarray]:
        """Penalised mean negative log-likelihood and its exact gradient."""
        n = len(z)
        ls, lv, lu = self.lam
        rows = np.arange(n)
        w0, dv, u, _b, j, _c = self._unpack(th)
        e = self.energies(z, th)
        lz = logsumexp(e, axis=1)
        nll = float((lz - e[rows, yi]).sum() / n)
        r = np.exp(e - lz[:, None])
        r[rows, yi] -= 1.0
        r /= n
        g_fields = r @ STATES
        g_w = g_fields.T @ z
        g_gate = r @ STATE_ANY
        pen = (ls * (w0 ** 2).sum() + lv * (dv ** 2).sum() + lu * (u ** 2).sum() + J_PENALTY * (j ** 2).sum()) / n
        grad = np.concatenate([
            g_w.sum(0) + 2 * ls / n * w0, (g_w + 2 * lv / n * dv).ravel(), g_gate @ z + 2 * lu / n * u,
            g_fields.sum(0), (r @ STATE_PAIRS).sum(0) + 2 * J_PENALTY / n * j, [g_gate.sum()],
        ])
        return nll + float(pen), grad

    def fit(self, z: np.ndarray, y: np.ndarray, maxiter: int = 3000) -> CVPIsing:
        self.d = z.shape[1]
        yi = pattern_index(y)
        from scipy.optimize import minimize  # training-time dependency only

        res = minimize(self.objective, np.zeros(5 * self.d + 7), args=(z, yi), jac=True, method="L-BFGS-B",
                       options={"maxiter": maxiter})
        self.theta = res.x
        self.converged = bool(res.success)
        return self

    def joint(self, z: np.ndarray) -> np.ndarray:
        e = self.energies(z)
        return np.exp(e - logsumexp(e, axis=1)[:, None])

    @staticmethod
    def marginals(p: np.ndarray) -> dict[str, np.ndarray]:
        out = {"CAD": 1.0 - p[:, 0]}
        for k, v in enumerate(VESSELS):
            out[v] = p @ STATES[:, k]
        return out

    @staticmethod
    def count_distribution(p: np.ndarray) -> np.ndarray:
        return np.stack([p[:, c == STATE_COUNT].sum(axis=1) for c in range(4)], axis=1)


# ---------------------------------------------------------------------------
# Deployed predictor (preprocessing + model + conformal + applicability)
# ---------------------------------------------------------------------------


class CVPPredictor:
    def __init__(self, artifact: dict[str, Any]):
        if artifact.get("feature_names") != list(ENCODED_NAMES):
            raise ValueError("CVP artifact feature layout does not match the current feature schema")
        self.artifact = artifact
        self.impute = np.array(artifact["impute"], float)
        self.mean = np.array(artifact["mean"], float)
        self.scale = np.array(artifact["scale"], float)
        t = artifact["theta"]
        self.model = CVPIsing(*artifact["lambdas"])
        self.model.d = len(self.mean)
        self.model.theta = np.concatenate([
            t["w_shared"], np.ravel(t["w_vessel"]), t["w_any"], t["bias"], t["coupling"], [t["bias_any"]],
        ]).astype(float)
        self.qhat = float(artifact["conformal"]["qhat"])
        self.ood_center = np.array(artifact["ood"]["center"], float)
        self.ood_precision = np.array(artifact["ood"]["precision"], float)
        self.ood_threshold = float(artifact["ood"]["threshold"])
        self.sha256 = hashlib.sha256(json.dumps(artifact, sort_keys=True).encode()).hexdigest()

    def standardise(self, raw_vec: np.ndarray) -> np.ndarray:
        return (raw_vec - self.mean) / self.scale

    def predict(self, values: dict[str, Any]) -> dict[str, Any]:
        rec = encode_record(values, self.impute)
        z = self.standardise(np.array(rec.vector, float))[None]
        p = self.model.joint(z)[0]
        marg = {k: float(v[0]) for k, v in self.model.marginals(p[None]).items()}
        counts = self.model.count_distribution(p[None])[0]
        in_set = p >= 1.0 - self.qhat
        set_states = STATES[in_set]
        vessel_status = {}
        for k, v in enumerate(VESSELS):
            bits = set(set_states[:, k].astype(int).tolist())
            vessel_status[v] = "involved" if bits == {1} else "not-involved" if bits == {0} else "uncertain"
        dz = z[0] - self.ood_center
        dist = float(np.sqrt(dz @ self.ood_precision @ dz))
        return {
            "joint": [{"pattern": STATE_LABELS[i], "vessels": STATES[i].astype(int).tolist(),
                       "probability": round(float(p[i]), 4), "in_prediction_set": bool(in_set[i])}
                      for i in np.argsort(-p)],
            "marginals": {k: round(v, 4) for k, v in marg.items()},
            "vessel_count": {("none" if c == 0 else f"{c}VD"): round(float(counts[c]), 4) for c in range(4)},
            "prediction_set": {"alpha": self.artifact["conformal"]["alpha"], "qhat": round(self.qhat, 4),
                               "patterns": [STATE_LABELS[i] for i in np.where(in_set)[0]],
                               "size": int(in_set.sum()), "vessel_status": vessel_status,
                               "empirical_coverage_cv": self.artifact["conformal"].get("empirical_coverage_cv")},
            "applicability": {"mahalanobis": round(dist, 2), "threshold_p99": round(self.ood_threshold, 2),
                              "in_domain": dist <= self.ood_threshold},
            "contributions": self.contributions(z[0]),
            "coherent": bool(marg["CAD"] + 1e-9 >= max(marg[v] for v in VESSELS)),
            "imputed_features": rec.imputed,
        }

    def contributions(self, z: np.ndarray, top: int = 6) -> dict[str, list[dict[str, Any]]]:
        """Per-head field contributions (weight × standardised value), summed per clinical feature."""
        w0, dv, u, *_ = self.model._unpack(self.model.theta)  # type: ignore[arg-type]
        heads = {v: w0 + dv[k] for k, v in enumerate(VESSELS)} | {"any": u}
        names = self.artifact["feature_names"]
        out: dict[str, list[dict[str, Any]]] = {}
        for head, w in heads.items():
            agg: dict[str, float] = {}
            for i, name in enumerate(names):
                raw = ENCODED_TO_RAW.get(name, name)
                agg[raw] = agg.get(raw, 0.0) + float(w[i] * z[i])
            ranked = sorted(agg.items(), key=lambda kv: -abs(kv[1]))[:top]
            out[head] = [{"feature": f, "log_odds": round(c, 3)} for f, c in ranked]
        return out


def build_artifact(model: CVPIsing, impute: np.ndarray, mean: np.ndarray, scale: np.ndarray, qhat: float,
                   coverage: float | None, ood_center: np.ndarray, ood_precision: np.ndarray,
                   ood_threshold: float, dataset_sha256: str, benchmark_ref: str | None = None) -> dict[str, Any]:
    w0, dv, u, b, j, c = model._unpack(model.theta)  # type: ignore[arg-type]
    return {
        "model_id": "cvp-ising", "version": "1.0.0", "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "family": "conditional Ising (exact 8-state) with shared + vessel-specific fields and an any-disease term",
        "feature_names": list(ENCODED_NAMES), "impute": impute.tolist(), "mean": mean.tolist(), "scale": scale.tolist(),
        "lambdas": list(model.lam),
        "theta": {"w_shared": w0.tolist(), "w_vessel": dv.tolist(), "w_any": u.tolist(), "bias": b.tolist(),
                  "coupling": j.tolist(), "coupling_names": list(PAIR_NAMES), "bias_any": float(c[0])},
        "conformal": {"method": "split-conformal LAC on out-of-fold joint probabilities", "alpha": 0.10,
                      "qhat": float(qhat), "empirical_coverage_cv": coverage},
        "ood": {"method": "Ledoit-Wolf Mahalanobis on standardised features", "center": ood_center.tolist(),
                "precision": ood_precision.tolist(), "threshold": float(ood_threshold), "quantile": 0.99},
        "dataset_sha256": dataset_sha256, "benchmark": benchmark_ref,
    }


_PREDICTOR: CVPPredictor | None = None


def load_cvp(path: Path | None = None) -> CVPPredictor:
    global _PREDICTOR
    if path is None and _PREDICTOR is not None:
        return _PREDICTOR
    p = path or ARTIFACT_PATH
    if not p.exists():
        raise FileNotFoundError(f"CVP artifact missing: {p}. Run `python -m app.cardiotwin.riskflow.train_ising`.")
    pred = CVPPredictor(json.loads(p.read_text(encoding="utf-8")))
    if path is None:
        _PREDICTOR = pred
    return pred
