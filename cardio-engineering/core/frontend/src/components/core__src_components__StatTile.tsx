/**
 * Dashboard KPI tile. Eyebrow + big value + optional trend / extra widget.
 * Variants:
 *   default: plain text value
 *   sparkline: shows a sparkline beside / under
 *   trend: shows ↑ or ↓ delta vs prior period
 *   gauge: bar gauge for 0-100 percentages
 *
 * Hover treatment: lifts -2px, brand-coloured shadow, accent gradient
 * top-border becomes visible. Designed to communicate "click me / read me"
 * without needing a CTA on every tile.
 */
import clsx from "clsx";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { Sparkline } from "./core__src_components__Sparkline";

interface Props {
  eyebrow: string;
  value: string;
  hint?: string;
  /** Sparkline values (small array, 5-12 numbers) */
  spark?: number[];
  /** Trend in % vs prior period; positive = up (good or bad depending on context) */
  trend?: { value: number; goodDirection: "up" | "down" };
  /** For gauge variant: numeric percent 0-100 */
  gauge?: number;
  /** Confidence interval label like "band 71%-77% · 95% CI" */
  confidenceLabel?: string;
  /** Color override for value (e.g. "text-accent-cyan") */
  valueClassName?: string;
  /** Extra slot, e.g. cost breakdown */
  extra?: ReactNode;
}

export function StatTile({
  eyebrow,
  value,
  hint,
  spark,
  trend,
  gauge,
  confidenceLabel,
  valueClassName,
  extra,
}: Props) {
  return (
    <div className="rounded-xl border border-cyan-500/25 bg-slate-950/85 backdrop-blur-xl p-5 flex flex-col gap-2 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-500/50 hover:shadow-[0_20px_45px_-5px_rgba(0,0,0,0.95),0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300">
      <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-400/80">
        {eyebrow}
      </div>

      <div className="flex items-end gap-3">
        <div className={clsx("font-sans text-3xl font-medium tracking-tight text-[var(--bone)] tabular-nums", valueClassName)}>
          {value}
        </div>
        {trend && (
          <TrendBadge value={trend.value} goodDirection={trend.goodDirection} />
        )}
      </div>

      {spark && (
        <div className="text-accent-brand">
          <Sparkline values={spark} width={140} height={32} />
        </div>
      )}

      {gauge !== undefined && (
        <div className="mt-1 h-1.5 w-full bg-surface-border overflow-hidden">
          <div
            className="h-full bg-accent-brand transition-all"
            style={{ width: `${Math.max(0, Math.min(100, gauge))}%` }}
          />
        </div>
      )}

      {hint && (
        <div className="text-ui-secondary text-[11px] text-ink-muted">{hint}</div>
      )}

      {confidenceLabel && (
        <div className="text-mono-tech text-[11px] text-ink-muted">{confidenceLabel}</div>
      )}

      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function TrendBadge({ value, goodDirection }: { value: number; goodDirection: "up" | "down" }) {
  const isUp = value > 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <div
      className={clsx(
        "flex items-center gap-1 text-xs text-mono-tech mb-1",
        isGood ? "text-accent-green" : "text-accent-red",
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      <span>
        {isUp ? "+" : ""}
        {value}%
      </span>
    </div>
  );
}
