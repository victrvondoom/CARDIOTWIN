"""Unit tests for the Unified Centralized Platform: MedClear AI and Pulse 911 integrations."""

import pytest
from app.cardiotwin.medclear.engine import get_medclear_engine
from app.cardiotwin.pulse.protocols_data import EMERGENCY_PROTOCOLS


def test_medclear_engine_simplification_english():
    engine = get_medclear_engine()
    sample_text = "Patient presents with acute dyspnea, tachycardia, and substernal angina associated with hypertension."
    res = engine.simplify(sample_text, target_lang="en", link_twin=True)

    assert res.original_length == len(sample_text)
    assert len(res.detected_terms) >= 3

    detected_terms_names = [d["term"].lower() for d in res.detected_terms]
    assert "dyspnea" in detected_terms_names
    assert "tachycardia" in detected_terms_names
    assert "angina" in detected_terms_names
    assert "hypertension" in detected_terms_names

    # Check urgent action trigger
    assert len(res.urgent_actions) > 0
    assert "🚨 Urgent Medical Attention" in res.urgent_actions[0]

    # Check daily vital monitoring trigger
    assert len(res.monitoring_actions) > 0
    assert "📋 Daily Vital Monitoring" in res.monitoring_actions[0]

    # Check hemodynamic twin projection
    assert res.hemodynamic_vector_summary is not None
    assert res.hemodynamic_vector_summary["projected_delta_hr_bpm"] > 0
    assert res.hemodynamic_vector_summary["elevated_stenosis_risk"] is True


def test_medclear_engine_simplification_spanish():
    engine = get_medclear_engine()
    sample_text = "Paciente con disnea aguda, taquicardia y sospecha de isquemia miocárdica."
    res = engine.simplify(sample_text, target_lang="es", link_twin=True)

    assert len(res.detected_terms) >= 2
    assert len(res.urgent_actions) > 0
    assert "🚨 Atención Urgente" in res.urgent_actions[0]


def test_pulse_911_protocols_integrity():
    assert len(EMERGENCY_PROTOCOLS) >= 5
    ids = [p["id"] for p in EMERGENCY_PROTOCOLS]
    assert "CARD-01" in ids  # Adult Cardiac Arrest
    assert "ACS-14" in ids   # STEMI / Ischemia
    assert "PED-03" in ids   # Infant Choking
    assert "STROKE-02" in ids # Acute Stroke FAST
    assert "ANAPH-05" in ids # Severe Anaphylaxis

    for proto in EMERGENCY_PROTOCOLS:
        assert len(proto["prearrival_steps"]) > 0
        assert len(proto["contraindications"]) > 0
        assert len(proto["cad_units_recommended"]) > 0
        assert "telemetry_link" in proto
        assert proto["cadence_bpm"] > 0


def test_fastapi_endpoints_medclear_and_pulse():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. MedClear Glossary
    res = client.get("/api/v1/cardiotwin/medclear/glossary")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["total_terms"] > 10

    # 2. MedClear Simplify Endpoint
    res_simp = client.post(
        "/api/v1/cardiotwin/medclear/simplify",
        json={"text": "Patient has severe dyspnea and tachycardia with angina.", "target_lang": "en", "link_twin": True},
    )
    assert res_simp.status_code == 200
    simp_data = res_simp.json()
    assert simp_data["status"] == "success"
    assert len(simp_data["detected_terms"]) >= 2
    assert len(simp_data["urgent_actions"]) >= 1

    # 3. Pulse 911 Protocols Endpoint
    res_proto = client.get("/api/v1/cardiotwin/pulse/protocols")
    assert res_proto.status_code == 200
    proto_data = res_proto.json()
    assert proto_data["status"] == "success"
    assert proto_data["total_protocols"] >= 5

    # 4. Pulse 911 Sub-10ms Query Endpoint
    res_query = client.post(
        "/api/v1/cardiotwin/pulse/query",
        json={"query": "Adult patient collapsed on the floor not breathing need cpr"},
    )
    assert res_query.status_code == 200
    q_data = res_query.json()
    assert q_data["status"] == "matched"
    assert q_data["is_sub_10ms"] is True
    assert q_data["retrieval_latency_ms"] < 10.0
    assert q_data["protocol"]["id"] == "CARD-01"

    # 5. Pulse 911 Latency Benchmark Endpoint
    res_bench = client.get("/api/v1/cardiotwin/pulse/benchmark")
    assert res_bench.status_code == 200
    bench_data = res_bench.json()
    assert bench_data["status"] == "completed"
    assert bench_data["in_memory_moss_engine"]["p50_latency_ms"] < 5.0
