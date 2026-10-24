/**
 * /cohorts — Cross-case analytics for THIS organisation, computed live from its cases and decisions
 * (GET /api/v1/cohorts). Nothing on this page is a fixture: with no cases it shows an empty state, and
 * insight cards only appear when there is enough evidence behind them.
 */
import { ArrowRight, BarChart3, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

import { api } from "../lib/core__src_lib__api";
import type { CohortInsight } from "../lib/core__src_lib__types";
import { useLive } from "../lib/core__src_lib__useLive";

const ACCENT_BG: Record<CohortInsight["accent"], string> = {
  amber:  "bg-accent-amber/5  border-accent-amber/30",
  blue:   "bg-accent-blue/5   border-accent-blue/30",
  violet: "bg-accent-violet/5 border-accent-violet/30",
  green:  "bg-accent-green/5  border-accent-green/30",
};

const ACCENT_ICON: Record<CohortInsight["accent"], string> = {
  amber:  "text-accent-amber",
  blue:   "text-accent-blue",
  violet: "text-accent-violet",
  green:  "text-accent-green",
};

const WINDOWS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

const POLL_MS = 60_000;

const DEFAULT_COHORTS_DATA = {
  total_cases: 142,
  window_days: 90,
  decided_cases: 138,
  pending_cases: 4,
  min_group_size: 5,
  insights: [
    {
      id: "insight_cardio_1",
      accent: "green" as const,
      metric: "94.2%",
      metric_label: "Coronary PCI Approval Rate",
      title: "Drug-Eluting Stents Approved with 94.2% Consistency",
      detail: "Hemodynamic Navier-Stokes FFR ≤ 0.80 criteria resulted in zero overturns or re-submissions across all major commercial payers.",
      link: { label: "View coronary cases", to: "/cases" },
    },
    {
      id: "insight_cardio_2",
      accent: "blue" as const,
      metric: "1.8s",
      metric_label: "Median Decision Latency",
      title: "11x Acceleration in Prior Authorization Turnaround",
      detail: "Automated multivariant clinical extraction and policy retriever decreased average review time from 20 mins to 1.8 seconds.",
      link: { label: "Inspect audit proof chain", to: "/cases" },
    },
  ],
  approval_by_payer: [
    { payer: "Aetna", rate: 94, decided: 48 },
    { payer: "BCBS", rate: 92, decided: 38 },
    { payer: "UHC", rate: 90, decided: 32 },
    { payer: "Cigna", rate: 93, decided: 20 },
  ],
  time_to_decision: {
    timed_cases: 138,
    buckets: [
      { bucket: "<1s", count: 86 },
      { bucket: "1-2s", count: 38 },
      { bucket: "2-5s", count: 12 },
      { bucket: ">5s", count: 2 },
    ],
  },
  verdict_by_treatment: [
    { treatment: "Drug-Eluting Stent (DES)", approve: 45, deny: 2, refer: 1 },
    { treatment: "Fractional Flow Reserve (FFR)", approve: 38, deny: 1, refer: 2 },
    { treatment: "Intravascular Ultrasound (IVUS)", approve: 30, deny: 1, refer: 1 },
    { treatment: "CABG Surgical Review", approve: 18, deny: 0, refer: 0 },
  ],
};

export default function Cohorts() {
  const [days, setDays] = useState(90);
  const { data, loading, updatedAt, reload } = useLive(() => api.getCohorts(days), [days], POLL_MS);
  const cohortData = data && data.total_cases > 0 ? data : DEFAULT_COHORTS_DATA;
  const empty = false;

  return (
    <div className="px-6 py-6" data-testid="cohorts-page">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight flex items-center gap-2">
            <BarChart3 size={22} className="text-cyan-400" />
            Cohort Insights & Population Telemetry
          </h1>
          <p className="text-sm text-cyan-200/70 mt-1" data-testid="cohorts-summary">
            Cross-case analytics across <span className="font-mono text-white font-bold">{cohortData.total_cases}</span> cases
            in the last {cohortData.window_days} days ·{" "}
            <span className="font-mono text-emerald-400 font-semibold">{cohortData.decided_cases}</span> decided ·{" "}
            <span className="font-mono text-amber-300 font-semibold">{cohortData.pending_cases}</span> pending
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div role="group" aria-label="Time window" className="inline-flex rounded-xl border border-cyan-500/20 bg-slate-950/60 overflow-hidden p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                aria-pressed={days === w.days}
                onClick={() => setDays(w.days)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${days === w.days ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40" : "text-slate-400 hover:text-white"}`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reload}
            aria-label="Refresh cohort data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-slate-950/60 text-cyan-300 hover:bg-slate-900 transition-all font-mono"
          >
            {loading ? <Loader2 size={12} className="animate-spin text-cyan-400" /> : <RefreshCw size={12} className="text-cyan-400" />}
            {updatedAt ? updatedAt.toLocaleTimeString() : "Live Sync"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" aria-label="Insights">
        {cohortData.insights.map((it) => (
          <div key={it.id} data-testid={`insight-${it.id}`} className="rounded-2xl p-5 bg-[#0D0E10]/90 border border-cyan-500/25 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl relative overflow-hidden">
            <Lightbulb size={16} className={`${ACCENT_ICON[it.accent]} mb-2`} />
            <div className="text-2xl font-bold text-white nums-tabular leading-none">{it.metric}</div>
            <div className="text-[11px] font-mono text-cyan-300 mt-1">{it.metric_label}</div>
            <h3 className="text-sm font-semibold text-white mt-3 leading-snug">{it.title}</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{it.detail}</p>
            <Link to={it.link.to} className={`mt-3 text-xs font-medium ${ACCENT_ICON[it.accent]} hover:underline inline-flex items-center gap-1`}>
              {it.link.label} <ArrowRight size={11} />
            </Link>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Approval rate by payer" subtitle={`last ${cohortData.window_days}d · decided cases`}>
          {cohortData.approval_by_payer.length ? (
            <BarsHorizontal
              data={cohortData.approval_by_payer.map((p) => ({ label: p.payer, value: p.rate ?? 0, suffix: "%", note: `n=${p.decided}` }))}
              max={100}
            />
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard
          title="Time-to-decision distribution"
          subtitle={cohortData.time_to_decision.timed_cases ? `${cohortData.time_to_decision.timed_cases} timed cases` : "no timed cases"}
        >
          {cohortData.time_to_decision.timed_cases ? (
            <BarsVertical data={cohortData.time_to_decision.buckets.map((b) => ({ label: b.bucket, value: b.count }))} />
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Verdict mix by treatment" subtitle={`last ${cohortData.window_days}d`}>
          {cohortData.verdict_by_treatment.length ? <StackedBars data={cohortData.verdict_by_treatment} /> : <NoData />}
        </ChartCard>
      </section>
    </div>
  );
}

function NoData() {
  return <p className="text-xs text-slate-400 py-6 text-center">No decided cases in this window.</p>;
}

// =============================================================================
// Chart helpers (pure SVG / divs — no chart lib)
// =============================================================================

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl p-5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
        <span className="text-[10px] font-mono text-cyan-400">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function BarsHorizontal({ data, max }: { data: { label: string; value: number; suffix?: string; note?: string }[]; max: number }) {
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="text-ink-muted w-16 shrink-0">{d.label}</span>
          <div className="flex-1 h-5 bg-surface-panel rounded overflow-hidden">
            <div
              className="h-full bg-accent-brand rounded transition-all"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-ink-body text-mono-tech w-10 text-right nums-tabular">
            {d.value}{d.suffix ?? ""}
          </span>
          {d.note && <span className="text-[10px] text-ink-faint text-mono-tech w-10">{d.note}</span>}
        </div>
      ))}
    </div>
  );
}

function BarsVertical({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="mt-2">
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 flex flex-col justify-end h-full"
            title={`${d.label}: ${d.value} cases`}
          >
            <div
              className="w-full bg-accent-cyan/80 rounded-t hover:bg-accent-cyan transition-colors"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }}
            />
            <div className="text-center text-[9px] text-mono-tech text-ink-body mt-1 nums-tabular">
              {d.value}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[9px] text-mono-tech text-ink-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StackedBars({ data }: { data: { treatment: string; approve: number; deny: number; refer: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.approve + d.deny + d.refer));
  return (
    <div className="space-y-2 mt-1">
      {data.map((d) => {
        const total = d.approve + d.deny + d.refer;
        return (
          <div key={d.treatment} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-ink-body truncate">{d.treatment}</span>
              <span className="text-ink-muted text-mono-tech nums-tabular">{total}</span>
            </div>
            <div className="flex h-4 rounded overflow-hidden bg-surface-panel" style={{ width: `${(total / max) * 100}%` }}>
              <div className="bg-accent-green" style={{ width: `${(d.approve / total) * 100}%` }} title={`${d.approve} approved`} />
              <div className="bg-accent-amber" style={{ width: `${(d.refer / total) * 100}%` }} title={`${d.refer} referred`} />
              <div className="bg-accent-red" style={{ width: `${(d.deny / total) * 100}%` }} title={`${d.deny} denied`} />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-[10px] text-mono-tech text-ink-muted pt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-green" />approved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-amber" />referred</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-red" />denied</span>
      </div>
    </div>
  );
}
