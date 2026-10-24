/**
 * ClinicianAlertModal — Evidence-Aware Clinician Action Dispatcher.
 *
 * Allows clinicians to sign off on recomputed digital twin alerts,
 * trigger order sets (ECG, Echo, Troponin-I, Med Titration), and attach clinical notes.
 */

import React, { useState } from "react";
import { AlertTriangle, Check, FileCheck, Shield, Stethoscope, X } from "lucide-react";
import type { ClinicianAlert } from "./types";
import { twinosApi } from "./api";

interface Props {
  alert: ClinicianAlert;
  onClose: () => void;
  onAlertUpdated: (updated: ClinicianAlert) => void;
}

export function ClinicianAlertModal({ alert, onClose, onAlertUpdated }: Props) {
  const [clinicianName, setClinicianName] = useState("Dr. Elena Cruz, MD, FACC");
  const [selectedAction, setSelectedAction] = useState<string>(
    alert.recommended_clinical_actions[0] || "Order urgent 12-lead ECG and outpatient cardiology review."
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await twinosApi.acknowledgeAlert(
        alert.alert_id,
        clinicianName,
        selectedAction,
        notes || undefined
      );
      onAlertUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit acknowledgment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface-raised,#0f172a)] border border-surface-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-subtle"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
              Evidence-Aware Clinician Order Set
            </span>
            <h3 className="text-base font-bold text-ink-primary">{alert.headline}</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Dispatched at {new Date(alert.dispatched_at).toLocaleString()} • Patient ID: {alert.patient_id}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border text-xs leading-relaxed text-ink-body">
            <h5 className="font-semibold text-ink-primary mb-1 flex items-center gap-1.5">
              <Shield size={14} className="text-cyan-400" /> Executive Clinical Provenance
            </h5>
            <p>{alert.predicted_outcomes_summary}</p>
            <p className="text-[11px] text-ink-muted mt-2 font-mono">
              Reliability: {alert.reliability_statement}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Attending / Reviewing Clinician:
              </label>
              <input
                type="text"
                value={clinicianName}
                onChange={(e) => setClinicianName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-surface-border focus:border-cyan-500 focus:outline-none text-ink-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Select Immediate Clinical Action / Order Set:
              </label>
              <div className="space-y-2">
                {alert.recommended_clinical_actions.map((action, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedAction === action
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-200"
                        : "border-surface-border hover:bg-surface-subtle text-ink-body"
                    }`}
                  >
                    <input
                      type="radio"
                      name="clinicalAction"
                      checked={selectedAction === action}
                      onChange={() => setSelectedAction(action)}
                      className="mt-0.5 text-cyan-500"
                    />
                    <span>{action}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Clinical Notes / Rationale (optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Telemetry verified. Contacted patient for urgent morning intake..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-surface-border focus:border-cyan-500 focus:outline-none text-ink-primary"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-surface-border text-xs text-ink-muted hover:text-ink-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileCheck size={14} />
                {submitting ? "Signing & Dispatching..." : "Sign with ECHO Provenance"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
