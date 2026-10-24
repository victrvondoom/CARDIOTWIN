"""Train + benchmark the Coherent Vessel-Pattern model against XGBoost and logistic regression.

    python -m app.cardiotwin.riskflow.train_ising            # full protocol, writes both artifacts
    python -m app.cardiotwin.riskflow.train_ising --quick    # 1 repeat, small grids (smoke test)

Protocol (all preprocessing and tuning inside each outer fold — nothing sees held-out rows):
  * Extension of Z-Alizadeh Sani (UCI 411, CC BY 4.0), 303 patients; label columns never inputs
  * repeated stratified 5-fold CV (3 repeats), stratified on the number of stenotic vessels
  * CVP: penalties chosen by inner 5-fold CV on joint log-loss; conformal q̂ from the inner
    out-of-fold scores, coverage measured on the outer fold
  * XGBoost: one classifier per target (CAD, LAD, LCX, RCA), depth × trees tuned by inner CV on
    log-loss; joint pattern probability = product of the vessel marginals (what independent models imply)
  * L2 logistic regression per target (the project's shipped family), C tuned by inner CV
  * corrected resampled t-test (Nadeau & Bengio 2003) for CVP − XGBoost per metric
If xgboost is not importable the XGBoost arm is skipped and the benchmark says so; nothing is substituted.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import UTC, datetime
from typing import Any

import numpy as np
from sklearn.covariance import LedoitWolf
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegressionCV
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold
from sklearn.preprocessing import StandardScaler

from app.cardiotwin.core__app_cardiotwin__data import (
    DATASET_CSV,
    encode_frame,
    file_sha256,
    load_dataset,
    target_vector,
)
from app.cardiotwin.core__app_cardiotwin__evaluation import corrected_paired_t
from app.cardiotwin.core__app_cardiotwin__features import ENCODED_NAMES, assert_no_leakage
from app.cardiotwin.riskflow.vessel_ising import (
    ARTIFACT_PATH,
    BENCHMARK_PATH,
    STATE_COUNT,
    STATES,
    CVPIsing,
    build_artifact,
    pattern_index,
)

TARGETS = ("CAD", "LAD", "LCX", "RCA")
FULL_GRID = [(a, b, c) for a in (30, 100, 300) for b in (30, 100, 300) for c in (3, 10, 30)]
QUICK_GRID = [(100, 100, 10), (300, 100, 10)]
XGB_GRID = [{"max_depth": d, "n_estimators": n} for d in (2, 3, 4) for n in (100, 300)]
ALPHA = 0.10

try:
    import xgboost as xgb

    HAS_XGB = True
    XGB_VERSION: str | None = xgb.__version__
except ImportError:  # pragma: no cover - optional benchmark dependency
    HAS_XGB = False
    XGB_VERSION = None


def load_xy() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    df = load_dataset()
    for t in TARGETS:
        assert_no_leakage(list(ENCODED_NAMES), t)
    x, _ = encode_frame(df)
    y = np.stack([target_vector(df, v) for v in ("LAD", "LCX", "RCA")], axis=1).astype(float)
    cad = target_vector(df, "CAD").astype(float)
    return x, y, cad


def _prep(xtr: np.ndarray, *others: np.ndarray) -> tuple[Any, ...]:
    imp, sc = SimpleImputer(strategy="median"), StandardScaler()
    ztr = sc.fit_transform(imp.fit_transform(xtr))
    return (ztr, *[sc.transform(imp.transform(o)) for o in others], imp, sc)


def tune_cvp(z: np.ndarray, y: np.ndarray, seed: int, grid: list[tuple[float, float, float]]) -> tuple[CVPIsing, np.ndarray]:
    """Pick penalties by inner 5-fold joint log-loss; return the refit model and its out-of-fold joint."""
    strat = y.sum(axis=1).astype(int)
    folds = list(StratifiedKFold(5, shuffle=True, random_state=seed).split(z, strat))
    yi = pattern_index(y)
    best: tuple[float, tuple[float, float, float], np.ndarray] | None = None
    for lam in grid:
        oof = np.zeros((len(z), 8))
        for a, v in folds:
            oof[v] = CVPIsing(*lam).fit(z[a], y[a]).joint(z[v])
        ll = float(-np.log(oof[np.arange(len(z)), yi] + 1e-12).sum())
        if best is None or ll < best[0]:
            best = (ll, lam, oof)
    assert best is not None
    return CVPIsing(*best[1]).fit(z, y), best[2]


def conformal_qhat(oof: np.ndarray, y: np.ndarray, alpha: float = ALPHA) -> float:
    scores = np.sort(1.0 - oof[np.arange(len(y)), pattern_index(y)])
    k = int(np.ceil((len(scores) + 1) * (1 - alpha)))
    return float(scores[k - 1]) if k <= len(scores) else 1.0


def _xgb(z: np.ndarray, t: np.ndarray, seed: int, grid: list[dict[str, int]]) -> Any:
    best: tuple[float, dict[str, int]] | None = None
    common = {"learning_rate": 0.05, "subsample": 0.8, "colsample_bytree": 0.8, "eval_metric": "logloss",
              "random_state": seed, "n_jobs": 4}
    for g in grid:
        ll = 0.0
        for a, v in StratifiedKFold(5, shuffle=True, random_state=seed).split(z, t):
            p = np.clip(xgb.XGBClassifier(**g, **common).fit(z[a], t[a]).predict_proba(z[v])[:, 1], 1e-6, 1 - 1e-6)
            ll -= float((t[v] * np.log(p) + (1 - t[v]) * np.log(1 - p)).sum())
        if best is None or ll < best[0]:
            best = (ll, g)
    assert best is not None
    return xgb.XGBClassifier(**best[1], **common).fit(z, t)


def _independent_joint(pv: dict[str, np.ndarray]) -> np.ndarray:
    p = np.stack([pv["LAD"], pv["LCX"], pv["RCA"]], axis=1)
    return np.prod(np.where(STATES[None] == 1, p[:, None], 1 - p[:, None]), axis=2)


def _metrics(pm: dict[str, np.ndarray], joint: np.ndarray, truth: dict[str, np.ndarray], yi: np.ndarray,
             count: np.ndarray) -> dict[str, Any]:
    pc = np.stack([joint[:, c == STATE_COUNT].sum(axis=1) for c in range(4)], axis=1)
    onehot = np.eye(4)[count]
    vessel_max = np.max(np.stack([pm["LAD"], pm["LCX"], pm["RCA"]]), axis=0)
    return {
        "auc": {t: float(roc_auc_score(truth[t], pm[t])) for t in TARGETS},
        "brier": {t: float(brier_score_loss(truth[t], pm[t])) for t in TARGETS},
        "joint_nll": float(-np.log(joint[np.arange(len(yi)), yi] + 1e-12).mean()),
        "count_accuracy": float(np.mean(pc.argmax(axis=1) == count)),
        "rps": float(np.mean(((np.cumsum(pc, 1) - np.cumsum(onehot, 1)) ** 2).sum(axis=1) / 3)),
        "coherence_violation_rate": float(np.mean(pm["CAD"] + 1e-9 < vessel_max)),
    }


def _flatten(m: dict[str, Any]) -> dict[str, float]:
    flat: dict[str, float] = {}
    for k, v in m.items():
        if isinstance(v, dict):
            flat.update({f"{k}_{t}": x for t, x in v.items()})
        else:
            flat[k] = v
    return flat


def benchmark(quick: bool = False, log: bool = True) -> dict[str, Any]:
    x, y, cad = load_xy()
    count = y.sum(axis=1).astype(int)
    yi_all = pattern_index(y)
    grid, xgrid = (QUICK_GRID, XGB_GRID[:2]) if quick else (FULL_GRID, XGB_GRID)
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=1 if quick else 3, random_state=7)
    methods = ["cvp", "lr"] + (["xgboost"] if HAS_XGB else [])
    per_fold: dict[str, list[dict[str, float]]] = {m: [] for m in methods}
    cover, sizes = [], []
    t0 = time.time()
    n_tr = n_te = 0
    for f, (tr, te) in enumerate(cv.split(x, count)):
        n_tr, n_te = len(tr), len(te)
        ztr, zte, *_ = _prep(x[tr], x[te])
        truth = {"CAD": cad[te], "LAD": y[te, 0], "LCX": y[te, 1], "RCA": y[te, 2]}
        model, oof = tune_cvp(ztr, y[tr], f, grid)
        joint = model.joint(zte)
        pm = CVPIsing.marginals(joint)
        per_fold["cvp"].append(_flatten(_metrics(pm, joint, truth, yi_all[te], count[te])))
        qhat = conformal_qhat(oof, y[tr])
        in_set = joint >= 1 - qhat
        cover.append(float(np.mean(in_set[np.arange(len(te)), yi_all[te]])))
        sizes.append(float(in_set.sum(axis=1).mean()))
        targets_tr = {"CAD": cad[tr], "LAD": y[tr, 0], "LCX": y[tr, 1], "RCA": y[tr, 2]}
        lr = {t: LogisticRegressionCV(Cs=np.logspace(-3, 1, 9), cv=5, scoring="neg_log_loss", max_iter=3000)
              .fit(ztr, targets_tr[t]).predict_proba(zte)[:, 1] for t in TARGETS}
        per_fold["lr"].append(_flatten(_metrics(lr, _independent_joint(lr), truth, yi_all[te], count[te])))
        if HAS_XGB:
            xp = {t: _xgb(ztr, targets_tr[t], f, xgrid).predict_proba(zte)[:, 1] for t in TARGETS}
            per_fold["xgboost"].append(_flatten(_metrics(xp, _independent_joint(xp), truth, yi_all[te], count[te])))
        if log:
            print(f"fold {f + 1}: cvp lambda={model.lam}  {time.time() - t0:.0f}s", flush=True)

    summary = {}
    for m, rows in per_fold.items():
        summary[m] = {k: {"mean": round(float(np.mean([r[k] for r in rows])), 4),
                          "sd": round(float(np.std([r[k] for r in rows], ddof=1)), 4)} for k in rows[0]}
    paired = {}
    if HAS_XGB:
        for k in per_fold["cvp"][0]:
            d = np.array([a[k] - b[k] for a, b in zip(per_fold["cvp"], per_fold["xgboost"], strict=True)])
            res = corrected_paired_t(d, n_tr, n_te)
            paired[k] = {"mean_diff_cvp_minus_xgboost": round(res["mean_diff"], 4), "p_value": round(res["p_value"], 4)}
    return {
        "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "dataset": {"name": "Extension of Z-Alizadeh Sani (UCI 411)", "rows": int(len(x)),
                    "sha256": file_sha256(DATASET_CSV)},
        "protocol": {"outer": f"repeated stratified 5-fold x {1 if quick else 3}", "stratify": "number of stenotic vessels",
                     "quick": quick, "cvp_grid": grid, "xgboost_grid": xgrid, "conformal_alpha": ALPHA,
                     "paired_test": "Nadeau-Bengio corrected resampled t-test"},
        "xgboost": {"available": HAS_XGB, "version": XGB_VERSION},
        "methods": summary,
        "paired_tests": paired,
        "conformal": {"target_coverage": 1 - ALPHA, "empirical_coverage": round(float(np.mean(cover)), 4),
                      "mean_set_size_of_8": round(float(np.mean(sizes)), 2)},
        "metric_direction": {"auc": "higher", "brier": "lower", "joint_nll": "lower", "count_accuracy": "higher",
                             "rps": "lower", "coherence_violation_rate": "lower"},
        "runtime_s": round(time.time() - t0, 1),
    }


def fit_final(grid: list[tuple[float, float, float]], coverage: float | None) -> dict[str, Any]:
    x, y, _ = load_xy()
    z, imp, sc = _prep(x)
    model, oof = tune_cvp(z, y, seed=11, grid=grid)
    lw = LedoitWolf().fit(z)
    dz = z - lw.location_
    dist = np.sqrt(np.einsum("ij,jk,ik->i", dz, lw.precision_, dz))
    return build_artifact(
        model, np.asarray(imp.statistics_, dtype=float), sc.mean_, sc.scale_, conformal_qhat(oof, y), coverage,
        lw.location_, lw.precision_, float(np.quantile(dist, 0.99)), file_sha256(DATASET_CSV),
        benchmark_ref=BENCHMARK_PATH.name,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Train + benchmark the CVP vessel-pattern model")
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--no-benchmark", action="store_true")
    args = ap.parse_args()
    coverage = None
    if not args.no_benchmark:
        bench = benchmark(quick=args.quick)
        coverage = bench["conformal"]["empirical_coverage"]
        BENCHMARK_PATH.write_text(json.dumps(bench, indent=2), encoding="utf-8")
        print(json.dumps({m: {k: v["mean"] for k, v in s.items()} for m, s in bench["methods"].items()}, indent=1))
    art = fit_final(QUICK_GRID if args.quick else FULL_GRID, coverage)
    ARTIFACT_PATH.write_text(json.dumps(art), encoding="utf-8")
    from app.cardiotwin.riskflow.synthetic import export_demo_rows

    export_demo_rows()
    print(f"wrote {ARTIFACT_PATH.name} (lambda={art['lambdas']}, qhat={art['conformal']['qhat']:.3f})")


if __name__ == "__main__":
    main()
