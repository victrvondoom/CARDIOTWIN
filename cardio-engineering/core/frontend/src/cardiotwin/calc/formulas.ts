/**
 * Cardiovascular echo formulas for the CardioTwin calculator studio.
 *
 * Every function returns raw mathematical outputs. No function classifies a
 * result as normal or abnormal, because no clinical thresholds are verified in
 * this repository. Results are educational and are not a diagnosis.
 *
 * Units are stated in each signature. Inputs are validated: non-finite values,
 * values outside the physical range, and denominators that would divide by zero
 * return a CalcError instead of a number.
 */

export interface CalcError {
  ok: false;
  field: string;
  message: string;
}

export interface CalcOk<T> {
  ok: true;
  value: T;
}

export type CalcResult<T> = CalcOk<T> | CalcError;

export function ok<T>(value: T): CalcOk<T> {
  return { ok: true, value };
}

export function fail(field: string, message: string): CalcError {
  return { ok: false, field, message };
}

/** Checks a finite number inside [min, max]. Returns the number or an error. */
export function requireRange(field: string, value: number, min: number, max: number, unit: string): CalcResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(field, `Enter a number for ${field}.`);
  }
  if (value < min || value > max) {
    return fail(field, `${field} must be between ${min} and ${max} ${unit}.`);
  }
  return ok(value);
}

// ---------------------------------------------------------------- unit conversion

/** Millimetres to centimetres. */
export const mmToCm = (mm: number): number => mm / 10;
/** Metres per second to centimetres per second. */
export const mPerSToCmPerS = (ms: number): number => ms * 100;
/** Centimetres per second to metres per second. */
export const cmPerSToMPerS = (cmS: number): number => cmS / 100;

// ---------------------------------------------------------------- left-ventricular outflow

/**
 * Cross-sectional area of a circular LVOT.
 * @param diameterCm LVOT diameter, cm (must be 0.5 to 4).
 * @returns area in cm².
 */
export function lvotArea(diameterCm: number): CalcResult<number> {
  const d = requireRange("LVOT diameter", diameterCm, 0.5, 4, "cm");
  if (!d.ok) return d;
  return ok(Math.PI * (d.value / 2) ** 2);
}

/**
 * Aortic valve area by the continuity equation.
 *
 * AVA = LVOT area × VTI(LVOT) / VTI(AV), with VTIs in cm (velocity-time integral).
 * Source: ASE/EACVI recommendations for the echocardiographic assessment of aortic
 * valve stenosis (Baumgartner et al., J Am Soc Echocardiogr 2017), formula version v1.
 *
 * @returns area in cm² and the dimensionless velocity-time index (DVI).
 */
export function aorticValveAreaContinuity(input: {
  lvotDiameterCm: number;
  lvotVtiCm: number;
  aorticVtiCm: number;
}): CalcResult<{ areaCm2: number; dvi: number; lvotAreaCm2: number }> {
  const area = lvotArea(input.lvotDiameterCm);
  if (!area.ok) return area;
  const lvotVti = requireRange("LVOT VTI", input.lvotVtiCm, 1, 80, "cm");
  if (!lvotVti.ok) return lvotVti;
  const aoVti = requireRange("Aortic valve VTI", input.aorticVtiCm, 1, 300, "cm");
  if (!aoVti.ok) return aoVti;
  return ok({
    areaCm2: (area.value * lvotVti.value) / aoVti.value,
    dvi: lvotVti.value / aoVti.value,
    lvotAreaCm2: area.value,
  });
}

/**
 * Stroke volume from the LVOT: SV = LVOT area × LVOT VTI.
 * @returns mL (cm³).
 */
export function strokeVolumeFromLvot(input: { lvotDiameterCm: number; lvotVtiCm: number }): CalcResult<number> {
  const area = lvotArea(input.lvotDiameterCm);
  if (!area.ok) return area;
  const vti = requireRange("LVOT VTI", input.lvotVtiCm, 1, 80, "cm");
  if (!vti.ok) return vti;
  return ok(area.value * vti.value);
}

/** Cardiac output = stroke volume × heart rate, returned in L/min. */
export function cardiacOutput(input: { strokeVolumeMl: number; heartRateBpm: number }): CalcResult<number> {
  const sv = requireRange("Stroke volume", input.strokeVolumeMl, 10, 250, "mL");
  if (!sv.ok) return sv;
  const hr = requireRange("Heart rate", input.heartRateBpm, 20, 220, "bpm");
  if (!hr.ok) return hr;
  return ok((sv.value * hr.value) / 1000);
}

// ---------------------------------------------------------------- aortic regurgitation (PISA)

/**
 * Proximal isovelocity surface area (PISA) method for effective regurgitant orifice area.
 *
 * Flow rate at the aliasing surface: Q = 2π r² Va (mL/s, r in cm, Va in cm/s).
 * EROA = Q / Vmax (cm²), where Vmax is the peak regurgitant velocity in cm/s.
 * Source: ASE/EACVI recommendations for noninvasive evaluation of native valvular
 * regurgitation (Zoghbi et al., J Am Soc Echocardiogr 2017), formula version v1.
 */
export function pisaEroa(input: {
  aliasingRadiusCm: number;
  aliasingVelocityCmS: number;
  peakVelocityCmS: number;
}): CalcResult<{ flowRateMlS: number; eroaCm2: number }> {
  const r = requireRange("Aliasing radius", input.aliasingRadiusCm, 0.05, 3, "cm");
  if (!r.ok) return r;
  const va = requireRange("Aliasing velocity", input.aliasingVelocityCmS, 5, 200, "cm/s");
  if (!va.ok) return va;
  const vmax = requireRange("Peak regurgitant velocity", input.peakVelocityCmS, 100, 800, "cm/s");
  if (!vmax.ok) return vmax;
  const flow = 2 * Math.PI * r.value ** 2 * va.value;
  return ok({ flowRateMlS: flow, eroaCm2: flow / vmax.value });
}

/**
 * Regurgitant volume: RVol = EROA × VTI of the regurgitant jet (mL).
 */
export function regurgitantVolume(input: { eroaCm2: number; jetVtiCm: number }): CalcResult<number> {
  const eroa = requireRange("EROA", input.eroaCm2, 0.01, 5, "cm²");
  if (!eroa.ok) return eroa;
  const vti = requireRange("Jet VTI", input.jetVtiCm, 5, 300, "cm");
  if (!vti.ok) return vti;
  return ok(eroa.value * vti.value);
}

/** Regurgitant fraction (%) = RVol / LVOT stroke volume × 100. */
export function regurgitantFraction(input: { regurgitantVolumeMl: number; lvotStrokeVolumeMl: number }): CalcResult<number> {
  const rvol = requireRange("Regurgitant volume", input.regurgitantVolumeMl, 0, 300, "mL");
  if (!rvol.ok) return rvol;
  const sv = requireRange("LVOT stroke volume", input.lvotStrokeVolumeMl, 10, 250, "mL");
  if (!sv.ok) return sv;
  return ok((rvol.value / sv.value) * 100);
}

// ---------------------------------------------------------------- left ventricle

/** Ejection fraction (%) = (EDV − ESV) / EDV × 100 from end-diastolic and end-systolic volumes. */
export function ejectionFraction(input: { edvMl: number; esvMl: number }): CalcResult<number> {
  const edv = requireRange("End-diastolic volume", input.edvMl, 20, 500, "mL");
  if (!edv.ok) return edv;
  const esv = requireRange("End-systolic volume", input.esvMl, 5, 500, "mL");
  if (!esv.ok) return esv;
  if (esv.value >= edv.value) {
    return fail("End-systolic volume", "End-systolic volume must be smaller than end-diastolic volume.");
  }
  return ok(((edv.value - esv.value) / edv.value) * 100);
}

// ---------------------------------------------------------------- right ventricle

/** RV fractional area change (%) = (EDA − ESA) / EDA × 100 from end-diastolic and end-systolic areas. */
export function rvFractionalAreaChange(input: { edaCm2: number; esaCm2: number }): CalcResult<number> {
  const eda = requireRange("End-diastolic RV area", input.edaCm2, 5, 80, "cm²");
  if (!eda.ok) return eda;
  const esa = requireRange("End-systolic RV area", input.esaCm2, 2, 80, "cm²");
  if (!esa.ok) return esa;
  if (esa.value >= eda.value) {
    return fail("End-systolic RV area", "End-systolic area must be smaller than end-diastolic area.");
  }
  return ok(((eda.value - esa.value) / eda.value) * 100);
}

// ---------------------------------------------------------------- physics

/**
 * Simplified Bernoulli equation: peak pressure gradient ΔP = 4 v² (mmHg, v in m/s).
 * This is the standard echo simplification and ignores proximal velocity.
 */
export function bernoulliPeakGradient(peakVelocityMs: number): CalcResult<number> {
  const v = requireRange("Peak velocity", peakVelocityMs, 0.2, 7, "m/s");
  if (!v.ok) return v;
  return ok(4 * v.value ** 2);
}

// ---------------------------------------------------------------- diastology

/** Early-to-late mitral inflow velocity ratio (E/A), dimensionless. */
export function eToAratio(input: { eCmS: number; aCmS: number }): CalcResult<number> {
  const e = requireRange("E velocity", input.eCmS, 10, 250, "cm/s");
  if (!e.ok) return e;
  const a = requireRange("A velocity", input.aCmS, 10, 250, "cm/s");
  if (!a.ok) return a;
  return ok(e.value / a.value);
}

/** E/e′ ratio, dimensionless: mitral E velocity divided by the mitral annular e′ velocity. */
export function eOverEprime(input: { eCmS: number; eprimeCmS: number }): CalcResult<number> {
  const e = requireRange("E velocity", input.eCmS, 10, 250, "cm/s");
  if (!e.ok) return e;
  const ep = requireRange("e′ velocity", input.eprimeCmS, 1, 40, "cm/s");
  if (!ep.ok) return ep;
  return ok(e.value / ep.value);
}
