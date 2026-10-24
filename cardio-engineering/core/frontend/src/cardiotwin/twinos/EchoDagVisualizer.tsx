/**
 * EchoDagVisualizer — ECHO / HYPERGRID Dependency-Aware Recalculation DAG.
 *
 * Visualizes reactive execution nodes, latency metrics, cryptographic SHA-256
 * provenance hashes, and node invalidation states.
 */

import React, { useState } from "react";
import { CheckCircle2, Cpu, Database, Network, ShieldCheck, Zap } from "lucide-react";
import type { EchoGraphNode, EchoProvenanceRecord } from "./types";

interface Props {
  provenance: EchoProvenanceRecord | null;
}

export function EchoDagVisualizer({ provenance }: Props) {
  const [selectedNode, setSelectedNode] = useState<EchoGraphNode | null>(null);

  if (!provenance) {
    return (
      <div className="p-4 text-center text-xs text-ink-muted border border-surface-border rounded-xl">
        No active ECHO recalculation record
      </div>
    );
  }

  const nodes = provenance.dependency_graph;
  const activeNode = selectedNode || nodes.find((n) => n.node_id === "node_staleness_detector") || nodes[0];

  return (
    <div className="bg-[var(--surface-raised,rgba(15,23,42,0.6))] border border-[var(--surface-border,rgba(51,65,85,0.4))] rounded-xl p-4 backdrop-blur-md shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Network size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-ink-primary uppercase tracking-wider">
              ECHO / HYPERGRID Dependency-Aware Recalculation Graph
            </h4>
            <p className="text-[11px] text-ink-muted">
              Deterministic reactive DAG • Cryptographically signed with SHA-256 • Latency:{" "}
              <span className="font-mono text-cyan-400">{provenance.recomputation_latency_ms.toFixed(1)} ms</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
            {provenance.event_type}
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            ID: {provenance.provenance_id.slice(0, 14)}...
          </span>
        </div>
      </div>

      {/* Interactive Horizontal DAG Nodes Flow */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max py-1">
          {nodes.map((node, idx) => {
            const isSelected = activeNode.node_id === node.node_id;
            const isSentinel = node.node_id === "node_staleness_detector";
            const isPrediction = node.node_id === "node_conformal_engine";

            let borderClass = "border-surface-border hover:border-surface-border-strong";
            let bgClass = "bg-surface-subtle";
            let textClass = "text-ink-primary";

            if (isSelected) {
              borderClass = "border-cyan-500 ring-2 ring-cyan-500/20 shadow-cyan-500/10 shadow-lg";
              bgClass = "bg-cyan-500/10";
              textClass = "text-cyan-300";
            } else if (isSentinel) {
              borderClass = "border-amber-500/60";
              bgClass = "bg-amber-500/10";
              textClass = "text-amber-300";
            } else if (isPrediction) {
              borderClass = "border-purple-500/60";
              bgClass = "bg-purple-500/10";
              textClass = "text-purple-300";
            }

            return (
              <React.Fragment key={node.node_id}>
                <button
                  onClick={() => setSelectedNode(node)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all w-[150px] shrink-0 ${borderClass} ${bgClass}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mb-1">
                    <span className="uppercase tracking-wider">{node.stage}</span>
                    <span className="text-cyan-400">{node.execution_time_ms.toFixed(0)}ms</span>
                  </div>
                  <span className={`text-[11px] font-semibold line-clamp-2 ${textClass}`}>
                    {node.node_name}
                  </span>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-ink-muted pt-1 border-t border-surface-border/50">
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 size={10} />
                      {node.status === "executed_ok" ? "Recomputed" : "Cached"}
                    </span>
                    <span className="font-mono">#{idx + 1}</span>
                  </div>
                </button>

                {idx < nodes.length - 1 && (
                  <div className="shrink-0 text-ink-muted/40 font-mono text-xs px-0.5">→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {activeNode && (
        <div className="bg-surface-subtle/80 border border-surface-border rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-primary flex items-center gap-1.5">
              <Cpu size={14} className="text-cyan-400" />
              Node Detail: <span className="text-cyan-300">{activeNode.node_name}</span>
            </span>
            <span className="font-mono text-[10px] text-ink-muted">
              Stage: {activeNode.stage} • Execution: {activeNode.execution_time_ms.toFixed(2)} ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] text-ink-muted block mb-0.5 font-medium">Output State & Rationale:</span>
              <p className="text-[11.5px] text-ink-body bg-[var(--surface-raised)] p-2 rounded border border-surface-border/60">
                {activeNode.output_summary}
              </p>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-[11px] text-ink-muted block mb-0.5 font-medium">Dependencies:</span>
                <div className="flex flex-wrap gap-1">
                  {activeNode.dependencies.length > 0 ? (
                    activeNode.dependencies.map((dep) => (
                      <span key={dep} className="px-1.5 py-0.5 rounded bg-surface-raised border border-surface-border font-mono text-[10px] text-ink-muted">
                        {dep}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] text-ink-muted italic">Root ingestion node (no upstream deps)</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-ink-muted block mb-0.5 font-medium">SHA-256 Provenance Hash:</span>
                <span className="font-mono text-[10px] text-cyan-400/90 break-all select-all bg-surface-raised px-2 py-0.5 rounded border border-surface-border block">
                  {activeNode.sha256_hash}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
