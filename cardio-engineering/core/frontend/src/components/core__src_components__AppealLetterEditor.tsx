import { Download, FileEdit, Mail, Paperclip } from "lucide-react";
import { useState } from "react";

import type { AppealDraft } from "../lib/core__src_lib__types";

interface Props {
  appeal: AppealDraft;
  caseId?: string;
  pendingReview?: boolean;
}

/**
 * Trigger a server-side PDF render via POST /api/v1/appeals/render.pdf.
 * Falls back to the browser's native print → save-as-PDF if the endpoint
 * is unreachable (e.g. running the frontend without a live backend).
 */
async function downloadAppealPdf(appeal: AppealDraft, caseId?: string, pendingReview = false): Promise<void> {
  try {
    const response = await fetch("/api/v1/appeals/render.pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingReview ? { ...appeal, appeal_body: `DRAFT — HUMAN REVIEW REQUIRED. No final denial recorded.\n\n${appeal.appeal_body}` } : appeal),
    });
    if (!response.ok) throw new Error(`PDF endpoint returned ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pendingReview ? "draft-" : ""}appeal-${appeal.patient_initials}-${caseId ?? appeal.payer_id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("Server PDF endpoint unreachable; falling back to window.print()", err);
    window.print();
  }
}

export function AppealLetterEditor({ appeal, caseId, pendingReview = false }: Props) {
  const [showStructured, setShowStructured] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAppealPdf(appeal, caseId, pendingReview);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-[#0D0E10]/90 border border-cyan-500/25 rounded-2xl overflow-hidden shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <div className="px-5 py-3.5 border-b border-cyan-500/20 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-cyan-400" />
          <h3 className="font-semibold text-white tracking-wide">Drafted Appeal Letter & Case Defense</h3>
          <span className="text-xs font-mono text-cyan-400">
            {appeal.appeal_body.split(/\s+/).length} words
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowStructured(!showStructured)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
          >
            <FileEdit size={12} />
            {showStructured ? "Letter view" : "Structured arguments"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            title="POST /api/v1/appeals/render.pdf · ReportLab letter with letterhead, footer page numbers, and CMS-0057-F § IV.A audit anchor"
            className="text-xs px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/80 text-cyan-200 hover:bg-cyan-900 disabled:opacity-60 flex items-center gap-1.5 font-mono shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all"
          >
            <Download size={12} />
            {downloading ? "Rendering…" : "Download PDF"}
          </button>
        </div>
      </div>

      {pendingReview && <p role="note" className="px-5 py-3 text-xs bg-amber-950/50 text-amber-200 border-b border-amber-500/30 font-mono">DRAFT — clinician review required. This proposed appeal has not been approved or submitted.</p>}
      <div className="p-6 max-h-[500px] overflow-auto">
        {!showStructured && (
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed text-sm bg-slate-950/40 p-4 rounded-xl border border-white/5">
              {appeal.appeal_body}
            </pre>
          </div>
        )}

        {showStructured && (
          <div className="space-y-4">
            {appeal.structured_arguments.map((arg, i) => (
              <div
                key={i}
                className="border border-cyan-500/20 rounded-xl p-4 bg-slate-950/60"
              >
                <div className="text-xs font-mono text-cyan-400 mb-1">
                  Argument #{i + 1}
                </div>
                <div className="font-semibold text-white text-sm mb-2">
                  {arg.contested_criterion}
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-slate-400 font-mono uppercase mb-1">
                      Payer position
                    </div>
                    <p className="text-slate-300">{arg.payer_position}</p>
                  </div>
                  <div className="bg-cyan-950/30 p-3 rounded-lg border border-cyan-500/20">
                    <div className="text-xs text-cyan-400 font-mono uppercase mb-1">
                      Our position
                    </div>
                    <p className="text-cyan-100">{arg.counter_position}</p>
                  </div>
                </div>

                {arg.cited_evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/20">
                    <div className="text-xs text-cyan-400 font-mono uppercase mb-1">
                      Cited clinical evidence
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                      {arg.cited_evidence.map((e, j) => (
                        <li key={j}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {arg.cited_guideline && (
                  <div className="mt-2.5">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-200 border border-cyan-500/30">
                      📖 {arg.cited_guideline}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {appeal.attachments_referenced.length > 0 && (
        <div className="px-6 py-3 border-t border-cyan-500/20 bg-slate-950/60">
          <div className="text-xs text-cyan-400 font-mono uppercase mb-1.5 flex items-center gap-1">
            <Paperclip size={11} />
            Attachments referenced
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appeal.attachments_referenced.map((a, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/20 text-slate-300 font-mono"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-3.5 border-t border-cyan-500/20 bg-slate-950/80">
        <div className="text-xs text-cyan-400 font-mono uppercase mb-1">
          Requested action
        </div>
        <div className="text-sm text-white font-medium">{appeal.requested_action}</div>
      </div>
    </div>
  );
}
