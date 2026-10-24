"""FastAPI router for Wispr Flow Voice Workflow."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.cardiotwin.voice.service import get_wispr_flow_service

router = APIRouter(prefix="/voice", tags=["cardiotwin_voice"])


class VoiceCommandRequest(BaseModel):
    transcript: str = Field(..., description="Transcribed voice text")
    language: str = Field(default="en", description="Language code")


class SoapGenerationRequest(BaseModel):
    transcript: str = Field(..., description="Dictated clinical encounter notes")
    language: str = Field(default="en", description="Language code")
    patient_name: str = Field(default="CardioTwin Patient 001", description="Patient identifier")


@router.get("/languages", summary="Get supported languages for Wispr Flow voice")
async def get_languages() -> dict[str, Any]:
    svc = get_wispr_flow_service()
    return {"languages": svc.get_supported_languages()}


@router.post("/command", summary="Interpret spoken command into 3D twin actions")
async def parse_command(req: VoiceCommandRequest) -> dict[str, Any]:
    svc = get_wispr_flow_service()
    res = svc.parse_voice_command(transcript=req.transcript, lang=req.language)
    return {"status": "success", **res}


@router.post("/soap-generate", summary="Generate structured clinical SOAP note from dictation")
async def generate_soap(req: SoapGenerationRequest) -> dict[str, Any]:
    svc = get_wispr_flow_service()
    note = svc.generate_clinical_soap(
        transcript=req.transcript,
        lang=req.language,
        patient_name=req.patient_name,
    )
    return {"status": "success", "soap_note": note}
