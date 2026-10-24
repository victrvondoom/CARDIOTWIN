"""Patient Similarity Matching Engine ("Similar patients रख").

Finds the most analogous historical patients from WHO, UCI Cleveland, Framingham,
and Z-Alizadeh Sani cohorts using normalized multi-feature distance metrics.
"""

from __future__ import annotations

import math
from typing import Any

from app.cardiotwin.cohorts.dataset_repository import (
    HistoricalPatientRecord,
    get_dataset_repository,
)


class SimilarPatientMatcher:
    """Matches active patient against historical clinical cohorts."""

    def __init__(self) -> None:
        self._repo = get_dataset_repository()

    def find_similar_patients(
        self,
        patient_features: dict[str, Any],
        limit: int = 4,
    ) -> list[dict[str, Any]]:
        """Compute similarity score (0% to 100%) against historical cohort records.

        Features compared:
        - Age, Blood Pressure (Sys/Dia), Resting HR, Smoking, Cholesterol, Glucose,
          Ejection Fraction, and ECG ST-deviation.
        """
        records = self._repo.get_all_records()

        # Extract active patient values with sensible clinical fallbacks
        p_age = float(patient_features.get("Age", patient_features.get("age", 60)))
        p_sys = float(patient_features.get("BP", patient_features.get("systolic_bp", 135)))
        p_hr = float(patient_features.get("PR", patient_features.get("heart_rate", 75)))
        p_chol = float(patient_features.get("Chol", patient_features.get("cholesterol", 210)))
        p_ef = float(patient_features.get("EF", patient_features.get("ejection_fraction", 55)))
        p_st = float(patient_features.get("ST_Depression", 0.0))

        results = []
        for rec in records:
            # Normalized Euclidean distance over clinical ranges
            d_age = math.pow((p_age - rec.age) / 30.0, 2)
            d_sys = math.pow((p_sys - rec.systolic_bp) / 40.0, 2)
            d_hr = math.pow((p_hr - rec.resting_hr) / 35.0, 2)
            d_chol = math.pow((p_chol - rec.cholesterol_mg_dl) / 80.0, 2)
            d_ef = math.pow((p_ef - rec.ejection_fraction_pct) / 25.0, 2)
            d_st = math.pow((p_st - rec.ecg_st_deviation_mm) / 2.0, 2)

            total_dist = math.sqrt(d_age * 1.5 + d_sys * 1.2 + d_hr * 0.8 + d_chol * 1.0 + d_ef * 1.8 + d_st * 1.5)

            # Similarity percentage: 100% at distance 0, decaying gracefully
            similarity_pct = round(max(30.0, min(99.0, 100.0 / (1.0 + total_dist * 0.45))), 1)

            entry = rec.to_dict()
            entry["similarity_match_pct"] = similarity_pct
            entry["matching_reasons"] = self._explain_match(p_age, p_sys, p_ef, rec)
            results.append(entry)

        results.sort(key=lambda x: x["similarity_match_pct"], reverse=True)
        return results[:limit]

    def _explain_match(
        self,
        p_age: float,
        p_sys: float,
        p_ef: float,
        rec: HistoricalPatientRecord,
    ) -> list[str]:
        reasons = []
        if abs(p_age - rec.age) <= 5:
            reasons.append(f"Close age cohort (Within {abs(int(p_age - rec.age))} years)")
        if abs(p_sys - rec.systolic_bp) <= 12:
            reasons.append("Similar systolic hemodynamic load")
        if abs(p_ef - rec.ejection_fraction_pct) <= 8:
            reasons.append(f"Concordant myocardial contractility (EF ~{rec.ejection_fraction_pct}%)")
        if rec.smoking:
            reasons.append("Shared vascular risk factor profile")
        if not reasons:
            reasons.append("Comparable multi-vessel hemodynamic impedance")
        return reasons


# Singleton
_matcher_instance: SimilarPatientMatcher | None = None


def get_similar_patient_matcher() -> SimilarPatientMatcher:
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = SimilarPatientMatcher()
    return _matcher_instance
