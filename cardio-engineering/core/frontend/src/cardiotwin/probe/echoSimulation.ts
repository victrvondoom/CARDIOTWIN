/**
 * Deterministic synthetic echocardiogram.
 *
 * This is a 2D procedural cross-section of the same landmark model that drives
 * the 3D scene. Each anatomy sphere is intersected with the probe's scan plane,
 * then drawn as a grayscale chamber with a bright wall, speckle texture and
 * depth attenuation. It is an educational rendering only: it is not a physical
 * ultrasound simulation and it is never a patient image.
 */

import { ANATOMY, probeFrame, toPlane, type AnatomyLandmark, type ProbeFrame, type ProbePose, type StructureId, type ViewPreset } from "./probeGeometry";

export interface EchoInput {
  preset: ViewPreset;
  pose: Partial<ProbePose>;
  /** Cardiac phase in [0, 1). 0 = end-diastole. */
  phase: number;
  width: number;
  height: number;
}

export interface EchoHit {
  id: StructureId;
  label: string;
  kind: AnatomyLandmark["kind"];
  /** Image coordinates in pixels. */
  x: number;
  y: number;
  /** Cross-section radius in pixels (chambers and vessels), 0 for valves. */
  radiusPx: number;
  /** Distance of the structure centre from the scan plane, millimetres. */
  distanceMm: number;
  /** Whether the structure lies inside the fan and depth. */
  inSector: boolean;
}

export interface EchoResult {
  width: number;
  height: number;
  /** RGBA, row-major, length = width * height * 4. */
  pixels: Uint8ClampedArray;
  hits: EchoHit[];
  /** Structures inside the sector, in anatomy order. */
  visibleStructures: StructureId[];
  frame: ProbeFrame;
  sector: { apexX: number; apexY: number; radiusPx: number; halfFanRad: number; pxPerM: number };
  /** Stable 32-bit checksum of the rendered pixels, for tests and provenance. */
  checksum: number;
}

const TOP_MARGIN_PX = 12;
const WALL_M = 0.0045;
const VALVE_MARK_M = 0.012;

/** Deterministic hash in [0, 1). */
export function hash2(x: number, y: number, seed = 1337): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Heartbeat modulation of chamber radii for the given phase. */
export function phaseScale(id: StructureId, phase: number): number {
  const wave = Math.sin(2 * Math.PI * phase);
  switch (id) {
    case "LEFT_VENTRICLE":
    case "RIGHT_VENTRICLE":
      return 1 + 0.08 * wave;
    case "LEFT_ATRIUM":
    case "RIGHT_ATRIUM":
      return 1 - 0.05 * wave;
    default:
      return 1;
  }
}

export function simulateEcho(input: EchoInput): EchoResult {
  const { preset, phase, width, height } = input;
  const frame = probeFrame(preset, input.pose);
  const top = TOP_MARGIN_PX;
  const pxPerM = (height - top - 6) / frame.depthM;
  const apexX = width / 2;
  const apexY = top;
  const halfFan = frame.fanRad / 2;
  const radiusPx = frame.depthM * pxPerM;

  // Project every landmark into the image plane.
  const planeHits = ANATOMY.map(landmark => {
    const rel = toPlane(frame, landmark.center);
    const scaled = landmark.kind === "chamber" ? phaseScale(landmark.id, phase) : 1;
    const radius = landmark.radius * scaled;
    // A structure counts as visible when any part of it reaches the fan, so the
    // reach (its radius) widens both the depth and the angular window.
    const reach = landmark.kind === "valve" ? 0 : radius;
    const depthOk = rel.y + reach >= 0 && rel.y - reach <= frame.depthM;
    const theta = Math.atan2(rel.x, rel.y);
    const angularWindow = halfFan + Math.atan2(reach, Math.max(rel.y, 1e-3));
    const inSector = depthOk && Math.abs(theta) <= angularWindow;
    const px = apexX + rel.x * pxPerM;
    const py = apexY + rel.y * pxPerM;
    const crossRadius = landmark.kind === "valve" ? 0 : Math.sqrt(Math.max(0, radius * radius - rel.distance * rel.distance));
    const visible = landmark.kind === "valve" ? Math.abs(rel.distance) < VALVE_MARK_M && inSector : crossRadius > 0 && inSector;
    return {
      landmark,
      cx: rel.x,
      cy: rel.y,
      crossRadius,
      visible,
      hit: {
        id: landmark.id,
        label: landmark.label,
        kind: landmark.kind,
        x: px,
        y: py,
        radiusPx: crossRadius * pxPerM,
        distanceMm: rel.distance * 1000,
        inSector,
      } satisfies EchoHit,
    };
  });

  const circles = planeHits.filter(item => item.visible && item.landmark.kind !== "valve");
  const valves = planeHits.filter(item => item.visible && item.landmark.kind === "valve");

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let py = 0; py < height; py++) {
    const ym = (py - apexY) / pxPerM;
    for (let px = 0; px < width; px++) {
      const xm = (px - apexX) / pxPerM;
      const r = Math.hypot(xm, ym);
      const theta = Math.atan2(xm, ym);
      const offset = (py * width + px) * 4;
      if (ym < 0 || r > frame.depthM || Math.abs(theta) > halfFan) {
        pixels[offset + 3] = 255;
        continue;
      }
      const speckle = hash2(px, py);
      const attenuation = Math.exp(-0.9 * (r / frame.depthM));
      let value = 0.2 * attenuation * (0.65 + 0.7 * speckle);

      for (const item of circles) {
        const dist = Math.hypot(xm - item.cx, ym - item.cy);
        if (dist < item.crossRadius) {
          value = 0.04 + 0.05 * hash2(px, py, 7);
        } else if (dist < item.crossRadius + WALL_M) {
          value = 0.72 + 0.2 * speckle;
        }
      }
      for (const item of valves) {
        if (Math.hypot(xm - item.cx, ym - item.cy) < VALVE_MARK_M * 0.5) value = 0.95;
      }
      // Fan edges are dimmer, as a real sector fades at its margins.
      if (Math.abs(theta) > halfFan - 0.03) value *= 0.5;

      const v = Math.round(Math.min(1, Math.max(0, value)) * 255);
      pixels[offset] = v;
      pixels[offset + 1] = v;
      pixels[offset + 2] = v;
      pixels[offset + 3] = 255;
    }
  }

  let checksum = 0;
  for (let i = 0; i < pixels.length; i++) {
    checksum = (checksum + pixels[i] * ((i % 251) + 1)) % 2147483647;
  }

  const hits = planeHits.map(item => item.hit);
  return {
    width,
    height,
    pixels,
    hits,
    visibleStructures: hits.filter(hit => hit.inSector && (hit.kind === "valve" ? hit.radiusPx === 0 : hit.radiusPx > 0)).map(hit => hit.id),
    frame,
    sector: { apexX, apexY, radiusPx, halfFanRad: halfFan, pxPerM },
    checksum,
  };
}

/** Polygon outline of the fan, for overlays. Coordinates in pixels. */
export function sectorOutline(result: EchoResult, steps = 24): Array<{ x: number; y: number }> {
  const { apexX, apexY, radiusPx, halfFanRad } = result.sector;
  const points: Array<{ x: number; y: number }> = [{ x: apexX, y: apexY }];
  for (let i = 0; i <= steps; i++) {
    const theta = -halfFanRad + (2 * halfFanRad * i) / steps;
    points.push({ x: apexX + radiusPx * Math.sin(theta), y: apexY + radiusPx * Math.cos(theta) });
  }
  return points;
}
