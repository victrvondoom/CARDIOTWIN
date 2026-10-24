/**
 * Core type definitions for the CARDIO-INTELLIGENCE Pulse-Cardiology unified subsystem.
 * Integrates emergency dispatch protocols, multi-singular ischemia mathematics,
 * synchronized multisign signals, multilingual ontology, and verifiable orchestration.
 */

export type TriageLevel =
  | 'ESI-1 (Immediate Resuscitation)'
  | 'ESI-2 (Emergent / High Risk)'
  | 'ESI-3 (Urgent)'
  | 'ESI-4 (Less Urgent)'
  | 'ESI-5 (Non-Urgent)';

export type ProtocolCategory =
  | 'cardiac'
  | 'airway'
  | 'stroke'
  | 'allergy'
  | 'toxicology'
  | 'device'
  | 'burn'
  | 'seizure'
  | 'hemorrhage'
  | 'obstetric'
  | 'endocrine'
  | 'trauma'
  | 'environmental'
  | 'psychiatric';

export interface CADUnitRecommendation {
  unitType: string;
  priority: string;
  requiredEquipment: string[];
}

export interface EmergencyProtocol {
  id: string;
  code: string;
  title: string;
  category: ProtocolCategory;
  triageLevel: TriageLevel;
  clinicalSummary: string;
  immediateActions: string[];
  verbalResponseText: string;
  cadenceBpm?: number;
  criticalQuestions: string[];
  contraindications: string[];
  unitRecommendation: CADUnitRecommendation;
  keywords: string[];
  lethalContraindicationLocks?: string[];
  reviewedBy?: string | null;
  reviewedAt?: string;
  hemodynamicProfile?: {
    expectedMap: string;
    targetHr: string;
    shockIndexThreshold: number;
    stemiRisk: boolean;
  };
}

export type AbstainReason =
  | 'insufficient_signal'
  | 'below_confidence_threshold'
  | 'ambiguous_presentation'
  | 'contraindication_conflict';

export type TriageOutcome =
  | { status: 'matched'; protocol: EmergencyProtocol; confidence: number; matchedKeywords: string[]; latencyMs: number }
  | { status: 'abstain'; reason: AbstainReason; score: number; latencyMs: number; suggestedQuestions: string[] };

export interface MultisignTelemetry {
  timestamp: number;
  heartRate: number;              // bpm
  systolicBp: number;             // mmHg
  diastolicBp: number;            // mmHg
  meanArterialPressure: number;   // mmHg
  spO2: number;                   // %
  etCO2: number;                  // mmHg (End-tidal CO2)
  pulseTransitTimeMs: number;     // ms (ECG R-peak to Radial PPG peak)
  pulseWaveVelocityMs: number;    // m/s
  stElevationMm: number;          // mm (Lead II / V2-V4 ST deviation)
  rhythmStatus: 'NSR' | 'STEMI' | 'NSTEMI' | 'VT_PULSELESS' | 'VFIB' | 'PEA' | 'ASYSTOLE' | 'ROSC';
}

export interface CoronarySingularity {
  vesselId: 'LAD' | 'LCX' | 'RCA' | 'LMCA';
  name: string;
  stenosisPercent: number;        // 0 - 100%
  lumenDiameterMm: number;        // e.g. 1.2 mm vs reference 3.5 mm
  lesionLengthMm: number;         // mm
  deltaP_mmHg: number;            // Navier-Stokes singular pressure drop
  reynoldsSingularity: number;    // Re across stenosis constriction
  wallShearStressPa: number;      // Pa (normal 1.5 - 2.5 Pa; jet > 10 Pa, recirculation < 0.4 Pa)
  ffr: number;                    // Fractional Flow Reserve (Pd / Pa)
  myocardialTerritory: string;
  ischemicRiskTier: 'Normal' | 'Mild' | 'Moderate' | 'Critical Singular Ischemia';
}

export interface TherapeuticProof {
  interventionId: 'PCI_STENT' | 'CABG_BYPASS' | 'THROMBOLYSIS' | 'ANTI_ISCHEMIC_PHARM';
  name: string;
  postInterventionFfr: number;
  deltaP_reductionPct: number;
  wallShearStressNormalized: boolean;
  lactateClearanceRateMin: number;
  clinicalEvidenceGrade: 'Class I, Level A (ACC/AHA)' | 'Class I, Level B' | 'Class IIa';
  merkleProofHash: string;
  verificationStatus: 'CRYPTOGRAPHICALLY_VERIFIED' | 'PENDING_VALIDATION';
}

export interface MultiSingularIschemiaState {
  globalIschemiaIndex: number;    // 0 - 100
  myocardialO2DeficitPct: number; // %
  vessels: Record<'LAD' | 'LCX' | 'RCA' | 'LMCA', CoronarySingularity>;
  activeCascadeStage:
    | 'STAGE_1_SINGULAR_PERTURBATION'
    | 'STAGE_2_PERFUSION_FFR_COLLAPSE'
    | 'STAGE_3_ANAEROBIC_METABOLISM'
    | 'STAGE_4_MECHANICAL_WALL_MOTION_FAILURE'
    | 'STAGE_5_ELECTROVECTOR_ST_DEVIATION'
    | 'STAGE_6_PULSE_TRANSIT_COLLAPSE';
  therapeuticProofs: TherapeuticProof[];
  cryptographicRootHash: string;
}

export type WorldLanguageCode =
  | 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'fr' | 'de' | 'ja'
  | 'pt' | 'ru' | 'it' | 'ko' | 'sw' | 'bn' | 'ur' | 'tr'
  | 'vi' | 'pl' | 'nl' | 'tl' | 'fa' | 'he' | 'sv' | 'el'
  | 'uk' | 'th' | 'id' | 'ta' | 'te' | 'mr' | 'pa' | 'ms';

export interface WorldLanguageDefinition {
  code: WorldLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export type OrchestrationActor = 'DISPATCHER_CLINICIAN' | 'PATIENT_BYSTANDER';
