"""Unit and integration tests for CardioTwin Multilingual Signs, Wispr Flow Voice, and OpenTelemetry Multi-Telemetry."""

import pytest
from app.cardiotwin.signs.database import get_multilingual_signs_db, MultilingualSignDB
from app.cardiotwin.voice.service import get_wispr_flow_service, WisprFlowService
from app.cardiotwin.telemetry.service import get_multi_telemetry_service, MultiTelemetryService


class TestMultilingualSignsDB:
    def test_database_seeding(self):
        db = get_multilingual_signs_db()
        signs = db.get_all()
        assert len(signs) >= 5
        ids = [s.id for s in signs]
        assert "sign_angina_substernal" in ids
        assert "sign_dyspnea_exertion" in ids

    def test_cross_lingual_search(self):
        db = get_multilingual_signs_db()
        # Hindi search
        hi_results = db.search("छाती", lang="hi")
        assert len(hi_results) >= 1
        assert "sign_angina_substernal" in [r["id"] for r in hi_results]

        # Spanish search
        es_results = db.search("pecho", lang="es")
        assert len(es_results) >= 1

        # Code search
        snomed_results = db.search("225566008")
        assert len(snomed_results) >= 1
        assert snomed_results[0]["id"] == "sign_angina_substernal"

    def test_spoken_utterance_resolution(self):
        db = get_multilingual_signs_db()
        res = db.resolve_spoken_utterance("patient has severe tightness in chest and pressure", lang="en")
        assert res["matched_count"] >= 1
        impact = res["aggregate_hemodynamic_impact"]
        assert impact["delta_hr_bpm"] > 0
        assert "LAD" in impact["coronary_risk_priors"]


class TestWisprFlowVoiceService:
    def test_voice_command_parsing(self):
        svc = get_wispr_flow_service()
        # Real body command
        cmd1 = svc.parse_voice_command("show real body view", lang="en")
        assert cmd1["action"] == "VIEW_REAL_BODY"

        # Heart core command
        cmd2 = svc.parse_voice_command("center on heart", lang="en")
        assert cmd2["action"] == "VIEW_HEART_CORE"

        # Vessel isolation
        cmd3 = svc.parse_voice_command("isolate left anterior descending artery", lang="en")
        assert cmd3["action"] == "ISOLATE_VESSEL"
        assert cmd3["parameters"]["vessel"] == "LAD"

        # Stress test
        cmd4 = svc.parse_voice_command("trigger exercise stress test", lang="en")
        assert cmd4["action"] == "TRIGGER_STRESS_TEST"

    def test_soap_note_generation(self):
        svc = get_wispr_flow_service()
        transcript = "Patient reports retrosternal chest tightness radiating to jaw with dyspnea."
        soap = svc.generate_clinical_soap(transcript, lang="en", patient_name="Test Patient 42")
        assert soap["patient"] == "Test Patient 42"
        assert "Subjective" in soap["subjective"] or "Patient" in soap["subjective"]
        assert "Assessment" in soap["assessment"] or "risk" in soap["assessment"].lower()
        assert len(soap["matched_snomed_codes"]) >= 1


class TestMultiTelemetryService:
    def test_live_stream_snapshot(self):
        svc = get_multi_telemetry_service()
        snap = svc.get_live_telemetry_snapshot(hr=75.0, map_target=95.0, stress_active=False)
        assert "vitals" in snap
        assert "waveforms" in snap
        assert snap["vitals"]["heart_rate_bpm"] == 75.0
        assert "ecg_lead_ii_mv" in snap["waveforms"]
        assert "abp_wave_mmhg" in snap["waveforms"]
        assert "cvp_wave_mmhg" in snap["waveforms"]
        assert "w3c_traceparent" in snap

    def test_stress_mode_telemetry(self):
        svc = get_multi_telemetry_service()
        snap_stress = svc.get_live_telemetry_snapshot(hr=70.0, stress_active=True)
        assert snap_stress["vitals"]["heart_rate_bpm"] > 70.0
        assert snap_stress["status"] == "STRESS_INDUCED_TACHYCARDIA"

    def test_opentelemetry_spans(self):
        svc = get_multi_telemetry_service()
        spans = svc.get_recent_otel_spans(limit=5)
        assert len(spans) >= 1
        for s in spans:
            assert "span_id" in s
            assert "duration_ms" in s
            assert "status_code" in s


class TestCardioTwinSandboxAgent:
    def test_sandbox_talk_biophysics_invocation(self):
        from app.cardiotwin.sandbox.agent import default_sandbox_agent

        msg = default_sandbox_agent.talk(
            user_message="What is my FFR if LAD has 85% stenosis?",
            session_id="test_session_1",
            persona="doctor",
        )
        assert msg.role == "agent"
        assert len(msg.thoughts) >= 3
        assert len(msg.tools_executed) >= 1
        tools = [t.tool_name for t in msg.tools_executed]
        assert "run_navier_stokes_ffr" in tools
        assert "simulate_cardiomyocyte_ap" in tools
        assert msg.traceparent.startswith("00-")

        # Verify sandbox state was updated
        state = default_sandbox_agent.get_or_create_state("test_session_1")
        assert state.target_vessel == "LAD"
        assert state.stenosis_pct == 85.0
        assert state.ffr < 0.80  # Ischemic at 85%

    def test_sandbox_multilingual_patient_mode(self):
        from app.cardiotwin.sandbox.agent import default_sandbox_agent

        msg = default_sandbox_agent.talk(
            user_message="छाती में दर्द है (severe chest pain)",
            session_id="test_session_hi",
            language="hi",
            persona="patient",
        )
        assert msg.role == "agent"
        assert msg.language == "hi"
        assert msg.persona == "patient"
        assert "नमस्ते" in msg.content or "कार्डियो" in msg.content

    def test_sandbox_reset(self):
        from app.cardiotwin.sandbox.agent import default_sandbox_agent

        default_sandbox_agent.talk(
            user_message="LAD 90% stenosis",
            session_id="test_reset_session",
        )
        reset_state = default_sandbox_agent.reset_sandbox("test_reset_session")
        assert reset_state.stenosis_pct == 75.0
        assert len(default_sandbox_agent.get_conversation("test_reset_session")) == 0

    def test_sandbox_api_endpoints(self):
        from fastapi.testclient import TestClient
        from app.api.cardiotwin import router
        from fastapi import FastAPI

        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        # 1. Talk to agent
        res = client.post(
            "/cardiotwin/sandbox/talk",
            json={
                "message": "Calculate FFR for LCX with 70% stenosis",
                "session_id": "api_test_session",
                "language": "en",
                "persona": "doctor",
                "state_overrides": {"target_vessel": "LCX", "stenosis_pct": 70.0},
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "reply" in data
        assert len(data["thoughts"]) >= 1
        assert "sandbox_state" in data
        assert data["sandbox_state"]["target_vessel"] == "LCX"

        # 2. Get state
        res_state = client.get("/cardiotwin/sandbox/state?session_id=api_test_session")
        assert res_state.status_code == 200
        assert res_state.json()["sandbox_state"]["target_vessel"] == "LCX"

        # 3. Get conversation
        res_conv = client.get("/cardiotwin/sandbox/conversation?session_id=api_test_session")
        assert res_conv.status_code == 200
        assert len(res_conv.json()["messages"]) >= 2

        # 4. Reset
        res_reset = client.post("/cardiotwin/sandbox/reset", json={"session_id": "api_test_session"})
        assert res_reset.status_code == 200
        assert res_reset.json()["status"] == "success"


