/**
 * Synthetic echo stage for the CardioTwin probe lab.
 *
 * The image is a deterministic procedural cross-section (echoSimulation.ts). It is
 * labeled as an educational simulation everywhere it is shown. The ECG strip is
 * a generated waveform, not a measurement.
 */

import { useEffect, useMemo, useRef } from "react";

import { sectorOutline, type EchoResult } from "./echoSimulation";
import type { ProbePose, StructureId, ViewPreset } from "./probeGeometry";

interface EchoStageProps {
  preset: ViewPreset;
  pose: ProbePose;
  phase: number;
  selected: StructureId | null;
  onSelect: (id: StructureId) => void;
  result: EchoResult;
}

/** Generated single-beat ECG: P wave, QRS, T wave. Educational, not a measurement. */
export function ecgSample(phase: number): number {
  const t = ((phase % 1) + 1) % 1;
  const gauss = (x: number, mu: number, sigma: number, amp: number) => amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  return gauss(t, 0.12, 0.025, 0.12) + gauss(t, 0.3, 0.008, -0.12) + gauss(t, 0.33, 0.01, 1.0) + gauss(t, 0.36, 0.008, -0.2) + gauss(t, 0.56, 0.05, 0.25);
}

function EchoCanvas({ result, selected }: { result: EchoResult; selected: StructureId | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height), 0, 0);

    ctx.save();
    ctx.strokeStyle = "rgba(57,169,232,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    sectorOutline(result, 40).forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    ctx.stroke();

    const hit = selected ? result.hits.find(item => item.id === selected && item.inSector) : undefined;
    if (hit && hit.radiusPx > 0) {
      ctx.strokeStyle = "#FF7900";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, hit.radiusPx, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }, [result, selected]);

  return (
    <canvas
      ref={canvasRef}
      width={result.width}
      height={result.height}
      className="echo-canvas"
      role="img"
      aria-label="Synthetic echocardiogram cross-section. Educational simulation, not a patient image."
    />
  );
}

function EcgStrip({ phase }: { phase: number }) {
  const points = useMemo(() => {
    const samples: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      samples.push(`${(t * 160).toFixed(1)},${(26 - ecgSample(t) * 22).toFixed(1)}`);
    }
    return samples.join(" ");
  }, []);
  const marker = (((phase % 1) + 1) % 1) * 160;
  return (
    <svg className="echo-ecg" viewBox="0 0 160 40" role="img" aria-label="Simulated ECG strip, not a measurement">
      <polyline points={points} fill="none" stroke="#59DFA6" strokeWidth="1.2" />
      <line x1={marker} x2={marker} y1="2" y2="38" stroke="#FF7900" strokeWidth="1" />
    </svg>
  );
}

export function EchoStage({ preset, pose, phase, selected, onSelect, result }: EchoStageProps) {
  const labels = result.hits.filter(hit => hit.inSector && (hit.kind === "valve" || hit.radiusPx > 0));
  const inPlane = result.visibleStructures.map(id => result.hits.find(hit => hit.id === id)?.label ?? id);

  return (
    <div className="echo-stage" data-testid="echo-stage">
      <div className="echo-frame">
        <EchoCanvas result={result} selected={selected} />
        <div className="echo-overlay">
          {labels.map(hit => (
            <button
              key={hit.id}
              type="button"
              className={`echo-label${selected === hit.id ? " is-selected" : ""}`}
              style={{ left: `${(hit.x / result.width) * 100}%`, top: `${(hit.y / result.height) * 100}%` }}
              onClick={() => onSelect(hit.id)}
              aria-label={`${hit.label} in image`}
            >
              {hit.label}
            </button>
          ))}
        </div>
        <div className="echo-badge">SYNTHETIC EDUCATIONAL ULTRASOUND SIMULATION</div>
        <div className="echo-readout" aria-label="Probe settings">
          <span>2D</span>
          <span>DEPTH {pose.depthCm.toFixed(1)} cm</span>
          <span>FAN {pose.fanDeg}°</span>
          <span>ROT {pose.rotationDeg.toFixed(0)}°</span>
          <span>TILT {pose.tiltDeg.toFixed(0)}°</span>
          <span>ROCK {pose.rockDeg.toFixed(0)}°</span>
        </div>
      </div>
      <div className="echo-footer">
        <EcgStrip phase={phase} />
        <p className="echo-status" role="status" aria-live="polite">
          {inPlane.length === 0
            ? "No cardiac structure lies in this plane at the current depth. Adjust tilt, rock or depth."
            : `In plane: ${inPlane.join(", ")}`}
        </p>
        <p className="echo-guidance">{preset.guidance}</p>
      </div>
    </div>
  );
}
