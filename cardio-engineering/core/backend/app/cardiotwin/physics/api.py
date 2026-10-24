"""FastAPI router for CardioTwin Multiscale Biophysics & Multicellular Electromechanics."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.cardiotwin.physics.biophysics_engine import get_biophysics_engine

router = APIRouter(prefix="/physics", tags=["cardiotwin_physics"])


class MultilingualTalkRequest(BaseModel):
    vessel_id: str = Field(default="LAD", description="Coronary target (LAD, LCX, RCA)")
    stenosis_pct: float = Field(default=75.0, ge=0.0, le=95.0, description="Stenosis percentage")
    ischemia_severity: float = Field(default=0.7, ge=0.0, le=1.0, description="Cellular ischemia degree")
    language: str = Field(default="en", description="Language code (en, hi, es, zh, fr, de, ar)")
    persona: str = Field(default="doctor", description="Target persona: 'doctor', 'nurse', or 'patient'")


@router.get("/simulate", summary="Solve Navier-Stokes coronary hemodynamics")
async def simulate_hemodynamics(
    vessel: str = Query("LAD", description="Vessel identifier (LAD, LCX, RCA)"),
    stenosis: float = Query(70.0, ge=0.0, le=95.0, description="Stenosis percentage"),
    map_target: float = Query(93.3, description="Mean aortic pressure in mmHg"),
    stress: bool = Query(False, description="Hyperemic stress state"),
) -> dict[str, Any]:
    engine = get_biophysics_engine()
    res = engine.solve_navier_stokes_hemodynamics(
        vessel_id=vessel,
        stenosis_pct=stenosis,
        mean_aortic_pressure_mmhg=map_target,
        hyperemic_stress=stress,
    )
    return {"status": "success", "hemodynamics": res.to_dict()}


@router.get("/cellular", summary="Simulate multicellular cardiomyocyte electromechanics")
async def simulate_cellular(
    ischemia: float = Query(0.0, ge=0.0, le=1.0, description="Cellular ischemia severity"),
    hr: float = Query(72.0, ge=40.0, le=220.0, description="Heart rate in bpm"),
) -> dict[str, Any]:
    engine = get_biophysics_engine()
    cell = engine.simulate_cellular_electromechanics(
        ischemia_severity=ischemia,
        heart_rate_bpm=hr,
    )
    return {"status": "success", "cellular_electromechanics": cell.to_dict()}


@router.post("/multilingual-talk", summary="Generate multilingual physics explanation")
async def generate_physics_talk(req: MultilingualTalkRequest) -> dict[str, Any]:
    engine = get_biophysics_engine()
    hemo = engine.solve_navier_stokes_hemodynamics(
        vessel_id=req.vessel_id,
        stenosis_pct=req.stenosis_pct,
    )
    cell = engine.simulate_cellular_electromechanics(
        ischemia_severity=req.ischemia_severity,
    )
    talk = engine.generate_multilingual_physics_talk(
        hemo=hemo,
        cell=cell,
        lang=req.language,
        persona=req.persona,
    )
    return {
        "status": "success",
        "talk": talk,
        "hemodynamics": hemo.to_dict(),
        "cellular": cell.to_dict(),
    }
