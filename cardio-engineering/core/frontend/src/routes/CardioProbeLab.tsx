/**
 * /cardiotwin — Probe lab: a 3D torso with heart and ultrasound probe, synchronised with
 * a synthetic echocardiogram. Educational simulation only; not a diagnostic tool.
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DEFAULT_LAYERS, canUseWebGL, type ProbeLayers } from "../cardiotwin/probe/ProbeTorsoScene";
import { EchoStage } from "../cardiotwin/probe/EchoPanel";
import { simulateEcho } from "../cardiotwin/probe/echoSimulation";
import {
  ANATOMY,
  DEFAULT_POSE,
  POSE_RANGE,
  VIEW_PRESETS,
  anatomyById,
  clampPose,
  presetById,
  probeFrame,
  type ProbePose,
  type StructureId,
  type ViewGroup,
} from "../cardiotwin/probe/probeGeometry";
import "../cardiotwin/probe/probe-lab.css";

const ProbeTorsoScene = lazy(() => import("../cardiotwin/probe/ProbeTorsoScene"));

const ECHO_WIDTH = 520;
const ECHO_HEIGHT = 420;
const HEARTBEAT_STEP = 0.02;
const HEARTBEAT_MS = 100;
const TOUR_MS = 4000;

const LAYER_LABELS: Array<{ key: keyof Omit<ProbeLayers, "torsoOpacity">; label: string }> = [
  { key: "skeleton", label: "Skeleton" },
  { key: "lungs", label: "Lungs" },
  { key: "heart", label: "Heart" },
  { key: "vessels", label: "Great vessels" },
  { key: "beam", label: "Probe beam" },
  { key: "labels", label: "Labels" },
  { key: "landmarks", label: "Model landmarks" },
  { key: "xray", label: "X-ray mode" },
];

const CONTROLS = [
  { key: "rotationDeg", label: "Rotation", unit: "°", relative: true },
  { key: "tiltDeg", label: "Tilt", unit: "°", relative: true },
  { key: "rockDeg", label: "Rock", unit: "°", relative: true },
  { key: "depthCm", label: "Depth", unit: " cm", relative: false },
  { key: "fanDeg", label: "Fan", unit: "°", relative: false },
] as const;

function readPreset(value: string | null): ViewGroup {
  const found = VIEW_PRESETS.find(preset => preset.id === value);
  return found ? found.id : "PLAX";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function structureName(id: StructureId): string {
  return id.toLowerCase().replace(/_/g, " ");
}

export default function CardioProbeLab() {
  const [params, setParams] = useSearchParams();
  const [presetId, setPresetId] = useState<ViewGroup>(() => readPreset(params.get("preset")));
  const [pose, setPose] = useState<ProbePose>(DEFAULT_POSE);
  const [layers, setLayers] = useState<ProbeLayers>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<StructureId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [touring, setTouring] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [webgl] = useState(canUseWebGL);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  const preset = presetById(presetId);
  const frame = useMemo(() => probeFrame(preset, pose), [preset, pose]);
  const result = useMemo(
    () => simulateEcho({ preset, pose, phase, width: ECHO_WIDTH, height: ECHO_HEIGHT }),
    [preset, pose, phase],
  );

  // Heartbeat advances the echo phase in steps. It stays paused under reduced motion.
  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const timer = window.setInterval(() => setPhase(value => (value + HEARTBEAT_STEP) % 1), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  // Tour steps through every preset.
  useEffect(() => {
    if (!touring) return undefined;
    const timer = window.setInterval(() => {
      setPresetId(current => {
        const index = VIEW_PRESETS.findIndex(item => item.id === current);
        return VIEW_PRESETS[(index + 1) % VIEW_PRESETS.length].id;
      });
    }, TOUR_MS);
    return () => window.clearInterval(timer);
  }, [touring]);

  // Keep the view in the URL so it can be shared or bookmarked.
  useEffect(() => {
    if (params.get("preset") === presetId) return;
    const next = new URLSearchParams(params);
    next.set("preset", presetId);
    setParams(next, { replace: true });
  }, [presetId, params, setParams]);

  const choosePreset = useCallback((id: ViewGroup) => {
    setPresetId(id);
    // A preset defines its own base pose, so offsets reset. Depth and fan are kept.
    setPose(current => ({ ...DEFAULT_POSE, depthCm: current.depthCm, fanDeg: current.fanDeg }));
  }, []);

  const applyDelta = useCallback((delta: Partial<ProbePose>) => {
    setPose(current => clampPose({
      rotationDeg: current.rotationDeg + (delta.rotationDeg ?? 0),
      tiltDeg: current.tiltDeg + (delta.tiltDeg ?? 0),
      rockDeg: current.rockDeg + (delta.rockDeg ?? 0),
      depthCm: delta.depthCm ?? current.depthCm,
      fanDeg: delta.fanDeg ?? current.fanDeg,
    }));
  }, []);

  const setControl = (key: keyof ProbePose, value: number) => {
    setPose(current => clampPose({ ...current, [key]: value }));
  };

  const resetAll = () => {
    setPose(DEFAULT_POSE);
    setLayers(DEFAULT_LAYERS);
    setSelected(null);
    setPhase(0);
    setResetSignal(value => value + 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const step = event.shiftKey ? 5 : 1;
    switch (event.key) {
      case "ArrowLeft": applyDelta({ rotationDeg: -step }); break;
      case "ArrowRight": applyDelta({ rotationDeg: step }); break;
      case "ArrowUp": applyDelta({ tiltDeg: step }); break;
      case "ArrowDown": applyDelta({ tiltDeg: -step }); break;
      case "q": case "Q": applyDelta({ rockDeg: -step }); break;
      case "e": case "E": applyDelta({ rockDeg: step }); break;
      case "+": case "=": applyDelta({ depthCm: pose.depthCm + 1 }); break;
      case "-": case "_": applyDelta({ depthCm: pose.depthCm - 1 }); break;
      case "r": case "R": resetAll(); break;
      case " ": event.preventDefault(); setPlaying(value => !value); break;
      default: {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < VIEW_PRESETS.length) choosePreset(VIEW_PRESETS[index].id);
      }
    }
  };

  const selectedAnatomy = selected ? anatomyById(selected) : null;
  const calculatorHref = selectedAnatomy?.calculatorId
    ? `/cardiotwin/calculators?calc=${selectedAnatomy.calculatorId}`
    : null;

  return (
    <div className="probe-lab" onKeyDown={onKeyDown}>
      <header className="probe-head">
        <div>
          <p className="probe-kicker">CardioTwin · probe lab</p>
          <h1>{preset.label}</h1>
          <p className="probe-sub">
            The 3D torso and probe on the left, and a synthetic echo cross-section on the right. Both come from the same geometry.
          </p>
        </div>
        <nav className="probe-actions" aria-label="Probe lab actions">
          <button type="button" className="probe-btn" onClick={() => setTouring(value => !value)} aria-pressed={touring}>
            {touring ? "Stop tour" : "Tour views"}
          </button>
          <button type="button" className="probe-btn" onClick={resetAll}>Reset</button>
          <Link className="probe-btn" to="/cardiotwin/calculators">Calculators</Link>
          <Link className="probe-btn" to="/cardiotwin/case">Case studio</Link>
        </nav>
      </header>

      <div className="probe-grid">
        <section className="probe-stage probe-stage--anatomy" aria-label="3D anatomy">
          <div className="probe-stage-top">
            <span className="probe-chip">{preset.caption}</span>
            <div className="probe-layers" role="group" aria-label="Anatomy layers">
              {LAYER_LABELS.map(item => (
                <label key={item.key} className="probe-toggle">
                  <input
                    type="checkbox"
                    checked={layers[item.key]}
                    onChange={event => setLayers(current => ({ ...current, [item.key]: event.target.checked }))}
                  />
                  {item.label}
                </label>
              ))}
              <label className="probe-range">
                Torso opacity
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.02}
                  value={layers.torsoOpacity}
                  onChange={event => setLayers(current => ({ ...current, torsoOpacity: Number(event.target.value) }))}
                />
              </label>
            </div>
          </div>

          <div className="probe-canvas">
            {webgl ? (
              <Suspense fallback={<p className="probe-note">Loading 3D model…</p>}>
                <ProbeTorsoScene
                  frame={frame}
                  layers={layers}
                  selected={selected}
                  onSelect={setSelected}
                  onPoseDelta={applyDelta}
                  heartbeat={playing}
                  reducedMotion={reducedMotion}
                  resetSignal={resetSignal}
                />
              </Suspense>
            ) : (
              <div className="probe-fallback" role="note">
                <p>
                  <strong>3D view unavailable.</strong> This browser has no WebGL support. The landmark list below replaces the 3D torso. The echo and every control still work.
                </p>
                <ul>
                  {ANATOMY.map(item => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(item.id)}
                        className={selected === item.id ? "is-selected" : undefined}
                      >
                        {item.label} · {structureName(item.id)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="probe-heart-controls" aria-label="Heartbeat">
            <button
              type="button"
              className="probe-btn"
              onClick={() => setPlaying(value => !value)}
              disabled={reducedMotion}
              aria-pressed={playing}
            >
              {playing ? "Pause heartbeat" : "Play heartbeat"}
            </button>
            <label className="probe-range">
              Phase
              <input
                type="range"
                min={0}
                max={0.98}
                step={0.02}
                value={phase}
                onChange={event => setPhase(Number(event.target.value))}
                aria-valuetext={`${Math.round(phase * 100)}% of the cardiac cycle`}
              />
            </label>
            {reducedMotion ? <span className="probe-note">Reduced motion is on. Use the phase slider to step through the cycle.</span> : null}
          </div>

          {selectedAnatomy ? (
            <aside className="probe-detail" aria-label="Selected structure">
              <h2>{selectedAnatomy.label} · {structureName(selectedAnatomy.id)}</h2>
              <p>{selectedAnatomy.description}</p>
              {calculatorHref ? (
                <Link to={calculatorHref}>Open the matching calculator</Link>
              ) : (
                <p className="probe-note">No calculator is implemented for this structure yet.</p>
              )}
              <button type="button" className="probe-btn" onClick={() => setSelected(null)}>Clear selection</button>
            </aside>
          ) : (
            <p className="probe-note">
              Select a label or structure to see its explanation. Drag the probe to move it. Use the mouse wheel over the probe to change depth.
            </p>
          )}
        </section>

        <section className="probe-stage probe-stage--echo" aria-label="Synthetic echocardiogram">
          <EchoStage
            preset={preset}
            pose={pose}
            phase={phase}
            selected={selected}
            onSelect={setSelected}
            result={result}
          />
          <div className="probe-controls" aria-label="Probe controls">
            {CONTROLS.map(control => {
              const range = POSE_RANGE[control.key];
              const value = pose[control.key];
              return (
                <label key={control.key} className="probe-control">
                  <span>{control.label}{control.relative ? " offset" : ""}</span>
                  <input
                    type="range"
                    min={range[0]}
                    max={range[1]}
                    step={control.key === "depthCm" ? 0.5 : 1}
                    value={value}
                    onChange={event => setControl(control.key, Number(event.target.value))}
                  />
                  <output>{value.toFixed(control.key === "depthCm" ? 1 : 0)}{control.unit}</output>
                </label>
              );
            })}
          </div>
          <p className="probe-keys">Keys: arrows rotate and tilt, Q and E rock, plus and minus change depth, R resets, Space toggles the heartbeat, 1 to 6 choose a view.</p>
        </section>
      </div>

      <section className="probe-gallery" aria-label="Examination views">
        {VIEW_PRESETS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`probe-view${item.id === presetId ? " is-active" : ""}`}
            onClick={() => choosePreset(item.id)}
            aria-pressed={item.id === presetId}
          >
            <span className="probe-view-id">{index + 1} · {item.label}</span>
            <span className="probe-view-caption">{item.caption}</span>
          </button>
        ))}
      </section>

      <footer className="probe-footer">
        Educational simulation. The torso, heart and echo are illustrative and generated from landmark geometry. They are not patient imaging and do not support any diagnosis.
      </footer>
    </div>
  );
}
