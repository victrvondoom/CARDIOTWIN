"""Wispr Flow Voice Workflow Service for CardioTwin.

Implements high-speed multilingual clinical dictation, SOAP note synthesis,
and hands-free voice command interpretation to manipulate the 3D body & cardiac digital twin.
Instrumented with OpenTelemetry trace context propagation.
"""

from __future__ import annotations

import re
import time
import uuid
from typing import Any

from app.cardiotwin.signs.database import get_multilingual_signs_db
from app.observability.otel import agent_span, current_traceparent


class WisprFlowService:
    """Core Wispr Flow Multilingual Voice Workflow engine."""

    SUPPORTED_LANGUAGES = [
        {"code": "en", "name": "English", "native": "English", "flag": "🇺🇸"},
        {"code": "es", "name": "Spanish", "native": "Español", "flag": "🇪🇸"},
        {"code": "hi", "name": "Hindi", "native": "हिन्दी", "flag": "🇮🇳"},
        {"code": "zh", "name": "Mandarin", "native": "中文", "flag": "🇨🇳"},
        {"code": "fr", "name": "French", "native": "Français", "flag": "🇫🇷"},
        {"code": "de", "name": "German", "native": "Deutsch", "flag": "🇩🇪"},
        {"code": "ar", "name": "Arabic", "native": "العربية", "flag": "🇸🇦"},
        {"code": "ja", "name": "Japanese", "native": "日本語", "flag": "🇯🇵"},
    ]

    COMMAND_PATTERNS = [
        # Real Body / Centralized Heart Views
        (r"(show|view|switch to)?.*(real body|full body|patient body|body view)", "VIEW_REAL_BODY", {}),
        (r"(show|view|switch to)?.*(heart|central heart|cardiac core|close up heart)", "VIEW_HEART_CORE", {}),
        (r"(show|view|switch to)?.*(chest|thorax|thoracic view|ribcage)", "VIEW_THORAX", {}),

        # Vessel Isolations
        (r"(isolate|highlight|show|focus on)?.*(lad|left anterior descending)", "ISOLATE_VESSEL", {"vessel": "LAD"}),
        (r"(isolate|highlight|show|focus on)?.*(rca|right coronary artery)", "ISOLATE_VESSEL", {"vessel": "RCA"}),
        (r"(isolate|highlight|show|focus on)?.*(lcx|circumflex|left circumflex)", "ISOLATE_VESSEL", {"vessel": "LCX"}),
        (r"(isolate|highlight|show|focus on)?.*(aorta|aortic arch)", "ISOLATE_VESSEL", {"vessel": "AORTA"}),

        # Stress Test & Simulation
        (r"(start|trigger|run|simulate)?.*(stress test|exercise stress|tachycardia)", "TRIGGER_STRESS_TEST", {"target_hr": 135}),
        (r"(reset|baseline|stop stress|normal rhythm)", "RESET_BASELINE", {}),

        # Multilingual command forms (Hindi / Spanish / French)
        (r"(lad|एलएडी).*दिखाओ|दिखाइए", "ISOLATE_VESSEL", {"vessel": "LAD"}),
        (r"(शरीर|पूरा शरीर).*दिखाओ", "VIEW_REAL_BODY", {}),
        (r"(दिल|हृदय).*दिखाओ", "VIEW_HEART_CORE", {}),
        (r"(mostrar|ver)?.*(cuerpo entero|cuerpo del paciente)", "VIEW_REAL_BODY", {}),
        (r"(mostrar|aislar)?.*(arteria coronaria descendente anterior|lad)", "ISOLATE_VESSEL", {"vessel": "LAD"}),
        (r"(montrer|voir)?.*(corps entier|corps du patient)", "VIEW_REAL_BODY", {}),
    ]

    def __init__(self) -> None:
        self._signs_db = get_multilingual_signs_db()

    def get_supported_languages(self) -> list[dict[str, str]]:
        return self.SUPPORTED_LANGUAGES

    def parse_voice_command(self, transcript: str, lang: str = "en") -> dict[str, Any]:
        """Parse natural spoken voice command into structured twin action."""
        clean_text = transcript.strip().lower()
        matched_action = None
        matched_params: dict[str, Any] = {}

        for pattern, action, params in self.COMMAND_PATTERNS:
            if re.search(pattern, clean_text, re.IGNORECASE):
                matched_action = action
                matched_params = params.copy()
                break

        if not matched_action:
            # Default action: search signs and update twin physiology
            sign_res = self._signs_db.resolve_spoken_utterance(transcript, lang=lang)
            matched_action = "UPDATE_TWIN_PHYSIOLOGY"
            matched_params = sign_res

        return {
            "transcript": transcript,
            "language": lang,
            "action": matched_action,
            "parameters": matched_params,
            "traceparent": current_traceparent(),
            "timestamp": time.time(),
        }

    def generate_clinical_soap(self, transcript: str, lang: str = "en", patient_name: str = "Demo Patient") -> dict[str, Any]:
        """Generate a structured clinical SOAP note from dictation using multilingual sign linkage."""
        with agent_span("voice.wispr_flow.soap_generation", attributes={"language": lang}) as span:
            span.set_attribute("transcript_len", len(transcript))
            sign_res = self._signs_db.resolve_spoken_utterance(transcript, lang=lang)
            matched_signs = sign_res.get("matched_signs", [])

            # Extract Subjective symptoms
            symptoms = [s["canonical_term"] for s in matched_signs if s["category"] == "symptom"]
            if not symptoms:
                symptoms = ["Patient presents for cardiovascular risk evaluation."]

            # Extract Physical exam signs
            signs = [s["canonical_term"] for s in matched_signs if s["category"] in ("physical_exam", "vital_sign")]
            if not signs:
                signs = ["Bilateral vesicular breath sounds, no frank peripheral edema noted."]

            # Calculate Assessment from prior weights
            priors = sign_res.get("aggregate_hemodynamic_impact", {}).get("coronary_risk_priors", {})
            lad_risk = priors.get("LAD", 0.45)
            risk_category = "High CAD Probability (LAD Dominant)" if lad_risk > 0.70 else "Moderate Cardiovascular Risk"

            soap_note = {
                "id": f"soap_{uuid.uuid4().hex[:10]}",
                "patient": patient_name,
                "language": lang,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "subjective": (
                    f"Patient reports symptoms consistent with: {', '.join(symptoms)}. "
                    f"Original patient dictation: \"{transcript}\""
                ),
                "objective": (
                    f"Physical examination and multi-telemetry signs: {', '.join(signs)}. "
                    f"ECG: Sinus rhythm with telemetry rate adaptation. "
                    f"Estimated Delta MAP: {sign_res['aggregate_hemodynamic_impact']['delta_map_mmhg']} mmHg, "
                    f"Delta EF: {sign_res['aggregate_hemodynamic_impact']['delta_ef_pct']}%."
                ),
                "assessment": (
                    f"{risk_category}. Calibrated 3D digital twin indicates LAD risk of {lad_risk*100:.1f}%, "
                    f"LCX risk of {priors.get('LCX', 0.4)*100:.1f}%, RCA risk of {priors.get('RCA', 0.38)*100:.1f}%. "
                    f"Linked SNOMED-CT codes: {', '.join([s['snomed_ct'] for s in matched_signs]) or '225566008'}."
                ),
                "plan": (
                    "1. Correlate with 12-lead ECG telemetry stream.\n"
                    "2. Run counterfactual exercise stress simulation in 3D twin.\n"
                    "3. Optimize guideline-directed medical therapy (GDMT).\n"
                    "4. Heart team consensus review before invasive angiography."
                ),
                "matched_snomed_codes": [s["snomed_ct"] for s in matched_signs],
                "matched_icd10_codes": [s["icd10"] for s in matched_signs],
                "w3c_traceparent": current_traceparent(),
            }
            return soap_note


# Singleton
_wispr_flow_instance: WisprFlowService | None = None


def get_wispr_flow_service() -> WisprFlowService:
    global _wispr_flow_instance
    if _wispr_flow_instance is None:
        _wispr_flow_instance = WisprFlowService()
    return _wispr_flow_instance
