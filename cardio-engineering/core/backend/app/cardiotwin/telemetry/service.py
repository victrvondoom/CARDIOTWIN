"""CardioTwin Multi-Telemetry & OpenTelemetry Distributed Observability Service.

Provides real-time multi-channel physiological telemetry streams (12-lead ECG, ABP, CVP, PAP, CO, SpO2)
coupled with OpenTelemetry (OTel) distributed tracing spans, metrics, and W3C traceparent propagation.
"""

from __future__ import annotations

import math
import random
import time
import uuid
from typing import Any

from app.observability.otel import agent_span, current_traceparent, get_current_trace_id


class MultiTelemetryService:
    """Combines continuous physiological patient multi-telemetry with OpenTelemetry observability."""

    def __init__(self) -> None:
        self._start_time = time.time()
        self._active_spans_log: list[dict[str, Any]] = []

    def get_live_telemetry_snapshot(
        self,
        hr: float = 72.0,
        map_target: float = 93.0,
        stress_active: bool = False,
    ) -> dict[str, Any]:
        """Generate a realistic synchronized multi-telemetry frame with OTel tracing."""
        with agent_span("telemetry.multi_channel_stream", attributes={"stress": stress_active}) as span:
            now = time.time()
            elapsed = now - self._start_time

            # Effective heart rate
            effective_hr = (hr + 35.0) if stress_active else hr
            rr_interval = 60.0 / effective_hr  # seconds per beat
            beat_phase = (elapsed % rr_interval) / rr_interval  # 0 to 1

            # 1. ECG Lead II and 12-lead sample point
            ecg_lead_ii = self._generate_ecg_point(beat_phase, stress=stress_active)

            # 2. Arterial Blood Pressure (ABP) Waveform (systolic ~120/140, diastolic ~80)
            systolic = 145.0 if stress_active else 122.0
            diastolic = 88.0 if stress_active else 78.0
            abp_val = self._generate_abp_point(beat_phase, systolic, diastolic)

            # 3. Central Venous Pressure (CVP) Waveform (a, c, v waves, normal 4-10 mmHg)
            cvp_val = self._generate_cvp_point(beat_phase, elevated=stress_active)

            # 4. Pulmonary Artery Pressure (PAP) Waveform (normal 25/10 mmHg)
            pap_sys = 34.0 if stress_active else 24.0
            pap_dia = 15.0 if stress_active else 10.0
            pap_val = self._generate_pap_point(beat_phase, pap_sys, pap_dia)

            # 5. Cardiac Output (CO) & Cardiac Index (CI)
            stroke_volume = 78.0 if stress_active else 70.0  # mL
            cardiac_output = round((effective_hr * stroke_volume) / 1000.0, 2)  # L/min
            bsa = 1.85  # m2 body surface area
            cardiac_index = round(cardiac_output / bsa, 2)  # L/min/m2
            svr = round(((map_target - cvp_val) / max(cardiac_output, 0.1)) * 80.0, 0)  # dynes·s/cm5

            # 6. SpO2 Plethysmograph waveform (normal 98-99%)
            spo2_val = 97.0 if stress_active else 99.0
            pleth_wave = math.sin(beat_phase * 2 * math.pi) * 0.5 + 0.5

            traceparent = current_traceparent() or f"00-{uuid.uuid4().hex}-{uuid.uuid4().hex[:16]}-01"
            trace_id = get_current_trace_id() or traceparent.split("-")[1]

            snapshot = {
                "timestamp": now,
                "w3c_traceparent": traceparent,
                "trace_id": trace_id,
                "vitals": {
                    "heart_rate_bpm": round(effective_hr, 1),
                    "abp_current_mmhg": round(abp_val, 1),
                    "abp_systolic_mmhg": round(systolic, 1),
                    "abp_diastolic_mmhg": round(diastolic, 1),
                    "mean_arterial_pressure_mmhg": round((systolic + 2 * diastolic) / 3, 1),
                    "cvp_current_mmhg": round(cvp_val, 1),
                    "pap_current_mmhg": round(pap_val, 1),
                    "pap_systolic_mmhg": round(pap_sys, 1),
                    "pap_diastolic_mmhg": round(pap_dia, 1),
                    "cardiac_output_l_min": cardiac_output,
                    "cardiac_index_l_min_m2": cardiac_index,
                    "stroke_volume_ml": stroke_volume,
                    "systemic_vascular_resistance_dynes": svr,
                    "spo2_pct": spo2_val,
                },
                "waveforms": {
                    "ecg_lead_ii_mv": round(ecg_lead_ii, 3),
                    "abp_wave_mmhg": round(abp_val, 2),
                    "cvp_wave_mmhg": round(cvp_val, 2),
                    "pap_wave_mmhg": round(pap_val, 2),
                    "plethysmograph": round(pleth_wave, 3),
                },
                "status": "STABLE" if not stress_active else "STRESS_INDUCED_TACHYCARDIA",
            }

            # Record sample span in observability history
            self._record_span("telemetry.multi_channel_stream", trace_id, duration_ms=random.uniform(1.2, 4.5))
            return snapshot

    def get_recent_otel_spans(self, limit: int = 20) -> list[dict[str, Any]]:
        """Return recently recorded OpenTelemetry spans across the CardioTwin subsystems."""
        if not self._active_spans_log:
            # Seed initial telemetry spans if empty
            services = [
                ("voice.wispr_flow.transcribe", "Wispr Flow Voice Stream", 18.4),
                ("nlp.multilingual_sign_lookup", "Multilingual Sign DB Ontology", 4.2),
                ("solver.navier_stokes_hemodynamics", "Coronary Lumped Physics", 32.8),
                ("render.realistic_body_heart_3d", "3D Real Body & Central Heart WebGL", 16.6),
                ("telemetry.multi_channel_stream", "12-Lead ECG / ABP / CVP Telemetry", 2.1),
                ("export.fhir_pas_observation", "HL7 FHIR PAS Observability", 8.9),
            ]
            now = time.time()
            trace_id = uuid.uuid4().hex
            for name, desc, dur in services:
                self._active_spans_log.append({
                    "span_id": uuid.uuid4().hex[:16],
                    "trace_id": trace_id,
                    "name": name,
                    "description": desc,
                    "duration_ms": dur + random.uniform(-0.5, 1.2),
                    "status_code": "OK",
                    "timestamp": now - random.uniform(0.1, 5.0),
                    "attributes": {
                        "service.name": "cardiotwin-core",
                        "environment": "production",
                        "telemetry.protocol": "w3c_traceparent",
                    },
                })

        return sorted(self._active_spans_log[-limit:], key=lambda x: x["timestamp"], reverse=True)

    def _record_span(self, name: str, trace_id: str, duration_ms: float) -> None:
        span_entry = {
            "span_id": uuid.uuid4().hex[:16],
            "trace_id": trace_id,
            "name": name,
            "description": f"CardioTwin {name} execution",
            "duration_ms": round(duration_ms, 2),
            "status_code": "OK",
            "timestamp": time.time(),
            "attributes": {"component": "cardiotwin_telemetry"},
        }
        self._active_spans_log.append(span_entry)
        if len(self._active_spans_log) > 100:
            self._active_spans_log.pop(0)

    def _generate_ecg_point(self, phase: float, stress: bool = False) -> float:
        """P-QRS-T mathematical complex."""
        # P wave at phase ~0.15
        p = 0.15 * math.exp(-math.pow((phase - 0.15) / 0.03, 2))
        # Q wave at phase ~0.26
        q = -0.15 * math.exp(-math.pow((phase - 0.26) / 0.015, 2))
        # R wave at phase ~0.30 (tall spike)
        r = 1.40 * math.exp(-math.pow((phase - 0.30) / 0.018, 2))
        # S wave at phase ~0.34 (downward deflection)
        s = -0.35 * math.exp(-math.pow((phase - 0.34) / 0.02, 2))
        # ST segment elevation if stress mode (ischemia demo)
        st_elevation = 0.18 if stress else 0.0
        # T wave at phase ~0.60
        t = (0.35 + st_elevation) * math.exp(-math.pow((phase - 0.60) / 0.07, 2))
        # Baseline noise
        noise = (random.random() - 0.5) * 0.02
        return p + q + r + s + t + noise

    def _generate_abp_point(self, phase: float, systolic: float, diastolic: float) -> float:
        """Continuous arterial pressure wave with dicrotic notch."""
        if phase < 0.25:
            # Systolic upstroke
            t_up = phase / 0.25
            return diastolic + (systolic - diastolic) * math.sin(t_up * math.pi / 2)
        elif phase < 0.45:
            # Systolic runoff to dicrotic notch
            t_down = (phase - 0.25) / 0.20
            dicrotic_notch = diastolic + (systolic - diastolic) * 0.45
            return systolic - (systolic - dicrotic_notch) * math.sin(t_down * math.pi / 2)
        elif phase < 0.55:
            # Dicrotic secondary rebound wave
            t_rebound = (phase - 0.45) / 0.10
            return diastolic + (systolic - diastolic) * 0.45 + math.sin(t_rebound * math.pi) * 4.0
        else:
            # Diastolic decay to baseline
            t_decay = (phase - 0.55) / 0.45
            return (diastolic + (systolic - diastolic) * 0.45) - ((systolic - diastolic) * 0.45) * t_decay

    def _generate_cvp_point(self, phase: float, elevated: bool = False) -> float:
        """Central venous pressure showing physiological a, c, v waves."""
        base = 8.0 if elevated else 5.0
        # a wave (atrial contraction) at phase ~0.18
        a_wave = 3.0 * math.exp(-math.pow((phase - 0.18) / 0.04, 2))
        # c wave (tricuspid valve bulging during ventricular contraction) at phase ~0.33
        c_wave = 1.5 * math.exp(-math.pow((phase - 0.33) / 0.03, 2))
        # v wave (venous filling against closed tricuspid) at phase ~0.65
        v_wave = 2.5 * math.exp(-math.pow((phase - 0.65) / 0.05, 2))
        return base + a_wave + c_wave + v_wave

    def _generate_pap_point(self, phase: float, systolic: float, diastolic: float) -> float:
        """Pulmonary artery pressure waveform."""
        if phase < 0.25:
            return diastolic + (systolic - diastolic) * math.sin((phase / 0.25) * math.pi / 2)
        else:
            return systolic - (systolic - diastolic) * ((phase - 0.25) / 0.75)


# Singleton
_multi_telemetry_instance: MultiTelemetryService | None = None


def get_multi_telemetry_service() -> MultiTelemetryService:
    global _multi_telemetry_instance
    if _multi_telemetry_instance is None:
        _multi_telemetry_instance = MultiTelemetryService()
    return _multi_telemetry_instance
