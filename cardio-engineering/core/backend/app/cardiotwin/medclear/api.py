"""FastAPI router for MedClear AI Plain-Language Simplifier & Patient Advocacy."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.cardiotwin.medclear.engine import get_medclear_engine

router = APIRouter(prefix="/medclear", tags=["cardiotwin_medclear_ai"])


class SimplifyRequest(BaseModel):
    text: str = Field(..., description="Clinical note, discharge summary, or doctor diagnosis")
    target_lang: str = Field(default="en", description="Target language: 'en' (English) or 'es' (Spanish)")
    link_twin: bool = Field(default=True, description="Whether to compute projected hemodynamic twin impact")


class BatchSimplifyRequest(BaseModel):
    notes: list[str] = Field(..., description="Array of clinical text strings to process")
    target_lang: str = Field(default="en")


@router.post("/simplify", summary="Translate dense clinical report into plain language")
async def simplify_clinical_text(req: SimplifyRequest) -> dict[str, Any]:
    """Analyze clinical report, inject plain-language explanations, and generate actionable triage checklist."""
    engine = get_medclear_engine()
    res = engine.simplify(text=req.text, target_lang=req.target_lang, link_twin=req.link_twin)
    return {
        "status": "success",
        "original_length": res.original_length,
        "target_lang": res.target_lang,
        "simplified_text": res.simplified_text,
        "detected_terms_count": len(res.detected_terms),
        "detected_terms": res.detected_terms,
        "urgent_actions": res.urgent_actions,
        "monitoring_actions": res.monitoring_actions,
        "routine_actions": res.routine_actions,
        "hemodynamic_twin_projection": res.hemodynamic_vector_summary,
    }


@router.get("/glossary", summary="Browse clinical dictionary")
async def get_glossary(
    category: str | None = Query(default=None, description="Optional category filter: cardiovascular, pulmonary, metabolic, general"),
    severity: str | None = Query(default=None, description="Optional severity filter: urgent, moderate, routine"),
) -> dict[str, Any]:
    """Retrieve all plain-language clinical terms with SNOMED-CT and ICD-10 codes."""
    engine = get_medclear_engine()
    items = []
    for term, data in engine.glossary.items():
        if category and data["category"] != category:
            continue
        if severity and data["severity"] != severity:
            continue
        items.append({
            "term": term,
            "plain_en": data["plain_en"],
            "plain_es": data["plain_es"],
            "category": data["category"],
            "severity": data["severity"],
            "snomed_ct": data["snomed"],
            "icd10": data["icd10"],
        })
    return {
        "status": "success",
        "total_terms": len(items),
        "glossary": items,
    }


@router.get("/stats", summary="MedClear platform integration status")
async def get_medclear_stats() -> dict[str, Any]:
    """Return health and integration metrics for MedClear AI inside CardioTwin."""
    engine = get_medclear_engine()
    return {
        "status": "active",
        "version": "2.4.0",
        "glossary_terms_count": len(engine.glossary),
        "supported_languages": ["en", "es"],
        "integrated_subsystems": [
            "CardioTwin 3D Patient Mode",
            "Wispr Flow Multilingual Voice Bar",
            "FastAPI Unified Clinical Gateway",
            "Hemodynamic Twin Vector Synthesizer",
        ],
        "zero_cloud_retrieval_latency": True,
        "privacy_compliant_offline_nlp": True,
    }
