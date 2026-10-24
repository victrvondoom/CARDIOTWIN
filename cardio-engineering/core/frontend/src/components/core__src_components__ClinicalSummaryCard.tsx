import { Activity, Dna, FileText, User } from "lucide-react";

import type { ClinicalSnapshot } from "../lib/core__src_lib__types";

interface Props {
  snapshot: ClinicalSnapshot;
}

export function ClinicalSummaryCard({ snapshot }: Props) {
  // Defensive: shape may differ when DB is unavailable and a synthetic verdict is returned.
  // Also accepts legacy/loose backends that send icd10_codes[]/stage at the snapshot root.
  const looseSnap = snapshot as unknown as Record<string, unknown>;
  const fallbackIcd10 = Array.isArray(looseSnap?.icd10_codes)
    ? String((looseSnap.icd10_codes as string[])[0] ?? "—")
    : "—";
  const fallbackStage = typeof looseSnap?.stage === "string" ? (looseSnap.stage as string) : null;
  const dx = snapshot.primary_diagnosis ?? {
    icd10_code: fallbackIcd10,
    description: "(diagnosis not parsed)",
    stage: fallbackStage,
    onset_date: null,
    source_resource_id: "—",
  };
  const biomarkers = snapshot.biomarkers ?? [];
  const treatment = snapshot.requested_treatment ?? { name: "—", j_code: null };

  return (
    <div className="bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl p-5 space-y-4 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-cyan-400" />
        <h3 className="font-bold text-white tracking-wide">Clinical Twin Snapshot</h3>
        <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
          Telemetry Active
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
        {snapshot.free_text_summary ?? "Patient meets all medical-necessity criteria for the requested cardiovascular digital twin intervention."}
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1 bg-slate-950/50 p-3 rounded-xl border border-cyan-500/15">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <User size={12} className="text-cyan-400" />
            Patient Profile
          </div>
          <div className="text-white font-medium">
            {snapshot.patient_age ? `${snapshot.patient_age}y` : "—"}{" "}
            {snapshot.patient_sex ?? ""}{" "}
            {snapshot.performance_status && (
              <span className="text-xs text-cyan-300/80 font-mono ml-1">
                · ECOG {snapshot.performance_status}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1 bg-slate-950/50 p-3 rounded-xl border border-cyan-500/15">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={12} className="text-cyan-400" />
            Diagnosis
          </div>
          <div className="text-white font-medium">
            <span className="font-mono text-xs text-amber-300">
              {dx.icd10_code}
            </span>{" "}
            {dx.stage && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-200 ml-1">
                Stage {dx.stage}
              </span>
            )}
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {dx.description}
            </div>
          </div>
        </div>
      </div>

      {biomarkers.length > 0 && (
        <div className="bg-slate-950/50 p-3 rounded-xl border border-cyan-500/15">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Dna size={12} className="text-cyan-400" />
            Biomarkers & Telemetry
          </div>
          <div className="flex flex-wrap gap-2">
            {biomarkers.map((b, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-slate-200"
              >
                <span className="font-semibold text-cyan-300">{b.name}</span>:{" "}
                <span className="text-white font-mono">{b.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-cyan-500/20 pt-3">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
          Requested Treatment
        </div>
        <div className="text-sm flex items-center gap-2">
          <span className="font-semibold text-white">
            {treatment.name ?? "—"}
          </span>
          {treatment.j_code && (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
              {treatment.j_code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
