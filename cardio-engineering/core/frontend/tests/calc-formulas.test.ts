import { describe, expect, it } from "vitest";

import {
  aorticValveAreaContinuity,
  bernoulliPeakGradient,
  cardiacOutput,
  cmPerSToMPerS,
  ejectionFraction,
  eOverEprime,
  eToAratio,
  lvotArea,
  mPerSToCmPerS,
  mmToCm,
  pisaEroa,
  regurgitantFraction,
  regurgitantVolume,
  rvFractionalAreaChange,
  strokeVolumeFromLvot,
  type CalcResult,
} from "../src/cardiotwin/calc/formulas";

function value<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(`expected a value, got error: ${result.message}`);
  return result.value;
}

describe("unit conversion", () => {
  it("converts millimetres to centimetres", () => {
    expect(mmToCm(20)).toBeCloseTo(2, 12);
  });

  it("converts metres per second and centimetres per second both ways", () => {
    expect(mPerSToCmPerS(4.5)).toBeCloseTo(450, 9);
    expect(cmPerSToMPerS(450)).toBeCloseTo(4.5, 9);
  });
});

describe("LVOT area and stroke volume", () => {
  it("computes a circular area: 2.0 cm diameter gives pi cm²", () => {
    expect(value(lvotArea(2))).toBeCloseTo(Math.PI, 12);
  });

  it("stroke volume is area times VTI: 2.0 cm and 20 cm gives pi × 20 mL", () => {
    expect(value(strokeVolumeFromLvot({ lvotDiameterCm: 2, lvotVtiCm: 20 }))).toBeCloseTo(20 * Math.PI, 9);
  });

  it("cardiac output is SV × HR in litres per minute", () => {
    expect(value(cardiacOutput({ strokeVolumeMl: 70, heartRateBpm: 60 }))).toBeCloseTo(4.2, 9);
  });
});

describe("aortic valve area by continuity", () => {
  it("worked example: LVOT 2.0 cm, LVOT VTI 20 cm, AV VTI 100 cm gives AVA = pi/5 cm² and DVI 0.2", () => {
    const result = value(aorticValveAreaContinuity({ lvotDiameterCm: 2, lvotVtiCm: 20, aorticVtiCm: 100 }));
    expect(result.areaCm2).toBeCloseTo(Math.PI / 5, 9);
    expect(result.dvi).toBeCloseTo(0.2, 12);
    expect(result.lvotAreaCm2).toBeCloseTo(Math.PI, 12);
  });

  it("AVA scales linearly with LVOT VTI", () => {
    const a = value(aorticValveAreaContinuity({ lvotDiameterCm: 2, lvotVtiCm: 20, aorticVtiCm: 100 })).areaCm2;
    const b = value(aorticValveAreaContinuity({ lvotDiameterCm: 2, lvotVtiCm: 40, aorticVtiCm: 100 })).areaCm2;
    expect(b / a).toBeCloseTo(2, 12);
  });

  it("rejects an LVOT diameter below the physical range", () => {
    const result = aorticValveAreaContinuity({ lvotDiameterCm: 0.4, lvotVtiCm: 20, aorticVtiCm: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("LVOT diameter");
  });

  it("rejects a missing (NaN) aortic VTI instead of returning NaN", () => {
    const result = aorticValveAreaContinuity({ lvotDiameterCm: 2, lvotVtiCm: 20, aorticVtiCm: Number.NaN });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("Aortic valve VTI");
  });

  it("accepts the exact boundary values", () => {
    expect(aorticValveAreaContinuity({ lvotDiameterCm: 0.5, lvotVtiCm: 1, aorticVtiCm: 300 }).ok).toBe(true);
    expect(aorticValveAreaContinuity({ lvotDiameterCm: 4, lvotVtiCm: 80, aorticVtiCm: 1 }).ok).toBe(true);
  });
});

describe("PISA and aortic regurgitation", () => {
  it("worked example: r 0.8 cm, Va 40 cm/s, Vmax 500 cm/s gives flow 2π·0.64·40 mL/s and EROA = flow/500", () => {
    const { flowRateMlS, eroaCm2 } = value(pisaEroa({ aliasingRadiusCm: 0.8, aliasingVelocityCmS: 40, peakVelocityCmS: 500 }));
    expect(flowRateMlS).toBeCloseTo(2 * Math.PI * 0.64 * 40, 9);
    expect(eroaCm2).toBeCloseTo(flowRateMlS / 500, 12);
  });

  it("regurgitant volume is EROA × jet VTI", () => {
    expect(value(regurgitantVolume({ eroaCm2: 0.3, jetVtiCm: 100 }))).toBeCloseTo(30, 9);
  });

  it("regurgitant fraction is RVol / LVOT stroke volume × 100", () => {
    expect(value(regurgitantFraction({ regurgitantVolumeMl: 30, lvotStrokeVolumeMl: 75 }))).toBeCloseTo(40, 9);
  });

  it("chains the PISA worked example to a regurgitant fraction", () => {
    const { eroaCm2 } = value(pisaEroa({ aliasingRadiusCm: 0.8, aliasingVelocityCmS: 40, peakVelocityCmS: 500 }));
    const rvol = value(regurgitantVolume({ eroaCm2, jetVtiCm: 100 }));
    const rf = value(regurgitantFraction({ regurgitantVolumeMl: rvol, lvotStrokeVolumeMl: 80 }));
    expect(rf).toBeCloseTo((rvol / 80) * 100, 9);
  });
});

describe("left and right ventricular indices", () => {
  it("ejection fraction: EDV 120 mL, ESV 50 mL gives 58.33 %", () => {
    expect(value(ejectionFraction({ edvMl: 120, esvMl: 50 }))).toBeCloseTo((100 * 70) / 120, 9);
  });

  it("ejection fraction refuses end-systolic volume at or above end-diastolic volume", () => {
    const result = ejectionFraction({ edvMl: 80, esvMl: 80 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("End-systolic volume");
  });

  it("RV fractional area change: EDA 20 cm², ESA 12 cm² gives 40 %", () => {
    expect(value(rvFractionalAreaChange({ edaCm2: 20, esaCm2: 12 }))).toBeCloseTo(40, 9);
  });
});

describe("physics and diastology", () => {
  it("simplified Bernoulli gradient: 4 m/s gives 64 mmHg", () => {
    expect(value(bernoulliPeakGradient(4))).toBeCloseTo(64, 9);
  });

  it("refuses a velocity above the supported range", () => {
    expect(bernoulliPeakGradient(9).ok).toBe(false);
  });

  it("E/A and E/e′ are plain ratios", () => {
    expect(value(eToAratio({ eCmS: 80, aCmS: 40 }))).toBeCloseTo(2, 12);
    expect(value(eOverEprime({ eCmS: 80, eprimeCmS: 8 }))).toBeCloseTo(10, 12);
  });
});
