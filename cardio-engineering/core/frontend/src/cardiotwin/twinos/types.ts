/**
 * Cardio Intelligence TwinOS — TypeScript Type Definitions.
 */

export interface WearableMetricSample {
  timestamp: string;
  resting_hr: number;
  mean_hr: number;
  hrv_rmssd: number;
  hrv_sdnn: number;
  spo2_nadir: number;
  spo2_mean: number;
  total_sleep_hours: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  sleep_efficiency_pct: number;
  ahi_events_per_hr: number;
  daily_steps: number;
  recovery_score: number;
}

export interface MeasurementDelta {
  metric_name: string;
  display_name: string;
  prior_value: number;
  current_value: number;
  unit: string;
  delta_absolute: number;
  delta_pct: number;
  baseline_normal_range: string;
  is_abnormal: boolean;
  drift_direction: "elevated" | "depressed" | "stable" | "critical_deterioration";
  clinical_interpretation: string;
  relative_contribution_pct: number;
}

export interface ConformalReliability {
  alpha: number;
  conformal_quantile: number;
  interval_lower: number;
  interval_upper: number;
  uncertainty_radius: number;
  coverage_guarantee_pct: number;
  empirical_coverage_score: number;
  calibration_cohort: string;
  is_well_calibrated: boolean;
}

export interface RiskForecast {
  horizon_key: "7d_acute" | "30d_mace" | "90d_cad";
  horizon_label: string;
  measurable_outcome: string;
  point_risk_pct: number;
  risk_band: "low" | "intermediate" | "elevated" | "critical";
  conformal_bounds: ConformalReliability;
  primary_drivers: string[];
  clinical_urgency: "routine" | "monitor" | "urgent_review" | "immediate_intervention";
  vessel_coronary_weights: Record<string, number>;
}

export interface StalenessEvaluation {
  is_stale: boolean;
  staleness_score: number;
  staleness_trigger_reasons: string[];
  drift_metrics_detected: string[];
  time_since_prior_assessment_hours: number;
  threshold_exceeded: boolean;
  recalculation_recommended: boolean;
  evaluated_at: string;
}

export interface EchoGraphNode {
  node_id: string;
  node_name: string;
  stage: string;
  status: "stale" | "invalidated" | "recomputing" | "cached" | "executed_ok";
  dependencies: string[];
  output_summary: string;
  execution_time_ms: number;
  sha256_hash: string;
}

export interface EchoProvenanceRecord {
  provenance_id: string;
  event_type: string;
  parent_assessment_id: string | null;
  new_assessment_id: string;
  timestamp: string;
  input_data_hash: string;
  model_version: string;
  recomputation_latency_ms: number;
  dependency_graph: EchoGraphNode[];
  signed_by: string;
}

export interface ClinicianAlert {
  alert_id: string;
  patient_id: string;
  severity: "info" | "warning" | "critical_action_required";
  headline: string;
  summary_markdown: string;
  measurements_changed: MeasurementDelta[];
  predicted_outcomes_summary: string;
  reliability_statement: string;
  recommended_clinical_actions: string[];
  guideline_citations: Array<{ title: string; url: string; recommendation: string }>;
  snomed_codes: string[];
  dispatched_at: string;
  acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  action_taken?: string | null;
}

export interface TwinAssessment {
  assessment_id: string;
  timestamp: string;
  is_active: boolean;
  is_stale: boolean;
  staleness_info?: StalenessEvaluation | null;
  forecasts: Record<string, RiskForecast>;
  measurements_summary: Record<string, any>;
  measurement_deltas: MeasurementDelta[];
  biophysical_markers: Record<string, any>;
  echo_provenance_id: string;
}

export interface TwinPatientProfile {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  primary_diagnosis: string;
  ehr_baseline: Record<string, any>;
  current_medications: string[];
  active_wearable_devices: string[];
  sync_status: string;
  last_synced_at: string;
  wearable_telemetry_history: WearableMetricSample[];
  current_assessment: TwinAssessment;
  prior_assessment: TwinAssessment | null;
  staleness_state: StalenessEvaluation;
  active_alert: ClinicianAlert | null;
  echo_provenance_history: EchoProvenanceRecord[];
}

export interface PatientListItem {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  primary_diagnosis: string;
  sync_status: string;
  last_synced_at: string;
  is_stale: boolean;
  staleness_score: number;
  active_alert_severity: "info" | "warning" | "critical_action_required" | null;
  mace_30d_pct: number;
  mace_risk_band: "low" | "intermediate" | "elevated" | "critical";
  recomputed_from_stale: boolean;
}

export interface YcThemeIntegrationItem {
  theme_number: string;
  theme_name: string;
  role_in_twinos: string;
  concrete_features: string[];
  clinical_value: string;
}
