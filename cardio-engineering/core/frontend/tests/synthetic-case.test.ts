import { describe, expect, it } from "vitest";

import {
  DEMO_CASE,
  crossChecks,
  deriveMetrics,
  plainLanguageSummary,
  runWhatIf,
  valuesOf,
} from "../src/cardiotwin/case/syntheticCase";

const byId = (metrics: ReturnType<typeof deriveMetrics>) => Object.fromEntries(metrics.map(metric => [metric.id, metric]));

describe("synthetic case derivations", () => {
  const metrics = byId(deriveMetrics(DEMO_CASE, valuesOf(DEMO_CASE)));

  it("aortic valve area matches the worked example: pi/5 cm²", () => {
    expect(metrics["D-001"].value).toBeCloseTo(Math.PI / 5, 9);
  });

  it("DVI is 0.2 and stroke volume is 20 pi mL", () => {
    expect(metrics["D-002"].value).toBeCloseTo(0.2, 12);
    expect(metrics["D-003"].value).toBeCloseTo(20 * Math.PI, 9);
  });

  it("peak gradient from 4.0 m/s is 64 mmHg, and EF from 120/50 mL is 58.33 %", () => {
    expect(metrics["D-004"].value).toBeCloseTo(64, 9);
    expect(metrics["D-005"].value).toBeCloseTo((100 * 70) / 120, 9);
  });

  it("every derived metric carries a finite, positive propagated uncertainty and a formula id", () => {
    for (const metric of Object.values(metrics)) {
      expect(metric.uncertainty).not.toBeNull();
      expect(metric.uncertainty!).toBeGreaterThan(0);
      expect(Number.isFinite(metric.uncertainty!)).toBe(true);
      expect(metric.formulaId.length).toBeGreaterThan(0);
    }
  });

  it("declares which measurements each metric depends on", () => {
    expect(metrics["D-001"].dependsOn).toEqual(["M-001", "M-002", "M-003"]);
    expect(metrics["D-005"].dependsOn).toEqual(["M-006", "M-007"]);
  });
});

describe("cross-checks", () => {
  const values = valuesOf(DEMO_CASE);
  const metrics = deriveMetrics(DEMO_CASE, values);
  const checks = Object.fromEntries(crossChecks(values, metrics).map(check => [check.id, check]));

  it("reported mean gradient 38 mmHg does not exceed peak 64 mmHg, so it corroborates", () => {
    expect(checks["X-001"].verdict).toBe("corroborates");
  });

  it("the continuity identity holds and is labelled as internal consistency only", () => {
    expect(checks["X-002"].verdict).toBe("corroborates");
    expect(checks["X-002"].detail).toMatch(/internal consistency/);
  });

  it("a reported mean above the peak conflicts", () => {
    const high = valuesOf(DEMO_CASE, { meanAvGradientMmHg: 90 });
    const conflict = crossChecks(high, deriveMetrics(DEMO_CASE, high)).find(check => check.id === "X-001");
    expect(conflict?.verdict).toBe("conflicts");
  });
});

describe("what-if runs", () => {
  it("increasing the aortic VTI shrinks the valve area and names the changed measurement", () => {
    const { baseline, simulated, diffs } = runWhatIf(DEMO_CASE, [{ key: "aorticVtiCm", to: 120 }]);
    const ava = diffs.find(diff => diff.metric.id === "D-001")!;
    expect(ava.changed).toBe(true);
    expect(ava.changedBecause).toEqual(["aorticVtiCm"]);
    expect(ava.simulated!).toBeLessThan(ava.baseline!);
    expect(simulated[0].value!).toBeCloseTo(baseline[0].value! * (100 / 120), 9);
  });

  it("metrics without that dependency do not change", () => {
    const { diffs } = runWhatIf(DEMO_CASE, [{ key: "aorticVtiCm", to: 120 }]);
    expect(diffs.find(diff => diff.metric.id === "D-004")!.changed).toBe(false);
    expect(diffs.find(diff => diff.metric.id === "D-005")!.changed).toBe(false);
  });

  it("a what-if never mutates the baseline case", () => {
    const before = DEMO_CASE.measurements.find(m => m.key === "aorticVtiCm")!.value;
    runWhatIf(DEMO_CASE, [{ key: "aorticVtiCm", to: 150 }]);
    expect(DEMO_CASE.measurements.find(m => m.key === "aorticVtiCm")!.value).toBe(before);
  });
});

describe("missing data and abstention", () => {
  const values = valuesOf(DEMO_CASE, { lvotVtiCm: null });
  const metrics = deriveMetrics(DEMO_CASE, values);

  it("abstains: the valve area is null with the missing measurement named", () => {
    expect(metrics[0].value).toBeNull();
    expect(metrics[0].missingReason).toMatch(/M-002/);
  });

  it("the dependent cross-check is not evaluable rather than guessed", () => {
    const identity = crossChecks(values, metrics).find(check => check.id === "X-002");
    expect(identity?.verdict).toBe("not-evaluable");
  });

  it("the plain-language summary says the value cannot be calculated", () => {
    expect(plainLanguageSummary(DEMO_CASE, metrics, crossChecks(values, metrics))).toMatch(/cannot be calculated/);
  });
});

describe("plain-language summary", () => {
  it("quotes the computed value and says it is not a diagnosis", () => {
    const values = valuesOf(DEMO_CASE);
    const metrics = deriveMetrics(DEMO_CASE, values);
    const text = plainLanguageSummary(DEMO_CASE, metrics, crossChecks(values, metrics));
    expect(text).toContain("0.63 cm²");
    expect(text).toContain("not a diagnosis");
    expect(text).toContain("D-001");
  });
});
