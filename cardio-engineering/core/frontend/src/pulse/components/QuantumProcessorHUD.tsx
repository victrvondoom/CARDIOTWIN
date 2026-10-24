/**
 * Hyper-Focused Quantum Cardio-Core Processor HUD.
 * Renders hardware-level engine metrics: multi-core bio-fluidic compute,
 * SIMD vector register banks, Navier-Stokes TFLOPS throughput, and memory clock rates.
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, HardDrive, Gauge, ShieldCheck, Terminal, Radio } from 'lucide-react';
import type { MultiSingularIschemiaState } from '../types';

export interface QuantumProcessorHUDProps {
  ischemiaState: MultiSingularIschemiaState;
  heartRate: number;
}

export default function QuantumProcessorHUD({
  ischemiaState,
  heartRate,
}: QuantumProcessorHUDProps) {
  const [clockJitter, setClockJitter] = useState<number>(4.28);
  const [hexCycle, setHexCycle] = useState<string>('0x7F9B2C4D');
  const [tflops, setTflops] = useState<number>(142.6);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockJitter(Number((4.20 + Math.random() * 0.16).toFixed(2)));
      setTflops(Number((140.0 + Math.random() * 5.2).toFixed(1)));
      const randHex = Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0');
      setHexCycle(`0x${randHex}`);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const cores = [
    {
      id: 'CORE_0',
      label: 'LAD Navier-Stokes Solver',
      vessel: 'LAD',
      freq: `${clockJitter} GHz`,
      load: `${Math.min(99, 45 + ischemiaState.vessels.LAD.stenosisPercent * 0.55).toFixed(1)}%`,
      status: ischemiaState.vessels.LAD.ffr <= 0.75 ? 'CRITICAL_LOAD' : 'NOMINAL',
    },
    {
      id: 'CORE_1',
      label: 'LCx Recirculation Vortex Engine',
      vessel: 'LCX',
      freq: '4.18 GHz',
      load: `${Math.min(99, 40 + ischemiaState.vessels.LCX.stenosisPercent * 0.50).toFixed(1)}%`,
      status: ischemiaState.vessels.LCX.ffr <= 0.75 ? 'CRITICAL_LOAD' : 'NOMINAL',
    },
    {
      id: 'CORE_2',
      label: 'RCA Microvascular Autoregulator',
      vessel: 'RCA',
      freq: '4.12 GHz',
      load: `${Math.min(99, 35 + ischemiaState.vessels.RCA.stenosisPercent * 0.45).toFixed(1)}%`,
      status: 'NOMINAL',
    },
    {
      id: 'CORE_3',
      label: 'Aortic Waveguide & PWV Pulse Bus',
      vessel: 'LMCA',
      freq: '4.32 GHz',
      load: `${(60 + (heartRate / 180) * 35).toFixed(1)}%`,
      status: 'ACCELERATED',
    },
    {
      id: 'CORE_4',
      label: 'Moss WASM 1024-bit In-Process Memory',
      vessel: 'WASM',
      freq: 'Direct RAM',
      load: '3.2 ms P50',
      status: 'ZERO_IO',
    },
  ];

  return (
    <div className="cyber-panel-radiance rounded-2xl p-4 text-xs font-mono select-none overflow-hidden relative">
      <div className="scanline-overlay" />
      <div className="crt-beam" />

      {/* TOP ENGINE CORE STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-wider">
                QUANTUM CARDIO-CORE V9.8
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                HYPER-ENGINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Parallel Navier-Stokes Fluidics · 1024-Bit WASM Interconnect
            </div>
          </div>
        </div>

        {/* Engine Hardware Gauges */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-400 uppercase">Compute Throughput</span>
            <span className="text-cyan-400 font-bold">{tflops} TFLOPS</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-400 uppercase">Core Clock</span>
            <span className="text-emerald-400 font-bold">{clockJitter} GHz</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-400 uppercase">Memory Register</span>
            <span className="text-amber-400 font-bold">{hexCycle}</span>
          </div>
        </div>
      </div>

      {/* MULTI-CORE WORKLOAD MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-3 relative z-10">
        {cores.map((core) => {
          const isCritical = core.status === 'CRITICAL_LOAD';
          return (
            <div
              key={core.id}
              className={`p-2.5 rounded-xl border transition-all ${
                isCritical
                  ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-slate-400">{core.id}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    isCritical
                      ? 'bg-rose-900/80 text-rose-300'
                      : core.status === 'ZERO_IO'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-cyan-950 text-cyan-300'
                  }`}
                >
                  {core.status}
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate" title={core.label}>
                {core.label}
              </div>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">{core.freq}</span>
                <span className={isCritical ? 'text-rose-400 font-bold' : 'text-cyan-300 font-bold'}>
                  {core.load}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
