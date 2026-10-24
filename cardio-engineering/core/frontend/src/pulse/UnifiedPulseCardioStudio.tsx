/**
 * Master Unified CARDIO-INTELLIGENCE & Pulse Studio.
 * Built with Ultra Graphical Radiance at the Hyper-Core Engine Level.
 * Integrates 3D cardiovascular simulation, synchronized multisign signals,
 * multi-singular ischemia mathematics, 32 world languages, Quantum Processor HUD,
 * and dual-view orchestration.
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Radio,
  Activity,
  HeartPulse,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import type {
  WorldLanguageCode,
  EmergencyProtocol,
  TriageOutcome,
  MultisignTelemetry,
} from './types';
import { WORLD_LANGUAGES, getTranslations } from './engine/multilingualWorldMatrix';
import { EMERGENCY_PROTOCOLS, getProtocolById } from './engine/emergencyProtocols';
import { evaluateMultiSingularIschemia } from './engine/multiSingularIschemiaEngine';
import { mossEngine } from './engine/mossEngine';
import PulseCardio3DScene, { type PulseCardioViewMode } from './components/PulseCardio3DScene';
import MultisignSignalMonitor from './components/MultisignSignalMonitor';
import MultiSingularIschemiaPanel from './components/MultiSingularIschemiaPanel';
import DualOrchestrationView from './components/DualOrchestrationView';
import LatencyBenchmarkComparison from './components/LatencyBenchmarkComparison';
import QuantumProcessorHUD from './components/QuantumProcessorHUD';
import './pulseCyberEngine.css';

export default function UnifiedPulseCardioStudio() {
  // Global Studio State
  const [language, setLanguage] = useState<WorldLanguageCode>('en');
  const [viewMode, setViewMode] = useState<PulseCardioViewMode>('FULL_TWIN');
  const [activeProtocolId, setActiveProtocolId] = useState<string>('CARD-01');
  const [heartRate, setHeartRate] = useState<number>(110);
  const [rhythm, setRhythm] = useState<MultisignTelemetry['rhythmStatus']>('NSR');
  const [selectedVessel, setSelectedVessel] = useState<'LAD' | 'LCX' | 'RCA' | 'LMCA' | null>('LAD');

  // Multi-Singular Stenoses
  const [stenoses, setStenoses] = useState({
    LAD: 75,
    LCX: 65,
    RCA: 45,
    LMCA: 30,
  });

  // Retrieval search state
  const [lastOutcome, setLastOutcome] = useState<TriageOutcome | null>(null);

  // Derived Multi-Singular Ischemia State
  const ischemiaState = useMemo(() => {
    return evaluateMultiSingularIschemia(stenoses);
  }, [stenoses]);

  const currentProtocol = useMemo(() => {
    return getProtocolById(activeProtocolId) || EMERGENCY_PROTOCOLS[0];
  }, [activeProtocolId]);

  const translations = getTranslations(language);

  const handleUpdateStenosis = (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA', value: number) => {
    setStenoses((prev) => ({ ...prev, [vessel]: value }));
  };

  const handleSearchQuery = (query: string) => {
    const outcome = mossEngine.query(query);
    setLastOutcome(outcome);
    if (outcome.status === 'matched') {
      setActiveProtocolId(outcome.protocol.id);
      if (outcome.protocol.cadenceBpm) {
        setHeartRate(outcome.protocol.cadenceBpm);
      }
      if (outcome.protocol.id === 'ACS-14') {
        setRhythm('STEMI');
      } else if (outcome.protocol.id === 'CARD-01') {
        setRhythm('VFIB');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#02050c] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white quantum-grid-bg relative overflow-x-hidden">
      {/* Laser Top Glow Beam */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent pointer-events-none z-50 shadow-[0_0_20px_rgba(6,182,212,0.8)]" />

      {/* TOP STUDIO COMMAND RIBBON */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-b border-cyan-500/20 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-600 to-red-800 shadow-[0_0_25px_rgba(244,63,94,0.5)] border border-rose-400/40 text-white">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-extrabold tracking-wider text-white flex items-center gap-2">
                CARDIO-INTELLIGENCE &times; Pulse-911
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                HYPER-CORE V9.8
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {translations.subTitle}
            </p>
          </div>
        </div>

        {/* Global Controls: 3D Mode & 32-Language Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 3D View Mode Tabs */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            {(
              [
                { id: 'FULL_TWIN', label: '3D Full Twin' },
                { id: 'ISCHEMIA_SINGULARITIES', label: 'Ischemia Singularities' },
                { id: 'PULSE_TRANSIT', label: 'Pulse Wave Particles' },
                { id: 'DISPATCH_THEATER', label: 'CAD Theater' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                  viewMode === mode.id
                    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* 32-World-Language Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as WorldLanguageCode)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-bold font-mono"
            >
              {WORLD_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* HARDWARE QUANTUM PROCESSOR HUD STRIP */}
      <div className="px-6 pt-4">
        <QuantumProcessorHUD
          ischemiaState={ischemiaState}
          heartRate={heartRate}
        />
      </div>

      {/* SUB-HEADER PROTOCOL SELECTOR RIBBON */}
      <div className="px-6 py-2.5 bg-slate-950/70 border-y border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap font-bold">
            Active CAD Protocol:
          </span>
          {EMERGENCY_PROTOCOLS.slice(0, 7).map((proto) => (
            <button
              key={proto.id}
              type="button"
              onClick={() => {
                setActiveProtocolId(proto.id);
                if (proto.cadenceBpm) setHeartRate(proto.cadenceBpm);
                if (proto.id === 'ACS-14') setRhythm('STEMI');
                else if (proto.id === 'CARD-01') setRhythm('VFIB');
                else setRhythm('NSR');
              }}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold whitespace-nowrap transition border ${
                activeProtocolId === proto.id
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {proto.code} ({proto.id})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            WASM Sim Engine: &lt;10ms
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Zero Panic Ceiling
          </span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKFLOW GRID */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 3D Scene + Multisign Oscilloscope (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col space-y-6">
          {/* 3D Scene Viewport */}
          <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] relative bg-[#030712]">
            <PulseCardio3DScene
              viewMode={viewMode}
              ischemiaState={ischemiaState}
              heartRate={heartRate}
              language={language}
              selectedVessel={selectedVessel}
              onSelectVessel={setSelectedVessel}
            />

            {/* 3D Scene Floating Info Chip */}
            <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs font-mono shadow-2xl pointer-events-none">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                {viewMode === 'FULL_TWIN' && '3D Bio-Digital Twin Hologram'}
                {viewMode === 'ISCHEMIA_SINGULARITIES' && 'Coronary Singularities & FFR Chokes'}
                {viewMode === 'PULSE_TRANSIT' && 'Dynamic Arterial Pulse Wave Particles'}
                {viewMode === 'DISPATCH_THEATER' && '3D Spatial Dispatch & Telemetry Grid'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Click vessel chokes to inspect · Left drag to orbit · Scroll to zoom
              </div>
            </div>
          </div>

          {/* Synchronized 5-Channel Multisign Signal Monitor */}
          <MultisignSignalMonitor
            heartRate={heartRate}
            ischemiaSeverityPct={ischemiaState.globalIschemiaIndex}
            rhythm={rhythm}
            onChangeRhythm={setRhythm}
          />
        </div>

        {/* RIGHT COLUMN: Dual Orchestrator + Multi-Singular Ischemia + Latency Benchmark (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-6">
          {/* Dual-View Orchestration Command Center */}
          <DualOrchestrationView
            currentProtocol={currentProtocol}
            language={language}
            onSearchQuery={handleSearchQuery}
            lastSearchOutcome={lastOutcome}
          />

          {/* Multi-Singular Ischemia Engine & Therapeutic Proofs */}
          <MultiSingularIschemiaPanel
            ischemiaState={ischemiaState}
            onUpdateStenosis={handleUpdateStenosis}
          />

          {/* In-Process Moss WASM Latency Benchmark */}
          <LatencyBenchmarkComparison
            currentLatencyMs={lastOutcome ? lastOutcome.latencyMs : 3.2}
          />
        </div>
      </main>
    </div>
  );
}
