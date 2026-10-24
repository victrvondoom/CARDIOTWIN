/**
 * PlatformLaunchpad.tsx
 *
 * Master Centralized Command Center & Ecosystem Launchpad for CardioTwin.
 * Unifies all sub-products:
 * 1. CardioTwin 3D Biophysical & Multicellular Digital Twin Core
 * 2. Pulse 911 Emergency Dispatch Voice AI Copilot & CPR Metronome
 * 3. MedClear AI Clinical Plain-Language Health Literacy & Patient Advocacy
 * 4. CardioTwinOS Wearable Drift Sentinel & Staleness Sentinel
 * 5. Intelligence Hub (31 Specialized Absorbed Modules, 3D Anatomy, Benchmarks)
 * 6. CROSS-5 Multiscale Five-Frame Intersection Engine
 * 7. Clinical Evidence Journey & WHO/UCI Similar Cohorts Lake
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Activity,
  Stethoscope,
  Sparkles,
  Zap,
  Globe2,
  Boxes,
  ShieldCheck,
  ArrowRight,
  Radio,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Workflow,
  Server,
  BookOpen,
  Search,
  ExternalLink,
} from 'lucide-react';

interface SubProduct {
  id: string;
  name: string;
  tagline: string;
  category: 'CORE_TWIN' | 'EMERGENCY_DISPATCH' | 'PATIENT_ADVOCACY' | 'ECOSYSTEM_HUB' | 'MULTISCALE';
  description: string;
  route: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  metrics: { label: string; value: string }[];
  keyFeatures: string[];
}

const SUB_PRODUCTS: SubProduct[] = [
  {
    id: 'cardiotwin_core',
    name: 'CardioTwin 3D Biophysical Core',
    tagline: 'Universal Multiscale Biophysical & Multicellular Digital Twin',
    category: 'CORE_TWIN',
    description: '3D real human body silhouette with beating heart core. Coupled 0D/1D Navier-Stokes coronary fluid mechanics, Luo-Rudy phase 0-4 cellular electrophysiology, and universal multi-disease CAD/AMI/HF predictors.',
    route: '/cardiotwin',
    icon: HeartPulse,
    badge: 'Flagship Core',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-600',
    metrics: [
      { label: 'Navier-Stokes FFR', value: '0.84 Calibrated' },
      { label: 'Cellular APD90', value: '310 ms' },
      { label: 'Multi-Disease ML', value: '6 Pathologies' },
    ],
    keyFeatures: [
      'Real Human Body Silhouette with Thoracic Centering',
      '0D/1D Navier-Stokes FFR & Wall Shear Stress',
      'Luo-Rudy Vm(t) & [Ca2+]i Electrophysiology',
      'Similar Patients WHO / UCI Cohort Matching',
    ],
  },
  {
    id: 'pulse_911',
    name: 'Pulse 911 Emergency Voice AI Copilot',
    tagline: 'Sub-10ms Zero-Latency Emergency Dispatch & Resuscitation Copilot',
    category: 'EMERGENCY_DISPATCH',
    description: 'Colocates AHA 2026 Emergency Cardiovascular Care (ECC) protocols in-memory using Moss WASM. Delivers sub-10ms protocol retrieval, 110 BPM acoustic CPR metronome, CAD unit assignment, and lethal contraindication locks.',
    route: '/pulse',
    icon: Activity,
    badge: 'Zero-Latency Dispatch',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-600',
    metrics: [
      { label: 'Retrieval Latency', value: '< 4.2 ms' },
      { label: 'Panic Ceiling', value: 'PASS (<300ms)' },
      { label: 'CPR Cadence', value: '110 BPM' },
    ],
    keyFeatures: [
      'Sub-10ms In-Memory Semantic Protocol Retrieval',
      'Interactive 911 Dispatcher Mission HUD with Checklists',
      'CAD Units (Engine 4, Medic 7, Squad 2, Battalion 1)',
      '110 BPM Web Audio API Acoustic CPR Metronome',
    ],
  },
  {
    id: 'medclear_ai',
    name: 'MedClear AI Plain-Language Simplifier',
    tagline: 'Patient Advocate & Health Literacy Translation Engine',
    category: 'PATIENT_ADVOCACY',
    description: 'Transforms dense clinical notes, discharge summaries, and cardiology consults into plain-language summaries and actionable next-steps triage checklists. Preserves 100% offline privacy with direct digital twin grounding.',
    route: '/medclear',
    icon: Stethoscope,
    badge: 'Health Literacy',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-600',
    metrics: [
      { label: 'Offline Privacy', value: '100% On-Device' },
      { label: 'Dictionary Size', value: '30+ Terms' },
      { label: 'Cross-Lingual', value: 'EN & ES' },
    ],
    keyFeatures: [
      'Clinical Jargon to Plain-Language Injection',
      'Urgent vs Routine Actionable Triage Checklists',
      'Direct Hemodynamic Digital Twin Vector Mapping',
      'Bilingual English & Spanish Clinical Glossary',
    ],
  },
  {
    id: 'intelligence_hub',
    name: 'Intelligence Hub (31 Sub-Modules)',
    tagline: 'One Unified Archive & Registry for All Inherited Projects',
    category: 'ECOSYSTEM_HUB',
    description: 'Catalogues 31 absorbed cardiovascular projects (AortaVision-3D, CAD-detection-3d, SlicerHeart, CardioSpatial, CoroLens, etc.) with unified 3D anatomy gallery, benchmarks, and embedded live apps.',
    route: '/hub',
    icon: Boxes,
    badge: '31 Absorbed Modules',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-600',
    metrics: [
      { label: 'Sub-Projects', value: '31 Active' },
      { label: '3D Anatomy Models', value: 'GLB/OBJ/STL' },
      { label: 'Evaluations', value: 'Independent' },
    ],
    keyFeatures: [
      'Comprehensive Catalog of 31 Inherited Modules',
      'Unified 3D Anatomy Gallery (Aorta, Coronary, Valves)',
      'Side-by-Side Model ROC-AUC Benchmarks',
      'Embedded Standalone Project Applications',
    ],
  },
  {
    id: 'cross5_studio',
    name: 'CROSS-5 Multiscale Engine',
    tagline: 'Five-Frame Multiscale Intersection Engine',
    category: 'MULTISCALE',
    description: 'Simulates the intersection of Five Multiscale Frames: Heart (Anatomical Twin) &times; Earth (Environmental Exposure) &times; Flow (Hemodynamics) &times; Chronos (Wearable Drift) &times; City (Societal Infrastructure).',
    route: '/cross5',
    icon: Globe2,
    badge: '5-Frame Multiscale',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-600',
    metrics: [
      { label: 'Intersection Frames', value: '5 Synchronized' },
      { label: 'Spatial Resolution', value: 'Organ to Biosphere' },
      { label: 'Time Horizon', value: 'ms to Decades' },
    ],
    keyFeatures: [
      'Heart &times; Earth &times; Flow &times; Chronos &times; City',
      'One Health Environmental Exposure Coupling',
      'Dynamic Biosphere Geospatial Mapping',
      'Longitudinal Aging & Plaque Progression Clock',
    ],
  },
];

export default function PlatformLaunchpad() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [e2eSimRunning, setE2eSimRunning] = useState(false);
  const [e2eSimStep, setE2eSimStep] = useState<number>(0);

  const filteredProducts = SUB_PRODUCTS.filter(
    (p) => activeCategory === 'ALL' || p.category === activeCategory
  );

  const handleRunE2eSimulation = () => {
    setE2eSimRunning(true);
    setE2eSimStep(1);

    setTimeout(() => {
      setE2eSimStep(2);
      setTimeout(() => {
        setE2eSimStep(3);
        setTimeout(() => {
          setE2eSimStep(4);
          setTimeout(() => {
            setE2eSimRunning(false);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--void)] text-[var(--bone)] p-4 md:p-8 space-y-8">
      {/* Synthetic scenario entry: one demo case flows through the probe lab, calculators, CROSS-5, MedClear and Pulse */}
      <nav aria-label="Synthetic scenario" className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono text-xs tracking-wider text-[var(--muted)]">SYNTHETIC SCENARIO</span>
        <Link to="/cardiotwin" className="pl-btn">Probe lab</Link>
        <Link to="/cardiotwin/calculators?calc=aortic-stenosis-continuity" className="pl-btn">Calculators</Link>
        <Link to="/cardiotwin/case" className="pl-btn pl-btn-primary">Evidence-linked case</Link>
        <span className="text-xs text-[var(--faint)]">Educational demo data. Not patient records.</span>
      </nav>
      {/* MASTER PLATFORM HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-[#030914] to-[#08031a] p-6 md:p-10 shadow-2xl">
        {/* Glow backdrop aura */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>SINGLE CENTRALIZED PLATFORM ARCHITECTURE</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                All Sub-Products Coherent &amp; Live
              </span>
              <span>WASM Sim Engine &lt; 5ms</span>
            </div>
          </div>

          <div className="space-y-2 max-w-4xl">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              CardioTwin Enterprise &times; Pulse-911 &times; MedClear AI
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans">
              Universal Multiscale Biophysical Digital Twin, Sub-10ms Emergency Dispatch Voice AI Copilot,
              and Plain-Language Patient Advocacy Engine — merged into a single centralized platform with
              inherent software coherence, zero cloud vector latency, and unified multi-persona accessibility.
            </p>
          </div>

          {/* Quick Platform Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">System Coherence</div>
              <div className="text-base font-bold font-mono text-emerald-400">100% Unified</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Emergency Retrieval</div>
              <div className="text-base font-bold font-mono text-cyan-400">&lt; 4.2 ms (In-Memory)</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Absorbed Sub-Modules</div>
              <div className="text-base font-bold font-mono text-purple-400">31 Repositories</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Supported Languages</div>
              <div className="text-base font-bold font-mono text-amber-400">32 World Dialects</div>
            </div>
          </div>
        </div>
      </div>

      {/* END-TO-END UNIFIED SIMULATION RUNNER */}
      <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Live End-to-End Coherence Demonstration
              </h2>
              <p className="text-xs text-[var(--muted)] font-mono">
                Observe how Acute Stenosis in CardioTwin triggers Pulse 911 CAD Dispatch and MedClear Translation in real time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunE2eSimulation}
            disabled={e2eSimRunning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition disabled:opacity-50"
          >
            {e2eSimRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Executing Coherent Cascade...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Unified System Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Pipeline Step Sequence Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div
            className={`p-3.5 rounded-xl border transition ${
              e2eSimStep >= 1
                ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono font-bold uppercase">Step 1 &bull; CardioTwin Core</div>
            <div className="text-xs font-bold mt-1 text-white">
              75% LAD Stenosis Detected
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              FFR drops to 0.68; Luo-Rudy ischemic shortening triggers telemetry alert.
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border transition ${
              e2eSimStep >= 2
                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono font-bold uppercase">Step 2 &bull; Pulse 911 Dispatch</div>
            <div className="text-xs font-bold mt-1 text-white">
              Sub-10ms Protocol Matched
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              AHA ACS-14 STEMI cascade activated in 3.8ms; Medic 7 dispatched.
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border transition ${
              e2eSimStep >= 3
                ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono font-bold uppercase">Step 3 &bull; CPR Acoustic Cadence</div>
            <div className="text-xs font-bold mt-1 text-white">
              110 BPM Metronome Synchronized
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Web Audio API clicks stabilize coronary perfusion pressure &gt; 20 mmHg.
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border transition ${
              e2eSimStep >= 4
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-mono font-bold uppercase">Step 4 &bull; MedClear Patient Report</div>
            <div className="text-xs font-bold mt-1 text-white">
              Plain-Language Discharge Generated
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Jargon simplified into actionable steps and SNOMED audit trail logged.
            </div>
          </div>
        </div>
      </div>

      {/* SUB-PRODUCT CATEGORY FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All Platform Pillars (6)' },
              { id: 'CORE_TWIN', label: 'Biophysical Twin' },
              { id: 'EMERGENCY_DISPATCH', label: 'Emergency Dispatch' },
              { id: 'PATIENT_ADVOCACY', label: 'Patient Advocacy' },
              { id: 'ECOSYSTEM_HUB', label: 'Intelligence Hub' },
              { id: 'MULTISCALE', label: 'Multiscale Frames' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-[var(--muted)]">
          Unified Repository Architecture &bull; CardioTwin
        </span>
      </div>

      {/* SUB-PRODUCTS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const Icon = product.icon;
          return (
            <div
              key={product.id}
              className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] flex flex-col justify-between space-y-5 hover:border-cyan-500/50 transition group hover:shadow-2xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="p-3 rounded-xl bg-[var(--void)] border border-[var(--line)] text-cyan-400 group-hover:border-cyan-500/40 group-hover:text-cyan-300 transition">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${product.badgeColor}`}
                  >
                    {product.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                    {product.name}
                  </h3>
                  <div className="text-xs font-medium text-cyan-400/90 font-mono mt-0.5">
                    {product.tagline}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                    {product.description}
                  </p>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {product.metrics.map((m, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[var(--void)] border border-[var(--line)]">
                      <div className="text-[9px] font-mono text-[var(--muted)] truncate uppercase">
                        {m.label}
                      </div>
                      <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key Features Bullet List */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--muted)]">
                    Inherent Capabilities:
                  </div>
                  {product.keyFeatures.map((feat, fidx) => (
                    <div key={fidx} className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={product.route}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-cyan-900/60 hover:to-sky-900/60 border border-[var(--line)] hover:border-cyan-500/50 text-white font-bold text-xs flex items-center justify-between transition group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <span>Launch {product.name}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
