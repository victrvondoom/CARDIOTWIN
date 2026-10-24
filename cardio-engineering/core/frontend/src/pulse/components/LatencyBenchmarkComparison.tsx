/**
 * In-Process Retrieval Latency Benchmark Visualizer.
 * Compares in-process Moss WASM (<10ms) against remote vector databases
 * (Redis VSS, Qdrant Cloud, Pinecone Serverless, Weaviate Cloud).
 */

import React from 'react';
import { Zap, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { VECTOR_DB_BENCHMARKS } from '../engine/mossEngine';

export default function LatencyBenchmarkComparison({
  currentLatencyMs,
}: {
  currentLatencyMs: number;
}) {
  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Emergency Dispatch Latency Benchmark
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Target Panic Ceiling: <span className="text-emerald-400 font-bold">&le; 10 ms</span>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Cardiovascular resuscitation and 911 dispatch require sub-10ms retrieval. Cloud round-trips add fatal network
        jitter, whereas in-process WebAssembly memory search executes instantaneously.
      </p>

      <div className="space-y-3">
        {VECTOR_DB_BENCHMARKS.map((db) => {
          const isMoss = db.databaseId === 'moss-wasm';
          const displayLatency = isMoss && currentLatencyMs > 0 ? currentLatencyMs : db.p50Ms;
          const maxScale = 150;
          const widthPct = Math.min(100, (displayLatency / maxScale) * 100);

          return (
            <div key={db.databaseId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isMoss ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                  {db.name}
                </span>
                <span className={`font-mono text-xs ${isMoss ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {displayLatency} ms
                </span>
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isMoss
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : db.p50Ms > 100
                      ? 'bg-rose-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.max(4, widthPct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{db.notes}</span>
                <span>{db.meetsZeroPanicThreshold ? 'PASSES CEILING' : 'FAILS CEILING'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
