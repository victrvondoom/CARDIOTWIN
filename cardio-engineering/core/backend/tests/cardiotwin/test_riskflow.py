"""Clinician cardiac-risk workflow: gates, alignment, CVP model, physics, API."""

from __future__ import annotations

import copy
import random
from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.optimize import check_grad

from app.auth import get_current_user
from app.cardiotwin.core__app_cardiotwin__features import ENCODED_NAMES
from app.cardiotwin.riskflow import physiology as ph
from app.cardiotwin.riskflow import quality as q
from app.cardiotwin.riskflow.alignment import align
from app.cardiotwin.riskflow.fhir_history import parse_history
from app.cardiotwin.riskflow.synthetic import (
    BY_ID,
    DEMO_AS_OF,
    SCENARIOS,
    _row,
    build_bundle,
    build_stream,
    clean_stream,
    evaluate_quality_gate,
    inject,
)
from app.cardiotwin.riskflow.vessel_ising import CVPIsing, load_cvp, pattern_index
from app.cardiotwin.riskflow.workflow import run_workflow
from app.cardiotwin.schema import LABEL_COLUMNS
from app.main import app

AS_OF = DEMO_AS_OF
BASE = "/api/v1/cardiotwin/riskflow"


# ---------------------------------------------------------------------------
# Gate 3: signal quality
# ---------------------------------------------------------------------------


def _stream(fault: str, hr: float = 70.0, dev: str = "dev-1"):
    return inject(fault, clean_stream(hr, AS_OF - timedelta(minutes=1), dev, f"t-{fault}"), AS_OF, random.Random(1))


@pytest.mark.parametrize(
    ("fault", "status", "reason"),
    [
        ("stale", "rejected", q.STALE),
        ("flatline", "rejected", q.FLATLINE),
        ("unbound", "rejected", q.DEVICE_UNBOUND),
        ("motion_heavy", "rejected", q.INSUFFICIENT_REST),
        ("rr_ectopy", "degraded", q.RR_ARTIFACT),
        ("dropout", "rejected", q.LOW_COVERAGE),
        ("low_device_quality", "rejected", q.DEVICE_LOW_QUALITY),
    ],
)
def test_quality_gate_rejects_each_fault_with_its_reason(fault, status, reason):
    rep = q.assess_stream(_stream(fault), AS_OF, {"dev-1"})
    assert rep.status == status
    assert reason in rep.reasons


def test_quality_gate_accepts_clean_stream_and_excludes_bad_samples():
    clean = q.assess_stream(_stream("none", hr=64), AS_OF, {"dev-1"})
    assert clean.status == "accepted" and abs(clean.resting_hr - 64) < 2
    burst = q.assess_stream(_stream("implausible_burst", hr=64), AS_OF, {"dev-1"})
    assert burst.status == "accepted" and burst.sample_flags[q.IMPLAUSIBLE_VALUE] > 0
    assert abs(burst.resting_hr - 64) < 2  # 255-bpm samples never reach the summary
    future = q.assess_stream(_stream("future_timestamps"), AS_OF, {"dev-1"})
    assert future.sample_flags[q.FUTURE_TIMESTAMP] == 5


def test_quality_gate_requires_timezone_aware_times():
    with pytest.raises(ValueError):
        q.assess_stream(_stream("none"), AS_OF.replace(tzinfo=None), {"dev-1"})


def test_fault_injection_evaluation_detects_every_fault():
    ev = evaluate_quality_gate(n_per_fault=15, seed=7)
    assert ev["false_rejection_rate_clean"] == 0.0
    assert all(r["rate"] == 1.0 for r in ev["faults"].values()), ev["faults"]


# ---------------------------------------------------------------------------
# Gate 2: FHIR history
# ---------------------------------------------------------------------------


def _history(pid: str):
    return parse_history(build_bundle(BY_ID[pid]), AS_OF)


def test_fhir_units_are_normalised_and_codes_mapped():
    h = _history("P-001")  # P-001 sends triglycerides in mmol/L
    tg = h.series("TG")[-1]
    assert tg.unit == "mg/dL" and abs(tg.value - float(_row(BY_ID["P-001"].row)["TG"])) < 0.5
    assert h.bound_device_ids == {"wd-P-001-a1"}
    assert any(r["reason"].startswith("status 'preliminary'") for r in h.rejected)


def test_fhir_time_travel_wrong_patient_and_unknown_unit_are_rejected():
    bundle = build_bundle(BY_ID["P-002"])
    template = next(e for e in bundle["entry"] if "valueQuantity" in e["resource"])
    future, other, unit = (copy.deepcopy(template) for _ in range(3))
    future["resource"].update(id="future", effectiveDateTime=(AS_OF + timedelta(days=3)).isoformat())
    other["resource"].update(id="other", subject={"reference": "Patient/someone-else"})
    unit["resource"]["id"] = "badunit"
    unit["resource"]["valueQuantity"].update(code="furlongs", unit="furlongs")
    bundle["entry"] += [future, other, unit]
    reasons = {r["resource"]: r["reason"] for r in parse_history(bundle, AS_OF).rejected}
    assert "time-travel" in reasons["Observation/future"]
    assert "different or missing patient" in reasons["Observation/other"]
    assert "unsupported unit" in reasons["Observation/badunit"]


def test_fhir_requires_exactly_one_patient():
    assert parse_history({"resourceType": "Bundle", "entry": [{"resource": {"resourceType": "Observation"}}]}, AS_OF).errors


# ---------------------------------------------------------------------------
# Gate 4: alignment
# ---------------------------------------------------------------------------


def test_alignment_uses_gated_wearable_hr_and_keeps_record_provenance():
    h = _history("P-001")
    rep = q.assess_stream(build_stream(BY_ID["P-001"]), AS_OF, h.bound_device_ids)
    al = align(h, rep, AS_OF)
    assert al.provenance["PR"]["status"] == "wearable" and "superseded_record" in al.provenance["PR"]
    assert al.provenance["CVA"]["status"] in {"assumed-negative", "fhir"}
    assert al.status in {"pass", "warn"} and al.core_completeness >= 0.7


def test_alignment_falls_back_to_record_when_wearable_rejected():
    al = align(_history("P-003"), None, AS_OF)
    assert al.provenance["PR"]["status"] == "fhir" and "PR_FROM_RECORD" in al.reasons


def test_alignment_fails_on_stale_history():
    al = align(_history("P-006"), None, AS_OF)
    assert al.status == "fail" and al.reasons[0] == "INSUFFICIENT_HISTORY"
    assert any(p["status"] == "stale" for p in al.provenance.values())


# ---------------------------------------------------------------------------
# Gate 5: Coherent Vessel-Pattern model
# ---------------------------------------------------------------------------


def test_cvp_gradient_is_exact():
    rng = np.random.default_rng(0)
    z, y = rng.normal(size=(40, 5)), (rng.random((40, 3)) < 0.5).astype(float)
    m = CVPIsing(3.0, 5.0, 2.0)
    m.d = 5
    yi = pattern_index(y)
    th = rng.normal(size=5 * 5 + 7) * 0.3
    err = check_grad(lambda t: m.objective(t, z, yi)[0], lambda t: m.objective(t, z, yi)[1], th)
    assert err < 1e-5


def test_cvp_outputs_are_coherent_for_any_input():
    cvp = load_cvp()
    z = np.random.default_rng(1).normal(scale=2.0, size=(500, len(cvp.mean)))
    p = cvp.model.joint(z)
    marg = CVPIsing.marginals(p)
    assert np.allclose(p.sum(1), 1)
    assert np.all(marg["CAD"] + 1e-12 >= np.maximum.reduce([marg["LAD"], marg["LCX"], marg["RCA"]]))
    assert np.allclose(CVPIsing.count_distribution(p).sum(1), 1)


def test_cvp_artifact_has_no_label_inputs_and_valid_conformal():
    art = load_cvp().artifact
    assert art["feature_names"] == list(ENCODED_NAMES)
    assert not set(LABEL_COLUMNS) & {n.split("=")[0] for n in art["feature_names"]}
    assert 0 < art["conformal"]["qhat"] <= 1
    assert abs(art["conformal"]["empirical_coverage_cv"] - 0.9) < 0.05


# ---------------------------------------------------------------------------
# Gate 6: physics
# ---------------------------------------------------------------------------


def test_circulation_conserves_volume_and_is_physiological():
    m = ph.simulate_circulation(ph.CircParams())["metrics"]
    assert m["volume_drift_ml"] < 1e-6 and m["periodicity_error"] < 1e-3
    assert 105 < m["sbp_mmhg"] < 135 and 65 < m["dbp_mmhg"] < 90 and 50 < m["ejection_fraction_pct"] < 70
    assert 4.0 < m["cardiac_output_l_min"] < 6.5 and 1.0 < m["sevr"] < 2.0


def test_sevr_falls_with_heart_rate_in_validated_range():
    sevr = [ph.simulate_circulation(ph.CircParams(hr=hr))["metrics"]["sevr"] for hr in (50, 70, 100)]
    assert sevr[0] > sevr[1] > sevr[2]


def test_calibration_matches_patient_record():
    c = ph.calibrate_circulation(78, sbp=140, ef=45)
    m = c["sim"]["metrics"]
    assert c["converged"] and abs(m["sbp_mmhg"] - 140) < 7 and abs(m["ejection_fraction_pct"] - 45) < 2.25


def test_coronary_sweep_is_physiological():
    sw = ph.coronary_sweep(93.0)["LAD"]
    assert sw["pressure_ratio_stress"][0] > 0.95  # a normal artery is not ischaemic
    assert all(a >= b for a, b in zip(sw["pressure_ratio_stress"], sw["pressure_ratio_stress"][1:], strict=False))
    assert 75 < sw["critical_area_stenosis_pct"] <= 90
    rest = ph._vessel("LAD", 0, 93, 1.0).flow_rate_ml_min
    assert 50 < rest < 90 and 3.0 < ph._vessel("LAD", 0, 93, ph.HYPEREMIA_FACTOR).flow_rate_ml_min / rest < 4.0


def test_organ_model_refuses_out_of_range_heart_rate():
    with pytest.raises(ValueError):
        ph.simulate_patient(175, 120, 55, 50)


def test_mitchell_schaeffer_analytic_and_numeric_agree():
    m = ph.MSParams()
    ap = ph.action_potential(60000 / 70, m)
    assert ap["apd_analytic_ms"] * 0.95 <= ap["apd_numeric_ms"] <= ap["apd_analytic_ms"] * 1.25
    cl = 60000 / ph.alternans_threshold_hr(m)
    assert abs(ph.apd_slope(cl - ph.steady_apd(cl, m), m) - 1.0) < 1e-3


def test_qt_calibration_reproduces_recorded_qt():
    m = ph.calibrate_tau_close(410, 65)
    assert abs(ph.steady_apd(60000 / 65, m) - 410) < 0.5


# ---------------------------------------------------------------------------
# End-to-end workflow and API
# ---------------------------------------------------------------------------

EXPECT = {
    "P-001": ("presented", {"signal": "pass"}),
    "P-002": ("presented", {"signal": "pass", "risk": "pass"}),
    "P-003": ("presented", {"signal": "fail"}),
    "P-004": ("presented", {"signal": "warn"}),
    "P-005": ("presented", {"identity": "warn", "signal": "fail"}),
    "P-006": ("withheld", {"alignment": "fail", "simulation": "skipped"}),
    "P-007": ("presented", {"signal": "fail"}),
    "P-008": ("withheld", {"risk": "fail", "simulation": "skipped"}),
}


@pytest.mark.parametrize("pid", [s.patient_id for s in SCENARIOS])
def test_demo_patients_follow_their_scenario(pid):
    s = BY_ID[pid]
    r = run_workflow(build_bundle(s), build_stream(s), AS_OF)
    outcome, gates = EXPECT[pid]
    assert r["outcome"] == outcome
    status = {g["id"]: g["status"] for g in r["gates"]}
    for gid, want in gates.items():
        assert status[gid] == want, (gid, status)
    if outcome == "presented":
        assert r["risk"]["coherent"] and r["simulation"]["organ"]["calibration_converged"]
    assert len(r["provenance"]["input_sha256"]) == 64 and r["provenance"]["persisted"] is False


def test_rejected_wearable_never_reaches_model():
    s = BY_ID["P-005"]  # stream from an unbound device
    r = run_workflow(build_bundle(s), build_stream(s), AS_OF)
    prov = next(g for g in r["gates"] if g["id"] == "alignment")["detail"]["provenance"]
    assert prov["PR"]["source"] != "wearable"
    assert all(n["status"] == "unbound" for n in r["sensors"])


@pytest.fixture()
def client():
    from app import rate_limit

    if isinstance(rate_limit._store, rate_limit._InMemoryBucketStore):
        rate_limit._store._buckets.clear()
    app.dependency_overrides[get_current_user] = lambda: {"id": "u", "email": "c@example.org", "full_name": "c",
                                                          "organization_id": "org", "role": "coordinator"}
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user, None)


def test_api_requires_auth():
    app.dependency_overrides.pop(get_current_user, None)
    assert TestClient(app).get(f"{BASE}/patients").status_code in (401, 403)


def test_api_patients_run_and_model_card(client):
    pts = client.get(f"{BASE}/patients").json()["patients"]
    assert {p["patient_id"] for p in pts} == set(BY_ID)
    r = client.post(f"{BASE}/run", json={"patient_id": "P-002"}).json()
    assert r["outcome"] == "presented" and r["synthetic"]["patient_id"] == "P-002"
    card = client.get(f"{BASE}/model-card").json()
    assert card["benchmark"]["methods"]["cvp"]["coherence_violation_rate"]["mean"] == 0.0
    assert card["signal_gate_evaluation"]["false_rejection_rate_clean"] == 0.0


def test_api_accepts_custom_bundle_and_validates_input(client):
    s = BY_ID["P-001"]
    wear = [p.to_dict() for p in build_stream(s)]
    r = client.post(f"{BASE}/run", json={"bundle": build_bundle(s), "wearable": wear, "as_of": AS_OF.isoformat()})
    assert r.status_code == 200 and r.json()["outcome"] == "presented"
    naive = [{**wear[0], "timestamp": "2026-10-19T08:00:00"}]
    assert client.post(f"{BASE}/run", json={"bundle": build_bundle(s), "wearable": naive}).status_code == 422
    assert client.post(f"{BASE}/run", json={"patient_id": "P-999"}).status_code == 404
    assert client.post(f"{BASE}/run", json={}).status_code == 422


def test_quick_benchmark_shows_independent_models_are_incoherent():
    from app.cardiotwin.riskflow.train_ising import benchmark

    b = benchmark(quick=True, log=False)
    assert b["methods"]["cvp"]["coherence_violation_rate"]["mean"] == 0.0
    assert b["methods"]["lr"]["coherence_violation_rate"]["mean"] > 0.05
    assert datetime.fromisoformat(b["created_at"]).tzinfo == UTC
