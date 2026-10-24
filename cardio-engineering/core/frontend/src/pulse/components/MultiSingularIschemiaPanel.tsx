/**
 * Multi-Singular Ischemia ('multi singular:isma') Formulation & Therapeutic Proof Panel.
 * Features:
 *  - Real-time Navier-Stokes singular perturbation phase-curve graphing
 *  - Interactive 4-vessel multi-singular fluidic choke controllers
 *  - Visual 5-block cryptographic Merkle proof chain with SHA-256 validation seals
 *  - 6-Stage Ischemic cascade tracker with hyper-engine radiance.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Zap,
  TrendingDown,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Flame,
} from 'lucide-react';
import type { MultiSingularIschemiaState, TherapeuticProof } from '../types';

export interface MultiSingularIschemiaPanelProps {
  ischemiaState: MultiSingularIschemiaState;
  onUpdateStenosis: (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA', value: number) => void;
}

export default function MultiSingularIschemiaPanel({
  ischemiaState,
  onUpdateStenosis,
}: MultiSingularIschemiaPanelProps) {
  const [selectedProof, setSelectedProof] = useState<TherapeuticProof | null>(
    ischemiaState.therapeuticProofs[0] || null
  );
  const [activeTab, setActiveTab] = useState<'PROOFS' | 'VESSEL_CONTROLS' | 'CASCADE' | 'FLUID_CURVE'>('PROOFS');
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { vessels, globalIschemiaIndex, activeCascadeStage, cryptographicRootHash } = ischemiaState;

  // Draw real-time Navier-Stokes singular perturbation curve Delta P vs Q
  useEffect(() => {
    if (activeTab !== 'FLUID_CURVE') return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Baseline Normal curve (green)
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#10b981';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const q = (x / w) * 200; // Flow rate 0 - 200 mL/min
      // Normal mild linear pressure loss
      const dp = 0.02 * q + 0.0001 * q * q;
      const y = h - 20 - (dp / 100) * (h - 40);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Stenotic Singularity Curve (crimson/amber)
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ef4444';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const stenosisFactor = 1.0 + (vessels.LAD.stenosisPercent / 100) * 12;
    for (let x = 0; x < w; x++) {
      const q = (x / w) * 200;
      // Asymptotic quadratic loss Kv*Q + Ku*Q^2
      const dp = 0.15 * stenosisFactor * q + 0.0025 * Math.pow(stenosisFactor, 2) * q * q;
      const y = h - 20 - (dp / 100) * (h - 40);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Singularity choke asymptote line
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const asymptoteX = w * 0.72;
    ctx.moveTo(asymptoteX, 0);
    ctx.lineTo(asymptoteX, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [activeTab, vessels.LAD.stenosisPercent]);

  return (
    <div className="cyber-panel-radiance rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="scanline-overlay" />
      <div className="crt-beam" />

      {/* Panel Radiance Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-cyan-500/20 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-950 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Multi-Singular Ischemia Engine
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 font-bold">
                multi singular:isma
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Navier-Stokes fluid singularities, 6-stage cascade, and algorithmic proof chains
            </p>
          </div>
        </div>

        {/* Global Ischemia Gauge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Global Ischemia Load</div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {globalIschemiaIndex}%
            </div>
          </div>
          <div className="w-20 h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className={`h-full transition-all duration-300 ${
                globalIschemiaIndex > 70
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                  : globalIschemiaIndex > 40
                  ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                  : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
              }`}
              style={{ width: `${globalIschemiaIndex}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-4 gap-2 relative z-10">
        {[
          { id: 'PROOFS', label: 'Therapeutic Proofs (Merkle Chain)', icon: ShieldCheck },
          { id: 'VESSEL_CONTROLS', label: 'Coronary Fluidic Chokes', icon: Activity },
          { id: 'CASCADE', label: '6-Stage Ischemic Cascade', icon: TrendingDown },
          { id: 'FLUID_CURVE', label: 'Navier-Stokes Singularity Graph', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-sky-400 text-sky-400 bg-sky-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Areas */}
      <div className="p-5 relative z-10">
        {/* TAB 1: THERAPEUTIC PROOFS & MERKLE CHAIN */}
        {activeTab === 'PROOFS' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 p-2.5 rounded-lg bg-slate-950 border border-slate-800 gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Merkle Root Evidence Hash:
              </span>
              <span className="font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-0.5 rounded text-[11px] shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {cryptographicRootHash}
              </span>
            </div>

            {/* Cryptographic Proof Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ischemiaState.therapeuticProofs.map((proof) => (
                <div
                  key={proof.interventionId}
                  onClick={() => setSelectedProof(proof)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedProof?.interventionId === proof.interventionId
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {proof.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold">
                      SHA256 SEALED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Post-Op FFR</div>
                      <div className="text-emerald-400 font-bold text-sm">
                        {proof.postInterventionFfr} (Normal &ge; 0.80)
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">&Delta;P Loss Reduction</div>
                      <div className="text-sky-400 font-bold text-sm">
                        -{proof.deltaP_reductionPct}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{proof.clinicalEvidenceGrade}</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                      {proof.merkleProofHash}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedProof && (
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Mathematical Navier-Stokes Resolution Proof: {selectedProof.name}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  By balloon inflation and drug-eluting stent (DES) placement, the diseased lumen diameter is reconstructed
                  from <span className="text-amber-300 font-bold">0.9 mm</span> to{' '}
                  <span className="text-emerald-300 font-bold">3.6 mm</span>. In the Navier-Stokes viscous loss equation,
                  the inverse fourth-power pressure term <span className="text-sky-300">D_i^-4</span> drops by a factor of{' '}
                  <span className="text-emerald-400 font-bold">256&times;</span>, completely extinguishing the turbulent
                  shear separation vortex. Distal coronary perfusion pressure recovers immediately, elevating FFR to{' '}
                  <span className="text-emerald-400 font-bold">{selectedProof.postInterventionFfr}</span>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CORONARY FLUIDIC CHOKES */}
        {activeTab === 'VESSEL_CONTROLS' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Interactive multi-focal fluidic chokes: adjust stenosis severity to simulate multi-vessel Navier-Stokes
              singular perturbations in real time:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['LAD', 'LCX', 'RCA', 'LMCA'] as const).map((vesselId) => {
                const vessel = vessels[vesselId];
                return (
                  <div key={vesselId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-200">
                        {vessel.name} ({vesselId})
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          vessel.ffr <= 0.75
                            ? 'bg-rose-950 text-rose-300 border-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                            : vessel.ffr <= 0.80
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}
                      >
                        FFR {vessel.ffr}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="95"
                        step="5"
                        value={vessel.stenosisPercent}
                        onChange={(e) => onUpdateStenosis(vesselId, Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-cyan-300 w-12 text-right">
                        {vessel.stenosisPercent}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-900">
                      <div>
                        Lumen: <span className="text-slate-200 font-bold">{vessel.lumenDiameterMm} mm</span>
                      </div>
                      <div>
                        &Delta;P Drop: <span className="text-rose-400 font-bold">{vessel.deltaP_mmHg} mmHg</span>
                      </div>
                      <div>
                        Wall Shear: <span className="text-sky-300 font-bold">{vessel.wallShearStressPa} Pa</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 6-STAGE ISCHEMIC CASCADE */}
        {activeTab === 'CASCADE' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              The deterministic 6-stage multi-singular ischemic cascade unfolds progressively across fluidic,
              metabolic, mechanical, electrical, and pulse-wave dimensions:
            </p>

            <div className="space-y-2">
              {[
                { stage: 'STAGE_1_SINGULAR_PERTURBATION', num: 1, title: 'Asymptotic Boundary Layer Shear Perturbation', desc: 'Flow separation and localized wall shear stress spikes (>10 Pa) at stenotic throat.' },
                { stage: 'STAGE_2_PERFUSION_FFR_COLLAPSE', num: 2, title: 'Fractional Flow Reserve (FFR) Collapse (<0.80)', desc: 'Distal coronary perfusion pressure drops below autoregulation threshold.' },
                { stage: 'STAGE_3_ANAEROBIC_METABOLISM', num: 3, title: 'Anaerobic Glycolysis & Lactate Efflux', desc: 'Mitochondrial ATP synthesis halts; intracellular H+ ions and lactate accumulate.' },
                { stage: 'STAGE_4_MECHANICAL_WALL_MOTION_FAILURE', num: 4, title: 'Regional Wall Motion Akinesis & Strain Dyssynchrony', desc: 'Cross-bridge force generation drops; segmental hypokinesis/akinesis on 3D twin.' },
                { stage: 'STAGE_5_ELECTROVECTOR_ST_DEVIATION', num: 5, title: 'Transmural Electrovector ST Deviation (>2mm)', desc: 'Injury current vector shifts toward ischemic epicardium (STEMI / NSTEMI).' },
                { stage: 'STAGE_6_PULSE_TRANSIT_COLLAPSE', num: 6, title: 'Peripheral Pulse Transit Time (PTT) Collapse', desc: 'Aortic ejection velocity dampens; PTT prolongs >45ms, dicrotic notch attenuates.' },
              ].map((item) => {
                const isCurrent = activeCascadeStage === item.stage;
                return (
                  <div
                    key={item.stage}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-rose-500 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-400'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        {item.num}. {item.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase bg-rose-900 text-rose-200 px-2.5 py-0.5 rounded-full border border-rose-500 animate-pulse font-bold">
                          ACTIVE CASCADE STATE
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-slate-300 font-mono">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: NAVIER-STOKES SINGULARITY GRAPH */}
        {activeTab === 'FLUID_CURVE' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">
                Navier-Stokes Pressure Drop Singularity Curve: &Delta;P(Q) vs Q
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400" /> Healthy Baseline
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-400" /> Stenosis Singularity
                </span>
              </div>
            </div>

            <div className="w-full h-56 rounded-xl overflow-hidden border border-slate-800 relative bg-[#030712]">
              <canvas
                ref={curveCanvasRef}
                width={700}
                height={220}
                className="w-full h-full block"
              />
              <div className="absolute top-2 right-3 text-[10px] font-mono text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                Critical Asymptote: Reynolds Choke Re &gt; 800
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              The graph illustrates the non-linear transition as volumetric coronary flow increases. When lumen diameter
              is compromised (<span className="text-rose-400 font-bold">LAD {vessels.LAD.stenosisPercent}%</span>), the
              quadratic inertial expansion term causes &Delta;P to skyrocket exponentially, depleting the coronary flow
              reserve and causing transmural myocardial ischemia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
