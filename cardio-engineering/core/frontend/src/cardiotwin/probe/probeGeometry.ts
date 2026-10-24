/**
 * Probe geometry for the CardioTwin probe lab.
 *
 * Model frame (metres): +x = patient's left (viewer's right on a front view),
 * +y = superior, +z = anterior (toward the viewer). The torso is centred on the
 * origin. Landmark centres are approximate educational positions for a generic
 * adult thorax; they are not patient measurements.
 *
 * A probe pose is defined relative to the preset's geometric base, so the
 * default pose (all offsets zero) reproduces the canonical view exactly.
 */

export type Vec3 = readonly [number, number, number];

export interface ProbePose {
  /** In-plane rotation of the scan plane about the beam axis, degrees offset. */
  rotationDeg: number;
  /** Tilt of the beam about the lateral axis, degrees offset. */
  tiltDeg: number;
  /** Rock: lateral swing of the beam about the superior axis, degrees offset. */
  rockDeg: number;
  /** Imaging depth, centimetres (absolute). */
  depthCm: number;
  /** Sector fan width, degrees (absolute). */
  fanDeg: number;
}

export const POSE_RANGE = {
  rotationDeg: [-90, 90],
  tiltDeg: [-40, 40],
  rockDeg: [-35, 35],
  depthCm: [6, 18],
  fanDeg: [40, 90],
} as const;

export const DEFAULT_POSE: ProbePose = { rotationDeg: 0, tiltDeg: 0, rockDeg: 0, depthCm: 14, fanDeg: 70 };

export function clamp(value: number, [min, max]: readonly [number, number]): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampPose(pose: Partial<ProbePose>): ProbePose {
  const merged = { ...DEFAULT_POSE, ...pose };
  return {
    rotationDeg: clamp(merged.rotationDeg, POSE_RANGE.rotationDeg),
    tiltDeg: clamp(merged.tiltDeg, POSE_RANGE.tiltDeg),
    rockDeg: clamp(merged.rockDeg, POSE_RANGE.rockDeg),
    depthCm: clamp(merged.depthCm, POSE_RANGE.depthCm),
    fanDeg: clamp(merged.fanDeg, POSE_RANGE.fanDeg),
  };
}

// ---------------------------------------------------------------- vector math

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  return len < 1e-9 ? [0, 0, 1] : scale(a, 1 / len);
}

/** Rodrigues rotation of v about a unit axis by angle (radians). */
export function rotateAround(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const kv = cross(k, v);
  const kdv = dot(k, v) * (1 - c);
  return [
    v[0] * c + kv[0] * s + k[0] * kdv,
    v[1] * c + kv[1] * s + k[1] * kdv,
    v[2] * c + kv[2] * s + k[2] * kdv,
  ];
}

const DEG = Math.PI / 180;
const UP: Vec3 = [0, 1, 0];

// ---------------------------------------------------------------- anatomy

export type StructureId =
  | "LEFT_VENTRICLE"
  | "RIGHT_VENTRICLE"
  | "LEFT_ATRIUM"
  | "RIGHT_ATRIUM"
  | "AORTA"
  | "INTERVENTRICULAR_SEPTUM"
  | "MITRAL_VALVE"
  | "TRICUSPID_VALVE"
  | "AORTIC_VALVE"
  | "PULMONARY_VALVE";

export type StructureKind = "chamber" | "vessel" | "valve" | "septum";

export interface AnatomyLandmark {
  id: StructureId;
  label: string;
  kind: StructureKind;
  /** Centre in the model frame, metres. */
  center: Vec3;
  /** Approximate radius, metres (chambers and vessels). Valves use a point marker. */
  radius: number;
  /** Plain-language explanation shown in the probe lab. Educational only. */
  description: string;
  /** Calculator that uses this structure, when one is implemented. */
  calculatorId?: string;
}

export const ANATOMY: readonly AnatomyLandmark[] = [
  {
    id: "LEFT_VENTRICLE", label: "LV", kind: "chamber", center: [0.05, -0.03, 0.035], radius: 0.03,
    description: "Left ventricle: the main pumping chamber for systemic circulation. Its ejection fraction and wall motion are common echo measurements.",
    calculatorId: "lv-ejection-fraction",
  },
  {
    id: "RIGHT_VENTRICLE", label: "RV", kind: "chamber", center: [-0.015, -0.02, 0.065], radius: 0.024,
    description: "Right ventricle: pumps blood to the lungs. Its size and longitudinal function are measured from the apical and subcostal views.",
    calculatorId: "rv-size-function",
  },
  {
    id: "LEFT_ATRIUM", label: "LA", kind: "chamber", center: [0.02, 0.05, 0.01], radius: 0.025,
    description: "Left atrium: receives oxygenated blood from the lungs and fills the left ventricle through the mitral valve.",
  },
  {
    id: "RIGHT_ATRIUM", label: "RA", kind: "chamber", center: [-0.05, 0.02, 0.01], radius: 0.024,
    description: "Right atrium: receives systemic venous return and fills the right ventricle through the tricuspid valve.",
  },
  {
    id: "AORTA", label: "Ao", kind: "vessel", center: [0.0, 0.075, 0.06], radius: 0.014,
    description: "Aorta and aortic root: the main outflow vessel. The left ventricular outflow tract (LVOT) feeds into it through the aortic valve.",
  },
  {
    id: "INTERVENTRICULAR_SEPTUM", label: "IVS", kind: "septum", center: [-0.005, -0.02, 0.05], radius: 0.01,
    description: "Interventricular septum: the muscular wall between the two ventricles.",
  },
  {
    id: "MITRAL_VALVE", label: "MV", kind: "valve", center: [0.03, 0.02, 0.02], radius: 0.01,
    description: "Mitral valve: between the left atrium and left ventricle. Inflow velocities across it are measured in diastology.",
  },
  {
    id: "TRICUSPID_VALVE", label: "TV", kind: "valve", center: [-0.02, 0.02, 0.035], radius: 0.01,
    description: "Tricuspid valve: between the right atrium and right ventricle. Its annular motion is used for right ventricular function.",
  },
  {
    id: "AORTIC_VALVE", label: "AV", kind: "valve", center: [0.01, 0.06, 0.035], radius: 0.01,
    description: "Aortic valve: the outflow valve of the left ventricle. Stenosis and regurgitation are assessed with continuity and PISA methods.",
    calculatorId: "aortic-stenosis-continuity",
  },
  {
    id: "PULMONARY_VALVE", label: "PV", kind: "valve", center: [-0.01, 0.08, 0.05], radius: 0.01,
    description: "Pulmonary valve: the outflow valve of the right ventricle, leading into the pulmonary artery.",
  },
];

export function anatomyById(id: StructureId): AnatomyLandmark {
  const found = ANATOMY.find(item => item.id === id);
  if (!found) throw new Error(`Unknown structure ${id}`);
  return found;
}

// ---------------------------------------------------------------- presets

export type ViewGroup = "PLAX" | "PSAX" | "APICAL" | "SUBX" | "SSN" | "RV_INFLOW";

export interface ViewPreset {
  id: ViewGroup;
  label: string;
  /** Chest contact point, metres. */
  contact: Vec3;
  /** The beam aims at this point. */
  primaryTarget: Vec3;
  /** The scan plane is built to contain this point as well. */
  secondaryTarget: Vec3;
  /** Structures the view is expected to show when the pose is canonical. */
  expected: readonly StructureId[];
  /** Guidance written for a learner; mirrors what an examiner would be told. */
  guidance: string;
  /** Short gallery caption. */
  caption: string;
}

export const VIEW_PRESETS: readonly ViewPreset[] = [
  {
    id: "PLAX",
    label: "Parasternal long axis",
    contact: [0.035, 0.09, 0.115],
    primaryTarget: [0.04, -0.01, 0.03],
    secondaryTarget: [0.0, 0.075, 0.06],
    // The plane is fixed by the LV and aortic root; the LA lies slightly out of
    // this plane and comes into view with a small tilt.
    expected: ["LEFT_VENTRICLE", "AORTA"],
    guidance: "From the parasternal position, angle the probe toward the left shoulder so the aortic root, mitral valve and left ventricle appear on one line.",
    caption: "Long axis: LV, LA, aortic root",
  },
  {
    id: "PSAX",
    label: "Parasternal short axis",
    contact: [0.035, -0.02, 0.115],
    primaryTarget: [0.017, -0.025, 0.05],
    secondaryTarget: [0.11, -0.03, 0.035],
    expected: ["LEFT_VENTRICLE", "RIGHT_VENTRICLE"],
    guidance: "Rotate the probe 90 degrees from PLAX so the image shows the left ventricle as a circle, with the right ventricle beside the septum.",
    caption: "Short axis: LV circle, RV crescent",
  },
  {
    id: "APICAL",
    label: "Apical four-chamber",
    contact: [0.075, -0.10, 0.10],
    primaryTarget: [0.03, 0.0, 0.02],
    secondaryTarget: [-0.015, 0.035, 0.01],
    // LA and RA lie beyond 14 cm from the apex: they appear only with more depth.
    expected: ["LEFT_VENTRICLE", "RIGHT_VENTRICLE"],
    guidance: "Place the probe at the cardiac apex and point it toward the right shoulder. Four chambers should appear side by side.",
    caption: "Apical 4-chamber: four chambers",
  },
  {
    id: "SUBX",
    label: "Subcostal",
    contact: [-0.01, -0.12, 0.09],
    primaryTarget: [-0.02, 0.0, 0.03],
    secondaryTarget: [-0.05, 0.02, 0.01],
    // The right atrium sits at the edge of a subcostal fan at 14 cm; it appears with more depth.
    expected: ["RIGHT_VENTRICLE", "LEFT_VENTRICLE"],
    guidance: "Place the probe below the xiphoid and aim up and to the left. Use it when the chest window is poor.",
    caption: "Subcostal: RA, RV and LV",
  },
  {
    id: "SSN",
    label: "Suprasternal",
    contact: [0.0, 0.16, 0.09],
    primaryTarget: [0.0, 0.075, 0.06],
    secondaryTarget: [0.11, 0.07, 0.02],
    expected: ["AORTA"],
    guidance: "Place the probe in the suprasternal notch and angle down toward the aortic arch and descending aorta.",
    caption: "Suprasternal: aortic arch",
  },
  {
    id: "RV_INFLOW",
    label: "RV inflow",
    contact: [-0.02, -0.05, 0.11],
    primaryTarget: [-0.02, 0.02, 0.035],
    secondaryTarget: [-0.05, 0.02, 0.01],
    expected: ["RIGHT_VENTRICLE", "RIGHT_ATRIUM", "TRICUSPID_VALVE"],
    guidance: "From the parasternal or apical window, tilt inferiorly toward the patient's right hip and add slight counterclockwise rotation to centre the tricuspid valve.",
    caption: "RV inflow: tricuspid valve",
  },
];

export function presetById(id: ViewGroup): ViewPreset {
  const found = VIEW_PRESETS.find(preset => preset.id === id);
  if (!found) throw new Error(`Unknown view ${id}`);
  return found;
}

// ---------------------------------------------------------------- frame

export interface ProbeFrame {
  /** Beam origin on the chest (skin contact). */
  contact: Vec3;
  /** Unit beam direction (into the thorax). */
  dir: Vec3;
  /** Unit lateral axis of the image (image x). */
  lateral: Vec3;
  /** Unit plane normal. */
  normal: Vec3;
  /** Imaging depth, metres. */
  depthM: number;
  /** Full fan angle, radians. */
  fanRad: number;
  /** Pose the frame was built from (clamped). */
  pose: ProbePose;
}

/**
 * Builds the scan plane for a preset and pose.
 *
 * The beam aims at the primary target. The lateral image axis is the component
 * of the secondary target direction perpendicular to the beam, so the plane
 * contains both targets. Offsets then apply in this order: tilt about the
 * lateral axis, rock about the superior axis, then in-plane rotation about the
 * beam.
 */
export function probeFrame(preset: ViewPreset, poseInput: Partial<ProbePose> = {}): ProbeFrame {
  const pose = clampPose(poseInput);
  const baseDir = normalize(sub(preset.primaryTarget, preset.contact));
  const secondary = sub(preset.secondaryTarget, preset.contact);
  const perpendicular = sub(secondary, scale(baseDir, dot(secondary, baseDir)));
  let lateral = normalize(perpendicular.some(v => Math.abs(v) > 1e-9) ? perpendicular : cross(baseDir, UP));

  // Tilt: rotate the beam about the lateral axis.
  let dir = rotateAround(baseDir, lateral, pose.tiltDeg * DEG);
  // Rock: swing the beam sideways about the superior axis.
  dir = normalize(rotateAround(dir, UP, pose.rockDeg * DEG));
  // Keep the lateral axis orthogonal to the final beam.
  lateral = normalize(sub(lateral, scale(dir, dot(lateral, dir))));
  // In-plane rotation about the beam.
  lateral = normalize(rotateAround(lateral, dir, pose.rotationDeg * DEG));

  const normal = normalize(cross(dir, lateral));
  return {
    contact: preset.contact,
    dir,
    lateral,
    normal,
    depthM: pose.depthCm / 100,
    fanRad: pose.fanDeg * DEG,
    pose,
  };
}

/** Plane-space coordinates (metres) of a model-frame point. */
export function toPlane(frame: ProbeFrame, point: Vec3): { x: number; y: number; distance: number } {
  const rel = sub(point, frame.contact);
  return { x: dot(rel, frame.lateral), y: dot(rel, frame.dir), distance: dot(rel, frame.normal) };
}
