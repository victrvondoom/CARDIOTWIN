"""FastAPI router for Similar Patient Cohorts & Multi-Disease Machine Learning."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.cardiotwin.cohorts.dataset_repository import get_dataset_repository
from app.cardiotwin.cohorts.multi_disease_predictor import get_multi_disease_predictor
from app.cardiotwin.cohorts.patient_similarity_matcher import get_similar_patient_matcher

router = APIRouter(prefix="/cohorts", tags=["cardiotwin_cohorts"])


class PatientFeaturesPayload(BaseModel):
    features: dict[str, Any] = Field(default_factory=dict, description="Patient input features")
    biophysical_ffr: float | None = Field(default=None, description="Optional biophysical FFR")


@router.post("/similar-patients", summary="Find Top Similar Historical Patients (WHO, UCI, Framingham)")
async def find_similar_patients(req: PatientFeaturesPayload) -> dict[str, Any]:
    matcher = get_similar_patient_matcher()
    similar = matcher.find_similar_patients(patient_features=req.features, limit=4)
    return {
        "status": "success",
        "total_matched": len(similar),
        "cohort_sources": [
            "World Health Organization (WHO) Global CVD Cohort",
            "UCI Cleveland Heart Disease Database",
            "Framingham Longitudinal Cardiovascular Study",
            "Z-Alizadeh Sani Invasive Angiography Cohort",
        ],
        "similar_patients": similar,
    }


@router.post("/multi-disease-predict", summary="Predict All Major Cardiovascular Diseases")
async def predict_multi_disease(req: PatientFeaturesPayload) -> dict[str, Any]:
    predictor = get_multi_disease_predictor()
    res = predictor.predict_all_cardiac_diseases(
        patient_features=req.features,
        biophysical_ffr=req.biophysical_ffr,
    )
    return {"status": "success", **res}


@router.get("/public-datasets", summary="Overview of Public Datasets in CardioTwin")
async def get_public_datasets_overview() -> dict[str, Any]:
    repo = get_dataset_repository()
    return {
        "status": "success",
        "datasets": [
            {
                "name": "World Health Organization (WHO) Global CVD Surveillance",
                "organization": "WHO Department of Noncommunicable Diseases",
                "coverage": "Global multinational cohorts (Asia, Americas, Europe, Africa)",
                "target_conditions": ["Ischemic Heart Disease", "Hypertensive Heart Disease", "Stroke"],
            },
            {
                "name": "UCI Cleveland Heart Disease Dataset",
                "organization": "Cleveland Clinic Foundation",
                "coverage": "Invasive coronary angiography records with multi-vessel stenosis targets",
                "target_conditions": ["Angiographic CAD", "Exercise-Induced Angina"],
            },
            {
                "name": "Framingham Heart Study Cohort",
                "organization": "National Heart, Lung, and Blood Institute (NHLBI)",
                "coverage": "Longitudinal 5-year and 10-year cardiovascular risk scores",
                "target_conditions": ["Atherosclerotic Cardiovascular Disease (ASCVD)", "Heart Failure"],
            },
            {
                "name": "Z-Alizadeh Sani Invasive Angiography Cohort",
                "organization": "Tehran Heart Center / UCI id 411",
                "coverage": "Vessel-specific stenosis classification (LAD, LCX, RCA)",
                "target_conditions": ["Coronary Artery Stenosis", "Catheterization Provenance"],
            },
        ],
        "total_historical_records": len(repo.get_all_records()),
    }
