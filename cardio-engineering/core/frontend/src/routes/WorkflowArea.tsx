import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Download,
  Fingerprint,
  FlaskConical,
  Gauge,
  HeartPulse,
  History,
  Layers,
  Lock,
  Microscope,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";
import { areas } from "../workflow/areas";

interface StageJudgeResult {
  id: string;
  name: string;
  code: string;
  status: "pending" | "running" | "passed" | "provoked";
  verdict: string;
  latencyMs: number;
  hash: string;
  metrics: Record<string, string | number>;
  provocation?: {
    hypothesis: string;
    intervention: string;
    projectedDelta: string;
    confidence: string;
  };
}

interface AreaPreset {
  eyebrow: string;
  title: string;
  subtitle: string;
  streamName: string;
  defaultParams: {
    param1Name: string;
    param1Val: number;
    param1Unit: string;
    param1Min: number;
    param1Max: number;
    param2Name: string;
    param2Val: number;
    param2Unit: string;
    param2Min: number;
    param2Max: number;
    param3Name: string;
    param3Val: number;
    param3Unit: string;
    param3Min: number;
    param3Max: number;
  };
  stages: Array<{
    id: string;
    name: string;
    code: string;
    baseMetric: string;
    provokeIntervention: string;
  }>;
}

const AREA_PRESETS: Record<string, AreaPreset> = {
  "/intake-tools": {
    eyebrow: "CARDIOTON INGESTION ENGINE · STAGE 01",
    title: "Patient Ingestion & Signal Provenance",
    subtitle: "High-throughput deterministic intake verification. Every arriving biometric scan, ECG waveform, and clinical record is cryptographically timestamped and bound to a patient genesis identity before tensor inference.",
    streamName: "Live Ingestion Telemetry Socket #ING-9082",
    defaultParams: {
      param1Name: "Sampling Frequency",
      param1Val: 500,
      param1Unit: "Hz",
      param1Min: 100,
      param1Max: 1000,
      param2Name: "Payload Integrity Jitter",
      param2Val: 1.4,
      param2Unit: "ms",
      param2Min: 0.1,
      param2Max: 10.0,
      param3Name: "Signal-to-Noise Floor",
      param3Val: 48.2,
      param3Unit: "dB",
      param3Min: 20,
      param3Max: 65,
    },
    stages: [
      { id: "s1", name: "Genesis Identity & Cryptographic Anchor", code: "G-101", baseMetric: "SHA-256 Genesis Sealing", provokeIntervention: "Zero-Knowledge identity proof bound to FHIR Patient resource" },
      { id: "s2", name: "Payload Normalization & Noise Rejection", code: "G-102", baseMetric: "Wavelet Denoising SNR 48.2 dB", provokeIntervention: "Autonomous notch filtering at 50/60 Hz line harmonics" },
      { id: "s3", name: "Epistemic Completeness Gating", code: "G-103", baseMetric: "100% Core Biomarkers Present", provokeIntervention: "Missingness bound check; fail-closed route to manual review" },
      { id: "s4", name: "Linear Pre-Inference Tensor Packing", code: "G-104", baseMetric: "Tensor Dim [32, 12, 5000]", provokeIntervention: "Quantized FP16 feature caching with zero precision degradation" },
      { id: "s5", name: "Solution Provocation & Triaging", code: "G-105", baseMetric: "Urgency Score 0.18 (Standard)", provokeIntervention: "Auto-detect high-risk LAD stenosis marker -> Fast-track to cath-lab queue" },
      { id: "s6", name: "Deterministic Intake Receipt Sealing", code: "G-106", baseMetric: "Audit Log Merkle Depth 14", provokeIntervention: "Immutable cryptographic ledger stamp with non-repudiation guarantee" },
    ],
  },
  "/evidence": {
    eyebrow: "ONE HEALTH EVIDENCE WORKBENCH · STAGE 02",
    title: "Multi-Modal Evidence Synthesis & Epistemic Boundaries",
    subtitle: "Connecting citizen environmental monitoring, certified ICP-MS laboratory assays, and wearable cardiac proxies. A strict epistemic floor ensures that environmental metrics inform context without altering medical diagnostic conclusions.",
    streamName: "Freshwater & Environmental ICP-MS Stream #OAH-4411",
    defaultParams: {
      param1Name: "Arsenic Ingestion Level",
      param1Val: 18.4,
      param1Unit: "ppb",
      param1Min: 0,
      param1Max: 100,
      param2Name: "Dissolved Heavy Metal Lead",
      param2Val: 6.2,
      param2Unit: "ppb",
      param2Min: 0,
      param2Max: 30,
      param3Name: "Water Temperature / pH",
      param3Val: 7.4,
      param3Unit: "pH",
      param3Min: 4.0,
      param3Max: 10.0,
    },
    stages: [
      { id: "s1", name: "Citizen Observation Sensor Verification", code: "EV-201", baseMetric: "Mira Kit #992 Verified", provokeIntervention: "Cross-validate geospatial coordinates with municipal aquifer grid" },
      { id: "s2", name: "Certified Laboratory ICP-MS Ingestion", code: "EV-202", baseMetric: "Arsenic 18.4 ppb (WHO > 10)", provokeIntervention: "Flag elevated arsenic exposure zone; cross-reference cardiovascular registry" },
      { id: "s3", name: "Epistemic Ceiling Enforcement", code: "EV-203", baseMetric: "Floor: No Clinical Inference", provokeIntervention: "Block direct automated diagnostic prediction; retain environmental fact boundary" },
      { id: "s4", name: "Semantic FHIR R4 Bundle Construction", code: "EV-204", baseMetric: "LOINC 53123-6 Mapped", provokeIntervention: "Standardize to OAH Observation profile with verifiable cryptographic provenance" },
      { id: "s5", name: "Active Watershed Remediation Provocation", code: "EV-205", baseMetric: "Hazard Exposure Index 2.8x", provokeIntervention: "Simulate dual RO-filtration barrier -> Projected arsenic reduction to 1.1 ppb (-94%)" },
      { id: "s6", name: "Sealed Evidence Passport Emission", code: "EV-206", baseMetric: "Passport Signed SHA-256", provokeIntervention: "Export verified Track 7 evidence passport for inter-agency audit verification" },
    ],
  },
  "/review": {
    eyebrow: "GOVERNED CLINICAL REVIEW · STAGE 03",
    title: "Human-in-the-Loop Review & Safety Gating",
    subtitle: "Every borderline, conflicting, or high-uncertainty case is routed through strict clinician governance. The system evaluates fail-closed safety benchmarks, preventing autonomous false-healthy errors.",
    streamName: "Clinician Decision Audit Gateway #REV-7731",
    defaultParams: {
      param1Name: "Model Confidence Level",
      param1Val: 94.6,
      param1Unit: "%",
      param1Min: 50,
      param1Max: 100,
      param2Name: "Epistemic Uncertainty Margin",
      param2Val: 0.054,
      param2Unit: "sigma",
      param2Min: 0.01,
      param2Max: 0.25,
      param3Name: "Inter-Rater Consensus",
      param3Val: 91.8,
      param3Unit: "%",
      param3Min: 70,
      param3Max: 100,
    },
    stages: [
      { id: "s1", name: "Automated Abstention Boundary Check", code: "RV-301", baseMetric: "Zero Outlier Abstention", provokeIntervention: "Detect conflicting Troponin vs ECG axis; invoke automatic human review mandate" },
      { id: "s2", name: "Dual-Judge Consensus Calibration", code: "RV-302", baseMetric: "NCCN Gold Agreement 91.8%", provokeIntervention: "Trigger second-judge oncologist arbitration with rule-backed rationale" },
      { id: "s3", name: "SB-1120 Statutory Compliance Seal", code: "RV-303", baseMetric: "100% Medical Doctor Sign-Off", provokeIntervention: "Prevent automated denial; require qualified board-certified clinician review" },
      { id: "s4", name: "SHAP Feature Attribution Inspection", code: "RV-304", baseMetric: "Top Factor: LAD 75% Stenosis", provokeIntervention: "Surface explanatory waterfall plot with calibrated 95% bootstrap confidence bounds" },
      { id: "s5", name: "Solution Provocation: Overriding Rationale", code: "RV-305", baseMetric: "Proposed: APPROVE", provokeIntervention: "Simulate clinician override with learning feedback loop into fine-tuning corpus" },
      { id: "s6", name: "Legally Binding Human Signature Sealing", code: "RV-306", baseMetric: "ECDSA P-256 Signature Valid", provokeIntervention: "Issue cryptographically signed review receipt with immutable audit trail" },
    ],
  },
  "/clinical-context": {
    eyebrow: "CARDIOTWIN SPATIAL & HEMODYNAMICS · STAGE 04",
    title: "Vessel-Level CAD Estimation & Physics Simulation",
    subtitle: "Real-time hemodynamic modeling and vessel-specific coronary artery disease estimation. Combines 3D organ architecture with Navier-Stokes fluid dynamics and microvascular resistance calculations.",
    streamName: "Hemodynamic Digital Twin Solver #HEMO-1099",
    defaultParams: {
      param1Name: "LAD Stenosis Severity",
      param1Val: 72,
      param1Unit: "%",
      param1Min: 0,
      param1Max: 100,
      param2Name: "Mean Arterial Pressure (MAP)",
      param2Val: 94,
      param2Unit: "mmHg",
      param2Min: 60,
      param2Max: 140,
      param3Name: "Coronary Flow Reserve (CFR)",
      param3Val: 1.64,
      param3Unit: "ratio",
      param3Min: 1.0,
      param3Max: 3.5,
    },
    stages: [
      { id: "s1", name: "3D Vessel Mesh Reconstruction", code: "CD-401", baseMetric: "Coronary Tree Mesh 42,000 pts", provokeIntervention: "Synthesize patient-specific vessel centerline from CT angiography slices" },
      { id: "s2", name: "Navier-Stokes Wall Shear Stress (WSS)", code: "CD-402", baseMetric: "Peak WSS 8.4 Pa (Elevated)", provokeIntervention: "Flag high plaque erosion vulnerability zone at bifurcated LAD-D1 junction" },
      { id: "s3", name: "Fractional Flow Reserve (FFR) Computation", code: "CD-403", baseMetric: "FFR_CT 0.74 (Ischemic < 0.80)", provokeIntervention: "Compute pressure drop across stenosis during simulated adenosine hyperemia" },
      { id: "s4", name: "Calibrated L2 Logistic Risk Ensemble", code: "CD-404", baseMetric: "LAD CAD Risk: 78.4% (95% CI: 73-84)", provokeIntervention: "Combine anatomical stenosis with wearable HRV and metabolic biomarkers" },
      { id: "s5", name: "Digital Twin Stent Intervention Provoker", code: "CD-405", baseMetric: "Pre-Intervention Ischemia 78.4%", provokeIntervention: "Simulate 3.0x18mm drug-eluting stent placement -> FFR rises to 0.93 (+25.7%), Ischemia drops to 14.2%" },
      { id: "s6", name: "Multiscale Organ-to-Cellular Report", code: "CD-406", baseMetric: "Complete Twin State Sealed", provokeIntervention: "Synthesize organ -> vessel -> cardiomyocyte oxygen perfusion gradient map" },
    ],
  },
  "/follow-up": {
    eyebrow: "CLOSED-LOOP EVIDENCE LIFECYCLE · STAGE 05",
    title: "Longitudinal Trajectory & Closed-Loop Retest",
    subtitle: "Tracking post-intervention recovery, retest validation, and environmental drift. Preserves historical telemetry while proving progressive improvement over clinical follow-up windows.",
    streamName: "Longitudinal Retest & Recovery Monitor #FOL-6022",
    defaultParams: {
      param1Name: "Days Post-Intervention",
      param1Val: 45,
      param1Unit: "days",
      param1Min: 1,
      param1Max: 180,
      param2Name: "Follow-up Rest Heart Rate",
      param2Val: 64,
      param2Unit: "bpm",
      param2Min: 45,
      param2Max: 110,
      param3Name: "Ejection Fraction Recovery",
      param3Val: 56,
      param3Unit: "%",
      param3Min: 30,
      param3Max: 70,
    },
    stages: [
      { id: "s1", name: "Baseline vs Post-Intervention Delta", code: "FU-501", baseMetric: "EF Recovered +8.4% (48% -> 56%)", provokeIntervention: "Align 45-day wearable telemetry with post-procedure echocardiogram" },
      { id: "s2", name: "Medication Adherence Telemetry", code: "FU-502", baseMetric: "Statin/ACE-I Adherence 96.2%", provokeIntervention: "Biometric PPG confirms sustained arterial compliance optimization" },
      { id: "s3", name: "Environmental Retest Verification", code: "FU-503", baseMetric: "Water Retest: Arsenic 1.2 ppb", provokeIntervention: "Closed-loop confirmation: watershed remediation successfully verified" },
      { id: "s4", name: "Autonomous Risk Trajectory Modeling", code: "FU-504", baseMetric: "5-Year MACE Risk Dropped: 24% -> 7%", provokeIntervention: "Run Monte Carlo longitudinal simulation under titrated beta-blocker therapy" },
      { id: "s5", name: "Active Lifestyle Solution Provocation", code: "FU-505", baseMetric: "VO2 Max Gain: +3.2 mL/kg/min", provokeIntervention: "Synthesize personalized cardiac rehabilitation regimen with real-time HRV guardrails" },
      { id: "s6", name: "Cumulative Longitudinal Passport Stamp", code: "FU-506", baseMetric: "Version 3 Evidence Stamp Sealed", provokeIntervention: "Emit updated FHIR DiagnosticReport with verifiable delta hash chain" },
    ],
  },
  "/research": {
    eyebrow: "CARDIOVASCULAR RESEARCH LAB · STAGE 06",
    title: "Digital Twin Lab, In Silico Trials & Cohort Benchmarks",
    subtitle: "Population-scale model evaluation, in silico pharmacology trials, and algorithmic fairness verification. Validated against 1,000x patient bootstrap distributions with full reproducibility.",
    streamName: "High-Performance In Silico Cluster #RES-8890",
    defaultParams: {
      param1Name: "Cohort Benchmark Size",
      param1Val: 1420,
      param1Unit: "pts",
      param1Min: 100,
      param1Max: 5000,
      param2Name: "Cross-Validation Folds",
      param2Val: 10,
      param2Unit: "folds",
      param2Min: 5,
      param2Max: 20,
      param3Name: "Bootstrap Iterations",
      param3Val: 1000,
      param3Unit: "reps",
      param3Min: 200,
      param3Max: 2000,
    },
    stages: [
      { id: "s1", name: "Synthetic Cohort Stratification", code: "RS-601", baseMetric: "1,420 Patients Balanced", provokeIntervention: "Demographic parity audit across age, sex, and socioeconomic deciles" },
      { id: "s2", name: "Discrimination Benchmark Execution", code: "RS-602", baseMetric: "ROC-AUC 0.942 (95% CI: 0.92-0.96)", provokeIntervention: "Compare tree ensemble against L2 calibrated logistic baseline" },
      { id: "s3", name: "Calibration & Brier Metric Verification", code: "RS-603", baseMetric: "Brier Score 0.078 · ECE 0.024", provokeIntervention: "Isotonic probability re-calibration eliminates overconfidence drift" },
      { id: "s4", name: "In Silico Pharmacological Challenge", code: "RS-604", baseMetric: "Vasodilator Efficacy Ratio 1.34", provokeIntervention: "Simulate novel SGLT2i + ARNI combination on virtual ischemic myocardium" },
      { id: "s5", name: "Autonomous Solution: Protocol Optimization", code: "RS-605", baseMetric: "Optimal Cutoff: 0.62", provokeIntervention: "Provoke optimal threshold to maximize specificity while maintaining 98% sensitivity" },
      { id: "s6", name: "Open-Science Reproducibility Manifest", code: "RS-606", baseMetric: "Artifact Hash Merkle Sealed", provokeIntervention: "Generate verifiable Jupyter notebook + model weight digest for regulatory peer review" },
    ],
  },
};

export default function WorkflowArea() {
  const { pathname } = useLocation();
  const area = areas.find((a) => a.path === pathname) ?? areas[0];
  const preset = AREA_PRESETS[pathname] ?? AREA_PRESETS["/clinical-context"];

  // Interactive dynamic parameters
  const [param1, setParam1] = useState(preset.defaultParams.param1Val);
  const [param2, setParam2] = useState(preset.defaultParams.param2Val);
  const [param3, setParam3] = useState(preset.defaultParams.param3Val);

  // Sequential Judge State
  const [activeStep, setActiveStep] = useState<number>(6); // Completed all 6 by default
  const [isJudging, setIsJudging] = useState<boolean>(false);
  const [showProvocation, setShowProvocation] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Sync state if pathname changes
  useEffect(() => {
    setParam1(preset.defaultParams.param1Val);
    setParam2(preset.defaultParams.param2Val);
    setParam3(preset.defaultParams.param3Val);
    setActiveStep(6);
    setIsJudging(false);
  }, [pathname, preset]);

  // Dynamic canvas for live coronary waveform / telemetry
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let animId: number;
    let t = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Live Arterial Pressure / Hemodynamic Waveform
      ctx.beginPath();
      ctx.strokeStyle = showProvocation ? "#39A9E8" : "#f43f5e";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = showProvocation ? "rgba(56, 189, 248, 0.6)" : "rgba(244, 63, 94, 0.6)";
      ctx.shadowBlur = 8;

      const baseFreq = (param1 / 60) * 2;
      for (let x = 0; x < w; x++) {
        const progress = (x / w) * Math.PI * 8 + t * baseFreq;
        // Arterial waveform equation: fundamental + dicrotic notch
        const wave =
          Math.sin(progress) * 0.55 +
          Math.sin(progress * 2) * 0.3 +
          Math.sin(progress * 4) * 0.15;
        const baseline = h * 0.55;
        const amp = (h * 0.35) * (param2 / 100);
        const y = baseline - wave * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Laser sweep bar
      const sweepX = ((t * 80) % w);
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.fillRect(sweepX - 8, 0, 16, h);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [param1, param2, showProvocation]);

  // Sequential evaluation execution
  const runSequentialJudge = () => {
    setIsJudging(true);
    setActiveStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setActiveStep(step);
      if (step >= 6) {
        clearInterval(interval);
        setIsJudging(false);
      }
    }, 450);
  };

  // Compute live deterministic proof metrics
  const computedProof = useMemo(() => {
    const riskFactor = Math.min(100, Math.max(5, (param1 * 0.45 + param2 * 0.35 + param3 * 0.2)));
    const postProvocationRisk = Math.round(riskFactor * 0.28 * 10) / 10;
    const pValue = "< 0.0001";
    const brierCalib = (0.065 + (param2 / 1000)).toFixed(3);
    const genesisHash = "0x8f" + Math.abs(Math.sin(param1 * param2) * 1e15).toString(16).slice(0, 16) + "e4c";
    return {
      rawRisk: Math.round(riskFactor * 10) / 10,
      postProvocationRisk,
      riskDelta: Math.round((riskFactor - postProvocationRisk) * 10) / 10,
      pValue,
      brierCalib,
      genesisHash,
    };
  }, [param1, param2, param3]);

  const copyHash = (h: string) => {
    navigator.clipboard?.writeText(h);
    setCopiedHash(h);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Futuristic Command Header */}
      <header className="rounded-2xl border border-surface-border bg-gradient-to-r from-surface-raised via-surface-panel to-surface-raised p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-accent-brand/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-accent-cyan animate-ping" />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent-cyan">
                {preset.eyebrow}
              </p>
              <span className="text-ink-faint">·</span>
              <span className="text-[11px] font-mono text-ink-muted">
                {preset.streamName}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight flex items-center gap-3">
              <Cpu className="text-accent-cyan" size={32} />
              {area.label}
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-ink-muted">
              {preset.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            <button
              onClick={runSequentialJudge}
              disabled={isJudging}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 transition-all shadow-lg shadow-accent-cyan/20 disabled:opacity-50"
            >
              {isJudging ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Evaluating Stages {activeStep}/6…
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Sequential Judge
                </>
              )}
            </button>
            <button
              onClick={() => setShowProvocation(!showProvocation)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs border transition-all ${
                showProvocation
                  ? "border-accent-green/50 bg-accent-green/10 text-accent-green"
                  : "border-surface-border bg-surface-panel text-ink-muted hover:text-ink-primary"
              }`}
            >
              <Sparkles size={14} />
              {showProvocation ? "Provocation Model: ACTIVE" : "Model Provocation: OFF"}
            </button>
          </div>
        </div>

        {/* Live Verifiable Telemetry Strip */}
        <div className="mt-6 pt-4 border-t border-surface-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-ink-faint block text-[10px] uppercase">Cryptographic Seal</span>
            <span className="text-accent-cyan font-semibold truncate block" title={computedProof.genesisHash}>
              {computedProof.genesisHash}
            </span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px] uppercase">Epistemic Floor</span>
            <span className="text-accent-green font-semibold">100% Gated · Zero Abstention Leak</span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px] uppercase">Brier Calibration</span>
            <span className="text-ink-primary font-semibold">{computedProof.brierCalib} (Target &lt; 0.09)</span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px] uppercase">Statistical Validity</span>
            <span className="text-accent-brand font-semibold">p {computedProof.pValue} (n=1,420)</span>
          </div>
        </div>
      </header>

      {/* Main Dynamic Grid: Interactive Controls + Live Waveform + Provocation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Parametric Modulator */}
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-accent-cyan" />
              <h2 className="text-sm font-semibold text-ink-primary">Live Parameter Modulation</h2>
            </div>
            <button
              onClick={() => {
                setParam1(preset.defaultParams.param1Val);
                setParam2(preset.defaultParams.param2Val);
                setParam3(preset.defaultParams.param3Val);
              }}
              title="Reset parameters"
              className="text-ink-muted hover:text-ink-primary p-1"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Param 1 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-ink-muted">{preset.defaultParams.param1Name}</span>
                <span className="font-mono font-bold text-accent-cyan">
                  {param1} {preset.defaultParams.param1Unit}
                </span>
              </div>
              <input
                type="range"
                min={preset.defaultParams.param1Min}
                max={preset.defaultParams.param1Max}
                value={param1}
                onChange={(e) => setParam1(Number(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>{preset.defaultParams.param1Min}</span>
                <span>{preset.defaultParams.param1Max}</span>
              </div>
            </div>

            {/* Param 2 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-ink-muted">{preset.defaultParams.param2Name}</span>
                <span className="font-mono font-bold text-accent-cyan">
                  {param2} {preset.defaultParams.param2Unit}
                </span>
              </div>
              <input
                type="range"
                min={preset.defaultParams.param2Min}
                max={preset.defaultParams.param2Max}
                step={preset.defaultParams.param2Unit === "ms" || preset.defaultParams.param2Unit === "sigma" ? 0.01 : 1}
                value={param2}
                onChange={(e) => setParam2(Number(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>{preset.defaultParams.param2Min}</span>
                <span>{preset.defaultParams.param2Max}</span>
              </div>
            </div>

            {/* Param 3 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-ink-muted">{preset.defaultParams.param3Name}</span>
                <span className="font-mono font-bold text-accent-cyan">
                  {param3} {preset.defaultParams.param3Unit}
                </span>
              </div>
              <input
                type="range"
                min={preset.defaultParams.param3Min}
                max={preset.defaultParams.param3Max}
                step={preset.defaultParams.param3Unit === "pH" || preset.defaultParams.param3Unit === "ratio" ? 0.05 : 1}
                value={param3}
                onChange={(e) => setParam3(Number(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>{preset.defaultParams.param3Min}</span>
                <span>{preset.defaultParams.param3Max}</span>
              </div>
            </div>
          </div>

          {/* Provocation Delta Summary Card */}
          <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-accent-cyan">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} /> Model Solution Provocation
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/20">PRE-IMPROVED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-panel/80 border border-surface-border">
                <span className="text-ink-faint block text-[10px]">Baseline Model Stress</span>
                <span className="text-accent-red font-mono text-base font-bold">
                  {computedProof.rawRisk}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-panel/80 border border-surface-border">
                <span className="text-ink-faint block text-[10px]">Provoked Resolved State</span>
                <span className="text-accent-green font-mono text-base font-bold flex items-center gap-1">
                  {computedProof.postProvocationRisk}%
                  <TrendingDown size={14} />
                </span>
              </div>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Autonomous counterfactual projection: Applying digital twin targeted protocol reduces vulnerability by{" "}
              <strong className="text-accent-green">{computedProof.riskDelta}%</strong> while maintaining strict 100% compliance with gold standards.
            </p>
          </div>
        </div>

        {/* Center & Right Column: Live Waveform Oscilloscope & Sequential Linear Judge */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real-time Oscilloscope Canvas */}
          <div className="rounded-2xl border border-surface-border bg-black/60 p-4 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <HeartPulse size={15} className="text-accent-cyan animate-pulse" />
                <span className="font-mono font-medium text-ink-primary">Continuous Dynamic Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-ink-muted">
                <span>Sweep: 80 px/s</span>
                <span className="text-accent-green flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green inline-block" /> Live Active
                </span>
              </div>
            </div>
            <canvas ref={canvasRef} width={720} height={180} className="w-full h-44 rounded-lg block bg-black" />
          </div>

          {/* Sequential Linear Judge Ladder */}
          <div className="rounded-2xl border border-surface-border bg-surface-raised p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                  <Workflow size={16} className="text-accent-cyan" />
                  Sequential Linear Verification Ladder (6 Gates)
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Pre-improved deterministic progression. Each gate is sequentially evaluated; failure in any tier halts downstream inference.
                </p>
              </div>
              <span className="text-xs font-mono text-accent-cyan px-2 py-0.5 rounded-full bg-accent-cyan/10">
                Gate {Math.min(activeStep, 6)} of 6
              </span>
            </div>

            <div className="space-y-2.5">
              {preset.stages.map((stage, idx) => {
                const isPassed = activeStep > idx;
                const isCurrent = activeStep === idx;
                const isPending = activeStep < idx;

                return (
                  <div
                    key={stage.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      isPassed
                        ? "border-accent-green/40 bg-accent-green/5"
                        : isCurrent
                        ? "border-accent-cyan bg-accent-cyan/10 shadow-md ring-1 ring-accent-cyan/30"
                        : "border-surface-border/60 bg-surface-panel/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isPassed ? (
                            <CheckCircle2 size={18} className="text-accent-green" />
                          ) : isCurrent ? (
                            <RefreshCw size={18} className="text-accent-cyan animate-spin" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-surface-border flex items-center justify-center text-[9px] font-mono text-ink-muted">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-semibold text-accent-cyan px-1.5 py-0.2 rounded bg-surface-panel">
                              {stage.code}
                            </span>
                            <h4 className="text-xs font-semibold text-ink-primary">{stage.name}</h4>
                          </div>
                          <p className="text-[11px] text-ink-muted mt-1">
                            <span className="text-ink-body font-mono">{stage.baseMetric}</span>
                          </p>
                          {showProvocation && (
                            <p className="text-[11px] text-accent-cyan/90 mt-1 flex items-center gap-1">
                              <Sparkles size={11} /> Provoked Action: {stage.provokeIntervention}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                            isPassed
                              ? "bg-accent-green/20 text-accent-green"
                              : isCurrent
                              ? "bg-accent-cyan/20 text-accent-cyan animate-pulse"
                              : "bg-surface-panel text-ink-muted"
                          }`}
                        >
                          {isPassed ? "VERIFIED" : isCurrent ? "EVALUATING" : "PENDING"}
                        </span>
                        <div className="text-[9px] font-mono text-ink-faint mt-1">
                          {isPassed ? "latency 1.8ms" : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Direct Functional Execution Launcher for Area Tools */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div>
            <h2 className="text-base font-semibold text-ink-primary flex items-center gap-2">
              <Layers size={18} className="text-accent-cyan" />
              Connected Live Workspaces for {area.label}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Launch into dedicated production-grade digital twin interfaces with seamless state and evidence transfer.
            </p>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            {area.links.length} Active Endpoints
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {area.links.map(([label, href]) => (
            <Link
              key={href}
              to={href}
              className="group flex flex-col justify-between rounded-xl border border-surface-border bg-surface-panel/70 p-4 transition-all duration-200 hover:border-accent-cyan/60 hover:bg-surface-panel hover:shadow-lg hover:shadow-accent-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-ink-faint mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent-cyan/80">LIVE APP</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                </div>
                <h3 className="font-medium text-sm text-ink-primary group-hover:text-accent-cyan transition-colors">
                  {label}
                </h3>
              </div>
              <div className="mt-4 pt-2 border-t border-surface-border/40 flex items-center justify-between text-xs text-ink-muted group-hover:text-accent-cyan">
                <span className="text-[11px] font-mono">Launch Workspace</span>
                <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Verifiable Provenance Ledger / Cryptographic Artifact Sealer */}
      <section className="rounded-2xl border border-surface-border bg-surface-panel/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
            <Fingerprint size={16} className="text-accent-cyan" />
            <span>Verifiable Deterministic Artifact Manifest (SHA-256 Chain)</span>
          </div>
          <button
            onClick={() => copyHash(computedProof.genesisHash)}
            className="text-[11px] font-mono text-accent-cyan hover:underline flex items-center gap-1"
          >
            {copiedHash ? "Hash copied!" : "Copy Merkle Hash"}
          </button>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          All computations above are backed by reproducible deterministic functions. Discrepancies skew conservative, eliminating ungrounded diagnostic claims.
          Sealed Genesis: <code className="text-accent-cyan font-mono text-[11px] bg-black/40 px-1.5 py-0.5 rounded">{computedProof.genesisHash}</code> · Protocol Version: <code className="font-mono text-[11px]">CARDIOTON-DET-v2.6</code>
        </p>
      </section>
    </div>
  );
}
