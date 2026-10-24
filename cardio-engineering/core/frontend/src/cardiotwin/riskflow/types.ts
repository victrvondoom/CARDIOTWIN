// Types for /api/v1/cardiotwin/riskflow — mirror backend/app/cardiotwin/riskflow (workflow.py, api.py).

export type GateStatus = "pass" | "warn" | "fail" | "skipped";
export type ChannelStatus = "accepted" | "rejected" | "absent" | "unbound";

export interface Gate {
  id: "identity" | "history" | "signal" | "alignment" | "risk" | "simulation";
  title: string;
  status: GateStatus;
  reasons: string[];
  detail: Record<string, unknown>;
}

export interface SensorNode {
  id: string;
  label: string;
  site: "left-wrist" | "right-finger";
  channel: "heart_rate" | "rr" | "spo2";
  status: ChannelStatus;
  reasons: string[];
  value: Record<string, number>;
}

export interface JointPattern {
  pattern: string;
  vessels: number[];
  probability: number;
  in_prediction_set: boolean;
}

export interface RiskResult {
  joint: JointPattern[];
  marginals: Record<"CAD" | "LAD" | "LCX" | "RCA", number>;
  vessel_count: Record<"none" | "1VD" | "2VD" | "3VD", number>;
  prediction_set: {
    alpha: number;
    qhat: number;
    patterns: string[];
    size: number;
    vessel_status: Record<"LAD" | "LCX" | "RCA", "involved" | "not-involved" | "uncertain">;
    empirical_coverage_cv: number | null;
  };
  applicability: { mahalanobis: number; threshold_p99: number; in_domain: boolean };
  contributions: Record<string, { feature: string; log_odds: number }[]>;
  coherent: boolean;
  imputed_features: string[];
  model: { id: string; version: string; sha256: string; trained_on: string; dataset_sha256: string };
}

export interface VesselSweep {
  area_stenosis_pct: number[];
  pressure_ratio_rest: number[];
  pressure_ratio_stress: number[];
  critical_area_stenosis_pct: number | null;
  at_label_threshold: { area_stenosis_pct: number; pressure_ratio_stress: number; flow_ml_min: number; below_0_80: boolean };
}

export interface OperatingPoint {
  heart_rate_bpm: number;
  cycle_length_ms: number;
  apd_ms: number;
  di_ms: number;
  restitution_slope: number;
  alternans_predicted: boolean;
}

export interface Simulation {
  organ: {
    model: string;
    calibrated_to: string[];
    calibration_residuals: Record<string, number>;
    calibration_converged: boolean;
    parameters: Record<string, number>;
    metrics: Record<string, number>;
    waveforms: { t_s: number[]; p_lv_mmhg: number[]; p_a_mmhg: number[]; v_lv_ml: number[] };
  };
  vessel: { model: string; driving_map_mmhg: number; sweep: Record<"LAD" | "LCX" | "RCA", VesselSweep> };
  cell: {
    model: string;
    parameters: Record<string, number>;
    parameter_source: string;
    qt_calibrated: boolean;
    operating_points: Record<string, OperatingPoint>;
    alternans_threshold_hr_bpm: number;
    restitution: { di_ms: number[]; apd_ms: number[] };
    action_potential: { t_ms: number[]; vm_mv: number[]; voltage_scaling: string; apd_numeric_ms: number; apd_analytic_ms: number };
  };
  limits: string[];
}

export interface RiskflowResult {
  workflow: string;
  version: string;
  label: string | null;
  as_of: string;
  outcome: "presented" | "withheld";
  gates: Gate[];
  sensors: SensorNode[];
  risk?: RiskResult;
  simulation?: Simulation | null;
  withheld_reasons?: string[];
  patient_summary: string[];
  provenance: { input_sha256: string; result_sha256: string; persisted: boolean; as_of: string };
  synthetic?: { patient_id: string; expect: string; note: string };
}

export interface RiskflowPatient {
  patient_id: string;
  title: string;
  expect: string;
}

export interface MethodSummary {
  [metric: string]: { mean: number; sd: number };
}

export interface RiskflowModelCard {
  version: string;
  model: { id: string; version: string; family: string; sha256: string; created_at: string; lambdas: number[];
    coupling: Record<string, number>; conformal: { alpha: number; qhat: number; empirical_coverage_cv: number | null } };
  benchmark: null | {
    created_at: string;
    dataset: { name: string; rows: number; sha256: string };
    protocol: Record<string, unknown>;
    xgboost: { available: boolean; version: string | null };
    methods: Record<string, MethodSummary>;
    paired_tests: Record<string, { mean_diff_cvp_minus_xgboost: number; p_value: number }>;
    conformal: { target_coverage: number; empirical_coverage: number; mean_set_size_of_8: number };
  };
  signal_gate_evaluation: {
    n_per_fault: number;
    false_rejection_rate_clean: number;
    faults: Record<string, { expected: string; reason: string | null; n: number; rate: number }>;
  };
  limits: string[];
}
