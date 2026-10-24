"""Cardio Intelligence TwinOS — Data Models & Schemas.

Defines schemas for longitudinal wearable streams (HR, HRV, sleep, EHR),
measurement change vectors, conformal risk predictions, staleness detection,
ECHO/HYPERGRID dependency recalculation, and clinician alerts.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class WearableMetricSample(BaseModel):
    """Point-in-time wearable biometric telemetry reading."""

    timestamp: str = Field(..., description="ISO 8601 timestamp")
    resting_hr: float = Field(..., description="Resting heart rate (bpm)")
    mean_hr: float = Field(..., description="Mean daily/nocturnal heart rate (bpm)")
    hrv_rmssd: float = Field(..., description="HRV Root Mean Square of Successive Differences (ms)")
    hrv_sdnn: float = Field(..., description="HRV Standard Deviation of NN intervals (ms)")
    spo2_nadir: float = Field(..., description="Minimum nocturnal oxygen saturation (%)")
    spo2_mean: float = Field(..., description="Mean nocturnal oxygen saturation (%)")
    total_sleep_hours: float = Field(..., description="Total sleep duration (hours)")
    deep_sleep_minutes: float = Field(..., description="Deep (slow-wave) sleep duration (minutes)")
    rem_sleep_minutes: float = Field(..., description="REM sleep duration (minutes)")
    sleep_efficiency_pct: float = Field(..., description="Sleep efficiency percentage")
    ahi_events_per_hr: float = Field(..., description="Apnea-Hypopnea Index (events/hour)")
    daily_steps: int = Field(default=6500, description="Step count")
    recovery_score: int = Field(default=68, ge=0, le=100, description="Autonomic recovery score 0-100")


class MeasurementDelta(BaseModel):
    """Detailed attribution of an individual measurement change vs baseline."""

    metric_name: str
    display_name: str
    prior_value: float
    current_value: float
    unit: str
    delta_absolute: float
    delta_pct: float
    baseline_normal_range: str
    is_abnormal: bool
    drift_direction: Literal["elevated", "depressed", "stable", "critical_deterioration"]
    clinical_interpretation: str
    relative_contribution_pct: float = Field(
        ..., description="Feature contribution to overall risk drift (e.g. Shapley weight)"
    )


class ConformalReliability(BaseModel):
    """Split-conformal prediction intervals and empirical calibration reliability."""

    alpha: float = Field(default=0.10, description="Significance level (e.g. 0.10 for 90% coverage)")
    conformal_quantile: float = Field(..., description="Empirical conformal quantile error radius")
    interval_lower: float = Field(..., description="Lower probability bound [0, 1]")
    interval_upper: float = Field(..., description="Upper probability bound [0, 1]")
    uncertainty_radius: float = Field(..., description="Margin of uncertainty (half-width)")
    coverage_guarantee_pct: float = Field(default=90.0, description="Nominal coverage guarantee %")
    empirical_coverage_score: float = Field(..., description="Empirical benchmark reliability score 0-100")
    calibration_cohort: str = Field(
        default="UK-Biobank-Cardio-Prospective-N12400",
        description="Reference calibration dataset"
    )
    is_well_calibrated: bool = Field(default=True)


class RiskForecast(BaseModel):
    """Specific measurable outcome prediction across clearly defined horizons."""

    horizon_key: Literal["7d_acute", "30d_mace", "90d_cad"]
    horizon_label: str
    measurable_outcome: str
    point_risk_pct: float = Field(..., description="Point probability percentage [0, 100]")
    risk_band: Literal["low", "intermediate", "elevated", "critical"]
    conformal_bounds: ConformalReliability
    primary_drivers: list[str]
    clinical_urgency: Literal["routine", "monitor", "urgent_review", "immediate_intervention"]
    vessel_coronary_weights: dict[str, float] = Field(
        default_factory=lambda: {"LAD": 0.45, "LCX": 0.25, "RCA": 0.30}
    )


class StalenessEvaluation(BaseModel):
    """Evaluation of whether changing wearable telemetry invalidates an earlier assessment."""

    is_stale: bool = Field(..., description="True if earlier risk assessment is no longer clinically valid")
    staleness_score: float = Field(..., ge=0, le=100, description="Staleness index (0=fresh, 100=severely outdated)")
    staleness_trigger_reasons: list[str]
    drift_metrics_detected: list[str]
    time_since_prior_assessment_hours: float
    threshold_exceeded: bool
    recalculation_recommended: bool
    evaluated_at: str


class EchoGraphNode(BaseModel):
    """Node within the ECHO / HYPERGRID dependency-aware recalculation DAG."""

    node_id: str
    node_name: str
    stage: str
    status: Literal["stale", "invalidated", "recomputing", "cached", "executed_ok"]
    dependencies: list[str]
    output_summary: str
    execution_time_ms: float
    sha256_hash: str


class EchoProvenanceRecord(BaseModel):
    """Cryptographic decision provenance and recalculation event history."""

    provenance_id: str
    event_type: Literal[
        "INITIAL_CALIBRATION",
        "STALE_ASSESSMENT_INVALIDATION",
        "AUTOMATIC_RECOMPUTATION",
        "CLINICIAN_ALERT_DISPATCHED",
        "CLINICIAN_ACKNOWLEDGED"
    ]
    parent_assessment_id: str | None
    new_assessment_id: str
    timestamp: str
    input_data_hash: str
    model_version: str
    recomputation_latency_ms: float
    dependency_graph: list[EchoGraphNode]
    signed_by: str = "TwinOS.ECHO.AutonomousDaemon"


class ClinicianAlert(BaseModel):
    """Evidence-aware alert dispatched to clinicians when a stale assessment is recomputed."""

    alert_id: str
    patient_id: str
    severity: Literal["info", "warning", "critical_action_required"]
    headline: str
    summary_markdown: str
    measurements_changed: list[MeasurementDelta]
    predicted_outcomes_summary: str
    reliability_statement: str
    recommended_clinical_actions: list[str]
    guideline_citations: list[dict[str, str]]
    snomed_codes: list[str]
    fhir_resource_type: str = "CommunicationRequest"
    dispatched_at: str
    acknowledged: bool = False
    acknowledged_by: str | None = None
    acknowledged_at: str | None = None
    action_taken: str | None = None


class TwinAssessment(BaseModel):
    """Snapshot of a complete cardiovascular digital twin state."""

    assessment_id: str
    timestamp: str
    is_active: bool
    is_stale: bool
    staleness_info: StalenessEvaluation | None = None
    forecasts: dict[str, RiskForecast]
    measurements_summary: dict[str, Any]
    measurement_deltas: list[MeasurementDelta]
    biophysical_markers: dict[str, Any]
    echo_provenance_id: str


class TwinPatientProfile(BaseModel):
    """Complete profile and longitudinal digital twin for a cardiovascular patient."""

    patient_id: str
    name: str
    age: int
    gender: str
    primary_diagnosis: str
    ehr_baseline: dict[str, Any]
    current_medications: list[str]
    active_wearable_devices: list[str]
    sync_status: str
    last_synced_at: str
    wearable_telemetry_history: list[WearableMetricSample]
    current_assessment: TwinAssessment
    prior_assessment: TwinAssessment | None
    staleness_state: StalenessEvaluation
    active_alert: ClinicianAlert | None
    echo_provenance_history: list[EchoProvenanceRecord]


class SimulateStreamRequest(BaseModel):
    """Request to inject synthetic longitudinal wearable telemetry."""

    patient_id: str
    scenario: Literal[
        "normal_baseline",
        "progressive_decompensation_72h",
        "nocturnal_apnea_hypoxia",
        "acute_arrhythmia_burst",
        "beta_blocker_recovery"
    ]
    auto_trigger_recomputation: bool = True


class RecalculateRequest(BaseModel):
    """Request to manually or reactively recompute patient digital twin."""

    patient_id: str
    force: bool = False
    reason: str = "Clinician requested real-time recalculation"


class AlertAckRequest(BaseModel):
    """Request for clinician acknowledgment of an evidence alert."""

    alert_id: str
    clinician_name: str
    action_taken: str
    clinical_notes: str | None = None


class YcThemeIntegrationItem(BaseModel):
    """Details how each YC Summer 2026 theme contributes to TwinOS."""

    theme_number: str
    theme_name: str
    role_in_twinos: str
    concrete_features: list[str]
    clinical_value: str
