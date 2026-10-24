/**
 * Panels for /cardiotwin/riskflow. Every number is read from the API response; the browser computes
 * nothing clinical (it only scales values onto SVG axes).
 */
import { AlertTriangle, CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CARD } from "../core__src_cardiotwin__panels";
import type { Gate, GateStatus, RiskResult, RiskflowModelCard, Simulation } from "./types";

export const STATUS_STYLE: Record<GateStatus, string> = {
  pass: "border-accent-green/50 bg-accent-green/10 text-accent-green",
  warn: "border-accent-amber/50 bg-accent-amber/10 text-accent-amber",
  fail: "border-accent-red/50 bg-accent-red/10 text-accent-red",
  skipped: "border-[var(--line)] bg-transparent text-ink-muted",
};
const ICON: Record<GateStatus, ReactNode> = {
  pass: <CheckCircle2 size={14} aria-hidden />, warn: <AlertTriangle size={14} aria-hidden />,
  fail: <XCircle size={14} aria-hidden />, skipped: <CircleSlash size={14} aria-hidden />,
};
const pct = (v: number) => `${Math.round(v * 100)}%`;
const n = (v: number | null | undefined, d = 1) => (v == null || Number.isNaN(v) ? "—" : v.toFixed(d));

export function Section({ title, note, children, testId }: { title: string; note?: string; children: ReactNode; testId?: string }) {
  return (
    <section className={`${CARD} p-4 space-y-2`} data-testid={testId}>
      <h2 className="text-[14px] font-semibold text-ink-primary">{title}</h2>
      {note && <p className="text-[11.5px] text-ink-muted max-w-4xl">{note}</p>}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Gate rail
// ---------------------------------------------------------------------------

export function GateRail({ gates }: { gates: Gate[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Workflow gates" data-testid="gate-rail">
      {gates.map((g, i) => (
        <li key={g.id}>
          <button type="button" onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}
            className={`w-full text-left rounded border px-3 py-2 ${STATUS_STYLE[g.status]}`} data-testid={`gate-${g.id}`}>
            <div className="flex items-center gap-2 text-[12.5px] font-semibold">
              {ICON[g.status]} <span>{i + 1}. {g.title}</span>
              <span className="ml-auto uppercase text-[10px] tracking-wide">{g.status}</span>
            </div>
            {g.reasons.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {g.reasons.map((r) => <code key={r} className="text-[10px] rounded bg-black/20 px-1">{r}</code>)}
              </div>
            )}
          </button>
          {open === g.id && <GateDetail gate={g} />}
        </li>
      ))}
    </ol>
  );
}

function GateDetail({ gate }: { gate: Gate }) {
  const d = gate.detail as Record<string, unknown>;
  if (gate.id === "history" && Array.isArray(d.rejected)) {
    const rej = d.rejected as { resource: string; reason: string }[];
    return (
      <div className="mt-1 text-[11.5px] text-ink-body space-y-1 px-1">
        <p>{String(d.resources)} resources · {String(d.facts)} facts · conditions: {(d.conditions as string[]).join(", ") || "none"}</p>
        {rej.length > 0 && <ul className="list-disc pl-4">{rej.map((r) => <li key={r.resource}><code>{r.resource}</code> — {r.reason}</li>)}</ul>}
      </div>
    );
  }
  if (gate.id === "signal" && d.report) {
    const rep = d.report as { coverage: number; newest_accepted_age_s: number | null; sample_flags: Record<string, number>;
      channels: Record<string, { status: string; reasons: string[]; value: Record<string, number> }>; reason_text: Record<string, string> };
    return (
      <div className="mt-1 text-[11.5px] text-ink-body space-y-1 px-1">
        <p>coverage {pct(rep.coverage)} · newest usable sample {rep.newest_accepted_age_s == null ? "—" : `${Math.round(rep.newest_accepted_age_s)} s`} old</p>
        <ul className="list-disc pl-4">
          {Object.entries(rep.channels).map(([k, c]) => (
            <li key={k}><b>{k}</b>: {c.status}{c.reasons.length ? ` (${c.reasons.join(", ")})` : ""}{" "}
              {Object.entries(c.value).map(([vk, vv]) => `${vk}=${vv}`).join(" · ")}</li>
          ))}
        </ul>
        {Object.keys(rep.sample_flags).length > 0 && (
          <p>samples excluded: {Object.entries(rep.sample_flags).map(([k, v]) => `${k}×${v}`).join(", ")}</p>
        )}
        {Object.entries(rep.reason_text).map(([k, t]) => <p key={k}><code>{k}</code>: {t}</p>)}
      </div>
    );
  }
  return (
    <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/30 p-2 text-[10.5px] text-ink-body">
      {JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !["provenance", "timeline"].includes(k))), null, 1)}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

function Bar({ label, value, accent = "bg-accent-brand", note }: { label: string; value: number; accent?: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-14 shrink-0 text-ink-muted">{label}</span>
      <div className="h-2.5 flex-1 rounded bg-white/5" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={value} aria-label={label}>
        <div className={`h-full rounded ${accent}`} style={{ width: `${Math.max(1, value * 100)}%` }} />
      </div>
      <span className="w-11 text-right tabular-nums">{pct(value)}</span>
      {note && <span className="w-24 text-[10.5px] text-ink-muted">{note}</span>}
    </div>
  );
}

export function RiskPanel({ risk }: { risk: RiskResult }) {
  const vs = risk.prediction_set.vessel_status;
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="risk-panel">
      <Section title="Vessel probabilities (one coherent distribution)"
        note="All four numbers are marginals of the same 8-pattern Boltzmann distribution, so P(any CAD) can never be lower than any single vessel.">
        <div className="space-y-1.5">
          <Bar label="Any CAD" value={risk.marginals.CAD} accent="bg-accent-red" />
          {(["LAD", "LCX", "RCA"] as const).map((v) => (
            <Bar key={v} label={v} value={risk.marginals[v]} note={vs[v]} />
          ))}
        </div>
        <p className="text-[11px] text-ink-muted">coherent: {String(risk.coherent)} · applicability: Mahalanobis {n(risk.applicability.mahalanobis, 2)} ≤ p99 {n(risk.applicability.threshold_p99, 2)}</p>
      </Section>
      <Section title="How many vessels? (single- vs multi-vessel disease)"
        note="Calibrated distribution over the number of stenotic vessels (≥50 % diameter) — the question independent per-vessel classifiers cannot answer consistently.">
        <div className="space-y-1.5">
          {(["none", "1VD", "2VD", "3VD"] as const).map((k) => <Bar key={k} label={k} value={risk.vessel_count[k]} accent="bg-accent-violet" />)}
        </div>
      </Section>
      <Section title={`Conformal prediction set (${pct(1 - risk.prediction_set.alpha)} target coverage)`}
        note={`Patterns kept: P(pattern) ≥ 1 − q̂ (q̂ = ${n(risk.prediction_set.qhat, 3)}). Cross-validated coverage: ${risk.prediction_set.empirical_coverage_cv == null ? "not measured" : pct(risk.prediction_set.empirical_coverage_cv)}.`}>
        <table className="w-full text-[12px]" data-testid="joint-table">
          <thead><tr className="text-ink-muted text-[11px]"><th className="text-left">pattern</th><th className="text-right">P</th><th className="text-right">in set</th></tr></thead>
          <tbody>
            {risk.joint.map((j) => (
              <tr key={j.pattern} className={j.in_prediction_set ? "" : "text-ink-muted"}>
                <td>{j.pattern}</td><td className="text-right tabular-nums">{pct(j.probability)}</td>
                <td className="text-right">{j.in_prediction_set ? "●" : "○"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="What drove each estimate" note="Field contributions (weight × standardised value, log-odds) per vessel head and the any-disease term; summed per clinical feature.">
        <div className="grid grid-cols-2 gap-3 text-[11.5px]">
          {Object.entries(risk.contributions).map(([head, rows]) => (
            <div key={head}>
              <p className="font-semibold text-ink-primary">{head === "any" ? "any disease" : head}</p>
              <ul>{rows.map((r) => (
                <li key={r.feature} className="flex justify-between gap-2">
                  <span className="truncate">{r.feature}</span>
                  <span className={`tabular-nums ${r.log_odds > 0 ? "text-accent-red" : "text-accent-green"}`}>{r.log_odds > 0 ? "+" : ""}{n(r.log_odds, 2)}</span>
                </li>
              ))}</ul>
            </div>
          ))}
        </div>
        {risk.imputed_features.length > 0 && <p className="text-[11px] text-accent-amber">Imputed (training median): {risk.imputed_features.join(", ")}</p>}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

interface Series { name: string; x: number[]; y: number[]; color: string; dashed?: boolean }

export function Chart({ series, xLabel, yLabel, hLines = [], points = [], label, w = 300, h = 170 }: {
  series: Series[]; xLabel: string; yLabel: string; label: string; w?: number; h?: number;
  hLines?: { y: number; color: string; text: string }[]; points?: { x: number; y: number; color: string; text: string }[];
}) {
  const xs = series.flatMap((s) => s.x).concat(points.map((p) => p.x));
  const ys = series.flatMap((s) => s.y).concat(hLines.map((l) => l.y), points.map((p) => p.y));
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0r, y1r] = [Math.min(...ys), Math.max(...ys)];
  const pad = (y1r - y0r) * 0.06 || 1;
  const [y0, y1] = [y0r - pad, y1r + pad];
  const L = 40, B = 26, R = 8, T = 8;
  const sx = (x: number) => L + ((x - x0) / (x1 - x0 || 1)) * (w - L - R);
  const sy = (y: number) => h - B - ((y - y0) / (y1 - y0 || 1)) * (h - B - T);
  const tick = (v: number) => v.toFixed(Math.abs(v) < 10 ? 2 : 0);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[420px]" role="img" aria-label={label}>
      <rect x={L} y={T} width={w - L - R} height={h - B - T} fill="none" stroke="currentColor" strokeOpacity=".2" />
      {[y0r, (y0r + y1r) / 2, y1r].map((v, i) => (
        <text key={`y${i}`} x={L - 4} y={sy(v) + 3} textAnchor="end" fontSize="8" fill="currentColor" opacity=".6">{tick(v)}</text>
      ))}
      {[x0, (x0 + x1) / 2, x1].map((v, i) => (
        <text key={`x${i}`} x={sx(v)} y={h - B + 10} textAnchor="middle" fontSize="8" fill="currentColor" opacity=".6">{tick(v)}</text>
      ))}
      <text x={(L + w - R) / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="currentColor" opacity=".75">{xLabel}</text>
      <text x={10} y={h / 2} textAnchor="middle" fontSize="9" fill="currentColor" opacity=".75" transform={`rotate(-90 10 ${h / 2})`}>{yLabel}</text>
      {hLines.map((l) => (
        <g key={l.text}>
          <line x1={L} x2={w - R} y1={sy(l.y)} y2={sy(l.y)} stroke={l.color} strokeDasharray="4 3" strokeOpacity=".8" />
          <text x={w - R - 2} y={sy(l.y) - 3} textAnchor="end" fontSize="8" fill={l.color}>{l.text}</text>
        </g>
      ))}
      {series.map((s) => (
        <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="1.6" strokeDasharray={s.dashed ? "4 3" : undefined}
          points={s.x.map((x, i) => `${sx(x)},${sy(s.y[i])}`).join(" ")} />
      ))}
      {points.map((p) => (
        <g key={p.text}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r="3.2" fill={p.color} />
          <text x={sx(p.x) + 5} y={sy(p.y) - 4} fontSize="8" fill={p.color}>{p.text}</text>
        </g>
      ))}
      <g transform={`translate(${L + 4}, ${T + 10})`}>
        {series.map((s, i) => <text key={s.name} x={0} y={i * 10} fontSize="8" fill={s.color}>— {s.name}</text>)}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Simulation: organ → vessel → cell
// ---------------------------------------------------------------------------

export function SimulationPanel({ sim, marginals }: { sim: Simulation; marginals?: RiskResult["marginals"] }) {
  const o = sim.organ, m = o.metrics, wf = o.waveforms;
  const c = sim.cell, rest = c.operating_points.rest, ex = c.operating_points.exertion_85pct_age_predicted;
  const metrics: [string, string][] = [
    ["BP", `${n(m.sbp_mmhg, 0)}/${n(m.dbp_mmhg, 0)} mmHg`], ["EF", `${n(m.ejection_fraction_pct, 0)} %`],
    ["Stroke volume", `${n(m.stroke_volume_ml, 0)} mL`], ["Cardiac output", `${n(m.cardiac_output_l_min)} L/min`],
    ["LVEDP", `${n(m.lvedp_mmhg)} mmHg`], ["Stroke work", `${n(m.stroke_work_j, 2)} J`],
    ["SEVR (DPTI/TTI)", n(m.sevr, 2)], ["Diastole", `${n(m.diastolic_time_s_per_min)} s/min`],
  ];
  return (
    <div className="space-y-4" data-testid="simulation-panel">
      <Section title="Level 1 · Organ — calibrated elastance–Windkessel left heart"
        note={`Driven by the gated heart rate (${n(m.heart_rate_bpm, 0)} bpm); E_max and R_s fitted to ${o.calibrated_to.join(" + ") || "nothing (no record values)"}; residuals ${JSON.stringify(o.calibration_residuals)}.`}>
        <div className="grid gap-3 md:grid-cols-2">
          <Chart label="Pressure-volume loop" xLabel="LV volume (mL)" yLabel="LV pressure (mmHg)"
            series={[{ name: "PV loop", x: wf.v_lv_ml, y: wf.p_lv_mmhg, color: "#f43f5e" }]} />
          <Chart label="Pressure waveforms" xLabel="time (s)" yLabel="mmHg"
            series={[{ name: "LV", x: wf.t_s, y: wf.p_lv_mmhg, color: "#f43f5e" }, { name: "aorta", x: wf.t_s, y: wf.p_a_mmhg, color: "#39A9E8" }]} />
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[12px]">
          {metrics.map(([k, v]) => (
            <div key={k}><dt className="text-ink-muted text-[11px]">{k}</dt><dd className="tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </Section>
      <Section title="Level 2 · Vessel — stenosis sweep at this patient's pressure"
        note={`Steady Poiseuille + expansion-loss circuit at MAP ${n(sim.vessel.driving_map_mmhg, 0)} mmHg. Lesion severity is swept, not measured; the dot marks 75 % area (= 50 % diameter), the training label's stenosis threshold.`}>
        <div className="grid gap-3 md:grid-cols-3">
          {(["LAD", "LCX", "RCA"] as const).map((v) => {
            const s = sim.vessel.sweep[v];
            return (
              <div key={v}>
                <p className="text-[12px] font-semibold">{v}{marginals ? ` · P(stenotic) ${pct(marginals[v])}` : ""}</p>
                <Chart label={`${v} pressure ratio sweep`} xLabel="area stenosis (%)" yLabel="Pd/Pa (sim.)" w={260} h={150}
                  series={[{ name: "rest", x: s.area_stenosis_pct, y: s.pressure_ratio_rest, color: "#94a3b8", dashed: true },
                    { name: "hyperaemia", x: s.area_stenosis_pct, y: s.pressure_ratio_stress, color: "#f59e0b" }]}
                  hLines={[{ y: 0.8, color: "#ef4444", text: "0.80" }]}
                  points={[{ x: s.at_label_threshold.area_stenosis_pct, y: s.at_label_threshold.pressure_ratio_stress, color: "#e879f9", text: n(s.at_label_threshold.pressure_ratio_stress, 2) }]} />
                <p className="text-[11px] text-ink-muted">simulated ratio ≤ 0.80 from {s.critical_area_stenosis_pct == null ? "—" : `${s.critical_area_stenosis_pct}% area`}</p>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Level 3 · Cell — Mitchell–Schaeffer ventricular myocyte at this heart rate"
        note={`${c.parameter_source}. Analytic APD ${n(c.action_potential.apd_analytic_ms, 0)} ms vs numerical ${n(c.action_potential.apd_numeric_ms, 0)} ms (the closed-form map is the τ_in→0 limit). ${c.action_potential.voltage_scaling}.`}>
        <div className="grid gap-3 md:grid-cols-2">
          <Chart label="Action potential" xLabel="time (ms)" yLabel="Vm (mV, scaled)"
            series={[{ name: `AP at ${n(rest.heart_rate_bpm, 0)} bpm`, x: c.action_potential.t_ms, y: c.action_potential.vm_mv, color: "#39A9E8" }]} />
          <Chart label="Restitution curve" xLabel="diastolic interval (ms)" yLabel="APD (ms)"
            series={[{ name: "APD restitution", x: c.restitution.di_ms, y: c.restitution.apd_ms, color: "#39A9E8" }]}
            points={[{ x: rest.di_ms, y: rest.apd_ms, color: "#10b981", text: `rest ${n(rest.restitution_slope, 2)}` },
              { x: ex.di_ms, y: ex.apd_ms, color: "#f59e0b", text: `exertion ${n(ex.restitution_slope, 2)}` }]} />
        </div>
        <p className="text-[12px]">Restitution slope at rest {n(rest.restitution_slope, 2)}, at 85 % age-predicted HR ({n(ex.heart_rate_bpm, 0)} bpm) {n(ex.restitution_slope, 2)};
          APD alternans predicted above <b>{n(c.alternans_threshold_hr_bpm, 0)} bpm</b> (slope &gt; 1).</p>
      </Section>
      <ul className="text-[11px] text-ink-muted list-disc pl-5">{sim.limits.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alignment / provenance
// ---------------------------------------------------------------------------

interface AlignmentDetail {
  provenance?: Record<string, { source: string; time: string | null; status: string; age_days: number | null }>;
  drift?: Record<string, { wearable: number; fhir_median_2y: number; delta: number; flag: boolean }>;
  core_completeness?: number;
  core_missing?: string[];
  timeline?: { time: string; feature: string; value: unknown; source: string; status: string }[];
}

export function AlignmentPanel({ gate }: { gate: Gate | undefined }) {
  if (!gate) return null;
  const d = gate.detail as AlignmentDetail;
  const prov = Object.entries(d.provenance ?? {});
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="alignment-panel">
      <Section title="Per-feature provenance" note={`Core completeness ${pct(d.core_completeness ?? 0)}${d.core_missing?.length ? ` · missing: ${d.core_missing.join(", ")}` : ""}. "assumed-negative" = condition absent from the problem list.`}>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-[11.5px]">
            <thead className="text-ink-muted"><tr><th className="text-left">feature</th><th className="text-left">source</th><th className="text-right">age (d)</th><th className="text-left pl-2">status</th></tr></thead>
            <tbody>{prov.map(([f, p]) => (
              <tr key={f} className={p.status === "stale" ? "text-accent-red" : p.status === "wearable" ? "text-accent-green" : ""}>
                <td>{f}</td><td className="truncate max-w-[160px]">{p.source}</td><td className="text-right tabular-nums">{p.age_days ?? "—"}</td><td className="pl-2">{p.status}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Section>
      <Section title="Wearable vs record drift" note="Accepted wearable values compared with the patient's own two-year FHIR median; a large shift is flagged for review, never silently used or discarded.">
        {Object.keys(d.drift ?? {}).length === 0 ? <p className="text-[12px] text-ink-muted">No accepted wearable channel to compare.</p> : (
          <ul className="text-[12px] space-y-1">{Object.entries(d.drift ?? {}).map(([k, v]) => (
            <li key={k}><b>{k}</b>: wearable {v.wearable} vs record median {n(v.fhir_median_2y)} (Δ {v.delta > 0 ? "+" : ""}{v.delta}){v.flag ? " ⚠ flagged" : ""}</li>
          ))}</ul>
        )}
        <p className="text-[12px] font-semibold mt-3">Timeline (most recent 14)</p>
        <ul className="text-[11px] space-y-0.5">{(d.timeline ?? []).slice(-14).reverse().map((e, i) => (
          <li key={`${e.time}-${e.feature}-${i}`} className={e.status === "used" ? "" : "text-ink-muted"}>
            <span className="tabular-nums">{e.time.slice(0, 10)}</span> · {e.feature} = {String(e.value)} · {e.status}
          </li>
        ))}</ul>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence: benchmark vs XGBoost + gate evaluation
// ---------------------------------------------------------------------------

const ROWS: [string, string, "higher" | "lower"][] = [
  ["auc_CAD", "AUC · CAD", "higher"], ["auc_LAD", "AUC · LAD", "higher"], ["auc_LCX", "AUC · LCX", "higher"], ["auc_RCA", "AUC · RCA", "higher"],
  ["brier_CAD", "Brier · CAD", "lower"], ["brier_LAD", "Brier · LAD", "lower"], ["brier_LCX", "Brier · LCX", "lower"], ["brier_RCA", "Brier · RCA", "lower"],
  ["joint_nll", "Joint pattern log-loss", "lower"], ["count_accuracy", "Vessel-count accuracy", "higher"],
  ["rps", "Vessel-count RPS", "lower"], ["coherence_violation_rate", "Impossible outputs (CAD < vessel)", "lower"],
];

export function ModelCardPanel({ card }: { card: RiskflowModelCard }) {
  const b = card.benchmark;
  const methods = b ? (["cvp", "xgboost", "lr"] as const).filter((m) => b.methods[m]) : [];
  const name: Record<string, string> = { cvp: "CVP (proposed)", xgboost: `XGBoost ${b?.xgboost.version ?? ""}`, lr: "Logistic regression" };
  return (
    <div className="space-y-4" data-testid="model-card">
      <Section title="Benchmark: Coherent Vessel-Pattern model vs XGBoost"
        note={b ? `${b.dataset.name}, n = ${b.dataset.rows}; ${String(b.protocol.outer)} CV stratified by ${String(b.protocol.stratify)}; every model tuned by inner CV. p = ${String(b.protocol.paired_test)} (CVP − XGBoost).` : "Benchmark artifact not found."}>
        {b && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-ink-muted text-[11px]"><tr><th className="text-left">metric</th>{methods.map((m) => <th key={m} className="text-right px-2">{name[m]}</th>)}<th className="text-right px-2">p</th></tr></thead>
              <tbody>{ROWS.map(([k, label, dir]) => {
                const vals = methods.map((m) => b.methods[m][k]?.mean ?? Number.NaN);
                const best = dir === "higher" ? Math.max(...vals) : Math.min(...vals);
                return (
                  <tr key={k}>
                    <td>{label}</td>
                    {vals.map((v, i) => (
                      <td key={methods[i]} className={`text-right px-2 tabular-nums ${v === best ? "font-semibold text-accent-green" : ""}`}>
                        {n(v, 3)}<span className="text-ink-muted text-[10px]"> ±{n(b.methods[methods[i]][k]?.sd, 3)}</span>
                      </td>
                    ))}
                    <td className="text-right px-2 tabular-nums">{b.paired_tests[k] ? n(b.paired_tests[k].p_value, 3) : "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            <p className="text-[11.5px] mt-2">Conformal sets: empirical coverage {pct(b.conformal.empirical_coverage)} (target {pct(b.conformal.target_coverage)}), mean size {b.conformal.mean_set_size_of_8} of 8 patterns.</p>
          </div>
        )}
      </Section>
      <Section title="Signal-quality gate: fault-injection evaluation"
        note={`${card.signal_gate_evaluation.n_per_fault} randomised synthetic streams per fault. Tests the gate against its specification, not real-world sensor sensitivity.`}>
        <table className="w-full text-[12px]">
          <thead className="text-ink-muted text-[11px]"><tr><th className="text-left">injected fault</th><th className="text-left">expected</th><th className="text-left">reason</th><th className="text-right">rate</th></tr></thead>
          <tbody>{Object.entries(card.signal_gate_evaluation.faults).map(([f, r]) => (
            <tr key={f}><td>{f}</td><td>{r.expected}</td><td><code className="text-[10.5px]">{r.reason ?? "—"}</code></td><td className="text-right tabular-nums">{pct(r.rate)}</td></tr>
          ))}</tbody>
        </table>
      </Section>
      <ul className="text-[11px] text-ink-muted list-disc pl-5">{card.limits.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}
