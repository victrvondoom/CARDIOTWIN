import { describe, expect, it } from "vitest";

import {
  ANATOMY,
  DEFAULT_POSE,
  VIEW_PRESETS,
  clampPose,
  dot,
  length,
  normalize,
  presetById,
  probeFrame,
  sub,
  toPlane,
} from "../src/cardiotwin/probe/probeGeometry";

describe("probe pose limits", () => {
  it("clamps every control into its documented range", () => {
    const pose = clampPose({ rotationDeg: 400, tiltDeg: -90, rockDeg: 99, depthCm: 1, fanDeg: 200 });
    expect(pose).toEqual({ rotationDeg: 90, tiltDeg: -40, rockDeg: 35, depthCm: 6, fanDeg: 90 });
  });

  it("falls back to the default pose for missing fields", () => {
    expect(clampPose({})).toEqual(DEFAULT_POSE);
  });
});

describe("canonical scan planes", () => {
  it.each(VIEW_PRESETS.map(preset => [preset.id, preset] as const))("%s aims the beam at its primary target", (_id, preset) => {
    const frame = probeFrame(preset);
    const expected = normalize(sub(preset.primaryTarget, preset.contact));
    expect(dot(frame.dir, expected)).toBeCloseTo(1, 9);
  });

  it.each(VIEW_PRESETS.map(preset => [preset.id, preset] as const))("%s plane contains both targets", (_id, preset) => {
    const frame = probeFrame(preset);
    expect(Math.abs(toPlane(frame, preset.primaryTarget).distance)).toBeLessThan(1e-9);
    expect(Math.abs(toPlane(frame, preset.secondaryTarget).distance)).toBeLessThan(1e-9);
  });

  it("keeps the image axes orthonormal", () => {
    for (const preset of VIEW_PRESETS) {
      const frame = probeFrame(preset, { rotationDeg: 23, tiltDeg: -12, rockDeg: 9 });
      expect(length(frame.dir)).toBeCloseTo(1, 9);
      expect(length(frame.lateral)).toBeCloseTo(1, 9);
      expect(length(frame.normal)).toBeCloseTo(1, 9);
      expect(dot(frame.dir, frame.lateral)).toBeCloseTo(0, 9);
      expect(dot(frame.normal, frame.dir)).toBeCloseTo(0, 9);
    }
  });
});

describe("pose controls change the frame as documented", () => {
  const preset = presetById("PLAX");

  it("in-plane rotation turns the image without moving the beam", () => {
    const base = probeFrame(preset);
    const turned = probeFrame(preset, { rotationDeg: 30 });
    expect(dot(base.dir, turned.dir)).toBeCloseTo(1, 9);
    expect(dot(base.lateral, turned.lateral)).toBeLessThan(0.99);
  });

  it("tilt moves the beam", () => {
    const base = probeFrame(preset);
    const tilted = probeFrame(preset, { tiltDeg: 15 });
    expect(dot(base.dir, tilted.dir)).toBeLessThan(0.999);
  });

  it("rock swings the beam sideways", () => {
    const base = probeFrame(preset);
    const rocked = probeFrame(preset, { rockDeg: 15 });
    expect(dot(base.dir, rocked.dir)).toBeLessThan(0.999);
  });

  it("depth and fan set the sector geometry", () => {
    const frame = probeFrame(preset, { depthCm: 15, fanDeg: 60 });
    expect(frame.depthM).toBeCloseTo(0.15, 9);
    expect(frame.fanRad).toBeCloseTo((60 * Math.PI) / 180, 9);
  });
});

describe("anatomy and presets", () => {
  it("has unique structure ids and labels", () => {
    expect(new Set(ANATOMY.map(item => item.id)).size).toBe(ANATOMY.length);
    expect(new Set(ANATOMY.map(item => item.label)).size).toBe(ANATOMY.length);
  });

  it("references only structures that exist", () => {
    const ids = new Set(ANATOMY.map(item => item.id));
    for (const preset of VIEW_PRESETS) {
      for (const expected of preset.expected) expect(ids.has(expected)).toBe(true);
    }
  });

  it("offers the six presets the reference uses", () => {
    expect(VIEW_PRESETS.map(preset => preset.id)).toEqual(["PLAX", "PSAX", "APICAL", "SUBX", "SSN", "RV_INFLOW"]);
  });
});
