"""FastAPI router for CardioTwin Multilingual Signs Database & AI Novelty."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.cardiotwin.signs.database import get_multilingual_signs_db

router = APIRouter(prefix="/signs", tags=["cardiotwin_multilingual_signs"])


class SearchSignsRequest(BaseModel):
    query: str = Field(..., description="Search term, symptom, sign, colloquialism, or code")
    lang: str = Field(default="en", description="ISO 639-1 language code (e.g. en, es, hi, zh, fr, de, ar)")


class ResolveUtteranceRequest(BaseModel):
    utterance: str = Field(..., description="Spoken patient or physician transcript")
    lang: str = Field(default="en", description="Language of the transcript")


@router.get("", summary="List all multilingual cardiovascular signs")
async def list_signs() -> dict[str, Any]:
    """Return all cardiovascular signs with multilingual mappings and hemodynamic vectors."""
    db = get_multilingual_signs_db()
    signs = [s.to_dict() for s in db.get_all()]
    return {
        "status": "success",
        "total_signs": len(signs),
        "supported_languages": ["en", "es", "hi", "zh", "fr", "de", "ar", "ja"],
        "signs": signs,
    }


@router.get("/novelty-brief", summary="AI Novelty and Clinical Significance Brief")
async def get_novelty_brief() -> dict[str, Any]:
    """Return structured explanation of how the multilingual signs database drives AI novelty."""
    return {
        "title": "Significance of Multilingual Signs Database in CardioTwin AI Novelty",
        "core_thesis": (
            "A structured multilingual clinical signs database fundamentally establishes AI novelty by providing "
            "deterministic cross-lingual semantic grounding, transforming colloquial acoustic voice tokens directly into "
            "mathematical Navier-Stokes boundary conditions for the 3D cardiovascular digital twin without Anglo-centric bias "
            "or LLM translation hallucinations."
        ),
        "key_pillars": [
            {
                "pillar": "Zero-Shot Cross-Lingual Clinical Phenotyping",
                "problem": "Current medical LLMs suffer from heavy Anglo-centric training bias, misinterpreting or losing nuances in colloquial non-English cardiovascular expressions (e.g. Hindi 'छाती में भारीपन' or Spanish 'pecho apretado').",
                "solution": "CardioTwin's sign database bridges vernacular idioms directly to standardized SNOMED-CT (225566008) and ICD-10 ontologies, preserving clinical semantic density.",
            },
            {
                "pillar": "Acoustic-to-Physiological Vector Embedding",
                "problem": "Standard voice assistants only output plain text without linking to physical simulations.",
                "solution": "Every multilingual sign maps to a quantitative HemodynamicVector (delta HR, delta MAP, delta LVEDP, and coronary branch resistance multipliers), driving live 3D twin deformations in real time.",
            },
            {
                "pillar": "SaMD & FDA Regulatory Explainability",
                "problem": "Black-box AI translations cannot be audited or certified under FDA Software as a Medical Device (SaMD) or EU MDR standards.",
                "solution": "Deterministic, versioned ontological mappings provide cryptographic audit trails and verifiable provenance from spoken words to patient risk predictions.",
            },
            {
                "pillar": "Patient-Centric Global Health Equity",
                "problem": "Non-English speaking patients face communicative barriers in acute triage and cardiovascular care.",
                "solution": "Patients speak in their native tongue (Hindi, Spanish, Arabic, etc.); the system updates the centralized 3D twin, generates dual-language SOAP notes, and explains hemodynamic risk in the patient's language.",
            },
        ],
    }


@router.get("/{sign_id}", summary="Get sign by ID")
async def get_sign(sign_id: str) -> dict[str, Any]:
    """Retrieve specific sign details."""
    db = get_multilingual_signs_db()
    sign = db.get_by_id(sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail=f"Sign with id '{sign_id}' not found")
    return {"status": "success", "sign": sign.to_dict()}


@router.post("/search", summary="Search signs across languages")
async def search_signs(req: SearchSignsRequest) -> dict[str, Any]:
    """Search signs with fuzzy matching across languages and colloquialisms."""
    db = get_multilingual_signs_db()
    results = db.search(query=req.query, lang=req.lang)
    return {
        "status": "success",
        "query": req.query,
        "language": req.lang,
        "results_count": len(results),
        "results": results,
    }


@router.post("/resolve-utterance", summary="Resolve voice utterance to signs and twin vector")
async def resolve_utterance(req: ResolveUtteranceRequest) -> dict[str, Any]:
    """Extract clinical signs from voice dictation and calculate twin hemodynamic impact."""
    db = get_multilingual_signs_db()
    resolution = db.resolve_spoken_utterance(utterance=req.utterance, lang=req.lang)
    return {"status": "success", **resolution}
