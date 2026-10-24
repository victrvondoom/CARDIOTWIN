"""Cardio Intelligence TwinOS — FastAPI Endpoints.

Mounted at /api/v1/cardiotwin/twinos.
Exposes endpoints for continuously updated cardiovascular digital twins,
wearable drift / staleness detection, split-conformal risk forecasts,
ECHO/HYPERGRID dependency recalculation, and clinician alerts.
"""

from __future__ import annotations

from typing import Any
import structlog
from fastapi import APIRouter, HTTPException, Query

from app.cardiotwin.twinos.engine import get_twinos_engine
from app.cardiotwin.twinos.schema import (
    AlertAckRequest,
    ClinicianAlert,
    RecalculateRequest,
    SimulateStreamRequest,
    StalenessEvaluation,
    TwinPatientProfile,
    YcThemeIntegrationItem,
)

log = structlog.get_logger()
router = APIRouter(prefix="/twinos", tags=["cardiotwin_twinos"])


@router.get("/patients")
async def list_twin_patients() -> list[dict[str, Any]]:
    """Lists all monitored twin patients with risk indicators and staleness status."""
    engine = get_twinos_engine()
    return engine.list_patients()


@router.get("/patient/{patient_id}")
async def get_twin_patient(patient_id: str) -> TwinPatientProfile:
    """Returns the comprehensive digital twin for a given patient."""
    engine = get_twinos_engine()
    patient = engine.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


@router.post("/evaluate-staleness")
async def evaluate_staleness(
    baseline_hr: float = Query(64.0),
    current_hr: float = Query(78.0),
    baseline_rmssd: float = Query(43.0),
    current_rmssd: float = Query(24.6),
    baseline_spo2_nadir: float = Query(94.5),
    current_spo2_nadir: float = Query(87.0),
    baseline_deep_sleep_min: float = Query(78.0),
    current_deep_sleep_min: float = Query(33.0),
    hours_elapsed: float = Query(72.0),
) -> StalenessEvaluation:
    """Evaluates whether changing wearable measurements make an earlier risk assessment outdated."""
    engine = get_twinos_engine()
    return engine.evaluate_staleness(
        baseline_hr=baseline_hr,
        current_hr=current_hr,
        baseline_rmssd=baseline_rmssd,
        current_rmssd=current_rmssd,
        baseline_spo2_nadir=baseline_spo2_nadir,
        current_spo2_nadir=current_spo2_nadir,
        baseline_deep_sleep_min=baseline_deep_sleep_min,
        current_deep_sleep_min=current_deep_sleep_min,
        hours_elapsed=hours_elapsed,
    )


@router.post("/recalculate")
async def recalculate_twin(req: RecalculateRequest) -> TwinPatientProfile:
    """Executes ECHO / HYPERGRID dependency-aware recomputation for a patient twin."""
    engine = get_twinos_engine()
    try:
        return engine.recalculate_patient_twin(
            patient_id=req.patient_id,
            reason=req.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/simulate-stream")
async def simulate_stream(req: SimulateStreamRequest) -> TwinPatientProfile:
    """Injects a synthetic wearable packet (decompensation, apnea, arrhythmia, recovery, baseline).

    Notices when changing wearable data makes an earlier assessment outdated,
    automatically recomputes the assessment, and alerts the clinician.
    """
    engine = get_twinos_engine()
    try:
        return engine.simulate_telemetry_stream(
            patient_id=req.patient_id,
            scenario=req.scenario,
            auto_recompute=req.auto_trigger_recomputation,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/ack-alert")
async def acknowledge_alert(req: AlertAckRequest) -> ClinicianAlert:
    """Records clinician acknowledgment and action on an evidence-aware alert."""
    engine = get_twinos_engine()
    try:
        return engine.acknowledge_alert(
            alert_id=req.alert_id,
            clinician_name=req.clinician_name,
            action_taken=req.action_taken,
            clinical_notes=req.clinical_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/fhir/{patient_id}")
async def export_fhir(patient_id: str) -> dict[str, Any]:
    """Exports agent-ready FHIR R4 Bundle with RiskAssessment, Observations, and ECHO Provenance."""
    engine = get_twinos_engine()
    try:
        return engine.export_fhir_r4_bundle(patient_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/themes-mapping")
async def get_yc_themes() -> list[YcThemeIntegrationItem]:
    """Returns the architectural mapping connecting the 5 YC Summer 2026 themes into TwinOS."""
    engine = get_twinos_engine()
    return engine.get_yc_themes_mapping()
