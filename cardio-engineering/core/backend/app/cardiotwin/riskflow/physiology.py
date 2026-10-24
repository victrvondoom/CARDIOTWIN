"""Patient-calibrated physics, progressively narrower: organ → vessel → cell.

Level 1 — organ (closed-loop left heart, lumped parameters; units mL, mmHg, s)
    E(t)   = E_min + (E_max − E_min)·e_n(t mod T)                       time-varying elastance
    e_n(t) = k·[(t/τ1)^m1 / (1+(t/τ1)^m1)]·[1 / (1+(t/τ2)^m2)]          double-Hill, max-normalised
             τ1 = 0.269T_c, τ2 = 0.452T_c, m1 = 1.32, m2 = 27.4        (Stergiopulos et al. 1996)
             T_c = 0.8 s · LVET(HR)/LVET(75), LVET = 0.413 − 0.0017·HR s  (Weissler 1968)
    P_lv = E(t)(V_lv − V0)     P_a = V_a/C_a     P_v = V_v/C_v     P_la = E_la(V_la − V0_la)
    Q_mv = max(P_la − P_lv, 0)/R_mv    Q_av = max(P_lv − P_a, 0)/R_av
    Q_s  = (P_a − P_v)/R_s             Q_r  = (P_v − P_la)/R_r
    dV_lv = Q_mv − Q_av   dV_a = Q_av − Q_s   dV_v = Q_s − Q_r   dV_la = Q_r − Q_mv   (volume conserved)
  T = 60/HR uses the gated wearable heart rate. E_max (contractility) and R_s (afterload) are fitted
  so the simulated systolic pressure and ejection fraction match the patient's own FHIR values.
  Supply/demand: Buckberg subendocardial viability ratio SEVR = DPTI/TTI,
    TTI = ∫_ejection P_a dt,  DPTI = ∫_diastole (P_a − P_lv) dt.

Level 2 — vessel: the existing steady Poiseuille + sudden-expansion stenosis circuit
  (hemodynamics/physics.py) driven by the calibrated mean arterial pressure, swept over lesion
  severity (10 mm focal lesion; microvascular resistance calibrated to resting LAD flow 70 mL/min;
  hyperaemia lowers it 3.5x, a normal coronary flow reserve). The training labels call a vessel "stenotic" at ≥50 % diameter (= 75 % area) narrowing,
  so the sweep reports the simulated pressure ratio at exactly that label threshold.

Level 3 — cell (Mitchell & Schaeffer 2003, dimensionless v ∈ [0, 1], time in ms)
    dv/dt = h·v²(1 − v)/τ_in − v/τ_out + J_stim
    dh/dt = (1 − h)/τ_open if v < v_gate else −h/τ_close
  Analytic restitution map: APD = τ_close·ln[(1 − (1 − h_min)e^(−DI/τ_open)) / h_min], h_min = 4τ_in/τ_out.
  Paced at the patient's RR; |dAPD/dDI| > 1 at the operating point predicts APD alternans. τ_close is
  calibrated to a recorded QT interval when one is available. The numerical AP is integrated and its
  APD cross-checked against the analytic map.

All outputs are simulations from a reduced-order model with population-default parameters except
where stated as calibrated. They are not measurements (not invasive FFR, not a measured APD).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import numpy as np

from app.cardiotwin.hemodynamics.physics import solve_vessel_physics

# Serving needs only numpy (scipy is a training-time dependency in this project), so the three
# numerical tools used below are implemented here: trapezoid rule, bisection root finding and a
# damped Gauss-Newton (Levenberg-Marquardt) least-squares fit with box bounds.


def trapezoid(y: np.ndarray, x: np.ndarray) -> float:
    y, x = np.asarray(y, float), np.asarray(x, float)
    return float(np.sum((y[1:] + y[:-1]) * np.diff(x)) / 2.0) if len(x) > 1 else 0.0


def bisect_root(f: Any, lo: float, hi: float, xtol: float = 1e-9, maxiter: int = 200) -> float:
    flo, fhi = f(lo), f(hi)
    if flo == 0:
        return lo
    if fhi == 0:
        return hi
    if (flo > 0) == (fhi > 0):
        raise ValueError("root not bracketed")
    for _ in range(maxiter):
        mid = 0.5 * (lo + hi)
        fm = f(mid)
        if fm == 0 or hi - lo < xtol:
            return mid
        if (fm > 0) == (flo > 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return 0.5 * (lo + hi)


def levenberg_marquardt(resid: Any, x0: np.ndarray, lo: np.ndarray, hi: np.ndarray, *, tol: float = 2e-3,
                        max_iter: int = 15, step: float = 0.02) -> np.ndarray:
    """Minimise ||resid(x)||² within [lo, hi] using forward-difference Jacobians."""
    x = np.clip(np.asarray(x0, float), lo, hi)
    r = resid(x)
    lam = 1e-2
    for _ in range(max_iter):
        if np.max(np.abs(r)) < tol:
            break
        jac = np.column_stack([(resid(np.clip(x + step * e, lo, hi)) - r) / step for e in np.eye(len(x))])
        jtj = jac.T @ jac
        move = np.linalg.solve(jtj + lam * (np.diag(np.diag(jtj)) + 1e-9 * np.eye(len(x))), -jac.T @ r)
        x_new = np.clip(x + move, lo, hi)
        r_new = resid(x_new)
        if r_new @ r_new < r @ r:
            x, r, lam = x_new, r_new, lam / 3
        else:
            lam *= 4
    return x

# ---------------------------------------------------------------------------
# Level 1 — organ
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CircParams:
    hr: float = 70.0
    e_max: float = 3.0
    e_min: float = 0.06
    v0: float = 10.0
    c_a: float = 1.3
    c_v: float = 60.0
    e_la: float = 0.25
    v0_la: float = 10.0
    r_mv: float = 0.005
    r_av: float = 0.012
    r_s: float = 1.0
    r_r: float = 0.06
    v_stressed: float = 1100.0  # mL; defaults give ~120/80 mmHg, EF ~60 %, EDV ~125 mL, CO ~5.3 L/min at 70 bpm


_M1, _M2 = 1.32, 27.4
# Fixed-resistance, no-baroreflex model: SEVR behaves physiologically (falls with HR) only in this band.
ORGAN_HR_RANGE = (40.0, 130.0)


def _hill_raw(t: Any, period: float) -> Any:
    g1 = (t / (0.269 * period)) ** _M1
    g2 = (t / (0.452 * period)) ** _M2
    return (g1 / (1 + g1)) * (1 / (1 + g2))


@lru_cache(maxsize=64)
def _hill_norm(period: float) -> float:
    t = np.linspace(1e-6, period, 4000)
    return float(1.0 / np.max(_hill_raw(t, period)))


def contraction_scale(hr: float) -> float:
    """Time scale of the elastance curve. Systole shortens far less than the beat as HR rises:
    scale with Weissler's ejection-time regression LVET = 0.413 − 0.0017·HR s, anchored to
    the published double-Hill shape at 75 bpm (T = 0.8 s). Diastole therefore absorbs the
    shortening, as it does physiologically."""
    lvet = max(0.413 - 0.0017 * hr, 0.12)
    return 0.8 * lvet / (0.413 - 0.0017 * 75.0)


def elastance(t: float, p: CircParams) -> float:
    period = 60.0 / p.hr
    ts = contraction_scale(p.hr)
    return p.e_min + (p.e_max - p.e_min) * _hill_norm(ts) * float(_hill_raw(t % period, ts))


def _rhs(t: float, y: np.ndarray, p: CircParams) -> tuple[np.ndarray, tuple[float, ...]]:
    v_lv, v_a, v_v, v_la = y
    p_lv = elastance(t, p) * (v_lv - p.v0)
    p_a, p_v = v_a / p.c_a, v_v / p.c_v
    p_la = p.e_la * (v_la - p.v0_la)
    q_mv = max(p_la - p_lv, 0.0) / p.r_mv
    q_av = max(p_lv - p_a, 0.0) / p.r_av
    q_s = (p_a - p_v) / p.r_s
    q_r = (p_v - p_la) / p.r_r
    return np.array([q_mv - q_av, q_av - q_s, q_s - q_r, q_r - q_mv]), (p_lv, p_a, p_la, q_av)


def simulate_circulation(p: CircParams, beats: int = 10, dt: float = 0.001) -> dict[str, Any]:
    """Fixed-step RK4 to a periodic steady state; metrics from the final beat."""
    period = 60.0 / p.hr
    y = np.array([120.0, 150.0, 0.0, 40.0])
    y[2] = p.v_stressed - y.sum()  # venous holds the remainder: total stressed volume is exact
    if y[2] <= 0:
        raise ValueError("stressed volume too small for the initial distribution")
    n_beat = int(round(period / dt))
    h = period / n_beat
    rec = np.zeros((n_beat + 1, 7))  # t, V_lv, P_lv, P_a, P_la, Q_av, total volume
    prev_edv: float | None = None
    periodicity = float("nan")
    for b in range(beats):
        last = b == beats - 1
        t0 = b * period
        for i in range(n_beat):
            t = t0 + i * h
            k1, aux = _rhs(t, y, p)
            if last:
                rec[i] = (i * h, y[0], *aux, y.sum())
            k2, _ = _rhs(t + h / 2, y + h / 2 * k1, p)
            k3, _ = _rhs(t + h / 2, y + h / 2 * k2, p)
            k4, _ = _rhs(t + h, y + h * k3, p)
            y = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        if last:
            _, aux = _rhs(t0 + period, y, p)
            rec[n_beat] = (period, y[0], *aux, y.sum())
        if prev_edv is not None:
            periodicity = abs(float(y[0]) - prev_edv) / max(prev_edv, 1e-9)
        prev_edv = float(y[0])
    t, v_lv, p_lv, p_a, p_la, q_av, vol = rec.T
    edv, esv = float(v_lv.max()), float(v_lv.min())
    sv = edv - esv
    eject = q_av > 1e-9
    if not eject.any():
        raise ArithmeticError("no ejection in final beat")
    end_ej = int(np.where(eject)[0][-1])
    diast = np.zeros_like(eject)
    diast[end_ej + 1:] = True
    tti = float(trapezoid(p_a[eject], t[eject]))
    dpti = float(trapezoid((p_a - p_lv)[diast], t[diast])) if diast.sum() > 1 else 0.0
    return {
        "t": t, "v_lv": v_lv, "p_lv": p_lv, "p_a": p_a, "p_la": p_la,
        "metrics": {
            "heart_rate_bpm": p.hr,
            "sbp_mmhg": float(p_a.max()),
            "dbp_mmhg": float(p_a.min()),
            "map_mmhg": float(trapezoid(p_a, t) / period),
            "edv_ml": edv, "esv_ml": esv, "stroke_volume_ml": sv,
            "ejection_fraction_pct": 100 * sv / edv,
            "cardiac_output_l_min": sv * p.hr / 1000,
            "lvedp_mmhg": float(p_lv[np.argmax(v_lv)]),
            "dp_dt_max_mmhg_s": float(np.gradient(p_lv, t).max()),
            "stroke_work_j": float(-trapezoid(p_lv, v_lv)) * 133.322e-6,
            "tti_mmhg_s": tti, "dpti_mmhg_s": dpti,
            "sevr": dpti / tti if tti > 0 else float("nan"),
            "diastolic_time_s_per_min": float(t[diast][-1] - t[diast][0]) * p.hr if diast.sum() > 1 else 0.0,
            "volume_drift_ml": float(vol.max() - vol.min()),
            "periodicity_error": periodicity,
        },
    }


def calibrate_circulation(hr: float, sbp: float | None, ef: float | None) -> dict[str, Any]:
    """Fit E_max and R_s so simulated SBP / EF match the patient's record (each only if present)."""
    base = CircParams(hr=hr)
    targets = [(k, float(v)) for k, v in (("sbp_mmhg", sbp), ("ejection_fraction_pct", ef)) if v is not None]
    if not targets:
        return {"params": base, "sim": simulate_circulation(base), "calibrated": [], "residuals": {}, "converged": True}

    def resid(x: np.ndarray) -> np.ndarray:
        q = CircParams(hr=hr, e_max=float(np.exp(x[0])), r_s=float(np.exp(x[1])))
        m = simulate_circulation(q, beats=8, dt=0.002)["metrics"]
        return np.array([(m[k] - v) / v for k, v in targets])

    x = levenberg_marquardt(resid, np.log([base.e_max, base.r_s]), np.log([0.5, 0.3]), np.log([10.0, 4.0]))
    params = CircParams(hr=hr, e_max=float(np.exp(x[0])), r_s=float(np.exp(x[1])))
    sim = simulate_circulation(params)
    res = {k: round(sim["metrics"][k] - v, 2) for k, v in targets}
    ok = all(abs(sim["metrics"][k] - v) / v < 0.05 for k, v in targets)
    return {"params": params, "sim": sim, "calibrated": [k for k, _ in targets], "residuals": res, "converged": ok}


# ---------------------------------------------------------------------------
# Level 2 — vessel
# ---------------------------------------------------------------------------

LABEL_THRESHOLD_AREA_PCT = 75.0  # ≥50 % diameter stenosis == 75 % area reduction
# The shared solver's defaults treat the whole vessel as the lesion and give ~15x physiological flow with a
# 1.45x "hyperaemia". The riskflow sweep passes physiological arguments instead (solver code unchanged):
LESION_LENGTH_MM = 10.0            # focal lesion
MICROVASCULAR_FACTOR = 26.89       # calibrated: resting LAD flow 70 mL/min at MAP 93 mmHg, 0 % stenosis
HYPEREMIA_FACTOR = 3.5             # microvascular resistance falls 3.5x -> normal coronary flow reserve ~3.5


def _vessel(vessel: str, area_pct: float, map_mmhg: float, hyperemia: float) -> Any:
    return solve_vessel_physics(vessel, area_pct, map_mmhg, hyperemia, lesion_length_mm=LESION_LENGTH_MM,
                                microvascular_resistance_factor=MICROVASCULAR_FACTOR)


def coronary_sweep(map_mmhg: float) -> dict[str, Any]:
    grid = [round(float(x), 1) for x in np.arange(0.0, 92.5, 2.5)]
    out: dict[str, Any] = {}
    for vessel in ("LAD", "LCX", "RCA"):
        rest = [_vessel(vessel, s, map_mmhg, 1.0).ffr for s in grid]
        stress = [_vessel(vessel, s, map_mmhg, HYPEREMIA_FACTOR).ffr for s in grid]
        critical = next((s for s, r in zip(grid, stress, strict=True) if r <= 0.80), None)
        at_label = _vessel(vessel, LABEL_THRESHOLD_AREA_PCT, map_mmhg, HYPEREMIA_FACTOR)
        out[vessel] = {
            "area_stenosis_pct": grid,
            "pressure_ratio_rest": [round(r, 4) for r in rest],
            "pressure_ratio_stress": [round(r, 4) for r in stress],
            "critical_area_stenosis_pct": critical,
            "at_label_threshold": {"area_stenosis_pct": LABEL_THRESHOLD_AREA_PCT,
                                   "pressure_ratio_stress": round(at_label.ffr, 4),
                                   "flow_ml_min": at_label.flow_rate_ml_min,
                                   "below_0_80": at_label.ffr <= 0.80},
        }
    return out


# ---------------------------------------------------------------------------
# Level 3 — cell
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MSParams:
    tau_in: float = 0.3
    tau_out: float = 6.0
    tau_open: float = 120.0
    tau_close: float = 150.0
    v_gate: float = 0.13

    @property
    def h_min(self) -> float:
        return 4 * self.tau_in / self.tau_out


def apd_map(di: float, m: MSParams) -> float:
    a = 1 - m.h_min
    return m.tau_close * math.log((1 - a * math.exp(-di / m.tau_open)) / m.h_min)


def apd_slope(di: float, m: MSParams) -> float:
    a, x = 1 - m.h_min, math.exp(-di / m.tau_open)
    return m.tau_close * a * x / (m.tau_open * (1 - a * x))


def steady_apd(cl: float, m: MSParams) -> float:
    """Fixed point APD = f(CL − APD) of the restitution map at pacing cycle length cl (ms)."""
    hi = min(cl, m.tau_close * math.log(1 / m.h_min)) - 1e-6
    return bisect_root(lambda a: a - apd_map(cl - a, m), 1e-6, hi)


def alternans_threshold_hr(m: MSParams) -> float:
    """Heart rate above which the steady state has |slope| > 1 (period-doubling)."""
    a = 1 - m.h_min
    x = m.tau_open / (a * (m.tau_close + m.tau_open))
    if x >= 1:
        return float("inf")
    di = -m.tau_open * math.log(x)
    return 60000.0 / (di + apd_map(di, m))


def calibrate_tau_close(qt_ms: float, hr: float) -> MSParams:
    cl = 60000.0 / hr

    def g(tc: float) -> float:
        return steady_apd(cl, MSParams(tau_close=tc)) - qt_ms

    lo, hi = 40.0, 600.0
    if g(lo) > 0 or g(hi) < 0:
        raise ValueError("QT not reachable within the calibrated τ_close range")
    return MSParams(tau_close=bisect_root(g, lo, hi))


def action_potential(cl: float, m: MSParams) -> dict[str, Any]:
    """Integrate one beat from the steady-state pre-stimulus gate; compare APD with the analytic map."""
    apd_a = steady_apd(cl, m)
    di = cl - apd_a
    h0 = 1 - (1 - m.h_min) * math.exp(-di / m.tau_open)

    def rhs(t: float, v: float, h: float) -> tuple[float, float]:
        stim = 0.2 if t < 2.0 else 0.0
        dv = h * v * v * (1 - v) / m.tau_in - v / m.tau_out + stim
        dh = (1 - h) / m.tau_open if v < m.v_gate else -h / m.tau_close
        return dv, dh

    dt = 0.025  # ms; RK4 is stable here (fastest rate ~1/τ_in = 3.3 /ms)
    steps = int(math.ceil(cl / dt))
    vs = np.empty(steps + 1)
    v, h = 0.0, h0
    vs[0] = v
    for i in range(steps):
        t0 = i * dt
        a1, b1 = rhs(t0, v, h)
        a2, b2 = rhs(t0 + dt / 2, v + dt / 2 * a1, h + dt / 2 * b1)
        a3, b3 = rhs(t0 + dt / 2, v + dt / 2 * a2, h + dt / 2 * b2)
        a4, b4 = rhs(t0 + dt, v + dt * a3, h + dt * b3)
        v += dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4)
        h += dt / 6 * (b1 + 2 * b2 + 2 * b3 + b4)
        vs[i + 1] = v
    t_all = np.arange(steps + 1) * dt
    above_all = np.where(vs > m.v_gate)[0]
    apd_n = float(t_all[above_all[-1]] - t_all[above_all[0]]) if above_all.size else 0.0
    t = np.linspace(0, cl, 400)
    v = np.interp(t, t_all, vs)
    return {"t_ms": t, "vm_mv": -85.0 + 120.0 * v, "apd_numeric_ms": apd_n, "apd_analytic_ms": apd_a,
            "di_ms": di, "h_pre": h0}


def cell_level(hr_rest: float, age: float | None, qt_ms: float | None) -> dict[str, Any]:
    calibrated = False
    m = MSParams()
    note = "population-default parameters"
    if qt_ms is not None:
        try:
            m = calibrate_tau_close(float(qt_ms), hr_rest)
            calibrated, note = True, "τ_close calibrated to recorded QT at the gated heart rate"
        except ValueError as e:
            note = f"QT calibration skipped: {e}"
    hr_ex = 0.85 * (220 - float(age)) if age else 150.0
    points = {}
    for label, hr in (("rest", hr_rest), ("exertion_85pct_age_predicted", hr_ex)):
        cl = 60000.0 / hr
        apd = steady_apd(cl, m)
        slope = apd_slope(cl - apd, m)
        points[label] = {"heart_rate_bpm": round(hr, 1), "cycle_length_ms": round(cl, 1),
                         "apd_ms": round(apd, 1), "di_ms": round(cl - apd, 1),
                         "restitution_slope": round(slope, 3), "alternans_predicted": abs(slope) > 1}
    ap = action_potential(60000.0 / hr_rest, m)
    di_grid = np.linspace(10, 800, 80)
    return {
        "model": "Mitchell-Schaeffer (2003) two-variable ventricular myocyte",
        "parameters": {"tau_in": m.tau_in, "tau_out": m.tau_out, "tau_open": m.tau_open,
                       "tau_close": round(m.tau_close, 2), "v_gate": m.v_gate, "h_min": m.h_min},
        "parameter_source": note, "qt_calibrated": calibrated,
        "operating_points": points,
        "alternans_threshold_hr_bpm": round(alternans_threshold_hr(m), 1),
        "restitution": {"di_ms": [round(float(d), 1) for d in di_grid],
                        "apd_ms": [round(apd_map(float(d), m), 2) for d in di_grid]},
        "action_potential": {"t_ms": [round(float(x), 2) for x in ap["t_ms"]],
                             "vm_mv": [round(float(x), 2) for x in ap["vm_mv"]],
                             "voltage_scaling": "illustrative: Vm = -85 + 120·v",
                             "apd_numeric_ms": round(ap["apd_numeric_ms"], 1),
                             "apd_analytic_ms": round(ap["apd_analytic_ms"], 1)},
    }


# ---------------------------------------------------------------------------
# Patient entry point
# ---------------------------------------------------------------------------


def _downsample(arr: np.ndarray, n: int = 200) -> list[float]:
    idx = np.linspace(0, len(arr) - 1, n).round().astype(int)
    return [round(float(arr[i]), 3) for i in idx]


def simulate_patient(heart_rate: float, sbp: float | None, ef: float | None, age: float | None,
                     qt_ms: float | None = None) -> dict[str, Any]:
    if not (ORGAN_HR_RANGE[0] <= heart_rate <= ORGAN_HR_RANGE[1]):
        raise ValueError(f"heart rate {heart_rate} outside the organ model's validated range {ORGAN_HR_RANGE} bpm")
    organ = calibrate_circulation(float(heart_rate), sbp, ef)
    sim, params = organ["sim"], organ["params"]
    m = sim["metrics"]
    return {
        "organ": {
            "model": "closed-loop time-varying-elastance left heart + Windkessel (lumped, 4 compartments)",
            "calibrated_to": organ["calibrated"], "calibration_residuals": organ["residuals"],
            "calibration_converged": organ["converged"],
            "parameters": {k: round(v, 4) for k, v in params.__dict__.items()},
            "metrics": {k: round(v, 3) for k, v in m.items()},
            "waveforms": {"t_s": _downsample(sim["t"]), "p_lv_mmhg": _downsample(sim["p_lv"]),
                          "p_a_mmhg": _downsample(sim["p_a"]), "v_lv_ml": _downsample(sim["v_lv"])},
        },
        "vessel": {"model": "steady Poiseuille + sudden-expansion stenosis circuit (hemodynamics/physics.py); 10 mm focal lesion, microvasculature calibrated to resting LAD flow 70 mL/min, hyperaemic CFR 3.5",
                   "driving_map_mmhg": round(m["map_mmhg"], 1), "sweep": coronary_sweep(m["map_mmhg"])},
        "cell": cell_level(float(heart_rate), age, qt_ms),
        "limits": [
            "Reduced-order models; parameters are population defaults except those listed as calibrated.",
            "Pressure ratios are simulated, not invasive FFR; lesion severity is swept, not measured.",
            "Cellular voltage is a dimensionless model rescaled for display.",
        ],
    }
