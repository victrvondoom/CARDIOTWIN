/**
 * YcThemesModal — 5 YC Summer 2026 Themes Integration Breakdown.
 *
 * Demonstrates how five themes contribute useful capabilities to one
 * narrowly defined product: Cardio Intelligence TwinOS.
 */

import React from "react";
import { Check, Sparkles, X, Layers, Cpu, Brain, Network, Heart } from "lucide-react";
import type { YcThemeIntegrationItem } from "./types";

interface Props {
  themes: YcThemeIntegrationItem[];
  onClose: () => void;
}

export function YcThemesModal({ themes, onClose }: Props) {
  const icons: Record<string, any> = {
    "#15": Heart,
    "#2": Layers,
    "#4": Cpu,
    "#6": Brain,
    "#5 / #1": Network,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[var(--surface-raised,#0f172a)] border border-surface-border rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-subtle"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-surface-border pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Strategic Architecture Matrix
            </span>
            <h3 className="text-lg font-bold text-ink-primary">
              Five Y Combinator Themes in One Cohesive Digital Twin
            </h3>
            <p className="text-xs text-ink-muted">
              Rather than 15 separate disjointed demos, each theme delivers a core capability to TwinOS.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((t) => {
            const Icon = icons[t.theme_number] || Sparkles;
            return (
              <div
                key={t.theme_number}
                className="bg-surface-subtle p-4 rounded-xl border border-surface-border/70 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {t.theme_number}
                    </span>
                    <Icon size={16} className="text-ink-muted" />
                  </div>
                  <h4 className="text-sm font-semibold text-ink-primary">{t.theme_name}</h4>
                  <p className="text-[11.5px] text-cyan-300 font-medium mt-1">
                    {t.role_in_twinos}
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-ink-body">
                    {t.concrete_features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 shrink-0 text-sm leading-none mt-0.5">✓</span>
                        <span className="text-[11px] leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-surface-border/50 text-[10.5px] text-ink-muted italic">
                  <strong>Clinical Impact:</strong> {t.clinical_value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            Cardio Intelligence TwinOS v2.6 • Conformal Calibrated • ECHO / HYPERGRID Provenance
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-raised hover:bg-surface-border text-xs text-ink-primary font-semibold border border-surface-border"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
