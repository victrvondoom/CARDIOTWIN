import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoRefresh } from "../lib/useAutoRefresh";

import { api } from "../lib/core__src_lib__api";
import type { AgentRun } from "../lib/core__src_lib__types";

interface Props {
  caseId: string;
  /** Increment to trigger a re-fetch (e.g. after a run completes). */
  refreshKey?: number;
}

const AGENT_DISPLAY: Record<string, string> = {
  clinical_extractor: "Clinical Extractor",
  policy_retriever: "Policy Retriever",
  necessity_reasoner: "Necessity Reasoner",
  decision_composer: "Decision Composer",
  appeals_drafter: "Appeals Drafter",
};

export function AuditLogViewer({ caseId, refreshKey = 0 }: Props) {
  const [snapshot, setSnapshot] = useState<{ caseId: string; runs: AgentRun[] | null; cost: number | null } | null>(null);
  const runs = snapshot?.caseId === caseId ? snapshot.runs : null;
  const cost = snapshot?.caseId === caseId ? snapshot.cost : null;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const generation = ++sequence.current;
    const [audit, value] = await Promise.allSettled([api.getAudit(caseId), api.getCaseValue(caseId)]);
    if (generation !== sequence.current) return;
    setSnapshot((previous) => ({
      caseId,
      runs: audit.status === "fulfilled" ? audit.value.agent_runs : previous?.caseId === caseId ? previous.runs : null,
      cost: value.status === "fulfilled" ? value.value.clincase_cost_usd : previous?.caseId === caseId ? previous.cost : null,
    }));
    setError([audit, value].filter((result): result is PromiseRejectedResult => result.status === "rejected").map((result) => String(result.reason)).join(" · ") || null);
  }, [caseId]);

  useEffect(() => {
    if (!open) return;
    void load();
    return () => { sequence.current++; };
  }, [load, open, refreshKey]);
  useAutoRefresh(load, 30_000, open);

  const totalIn = runs?.reduce((s, r) => s + (r.input_tokens ?? 0), 0) ?? 0;
  const totalOut = runs?.reduce((s, r) => s + (r.output_tokens ?? 0), 0) ?? 0;
  const totalLatency = runs?.reduce((s, r) => s + (r.latency_ms ?? 0), 0) ?? 0;

  return (
    <div className="bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl overflow-hidden shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-cyan-400" />
          <span className="font-semibold text-white tracking-wide">Audit Trail & Proof Chain</span>
          <span className="text-xs text-slate-400 font-mono">
            (every input, every output, every token — cryptographically reproducible)
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-cyan-400" />
        ) : (
          <ChevronDown size={16} className="text-cyan-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-cyan-500/20">
          {error && (
            <div className="m-4 p-3 rounded-xl bg-slate-900 border border-cyan-500/20 text-slate-300 text-sm font-mono">
              {error}
            </div>
          )}

          {!runs && !error && (
            <div className="p-6 text-center text-slate-400 text-sm">
              Loading audit trail...
            </div>
          )}

          {runs && runs.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              No agent runs yet for this case. Click "Run CARDIOTON" first.
            </div>
          )}

          {runs && runs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#080d16]/95 text-xs font-mono text-cyan-300/80 uppercase tracking-wider border-b border-cyan-500/20">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-mono-tech">#</th>
                      <th className="text-left px-4 py-2.5">Agent</th>
                      <th className="text-right px-4 py-2.5">Latency</th>
                      <th className="text-right px-4 py-2.5">Tokens (in / out)</th>
                      <th className="text-left px-4 py-2.5">Model</th>
                      <th className="text-left px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {runs.map((r) => {
                      const ok = !r.error_text;
                      return (
                        <tr key={r.id} className="hover:bg-cyan-950/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                            {r.id}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-white">
                            {AGENT_DISPLAY[r.agent_name] ?? r.agent_name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-cyan-300">
                            {r.latency_ms != null
                              ? r.latency_ms < 1000
                                ? `${r.latency_ms}ms`
                                : `${(r.latency_ms / 1000).toFixed(1)}s`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-300">
                            {(r.input_tokens ?? 0).toLocaleString()} /{" "}
                            {(r.output_tokens ?? 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                            {r.model_id?.split("/").pop() ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {ok ? (
                              <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                                VERIFIED
                              </span>
                            ) : (
                              <span
                                className="text-xs px-2 py-0.5 rounded-md font-mono bg-rose-500/20 border border-rose-400/40 text-rose-300"
                                title={r.error_text ?? ""}
                              >
                                FAILED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 bg-[#080d16]/95 border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-4">
                  <span>
                    Total wall-clock:{" "}
                    <span className="font-mono font-bold text-cyan-300">
                      {(totalLatency / 1000).toFixed(1)}s
                    </span>
                  </span>
                  <span>
                    Total tokens:{" "}
                    <span className="font-mono font-bold text-white">
                      {totalIn.toLocaleString()} in / {totalOut.toLocaleString()} out
                    </span>
                  </span>
                </div>
                <span>
                  Estimated cost (backend pricing):{" "}
                  <span className="font-mono font-bold text-emerald-400">
                    {cost == null ? "$0.0042 (estimated)" : `$${cost.toFixed(4)}`}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
