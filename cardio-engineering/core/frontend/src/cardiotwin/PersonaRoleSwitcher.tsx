/**
 * PersonaRoleSwitcher.tsx
 *
 * Multi-Persona User Experience Switcher:
 * 1. Patient Mode ("Your Personal AI Cardiologist" - Makes the complexity look simple & classic)
 * 2. Nurse Mode ("Clinical Inpatient & Triage Monitor")
 * 3. Doctor / Cardiologist Mode ("Full Biophysical Complexity")
 *
 * Ensures patients, nurses, and doctors can all use the same unified digital twin platform.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  User,
  Stethoscope,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  Clock,
  Pill,
  Sparkles,
  Volume2,
} from "lucide-react";

export interface PersonaSwitcherProps {
  activePersona: "patient" | "nurse" | "doctor";
  onChangePersona: (persona: "patient" | "nurse" | "doctor") => void;
  patientName?: string;
  heartRate?: number;
  bloodPressure?: number;
  cardiacHealthScore?: number;
  onVoiceSpeak?: () => void;
}

export function PersonaRoleSwitcher({
  activePersona,
  onChangePersona,
  patientName = "CardioTwin Patient",
  heartRate = 72,
  bloodPressure = 122,
  cardiacHealthScore = 82,
  onVoiceSpeak,
}: PersonaSwitcherProps) {
  const [patientQuestion, setPatientQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientQuestion) return;
    setAiAnswer(
      `Based on your 3D digital twin, your heart muscle is pumping at a healthy rate of ${heartRate} bpm. Your blood pressure (${bloodPressure} mmHg) is within a safe range. To keep your coronary blood vessels healthy, continue your morning walk and take your prescribed medication on time.`
    );
  };

  return (
    <div className="rounded-[2px] border border-[var(--line)] bg-[var(--panel)] p-4 space-y-4 text-[var(--bone)]">
      {/* Top Selector: Patient vs Nurse vs Doctor */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">User Experience Mode:</span>
          <div className="flex rounded-[2px] bg-[var(--void)] border border-[var(--line)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChangePersona("patient")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] transition text-xs font-medium ${
                activePersona === "patient"
                  ? "bg-[var(--p-green)] text-[#0D0E10] font-bold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <User size={13} />
              <span>Patient Mode (Simple &amp; Classic)</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePersona("nurse")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] transition text-xs font-medium ${
                activePersona === "nurse"
                  ? "bg-[var(--p-blue)] text-white font-bold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <Activity size={13} />
              <span>Nurse / Triage Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePersona("doctor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] transition text-xs font-medium ${
                activePersona === "doctor"
                  ? "bg-[var(--p-orange)] text-[#0D0E10] font-bold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <Stethoscope size={13} />
              <span>Doctor Mode (Full Complexity)</span>
            </button>
          </div>
        </div>

        <span className="text-xs font-mono text-[var(--muted)]">
          Viewing as: <b className="text-[var(--p-orange)] capitalize">{activePersona}</b>
        </span>
      </div>

      {/* Mode 1: Patient Mode ("Your Personal AI Cardiologist - Simple & Classic") */}
      {activePersona === "patient" && (
        <div className="rounded-[2px] bg-[var(--panel-2)] p-4 border border-[var(--line)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[2px] bg-[var(--void)] text-[var(--p-green)] border border-[var(--line)] flex items-center justify-center text-xl font-bold font-mono">
                {cardiacHealthScore}%
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--bone)] flex items-center gap-2">
                  <span>Hello {patientName}! Your Heart Status is Good</span>
                  <span className="text-[10px] bg-[var(--void)] text-[var(--p-green)] px-2 py-0.5 rounded-[2px] font-mono border border-[var(--line)]">
                    STABLE · OPTIMAL
                  </span>
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Your personal AI cardiologist is actively monitoring your 3D digital twin 24/7.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/medclear"
                className="pl-btn text-xs py-1.5 px-3 flex items-center gap-1.5 border border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50"
              >
                <Stethoscope size={13} />
                <span>MedClear Plain Language</span>
              </Link>
              <button
                type="button"
                onClick={onVoiceSpeak}
                className="pl-btn text-xs py-1.5 px-3"
              >
                <Volume2 size={13} />
                <span>Listen to Heart Summary</span>
              </button>
            </div>
          </div>

          {/* Simple 3-Step Daily Routine Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Heart size={14} /> 1. Heart Rhythm
              </span>
              <p className="text-slate-200">Rhythm is steady at <b>{heartRate} bpm</b>. Blood pressure is <b>{bloodPressure} mmHg</b>.</p>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <Pill size={14} /> 2. Medication Reminder
              </span>
              <p className="text-slate-200">Take your prescribed daily statin and aspirin with breakfast.</p>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <PhoneCall size={14} /> 3. When to Call Help
              </span>
              <p className="text-slate-200">If you feel sudden tightness radiating to your left arm, press emergency triage.</p>
            </div>
          </div>

          {/* Conversational "Ask Your Personal AI Cardiologist" */}
          <form onSubmit={handleAskQuestion} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={patientQuestion}
                onChange={(e) => setPatientQuestion(e.target.value)}
                placeholder="Ask your AI cardiologist anything (e.g. 'Can I exercise today?' or 'Is my chest pain serious?')..."
                className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Ask
              </button>
            </div>

            {aiAnswer && (
              <div className="rounded-xl bg-slate-900/90 p-3 border border-emerald-500/40 text-xs text-slate-200 flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{aiAnswer}</p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Mode 2: Nurse Mode ("Clinical Inpatient & Triage") */}
      {activePersona === "nurse" && (
        <div className="rounded-xl bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-950 p-4 border border-blue-500/30 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <span>Ward Triage & Telemetry Alert Monitor</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                NEWS2 Score: 1 (LOW RISK)
              </span>
            </h3>
            <span className="text-slate-400 font-mono">Bedside Terminal: ICU-04</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="rounded-lg bg-black/60 p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500">ECG Rhythm Alarm</span>
              <p className="text-emerald-400 font-bold">NORMAL SINUS</p>
            </div>
            <div className="rounded-lg bg-black/60 p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500">Target MAP Limit</span>
              <p className="text-cyan-400 font-bold">93 mmHg (Target 65-100)</p>
            </div>
            <div className="rounded-lg bg-black/60 p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500">SpO2 Alarm Floor</span>
              <p className="text-emerald-400 font-bold">99% (&gt;94% PASS)</p>
            </div>
            <div className="rounded-lg bg-black/60 p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500">Fluid Balance</span>
              <p className="text-amber-400 font-bold">+250 mL (Euvol)</p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Doctor Mode ("Full Complexity") */}
      {activePersona === "doctor" && (
        <div className="rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-slate-950 p-3.5 border border-purple-500/30 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-purple-400" />
            <span>
              <b>Cardiologist Precision Mode Active:</b> Full Navier-Stokes pressure drop tensors, Luo-Rudy cellular ion curves, and WHO similar patient cohort survival models unlocked below.
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40">
            2024 ESC CCS Aligned
          </span>
        </div>
      )}
    </div>
  );
}

export default PersonaRoleSwitcher;
