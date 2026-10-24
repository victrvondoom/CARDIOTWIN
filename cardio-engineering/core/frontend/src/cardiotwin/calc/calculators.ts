/**
 * Calculator registry for the CardioTwin calculator studio.
 *
 * Each entry wraps a formula from formulas.ts. Inputs carry units and limits; the
 * compute function returns labelled raw outputs or a validation error. A worked
 * example populates every input with the same values the unit tests use.
 * Categories without an implemented calculator are listed but not populated.
 */

import {
  aorticValveAreaContinuity,
  bernoulliPeakGradient,
  eOverEprime,
  eToAratio,
  ejectionFraction,
  pisaEroa,
  regurgitantFraction,
  regurgitantVolume,
  rvFractionalAreaChange,
  type CalcResult,
} from "./formulas";

export type CategoryId =
  | "atria"
  | "right-ventricle"
  | "left-ventricle"
  | "aortic-valve"
  | "mitral-valve"
  | "tricuspid-valve"
  | "pulmonary-valve"
  | "diastology"
  | "pericardium"
  | "physics"
  | "shunts";

export interface Category {
  id: CategoryId;
  label: string;
  /** Accent colour from the pixel palette. */
  accent: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: "atria", label: "Atria", accent: "var(--p-blue)" },
  { id: "right-ventricle", label: "Right ventricle", accent: "var(--p-green)" },
  { id: "left-ventricle", label: "Left ventricle", accent: "var(--p-orange)" },
  { id: "aortic-valve", label: "Aortic valve", accent: "var(--p-red)" },
  { id: "mitral-valve", label: "Mitral valve", accent: "var(--p-yellow)" },
  { id: "tricuspid-valve", label: "Tricuspid valve", accent: "var(--p-green)" },
  { id: "pulmonary-valve", label: "Pulmonary valve", accent: "var(--p-blue)" },
  { id: "diastology", label: "Diastology", accent: "var(--p-yellow)" },
  { id: "pericardium", label: "Pericardium", accent: "var(--p-red)" },
  { id: "physics", label: "Physics", accent: "var(--p-blue)" },
  { id: "shunts", label: "Shunts", accent: "var(--p-green)" },
];

export interface CalcInput {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  example: number;
  /** Plain-language note shown under the field. */
  help: string;
}

export interface CalcOutput {
  label: string;
  unit: string;
  /** Formatting precision, decimal places. */
  digits: number;
}

export type Values = Record<string, number>;

export type DiagramMode = "continuity" | "pisa" | "volumes" | "area" | "bernoulli" | "diastology";

export interface CalculatorSpec {
  id: string;
  name: string;
  category: CategoryId;
  summary: string;
  /** Formula lines, rendered as written. Symbols match the input labels. */
  formula: string[];
  /** Why each step matters, for learners. */
  explain: string;
  /** Source and formula version. No clinical thresholds are included. */
  source: string;
  /** Unit-test file that checks this calculator's numbers. */
  testFile: string;
  inputs: CalcInput[];
  outputs: CalcOutput[];
  compute: (values: Values) => CalcResult<Array<{ label: string; value: number }>>;
  diagram: DiagramMode;
}

export const CALCULATORS: readonly CalculatorSpec[] = [
  {
    id: "aortic-stenosis-continuity",
    name: "Aortic stenosis · continuity",
    category: "aortic-valve",
    summary: "Aortic valve area and dimensionless index from LVOT and aortic velocity-time integrals.",
    formula: [
      "AVA = LVOT area × VTI(LVOT) ÷ VTI(AV)",
      "LVOT area = π × (LVOT diameter ÷ 2)²",
      "DVI = VTI(LVOT) ÷ VTI(AV)",
    ],
    explain: "Flow through the LVOT must equal flow through the aortic valve. The valve area therefore equals the LVOT area scaled by the ratio of the two velocity-time integrals.",
    source: "ASE/EACVI recommendations for the echocardiographic assessment of aortic valve stenosis (Baumgartner et al., J Am Soc Echocardiogr 2017), formula v1.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "lvotDiameterCm", label: "LVOT diameter", unit: "cm", min: 0.5, max: 4, step: 0.1, example: 2, help: "Measured in the parasternal long-axis view, just below the aortic valve." },
      { key: "lvotVtiCm", label: "LVOT VTI", unit: "cm", min: 1, max: 80, step: 0.5, example: 20, help: "Velocity-time integral in pulsed-wave Doppler at the LVOT." },
      { key: "aorticVtiCm", label: "Aortic valve VTI", unit: "cm", min: 1, max: 300, step: 0.5, example: 100, help: "Continuous-wave Doppler velocity-time integral through the valve." },
    ],
    outputs: [
      { label: "Aortic valve area", unit: "cm²", digits: 2 },
      { label: "Dimensionless index (DVI)", unit: "", digits: 2 },
      { label: "LVOT area", unit: "cm²", digits: 2 },
    ],
    compute: values => {
      const r = aorticValveAreaContinuity({ lvotDiameterCm: values.lvotDiameterCm, lvotVtiCm: values.lvotVtiCm, aorticVtiCm: values.aorticVtiCm });
      if (!r.ok) return r;
      return {
        ok: true,
        value: [
          { label: "Aortic valve area", value: r.value.areaCm2 },
          { label: "Dimensionless index (DVI)", value: r.value.dvi },
          { label: "LVOT area", value: r.value.lvotAreaCm2 },
        ],
      };
    },
    diagram: "continuity",
  },
  {
    id: "aortic-regurgitation-pisa",
    name: "Aortic regurgitation · PISA",
    category: "aortic-valve",
    summary: "Effective regurgitant orifice area by the proximal isovelocity surface area method, then regurgitant volume and fraction.",
    formula: [
      "Flow = 2π × r² × Va   (r, Va in cm and cm/s)",
      "EROA = Flow ÷ Vmax",
      "RVol = EROA × jet VTI",
      "RF (%) = RVol ÷ LVOT stroke volume × 100",
    ],
    explain: "The aliasing surface is a hemisphere of constant velocity. Its flow rate, divided by the peak regurgitant velocity, gives the effective orifice.",
    source: "ASE/EACVI recommendations for noninvasive evaluation of native valvular regurgitation (Zoghbi et al., J Am Soc Echocardiogr 2017), formula v1.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "aliasingRadiusCm", label: "Aliasing radius", unit: "cm", min: 0.05, max: 3, step: 0.05, example: 0.8, help: "Distance from the orifice to the first aliasing boundary on the colour map." },
      { key: "aliasingVelocityCmS", label: "Aliasing velocity", unit: "cm/s", min: 5, max: 200, step: 1, example: 40, help: "Velocity set on the colour-Doppler scale at that boundary." },
      { key: "peakVelocityCmS", label: "Peak regurgitant velocity", unit: "cm/s", min: 100, max: 800, step: 5, example: 500, help: "Peak continuous-wave velocity of the regurgitant jet." },
      { key: "jetVtiCm", label: "Jet VTI", unit: "cm", min: 5, max: 300, step: 1, example: 100, help: "Velocity-time integral of the regurgitant jet." },
      { key: "lvotStrokeVolumeMl", label: "LVOT stroke volume", unit: "mL", min: 10, max: 250, step: 1, example: 80, help: "From the LVOT calculator, or measured directly." },
    ],
    outputs: [
      { label: "Flow rate at aliasing surface", unit: "mL/s", digits: 1 },
      { label: "Effective regurgitant orifice area (EROA)", unit: "cm²", digits: 3 },
      { label: "Regurgitant volume", unit: "mL", digits: 1 },
      { label: "Regurgitant fraction", unit: "%", digits: 1 },
    ],
    compute: values => {
      const pisa = pisaEroa({ aliasingRadiusCm: values.aliasingRadiusCm, aliasingVelocityCmS: values.aliasingVelocityCmS, peakVelocityCmS: values.peakVelocityCmS });
      if (!pisa.ok) return pisa;
      const rvol = regurgitantVolume({ eroaCm2: pisa.value.eroaCm2, jetVtiCm: values.jetVtiCm });
      if (!rvol.ok) return rvol;
      const rf = regurgitantFraction({ regurgitantVolumeMl: rvol.value, lvotStrokeVolumeMl: values.lvotStrokeVolumeMl });
      if (!rf.ok) return rf;
      return {
        ok: true,
        value: [
          { label: "Flow rate at aliasing surface", value: pisa.value.flowRateMlS },
          { label: "Effective regurgitant orifice area (EROA)", value: pisa.value.eroaCm2 },
          { label: "Regurgitant volume", value: rvol.value },
          { label: "Regurgitant fraction", value: rf.value },
        ],
      };
    },
    diagram: "pisa",
  },
  {
    id: "lv-ejection-fraction",
    name: "Left ventricle · ejection fraction",
    category: "left-ventricle",
    summary: "Ejection fraction from end-diastolic and end-systolic volumes.",
    formula: ["EF (%) = (EDV − ESV) ÷ EDV × 100"],
    explain: "The fraction of the end-diastolic volume ejected in one beat. Volumes come from a biplane method or from a 3D reconstruction.",
    source: "Definition of ejection fraction from end-diastolic and end-systolic volume. Clinical categories are not applied here.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "edvMl", label: "End-diastolic volume", unit: "mL", min: 20, max: 500, step: 1, example: 120, help: "Left ventricular volume at the end of diastole." },
      { key: "esvMl", label: "End-systolic volume", unit: "mL", min: 5, max: 500, step: 1, example: 50, help: "Left ventricular volume at the end of systole." },
    ],
    outputs: [{ label: "Ejection fraction", unit: "%", digits: 1 }],
    compute: values => {
      const r = ejectionFraction({ edvMl: values.edvMl, esvMl: values.esvMl });
      if (!r.ok) return r;
      return { ok: true, value: [{ label: "Ejection fraction", value: r.value }] };
    },
    diagram: "volumes",
  },
  {
    id: "rv-size-function",
    name: "Right ventricle · fractional area change",
    category: "right-ventricle",
    summary: "RV fractional area change from end-diastolic and end-systolic areas, in the apical four-chamber view.",
    formula: ["FAC (%) = (EDA − ESA) ÷ EDA × 100"],
    explain: "The RV outline is traced at end-diastole and end-systole. The change in area describes how much the chamber shortens in that view.",
    source: "Definition of RV fractional area change from end-diastolic and end-systolic area (apical four-chamber view). Clinical categories are not applied here.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "edaCm2", label: "End-diastolic RV area", unit: "cm²", min: 5, max: 80, step: 0.5, example: 20, help: "RV endocardial area traced at end-diastole." },
      { key: "esaCm2", label: "End-systolic RV area", unit: "cm²", min: 2, max: 80, step: 0.5, example: 12, help: "RV endocardial area traced at end-systole." },
    ],
    outputs: [{ label: "RV fractional area change", unit: "%", digits: 1 }],
    compute: values => {
      const r = rvFractionalAreaChange({ edaCm2: values.edaCm2, esaCm2: values.esaCm2 });
      if (!r.ok) return r;
      return { ok: true, value: [{ label: "RV fractional area change", value: r.value }] };
    },
    diagram: "area",
  },
  {
    id: "bernoulli-gradient",
    name: "Physics · Bernoulli peak gradient",
    category: "physics",
    summary: "Peak pressure gradient across a stenosis from its peak Doppler velocity.",
    formula: ["ΔP (mmHg) = 4 × v²   (v in m/s)"],
    explain: "Kinetic energy at the jet converts to a pressure drop. The simplified form ignores the velocity proximal to the narrowing.",
    source: "Simplified Bernoulli equation used in Doppler echocardiography.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "peakVelocityMs", label: "Peak velocity", unit: "m/s", min: 0.2, max: 7, step: 0.05, example: 4, help: "Peak continuous-wave Doppler velocity across the narrowing." },
    ],
    outputs: [{ label: "Peak pressure gradient", unit: "mmHg", digits: 1 }],
    compute: values => {
      const r = bernoulliPeakGradient(values.peakVelocityMs);
      if (!r.ok) return r;
      return { ok: true, value: [{ label: "Peak pressure gradient", value: r.value }] };
    },
    diagram: "bernoulli",
  },
  {
    id: "diastolic-ratios",
    name: "Diastology · E/A and E/e′",
    category: "diastology",
    summary: "Mitral inflow ratio E/A and the E/e′ ratio from mitral Doppler and tissue Doppler velocities.",
    formula: [
      "E/A = E velocity ÷ A velocity",
      "E/e′ = E velocity ÷ e′ velocity",
    ],
    explain: "E is early diastolic inflow, A is atrial-contraction inflow, and e′ is annular tissue velocity. The ratios combine these measurements without a threshold.",
    source: "Definitions from the ASE/EACVI recommendations for the evaluation of left ventricular diastolic function. Clinical grades are not applied here.",
    testFile: "tests/calc-formulas.test.ts",
    inputs: [
      { key: "eCmS", label: "E velocity", unit: "cm/s", min: 10, max: 250, step: 1, example: 80, help: "Early mitral inflow peak velocity." },
      { key: "aCmS", label: "A velocity", unit: "cm/s", min: 10, max: 250, step: 1, example: 40, help: "Late mitral inflow peak velocity." },
      { key: "eprimeCmS", label: "e′ velocity", unit: "cm/s", min: 1, max: 40, step: 0.5, example: 8, help: "Tissue Doppler e′ velocity at the mitral annulus." },
    ],
    outputs: [
      { label: "E/A ratio", unit: "", digits: 2 },
      { label: "E/e′ ratio", unit: "", digits: 1 },
    ],
    compute: values => {
      const ea = eToAratio({ eCmS: values.eCmS, aCmS: values.aCmS });
      if (!ea.ok) return ea;
      const ee = eOverEprime({ eCmS: values.eCmS, eprimeCmS: values.eprimeCmS });
      if (!ee.ok) return ee;
      return { ok: true, value: [{ label: "E/A ratio", value: ea.value }, { label: "E/e′ ratio", value: ee.value }] };
    },
    diagram: "diastology",
  },
];

export function calculatorById(id: string | null): CalculatorSpec | undefined {
  return CALCULATORS.find(item => item.id === id);
}

/** Worked-example values for a calculator, keyed by input. */
export function workedExample(spec: CalculatorSpec): Values {
  return Object.fromEntries(spec.inputs.map(input => [input.key, input.example]));
}

export function categoryCount(categoryId: CategoryId): number {
  return CALCULATORS.filter(item => item.category === categoryId).length;
}

/** Case-insensitive search across name, summary, category label and id. */
export function searchCalculators(query: string): CalculatorSpec[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CALCULATORS];
  return CALCULATORS.filter(item => {
    const category = CATEGORIES.find(cat => cat.id === item.category)?.label ?? "";
    return [item.name, item.summary, category, item.id].some(text => text.toLowerCase().includes(q));
  });
}
