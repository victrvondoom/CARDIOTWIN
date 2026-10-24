/**
 * Evidence-Linked CardioTwin: the shared synthetic case contract.
 *
 * Every number on the case page comes through this module. A measurement carries
 * provenance, timestamp, units and uncertainty. A derived metric names the formula
 * that produced it and the measurements it depends on. A what-if run recomputes
 * the metrics, and the diff lists which measurements caused each change.
 *
 * All case data here is synthetic and deterministic. It is not a patient record.
 */

import {
  aorticValveAreaContinuity,
  bernoulliPeakGradient,
  ejectionFraction,
  strokeVolumeFromLvot,
  type CalcResult,
} from "../calc/formulas";

export type Provenance = "synthetic" | "external" | "user-provided";

export type MeasurementKey =
  | "lvotDiameterCm"
  | "lvotVtiCm"
  | "aorticVtiCm"
  | "peakAvVelocityMs"
  | "meanAvGradientMmHg"
  | "edvMl"
  | "esvMl";

export interface Measurement {
  id: string;
  label: string;
  key: MeasurementKey;
  value: number | null;
  unit: string;
  /** One-standard-deviation uncertainty, same unit as value. */
  uncertainty: number;
  provenance: Provenance;
  /** ISO timestamp of the (synthetic) acquisition. */
  timestamp: string;
  source: string;
}

export interface DerivedMetric {
  id: string;
  label: string;
  value: number | null;
  uncertainty: number | null;
  unit: string;
  formulaId: string;
  formulaVersion: string;
  /** Measurement ids this metric depends on. */
  dependsOn: string[];
  /** Why the metric is missing, when value is null. */
  missingReason: string | null;
}

export interface CrossCheck {
  id: string;
  rule: string;
  verdict: "corroborates" | "conflicts" | "not-evaluable";
  detail: string;
  /** Measurement or metric ids involved. */
  evidenceIds: string[];
}

export interface SyntheticCase {
  id: string;
  title: string;
  summary: string;
  measurements: Measurement[];
}

export type Values = Partial<Record<MeasurementKey, number | null>>;

export interface WhatIfChange {
  key: MeasurementKey;
  to: number;
}

export interface MetricDiff {
  metric: DerivedMetric;
  baseline: number | null;
  simulated: number | null;
  delta: number | null;
  /** Measurement keys that changed and feed this metric. */
  changedBecause: MeasurementKey[];
  changed: boolean;
}

export const DEMO_TIMESTAMP = "2026-01-01T09:00:00Z";

export const DEMO_CASE: SyntheticCase = {
  id: "SYN-CASE-001",
  title: "Synthetic case: aortic valve continuity review",
  summary: "A made-up adult case used to test the calculators, the what-if engine and the evidence trail. No real patient data is used.",
  measurements: [
    { id: "M-001", label: "LVOT diameter", key: "lvotDiameterCm", value: 2.0, unit: "cm", uncertainty: 0.1, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic parasternal long-axis caliper" },
    { id: "M-002", label: "LVOT VTI", key: "lvotVtiCm", value: 20, unit: "cm", uncertainty: 1, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic pulsed-wave Doppler trace" },
    { id: "M-003", label: "Aortic valve VTI", key: "aorticVtiCm", value: 100, unit: "cm", uncertainty: 3, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic continuous-wave Doppler trace" },
    { id: "M-004", label: "Peak aortic velocity", key: "peakAvVelocityMs", value: 4.0, unit: "m/s", uncertainty: 0.1, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic continuous-wave Doppler peak" },
    { id: "M-005", label: "Reported mean aortic gradient", key: "meanAvGradientMmHg", value: 38, unit: "mmHg", uncertainty: 2, provenance: "user-provided", timestamp: DEMO_TIMESTAMP, source: "Value entered by the case author, used only for cross-checking" },
    { id: "M-006", label: "End-diastolic volume", key: "edvMl", value: 120, unit: "mL", uncertainty: 8, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic biplane volume" },
    { id: "M-007", label: "End-systolic volume", key: "esvMl", value: 50, unit: "mL", uncertainty: 5, provenance: "synthetic", timestamp: DEMO_TIMESTAMP, source: "Synthetic biplane volume" },
  ],
};

const KEY_TO_ID: Record<MeasurementKey, string> = {
  lvotDiameterCm: "M-001",
  lvotVtiCm: "M-002",
  aorticVtiCm: "M-003",
  peakAvVelocityMs: "M-004",
  meanAvGradientMmHg: "M-005",
  edvMl: "M-006",
  esvMl: "M-007",
};

/** Case values, keyed by measurement key, with optional overrides for a what-if run. */
export function valuesOf(c: SyntheticCase, overrides: Values = {}): Values {
  const out: Values = {};
  for (const m of c.measurements) out[m.key] = m.value;
  return { ...out, ...overrides };
}

function uncertaintyOf(c: SyntheticCase, key: MeasurementKey): number {
  return c.measurements.find(m => m.key === key)?.uncertainty ?? 0;
}

function missing(values: Values, keys: MeasurementKey[]): string | null {
  const absent = keys.filter(key => values[key] === null || values[key] === undefined);
  return absent.length ? `Missing: ${absent.map(key => KEY_TO_ID[key]).join(", ")}` : null;
}

/** Derives all metrics from the case values, with propagated uncertainty and dependencies. */
export function deriveMetrics(c: SyntheticCase, values: Values): DerivedMetric[] {
  const ava = (): DerivedMetric => {
    const reason = missing(values, ["lvotDiameterCm", "lvotVtiCm", "aorticVtiCm"]);
    let value: number | null = null;
    let uncertainty: number | null = null;
    if (!reason) {
      const r: CalcResult<{ areaCm2: number }> = aorticValveAreaContinuity({
        lvotDiameterCm: values.lvotDiameterCm as number,
        lvotVtiCm: values.lvotVtiCm as number,
        aorticVtiCm: values.aorticVtiCm as number,
      });
      if (r.ok) {
        value = r.value.areaCm2;
        const d = values.lvotDiameterCm as number;
        const v1 = values.lvotVtiCm as number;
        const v2 = values.aorticVtiCm as number;
        const relative = Math.sqrt(
          (2 * uncertaintyOf(c, "lvotDiameterCm") / d) ** 2 +
          (uncertaintyOf(c, "lvotVtiCm") / v1) ** 2 +
          (uncertaintyOf(c, "aorticVtiCm") / v2) ** 2,
        );
        uncertainty = value * relative;
      }
    }
    return { id: "D-001", label: "Aortic valve area", value, uncertainty, unit: "cm²", formulaId: "aortic-stenosis-continuity", formulaVersion: "v1", dependsOn: ["M-001", "M-002", "M-003"], missingReason: reason };
  };

  const dvi = (): DerivedMetric => {
    const reason = missing(values, ["lvotVtiCm", "aorticVtiCm"]);
    let value: number | null = null;
    let uncertainty: number | null = null;
    if (!reason) {
      const v1 = values.lvotVtiCm as number;
      const v2 = values.aorticVtiCm as number;
      value = v1 / v2;
      uncertainty = value * Math.sqrt((uncertaintyOf(c, "lvotVtiCm") / v1) ** 2 + (uncertaintyOf(c, "aorticVtiCm") / v2) ** 2);
    }
    return { id: "D-002", label: "Dimensionless index (DVI)", value, uncertainty, unit: "", formulaId: "aortic-stenosis-continuity", formulaVersion: "v1", dependsOn: ["M-002", "M-003"], missingReason: reason };
  };

  const sv = (): DerivedMetric => {
    const reason = missing(values, ["lvotDiameterCm", "lvotVtiCm"]);
    let value: number | null = null;
    let uncertainty: number | null = null;
    if (!reason) {
      const r = strokeVolumeFromLvot({ lvotDiameterCm: values.lvotDiameterCm as number, lvotVtiCm: values.lvotVtiCm as number });
      if (r.ok) {
        value = r.value;
        const d = values.lvotDiameterCm as number;
        const v1 = values.lvotVtiCm as number;
        uncertainty = value * Math.sqrt((2 * uncertaintyOf(c, "lvotDiameterCm") / d) ** 2 + (uncertaintyOf(c, "lvotVtiCm") / v1) ** 2);
      }
    }
    return { id: "D-003", label: "LVOT stroke volume", value, uncertainty, unit: "mL", formulaId: "lvot-stroke-volume", formulaVersion: "v1", dependsOn: ["M-001", "M-002"], missingReason: reason };
  };

  const gradient = (): DerivedMetric => {
    const reason = missing(values, ["peakAvVelocityMs"]);
    let value: number | null = null;
    let uncertainty: number | null = null;
    if (!reason) {
      const v = values.peakAvVelocityMs as number;
      const r = bernoulliPeakGradient(v);
      if (r.ok) {
        value = r.value;
        uncertainty = 8 * v * uncertaintyOf(c, "peakAvVelocityMs");
      }
    }
    return { id: "D-004", label: "Peak gradient (simplified Bernoulli)", value, uncertainty, unit: "mmHg", formulaId: "bernoulli-gradient", formulaVersion: "v1", dependsOn: ["M-004"], missingReason: reason };
  };

  const ef = (): DerivedMetric => {
    const reason = missing(values, ["edvMl", "esvMl"]);
    let value: number | null = null;
    let uncertainty: number | null = null;
    if (!reason) {
      const r = ejectionFraction({ edvMl: values.edvMl as number, esvMl: values.esvMl as number });
      if (r.ok) {
        value = r.value;
        const edv = values.edvMl as number;
        const esv = values.esvMl as number;
        uncertainty = Math.sqrt(
          ((100 / edv) * uncertaintyOf(c, "esvMl")) ** 2 +
          ((100 * esv / (edv * edv)) * uncertaintyOf(c, "edvMl")) ** 2,
        );
      }
    }
    return { id: "D-005", label: "Ejection fraction", value, uncertainty, unit: "%", formulaId: "lv-ejection-fraction", formulaVersion: "v1", dependsOn: ["M-006", "M-007"], missingReason: reason };
  };

  return [ava(), dvi(), sv(), gradient(), ef()];
}

/** Rule-based cross-checks between measurements. Demonstrator rules, not clinical validation. */
export function crossChecks(values: Values, metrics: DerivedMetric[]): CrossCheck[] {
  const byId = Object.fromEntries(metrics.map(metric => [metric.id, metric]));
  const checks: CrossCheck[] = [];

  const gradient = byId["D-004"];
  const reported = values.meanAvGradientMmHg;
  const gradientRule = "Reported mean gradient must not exceed the peak gradient implied by the peak velocity.";
  if (gradient.value === null || reported === null || reported === undefined) {
    checks.push({ id: "X-001", rule: gradientRule, verdict: "not-evaluable", detail: gradient.missingReason ?? "Reported mean gradient is missing.", evidenceIds: ["M-004", "M-005"] });
  } else {
    checks.push({
      id: "X-001",
      rule: gradientRule,
      verdict: reported <= gradient.value ? "corroborates" : "conflicts",
      detail: `Peak gradient ${gradient.value.toFixed(1)} mmHg from velocity; reported mean ${reported.toFixed(0)} mmHg.`,
      evidenceIds: ["M-004", "M-005", "D-004"],
    });
  }

  const ava = byId["D-001"];
  const index = byId["D-002"];
  const identityRule = "Continuity identity: AVA equals LVOT area × DVI.";
  if (ava.value === null || index.value === null || values.lvotDiameterCm == null) {
    checks.push({ id: "X-002", rule: identityRule, verdict: "not-evaluable", detail: "One or more inputs are missing.", evidenceIds: ["M-001", "M-002", "M-003"] });
  } else {
    const lvotArea = Math.PI * (values.lvotDiameterCm / 2) ** 2;
    const identity = Math.abs(lvotArea * index.value - ava.value) < 1e-9;
    checks.push({
      id: "X-002",
      rule: identityRule,
      verdict: identity ? "corroborates" : "conflicts",
      detail: "AVA and the index come from the same two VTIs, so this confirms internal consistency only. It is not independent evidence.",
      evidenceIds: ["D-001", "D-002"],
    });
  }

  return checks;
}

/** Recomputes the metrics for a what-if and reports which measurements caused each change. */
export function runWhatIf(c: SyntheticCase, changes: WhatIfChange[]): { baseline: DerivedMetric[]; simulated: DerivedMetric[]; diffs: MetricDiff[] } {
  const baseline = deriveMetrics(c, valuesOf(c));
  const simulated = deriveMetrics(c, valuesOf(c, Object.fromEntries(changes.map(change => [change.key, change.to])) as Values));
  const changedKeys = changes.map(change => change.key);
  const diffs: MetricDiff[] = baseline.map((base, position) => {
    const sim = simulated[position];
    const delta = base.value !== null && sim.value !== null ? sim.value - base.value : null;
    const changedBecause = changedKeys.filter(key => base.dependsOn.includes(KEY_TO_ID[key]));
    return { metric: sim, baseline: base.value, simulated: sim.value, delta, changedBecause, changed: base.value !== sim.value };
  });
  return { baseline, simulated, diffs };
}

/** Plain-language explanation for MedClear, built only from computed metrics and their ids. */
export function plainLanguageSummary(c: SyntheticCase, metrics: DerivedMetric[], checks: CrossCheck[]): string {
  const ava = metrics.find(metric => metric.id === "D-001");
  const index = metrics.find(metric => metric.id === "D-002");
  if (!ava || ava.value === null) {
    return `${c.title}: the valve area cannot be calculated yet. ${ava?.missingReason ?? "Required measurements are missing."} This is a synthetic teaching case.`;
  }
  const conflicts = checks.filter(check => check.verdict === "conflicts").length;
  return [
    `${c.title}. This is a made-up teaching case, not a patient.`,
    `The calculated aortic valve area is ${ava.value.toFixed(2)} cm² (uncertainty about ± ${(ava.uncertainty ?? 0).toFixed(2)} cm², metric ${ava.id}).`,
    index?.value != null ? `The dimensionless index is ${index.value.toFixed(2)} (metric ${index.id}).` : "",
    conflicts > 0 ? `${conflicts} cross-check conflict(s) are listed in the evidence trail.` : "No cross-check conflicts were found by the demonstrator rules.",
    "These are raw numbers from a formula. They are not a diagnosis, and no treatment is suggested.",
  ].filter(Boolean).join(" ");
}
