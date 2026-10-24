import { describe, expect, it } from "vitest";

import { CALCULATORS, CATEGORIES, calculatorById, searchCalculators, workedExample } from "../src/cardiotwin/calc/calculators";

describe("calculator registry", () => {
  it.each(CALCULATORS.map(spec => [spec.id, spec] as const))("%s: worked example computes finite outputs", (_id, spec) => {
    const result = spec.compute(workedExample(spec));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(spec.outputs.length);
    for (const output of result.value) expect(Number.isFinite(output.value)).toBe(true);
  });

  it.each(CALCULATORS.map(spec => [spec.id, spec] as const))("%s: every example lies inside its declared limits", (_id, spec) => {
    for (const input of spec.inputs) {
      expect(input.example).toBeGreaterThanOrEqual(input.min);
      expect(input.example).toBeLessThanOrEqual(input.max);
      expect(input.step).toBeGreaterThan(0);
    }
  });

  it.each(CALCULATORS.map(spec => [spec.id, spec] as const))("%s: output labels and count match the spec", (_id, spec) => {
    const result = spec.compute(workedExample(spec));
    if (!result.ok) throw new Error(result.message);
    expect(result.value.map(output => output.label)).toEqual(spec.outputs.map(output => output.label));
  });

  it("reports a validation error instead of a number for an out-of-range input", () => {
    const spec = calculatorById("lv-ejection-fraction");
    expect(spec).toBeTruthy();
    const result = spec!.compute({ edvMl: 120, esvMl: 130 });
    expect(result.ok).toBe(false);
  });

  it("every calculator belongs to a known category", () => {
    const known = new Set(CATEGORIES.map(category => category.id));
    for (const spec of CALCULATORS) expect(known.has(spec.category)).toBe(true);
  });

  it("search finds RV size and aortic stenosis", () => {
    expect(searchCalculators("rv").map(spec => spec.id)).toContain("rv-size-function");
    expect(searchCalculators("aortic stenosis").map(spec => spec.id)).toContain("aortic-stenosis-continuity");
  });

  it("empty search returns every calculator", () => {
    expect(searchCalculators("   ")).toHaveLength(CALCULATORS.length);
  });
});
