# CardioTwin cardiac-risk workflow (riskflow)

Route `/cardiotwin/riskflow` · API `/api/v1/cardiotwin/riskflow/{patients,run,model-card}` · code `backend/app/cardiotwin/riskflow/`

Clinician selects a patient → six fail-closed gates → a validated risk estimate + simulation, or a withheld result with reason codes. Nothing rejected reaches the model or the simulation; nothing about the patient is persisted (input/result SHA-256 only).

| # | Gate | Rejects / flags | Module |
|---|------|-----------------|--------|
| 1 | Identity & device binding | wearable `device_id` not a FHIR `Device` bound to this `Patient` | `workflow.py` |
| 2 | FHIR history | non-final status, other-patient references, unknown UCUM units, resources dated after as-of (time-travel guard) | `fhir_history.py` |
| 3 | Wearable signal quality | STALE, NO_DATA, LOW_COVERAGE, DEVICE_UNBOUND, DEVICE_LOW_QUALITY, IMPLAUSIBLE_VALUE, FUTURE/DUPLICATE_TIMESTAMP, FLATLINE, MOTION_ARTIFACT, RR_ARTIFACT (Malik 20 %), HR_RR_MISMATCH | `quality.py` |
| 4 | Alignment | per-feature freshness limits (symptoms 90 d, vitals/ECG/labs 365 d, echo/anthropometrics 730 d); wearable resting HR replaces record `PR` only if gate 3 accepted it; drift vs the patient's 2-year FHIR median; INSUFFICIENT_HISTORY if < 70 % of core features are fresh | `alignment.py` |
| 5 | Validated risk | OUT_OF_DOMAIN (Ledoit-Wolf Mahalanobis > training p99), INCOHERENT_OUTPUT; warns on imputation or a > 6-of-8 conformal set | `vessel_ising.py` |
| 6 | Physics simulation | runs only after gate 5 presents; organ model limited to 40–130 bpm | `physiology.py` |

## Model: Coherent Vessel-Pattern (CVP) — why not per-target XGBoost

Clinical question: *which* of LAD/LCX/RCA are stenotic and *how many*. Independent per-target classifiers cannot represent the logical link (CAD = any vessel in 302/303 rows) and returned impossible outputs (P(CAD) < P(vessel)) for ~20 % of patients.

P(y|x) ∝ exp(Σ_v h_v(x) y_v + Σ_{v<w} J_vw y_v y_w + g(x)·1[any y]) over the 8 patterns, with h_v = (w₀ + Δ_v)·x + b_v (shared burden + vessel-specific) and g = u·x + c. Exact partition function, convex penalised likelihood, L-BFGS. Split-conformal (LAC) pattern sets at 90 %.

Benchmark — `python -m app.cardiotwin.riskflow.train_ising` (XGBoost 3.4.1 installed for the run; it is not a serving dependency). Extension of Z-Alizadeh Sani (UCI 411, n = 303); 5-fold × 3 repeated CV stratified by vessel count; all models tuned by inner CV; Nadeau–Bengio corrected t-test. Source: `artifacts/riskflow_benchmark.json`.

| Metric | CVP | XGBoost | LR | p (CVP−XGB) |
|---|---|---|---|---|
| AUC CAD / LAD / LCX / RCA | **.928** / **.844** / .711 / **.738** | .908 / .841 / **.731** / .730 | .923 / .833 / .694 / .734 | .36 / .89 / .52 / .79 |
| Brier CAD | **.099** | .106 | .100 | .63 |
| Joint pattern log-loss | **1.563** | 1.679 | 1.706 | **.047** |
| Vessel-count accuracy | **49.3 %** | 41.9 % | 40.2 % | **.042** |
| Impossible outputs | **0 %** | 19.7 % | 19.5 % | **< .001** |
| Conformal coverage (target 90 %) | 90.3 %, mean set 4.8 / 8 | — | — | |

Reading: CVP is significantly better on the pattern/vessel-count questions and is coherent by construction; per-target discrimination is statistically tied (XGBoost ahead on LCX AUC).

## Physics (organ → vessel → cell), patient-calibrated

* Organ: closed-loop double-Hill elastance + Windkessel left heart (volume conserved; LVET-scaled systole, Weissler). E_max and R_s fitted to the record's SBP and echo EF; HR from the gated wearable. Outputs PV loop, CO, SEVR = DPTI/TTI (falls with HR as expected).
* Vessel: existing `hemodynamics/physics.py` circuit with physiological arguments — 10 mm focal lesion, microvascular resistance calibrated to resting LAD flow 70 mL/min, hyperaemia 3.5× (CFR ≈ 3.5). Pd/Pa ≈ 1.0 at 0 %, ≈ 0.90 at the label threshold (75 % area), ≤ 0.80 from ~85 % area. Severity is swept, never inferred.
* Cell: Mitchell–Schaeffer myocyte paced at the patient's RR; analytic restitution map, alternans threshold (slope 1), τ_close calibrated to QT when recorded. Numerical APD (RK4) is ~18 % longer than the analytic τ_in→0 map; both are reported.

Serving uses numpy only (scipy/pandas/sklearn are training-time dependencies, enforced by `test_serving_path_does_not_need_training_dependencies`).

## Evidence and limits

* Signal gate fault injection (`synthetic.evaluate_quality_gate`, 60 streams × 11 conditions): every fault detected, 0 % false rejection of clean streams, resting HR p95 error < 1 bpm. This tests the specification, not real sensor sensitivity.
* Demo patients P-001…P-008 are verbatim public dataset rows (in-sample) wrapped in synthetic FHIR + wearable data (`artifacts/riskflow_demo_rows.json`).
* Single-centre public dataset, no external validation, no real wearable–outcome pairs: wearable data feeds gating, PR and the physics, not new model features.
* Decision support only; not a medical device; does not locate or size lesions.
* Tests: `backend/tests/cardiotwin/test_riskflow.py` (39), `frontend/tests/riskflow-page.test.tsx` (6).
