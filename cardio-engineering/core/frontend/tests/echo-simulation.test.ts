import { describe, expect, it } from "vitest";

import { VIEW_PRESETS, presetById } from "../src/cardiotwin/probe/probeGeometry";
import { hash2, sectorOutline, simulateEcho } from "../src/cardiotwin/probe/echoSimulation";

const SIZE = { width: 240, height: 200 };

function run(preset: string, pose: Parameters<typeof simulateEcho>[0]["pose"] = {}, phase = 0) {
  return simulateEcho({ preset: presetById(preset as never), pose, phase, ...SIZE });
}

describe("synthetic echo determinism", () => {
  it("produces identical pixels and checksum for identical inputs", () => {
    const a = run("PLAX", { tiltDeg: 4 });
    const b = run("PLAX", { tiltDeg: 4 });
    expect(a.checksum).toBe(b.checksum);
    expect(Array.from(a.pixels.slice(0, 64))).toEqual(Array.from(b.pixels.slice(0, 64)));
  });

  it("hash2 is stable and within [0, 1)", () => {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const v = hash2(x, y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(hash2(x, y)).toBe(v);
      }
    }
  });
});

describe("canonical views show their expected anatomy", () => {
  it.each(VIEW_PRESETS.map(preset => [preset.id] as const))("%s shows every expected structure", id => {
    const visible = run(id).visibleStructures;
    for (const expected of presetById(id).expected) {
      expect(visible, `${id} should show ${expected}`).toContain(expected);
    }
  });
});

describe("controls change the image deterministically", () => {
  it("depth scales the image: a deeper probe maps the same structure closer to the apex", () => {
    const shallow = run("PLAX", { depthCm: 8 });
    const deep = run("PLAX", { depthCm: 16 });
    const lvShallow = shallow.hits.find(hit => hit.id === "LEFT_VENTRICLE");
    const lvDeep = deep.hits.find(hit => hit.id === "LEFT_VENTRICLE");
    expect(lvShallow && lvDeep).toBeTruthy();
    expect(lvDeep!.y).toBeLessThan(lvShallow!.y);
  });

  it("a narrower fan renders fewer lit pixels", () => {
    const countLit = (pixels: Uint8ClampedArray) => {
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 0) lit++;
      return lit;
    };
    const wide = countLit(run("APICAL", { fanDeg: 90 }).pixels);
    const narrow = countLit(run("APICAL", { fanDeg: 40 }).pixels);
    expect(narrow).toBeLessThan(wide);
  });

  it("heartbeat phase changes ventricular cross-section radius", () => {
    // Phase 0.25 is the sine peak (radius up), 0.75 the trough (radius down).
    const diastole = run("PLAX", {}, 0.25).hits.find(hit => hit.id === "LEFT_VENTRICLE");
    const systole = run("PLAX", {}, 0.75).hits.find(hit => hit.id === "LEFT_VENTRICLE");
    expect(diastole && systole).toBeTruthy();
    expect(systole!.radiusPx).not.toBeCloseTo(diastole!.radiusPx, 3);
  });

  it("tilting the probe changes the rendered image", () => {
    expect(run("PSAX", { tiltDeg: 0 }).checksum).not.toBe(run("PSAX", { tiltDeg: 12 }).checksum);
  });

  it("sector outline has apex plus steps + 1 arc points", () => {
    const result = run("SUBX");
    expect(sectorOutline(result, 20)).toHaveLength(22);
  });
});

describe("limits of the synthetic view", () => {
  it("keeps the pixel buffer the requested size even when the plane misses the anatomy", () => {
    const result = run("SSN", { tiltDeg: 40, rockDeg: 35, depthCm: 6 });
    expect(result.visibleStructures.length).toBeLessThanOrEqual(VIEW_PRESETS.length);
    expect(result.pixels.length).toBe(SIZE.width * SIZE.height * 4);
  });
});
