"""Unit tests for Cardio Intelligence TwinOS.

Validates staleness detection, split-conformal risk bounds, ECHO dependency recalculation,
stream simulation, clinician alerts, and agent-ready FHIR R4 exports.
"""

from __future__ import annotations

import pytest
from app.cardiotwin.twinos.engine import get_twinos_engine


def test_twinos_initial_state():
    engine = get_twinos_engine()
    patients = engine.list_patients()
    assert len(patients) >= 3

    # Verify Marcus Vance initial state
    p1 = engine.get_patient("patient_marcus_vance")
    assert p1 is not None
    assert p1.name == "Marcus Vance"
    assert p1.age == 58
    assert p1.current_assessment.is_active is True
    assert p1.prior_assessment is not None
    assert p1.staleness_state.is_stale is True
    assert p1.current_assessment.forecasts["30d_mace"].point_risk_pct == 37.8


def test_staleness_detector_thresholds():
    engine = get_twinos_engine()

    # Normal stable telemetry -> should NOT be stale
    stable_eval = engine.evaluate_staleness(
        baseline_hr=64.0,
        current_hr=66.0,
        baseline_rmssd=42.0,
        current_rmssd=40.0,
        baseline_spo2_nadir=95.0,
        current_spo2_nadir=94.0,
        baseline_deep_sleep_min=75.0,
        current_deep_sleep_min=72.0,
        hours_elapsed=72.0,
    )
    assert stable_eval.is_stale is False
    assert stable_eval.staleness_score < 40.0

    # Deteriorating drift: HR +14, RMSSD down 45%, SpO2 down to 87% -> MUST BE STALE
    stale_eval = engine.evaluate_staleness(
        baseline_hr=64.0,
        current_hr=78.0,
        baseline_rmssd=43.0,
        current_rmssd=23.0,
        baseline_spo2_nadir=94.5,
        current_spo2_nadir=87.0,
        baseline_deep_sleep_min=78.0,
        current_deep_sleep_min=32.0,
        hours_elapsed=72.0,
    )
    assert stale_eval.is_stale is True
    assert stale_eval.staleness_score >= 80.0
    assert len(stale_eval.staleness_trigger_reasons) >= 3


def test_conformal_uncertainty_bounds():
    engine = get_twinos_engine()
    p1 = engine.get_patient("patient_marcus_vance")
    assert p1 is not None

    mace = p1.current_assessment.forecasts["30d_mace"]
    assert mace.conformal_bounds.interval_lower < mace.conformal_bounds.interval_upper
    assert 0.0 <= mace.conformal_bounds.interval_lower <= 1.0
    assert 0.0 <= mace.conformal_bounds.interval_upper <= 1.0
    assert mace.conformal_bounds.coverage_guarantee_pct == 90.0


def test_simulation_stream_recovery():
    engine = get_twinos_engine()
    p = engine.simulate_telemetry_stream(
        patient_id="patient_david_chen",
        scenario="beta_blocker_recovery",
        auto_recompute=True,
    )
    assert p is not None
    assert p.current_assessment.is_active is True
    assert len(p.echo_provenance_history) > 0


def test_fhir_r4_bundle_export():
    engine = get_twinos_engine()
    bundle = engine.export_fhir_r4_bundle("patient_marcus_vance")
    assert bundle["resourceType"] == "Bundle"
    assert len(bundle["entry"]) >= 2

    risk_resource = bundle["entry"][0]["resource"]
    assert risk_resource["resourceType"] == "RiskAssessment"
    assert risk_resource["prediction"][0]["probabilityDecimal"] > 0

    provenance_resource = bundle["entry"][1]["resource"]
    assert provenance_resource["resourceType"] == "Provenance"


def test_alert_acknowledgment():
    engine = get_twinos_engine()
    p1 = engine.get_patient("patient_marcus_vance")
    assert p1 is not None
    assert p1.active_alert is not None
    alert_id = p1.active_alert.alert_id

    ack = engine.acknowledge_alert(
        alert_id=alert_id,
        clinician_name="Dr. Sarah Connor, MD, FACC",
        action_taken="Scheduled immediate 12-lead ECG and ordered hs-cTnI stat.",
    )
    assert ack.acknowledged is True
    assert ack.acknowledged_by == "Dr. Sarah Connor, MD, FACC"
