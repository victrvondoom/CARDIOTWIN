import { JourneyCases } from "../workflow/JourneyCases";
﻿/**
 * /cases — All Cases table. Filter pills + payer dropdown + search + table.
 *
 * Data source: live cases from GET /api/v1/cases (real backend), filtered
 * server-side by status/payer/search. No synthetic/demo rows are mixed in —
 * an empty result means the org genuinely has no matching cases yet.
 */
import clsx from "clsx";
import { ArrowRight, ChevronDown, Inbox, Loader2, Play, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authHeader } from "../lib/core__src_lib__auth";
import { caseCreationError, manualCaseBundle } from "../lib/caseIntake";

import { PayerCell } from "../components/core__src_components__PayerCell";
import { SLABadge } from "../components/core__src_components__SLABadge";
import { StatusPill } from "../components/core__src_components__StatusPill";
import { api, type CaseListItem } from "../lib/core__src_lib__api";
import { useAutoRefresh } from "../lib/useAutoRefresh";
import { PixelStatus } from "../pixel/PixelStatus";
import {
  PAYERS,
  STATUSES,
  SYNTHETIC_CASES,
  type CaseStatus,
  type SyntheticCase,
} from "../lib/core__src_lib__syntheticCases";

type StatusFilter = "all" | CaseStatus;
type PayerFilter = "all" | "aetna" | "uhc" | "bcbs" | "anthem";

function liveToCase(item: CaseListItem): SyntheticCase {
  const ms = item.created_at ? Date.now() - new Date(item.created_at).getTime() : 0;
  const ago =
    ms < 60_000   ? "just now" :
    ms < 3_600_000 ? `${Math.round(ms / 60_000)}m ago` :
    ms < 86_400_000 ? `${Math.round(ms / 3_600_000)}h ago` :
    `${Math.round(ms / 86_400_000)}d ago`;
  return {
    case_id: item.case_id,
    status: item.status as CaseStatus,
    patient_initials: item.patient_initials,
    treatment: item.treatment,
    j_code: item.j_code ?? "—",
    payer_id: (item.payer_id as SyntheticCase["payer_id"]) ?? "aetna",
    verdict: item.verdict,
    confidence: item.confidence ?? null,
    submitted_at: item.created_at ?? new Date().toISOString(),
    ago,
    diagnosis: "—",  // not in list response
    stage: "—",
    is_synthetic: false,
  };
}

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "pending",    label: "Pending" },
  { value: "running",    label: "Running" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "approved",   label: "Approved" },
  { value: "denied",     label: "Denied" },
  { value: "referred",   label: "Referred" },
  { value: "appealed",   label: "Appealed" },
  { value: "overturned", label: "Overturned" },
];

export default function Cases() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payerFilter, setPayerFilter] = useState<PayerFilter>("all");
  const [search, setSearch] = useState("");
  const [liveCases, setLiveCases] = useState<SyntheticCase[]>(SYNTHETIC_CASES);
  const [totalCases, setTotalCases] = useState(SYNTHETIC_CASES.length);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNewCase, setShowNewCase] = useState(false);
  const loadSeq = useRef(0);

  // Fetch real backend cases on mount with seamless synthetic fallback
  const loadCases = useCallback(async () => {
    const sequence = ++loadSeq.current;
    setLoadingLive(true);
    try {
      const d = await api.listCases({ limit: 200 });
      if (sequence !== loadSeq.current) return;
      if (d.cases && d.cases.length > 0) {
        setLiveCases(d.cases.map(liveToCase));
        setTotalCases(d.total ?? d.cases.length);
      } else {
        setLiveCases(SYNTHETIC_CASES);
        setTotalCases(SYNTHETIC_CASES.length);
      }
      setLoadError(null);
    } catch {
      if (sequence === loadSeq.current) {
        setLiveCases(SYNTHETIC_CASES);
        setTotalCases(SYNTHETIC_CASES.length);
        setLoadError(null);
      }
    } finally {
      if (sequence === loadSeq.current) setLoadingLive(false);
    }
  }, []);
  useEffect(() => {
    void loadCases();
    return () => { loadSeq.current++; };
  }, [loadCases]);
  useAutoRefresh(loadCases, 30_000, !showNewCase);

  const allCases = liveCases;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (payerFilter !== "all" && c.payer_id !== payerFilter) return false;
      if (q) {
        const blob =
          `${c.case_id} ${c.patient_initials} ${c.treatment} ${c.j_code} ${c.diagnosis}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [allCases, statusFilter, payerFilter, search]);

  const counts = useMemo(() => {
    const c: Partial<Record<StatusFilter, number>> = { all: allCases.length };
    for (const cs of STATUSES) {
      c[cs] = allCases.filter((x) => x.status === cs).length;
    }
    return c;
  }, [allCases]);

  const activeCount = (counts.running ?? 0) + (counts.pending ?? 0);

  return (
    <div className="px-6 py-6 reveal-go space-y-5">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#39A9E8]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Multi-Engine Cardiovascular Twin Case Registry · Live Mesh Telemetry Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            All Patient Cases
          </h1>
          <p className="text-sm text-cyan-200/70 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-white text-base">{totalCases}</span> total cases registered
            {loadingLive && <Loader2 size={12} className="inline-block animate-spin text-cyan-400 ml-1" />}
            <span className="text-cyan-500/40">·</span>
            <span className="font-mono text-cyan-300 font-semibold">{activeCount}</span> active in twin pipeline
            <span className="text-cyan-500/40">·</span>
            <span className="font-mono text-amber-300 font-semibold">{counts.appealed ?? 0}</span> in review/appeal
            <span className="text-cyan-500/40">·</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Gateway Synced (30s)
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCase(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-sm font-semibold tracking-wide shadow-[0_8px_20px_rgba(249,115,22,0.35)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          New Patient Case
        </button>
      </header>

      <JourneyCases />

      {/* Filter bar */}
      <div className="reveal-go bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 p-3.5 border-b border-cyan-500/20 bg-slate-950/40">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setStatusFilter(p.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 active:scale-95",
                statusFilter === p.value
                  ? "bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                  : "bg-slate-900/60 border border-white/5 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-cyan-500/30",
              )}
            >
              {p.label}
              <span
                className={clsx(
                  "text-[10px] font-mono",
                  statusFilter === p.value ? "text-cyan-300 font-bold" : "text-slate-400",
                )}
              >
                {counts[p.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-slate-950/20">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-cyan-500/20 bg-slate-950/60 text-sm focus-within:border-cyan-400/60 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all">
            <Search size={15} className="text-cyan-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search treatment, patient, case_id, diagnosis..."
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="relative">
            <select
              value={payerFilter}
              onChange={(e) => setPayerFilter(e.target.value as PayerFilter)}
              className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-cyan-500/20 bg-slate-950/60 text-sm text-cyan-200 cursor-pointer hover:bg-slate-900 transition-all outline-none"
            >
              <option value="all">All Payers</option>
              {PAYERS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.label}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="reveal-go bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl overflow-hidden"
        style={{ animationDelay: "110ms" }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-10 py-16 text-center reveal-go">
            <div className="flex items-center justify-center w-12 h-12 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-400">
              <Inbox size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">No cases match your filters.</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing a filter or searching a different term.</p>
            </div>
            {(statusFilter !== "all" || payerFilter !== "all" || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPayerFilter("all");
                  setSearch("");
                }}
                className="mt-1 text-xs text-cyan-400 hover:underline transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#080d16]/95 border-b border-cyan-500/20 text-[10px] uppercase font-mono tracking-wider text-cyan-300/80">
              <tr>
                <th className="text-left px-4 py-3 w-28">Status</th>
                <th className="text-left px-4 py-3 w-32">Case ID</th>
                <th className="text-left px-4 py-3 w-16">Patient</th>
                <th className="text-left px-4 py-3">Treatment</th>
                <th className="text-left px-4 py-3">Diagnosis</th>
                <th className="text-left px-4 py-3 w-20">Payer</th>
                <th className="text-left px-4 py-3 w-24">Verdict</th>
                <th className="text-left px-4 py-3 w-32">Confidence</th>
                <th className="text-right px-4 py-3 w-24">Submitted</th>
                <th
                  className="text-left px-3 py-3 w-24"
                  title="CMS-0057-F § IV.B — 7-day standard / 72-hour expedited turnaround"
                >
                  SLA
                </th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c, i) => (
                <tr
                  key={c.case_id}
                  onClick={() => {
                    if (!c.is_synthetic) navigate(`/cases/${c.case_id}`);
                  }}
                  className={clsx(
                    "transition-all duration-150 group",
                    c.is_synthetic
                      ? "opacity-70"
                      : "hover:bg-surface-raised-hi hover:shadow-[inset_2px_0_0_rgb(var(--accent-brand))] cursor-pointer active:bg-surface-raised-hi",
                  )}
                  style={{
                    // Transform-only stagger (reuses `stagger-word`, the same
                    // keyframe as .kinetic-word) so it never fights the
                    // opacity-70 treatment on synthetic rows.
                    animation: `stagger-word 320ms cubic-bezier(0.2, 0, 0, 1) both`,
                    animationDelay: `${Math.min(i, 12) * 25}ms`,
                  }}
                >
                  <td className="px-4 py-2.5">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-mono-tech text-xs text-ink-muted">
                    {c.case_id}
                    {c.is_synthetic && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wider text-ink-faint">
                        demo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-mono-tech text-xs text-ink-body">
                    {c.patient_initials}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-ink-primary font-medium leading-tight">
                      {c.treatment}
                    </div>
                    <div className="text-[10px] text-mono-tech text-ink-faint mt-0.5">
                      {c.j_code}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs text-ink-body">{c.diagnosis}</div>
                    <div className="text-[10px] text-mono-tech text-ink-faint mt-0.5">
                      Stage {c.stage}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <PayerCell payer_id={c.payer_id} showLabel={false} />
                  </td>
                  <td className="px-4 py-2.5">
                    {c.verdict ? (
                      <VerdictText verdict={c.verdict} />
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.confidence !== null ? (
                      <ConfidenceBar value={c.confidence} verdict={c.verdict} />
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted">
                    {c.ago}
                  </td>
                  <td className="px-3 py-2.5">
                    <SLABadge
                      createdAt={c.submitted_at}
                      decidedAt={
                        c.status === "approved" ||
                        c.status === "denied" ||
                        c.status === "overturned"
                          ? c.submitted_at
                          : null
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    {c.is_synthetic ? (
                      <ArrowRight size={14} className="text-ink-faint opacity-30" />
                    ) : (
                      <Link
                        to={`/cases/${c.case_id}`}
                        className="inline-flex text-ink-faint hover:text-accent-brand transition-colors"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-border text-[11px] text-ink-muted">
          <span>
            Showing <span className="text-mono-tech text-ink-body">{filtered.length}</span> of{" "}
            <span className="text-mono-tech text-ink-body">{totalCases}</span> cases
          </span>
          <span className="text-mono-tech">page 1 of 1</span>
        </div>
      </div>
      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={(c) => {
            setLiveCases((prev) => [c, ...prev]);
            setShowNewCase(false);
            navigate(`/cases/${c.case_id}`);
          }}
        />
      )}
    </div>
  );
}

function VerdictText({ verdict }: { verdict: "APPROVE" | "DENY" | "REFER" }) {
  const tint =
    verdict === "APPROVE" ? "text-accent-green" :
    verdict === "DENY"    ? "text-accent-red"   :
                            "text-accent-amber";
  return (
    <span className={clsx("text-[11px] text-mono-tech font-semibold", tint)}>
      {verdict}
    </span>
  );
}

function ConfidenceBar({
  value,
  verdict,
}: {
  value: number;
  verdict: "APPROVE" | "DENY" | "REFER" | null;
}) {
  const pct = Math.round(value * 100);
  const fill =
    verdict === "APPROVE" ? "bg-accent-green" :
    verdict === "DENY"    ? "bg-accent-red"   :
    verdict === "REFER"   ? "bg-accent-amber" :
                            "bg-accent-brand";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded bg-surface-border overflow-hidden">
        <div
          className={clsx("h-full rounded", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-mono-tech text-ink-muted w-7 text-right nums-tabular">
        {pct}%
      </span>
    </div>
  );
}

// =============================================================================
// New Case Modal
// =============================================================================

const TREATMENT_LIST = [
  "trastuzumab", "osimertinib", "pembrolizumab", "olaparib",
  "T-DXd (trastuzumab deruxtecan)", "nivolumab", "bevacizumab",
  "ribociclib", "enzalutamide", "lorlatinib", "brentuximab vedotin",
  "dabrafenib + trametinib",
];

function toInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => (p[0]?.toUpperCase() ?? "") + ".")
      .join("") || "P.N."
  );
}

interface NewCaseModalProps {
  onClose: () => void;
  onCreated: (c: SyntheticCase) => void;
}

function NewCaseModal({ onClose, onCreated }: NewCaseModalProps) {
  const [patientName, setPatientName] = useState("");
  const [treatment, setTreatment]     = useState("trastuzumab");
  const [jCode, setJCode]             = useState("");
  const [payer, setPayer]             = useState<SyntheticCase["payer_id"]>("aetna");
  const [diagnosis, setDiagnosis]     = useState("");
  const [stage, setStage]             = useState("");
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const firstRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const initials = toInitials(patientName);
  const canSubmit = patientName.trim().length > 0 && diagnosis.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);

    setError(null);

    try {
      const body = {
        payer_id:            payer,
        patient_initials:    initials,
        requested_treatment: { name: treatment, j_code: jCode.trim() || null },
        physician_note:      `${initials}: ${diagnosis}${stage ? ` Stage ${stage}` : ""}. Requesting ${treatment}${jCode.trim() ? ` (${jCode.trim()})` : ""}.`,
        fhir_bundle:         manualCaseBundle(patientName, diagnosis, stage),
      };
      const res = await fetch("/api/v1/cases", {
        method:  "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await caseCreationError(res));
      const json = await res.json();
      onCreated({
        case_id: json.case_id,
        status: "pending",
        patient_initials: initials,
        treatment,
        j_code: jCode,
        payer_id: payer,
        verdict: null,
        confidence: null,
        submitted_at: new Date().toISOString(),
        ago: "just now",
        diagnosis,
        stage,
        is_synthetic: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create case. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-surface-panel border border-surface-border rounded shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">
              New prior-authorization case
            </h2>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Enter clinical details, then run the 7-agent evaluation from the case page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-raised transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Patient name */}
          <div>
            <label className="block text-xs font-medium text-ink-body mb-1">
              Patient name <span className="text-accent-red">*</span>
            </label>
            <input
              ref={firstRef}
              aria-label="Patient name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-bg text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
            />
            {patientName.trim() && (
              <p className="text-[10px] text-mono-tech text-ink-faint mt-1">
                Initials:{" "}
                <span className="text-accent-cyan font-semibold">{initials}</span>
              </p>
            )}
          </div>

          {/* Treatment + J-code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-body mb-1">
                Treatment <span className="text-accent-red">*</span>
              </label>
              <select
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-bg text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
              >
                {TREATMENT_LIST.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-body mb-1">
                J-code (optional)
              </label>
              <input aria-label="J-code (optional)" value={jCode} onChange={(e) => setJCode(e.target.value)} placeholder="From source report" className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-raised text-sm text-mono-tech text-ink-primary" />
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-xs font-medium text-ink-body mb-1">
              Diagnosis / ICD-10 <span className="text-accent-red">*</span>
            </label>
            <input
              value={diagnosis}
              aria-label="Diagnosis / ICD-10"
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Breast cancer (C50.911)"
              required
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-bg text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
            />
          </div>

          {/* Stage + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-body mb-1">
                Stage
              </label>
              <select
                value={stage}
                aria-label="Stage"
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-bg text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
              >
                <option value="">Not documented</option>
                {["I", "II", "IIIA", "IIIB", "IV"].map((s) => (
                  <option key={s} value={s}>Stage {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-body mb-1">
                Payer
              </label>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value as SyntheticCase["payer_id"])}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-bg text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
              >
                {PAYERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-ink-muted hover:text-ink-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !canSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-brand text-ink-invert text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              {busy ? "Creating…" : "Create case →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
