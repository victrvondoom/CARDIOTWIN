/**
 * Cardio Intelligence TwinOS — Frontend API Client.
 */

import { authHeader, clearAuth } from "../../lib/core__src_lib__auth";
import { readFetch } from "../../lib/readFetch";
import type {
  ClinicianAlert,
  PatientListItem,
  StalenessEvaluation,
  TwinPatientProfile,
  YcThemeIntegrationItem,
} from "./types";

const BASE = "/api/v1/cardiotwin/twinos";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await readFetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const d = body?.detail;
    const message = typeof d === "string" ? d : JSON.stringify(d ?? body);
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const twinosApi = {
  listPatients: () => request<PatientListItem[]>("/patients"),

  getPatient: (patientId: string) =>
    request<TwinPatientProfile>(`/patient/${encodeURIComponent(patientId)}`),

  recalculateTwin: (patientId: string, reason = "Clinician requested recomputation") =>
    post<TwinPatientProfile>("/recalculate", { patient_id: patientId, reason }),

  simulateStream: (
    patientId: string,
    scenario:
      | "normal_baseline"
      | "progressive_decompensation_72h"
      | "nocturnal_apnea_hypoxia"
      | "acute_arrhythmia_burst"
      | "beta_blocker_recovery",
    autoRecompute = true,
  ) =>
    post<TwinPatientProfile>("/simulate-stream", {
      patient_id: patientId,
      scenario,
      auto_trigger_recomputation: autoRecompute,
    }),

  acknowledgeAlert: (
    alertId: string,
    clinicianName: string,
    actionTaken: string,
    clinicalNotes?: string,
  ) =>
    post<ClinicianAlert>("/ack-alert", {
      alert_id: alertId,
      clinician_name: clinicianName,
      action_taken: actionTaken,
      clinical_notes: clinicalNotes,
    }),

  getFhirBundle: (patientId: string) =>
    request<Record<string, any>>(`/fhir/${encodeURIComponent(patientId)}`),

  getYcThemes: () => request<YcThemeIntegrationItem[]>("/themes-mapping"),
};
