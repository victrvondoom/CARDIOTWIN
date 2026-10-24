import clsx from "clsx";
import { AlertCircle, CheckCircle2, ChevronDown, Clock, Cpu } from "lucide-react";
import { useState } from "react";

export type AgentStatus = "pending" | "running" | "done" | "error";

interface AgentCardProps {
  name: string;
  displayName?: string;
  status: AgentStatus;
  latencyMs?: number | null;
  modelId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  error?: string | null;
  output?: Record<string, unknown>;
  description?: string;
}

const statusStyles: Record<AgentStatus, { ring: string; pill: string; pillText: string }> = {
  pending: {
    ring: "border-slate-800",
    pill: "bg-slate-800/80 border border-slate-700",
    pillText: "text-slate-300",
  },
  running: {
    ring: "border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35)]",
    pill: "bg-cyan-500/20 border border-cyan-400/40",
    pillText: "text-cyan-300",
  },
  done: {
    ring: "border-emerald-500/40",
    pill: "bg-emerald-500/20 border border-emerald-400/40",
    pillText: "text-emerald-300",
  },
  error: {
    ring: "border-rose-500/40",
    pill: "bg-rose-500/20 border border-rose-400/40",
    pillText: "text-rose-300",
  },
};

const statusLabel: Record<AgentStatus, string> = {
  pending: "Pending",
  running: "Thinking...",
  done: "Completed",
  error: "Error",
};

export function AgentCard({
  name,
  displayName,
  status,
  latencyMs,
  modelId,
  inputTokens,
  outputTokens,
  error,
  output,
  description,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const s = statusStyles[status];

  return (
    <div
      className={clsx(
        "rounded-2xl bg-[#0D0E10]/90 border p-4.5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl transition-all animate-slide-in-right",
        s.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold text-white tracking-wide">
              {displayName || name}
            </div>
            <span
              className={clsx(
                "text-[10px] font-mono rounded-md px-2 py-0.5",
                s.pill,
                s.pillText,
              )}
            >
              {statusLabel[status]}
            </span>
          </div>
          {description && (
            <div className="text-xs text-slate-400 mb-2">{description}</div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {latencyMs != null && (
              <span className="flex items-center gap-1 font-mono text-cyan-300">
                <Clock size={12} className="text-cyan-400" />
                {latencyMs < 1000
                  ? `${latencyMs}ms`
                  : `${(latencyMs / 1000).toFixed(1)}s`}
              </span>
            )}
            {modelId && (
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Cpu size={12} className="text-cyan-400" />
                {modelId.split("/").pop()}
              </span>
            )}
            {inputTokens != null && outputTokens != null && (
              <span className="font-mono text-slate-400">
                {inputTokens.toLocaleString()} in /{" "}
                {outputTokens.toLocaleString()} out
              </span>
            )}
          </div>
        </div>

        {status === "done" && (
          <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
        )}
        {status === "error" && (
          <AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
        )}
        {status === "running" && (
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {error && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {output && Object.keys(output).length > 0 && status === "done" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <ChevronDown
              size={12}
              className={clsx("transition-transform", expanded && "rotate-180")}
            />
            {expanded ? "Hide" : "Show"} output
          </button>
          {expanded && (
            <pre className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] font-mono text-cyan-200 overflow-auto max-h-64">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
