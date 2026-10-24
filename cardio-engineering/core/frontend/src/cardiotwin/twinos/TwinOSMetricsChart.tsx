/**
 * TwinOSMetricsChart — Longitudinal Wearable Stream Visualization.
 *
 * Renders smooth interactive charts for 14-day Resting HR, HRV (RMSSD),
 * Nocturnal SpO2 Nadir, and Sleep Architecture with drift highlight zones.
 */

import React, { useState } from "react";
import type { WearableMetricSample } from "./types";

interface Props {
  history: WearableMetricSample[];
}

export function TwinOSMetricsChart({ history }: Props) {
  const [metric, setMetric] = useState<"hr" | "rmssd" | "spo2" | "sleep">("hr");

  if (!history || history.length === 0) {
    return <div className="p-4 text-xs text-ink-muted">No wearable history available</div>;
  }

  const n = history.length;
  const labels = history.map((h, i) => {
    const d = new Date(h.timestamp);
    return isNaN(d.getTime()) ? `D${i + 1}` : `${d.getMonth() + 1}/${d.getDate()}`;
  });

  let dataPoints: number[] = [];
  let unit = "";
  let title = "";
  let normalMin = 0;
  let normalMax = 0;
  let lineStroke = "#39A9E8"; // cyan-400
  let fillGradient = "url(#hrGradient)";

  if (metric === "hr") {
    dataPoints = history.map((h) => h.resting_hr);
    unit = "bpm";
    title = "Resting Heart Rate (72h Drift Window)";
    normalMin = 60;
    normalMax = 75;
    lineStroke = "#f43f5e"; // rose-500
    fillGradient = "url(#hrGrad)";
  } else if (metric === "rmssd") {
    dataPoints = history.map((h) => h.hrv_rmssd);
    unit = "ms";
    title = "Heart Rate Variability RMSSD (Vagal Autonomic Tone)";
    normalMin = 35;
    normalMax = 65;
    lineStroke = "#39A9E8"; // purple-500
    fillGradient = "url(#rmssdGrad)";
  } else if (metric === "spo2") {
    dataPoints = history.map((h) => h.spo2_nadir);
    unit = "%";
    title = "Nocturnal SpO2 Nadir (Intermittent Hypoxemia)";
    normalMin = 92;
    normalMax = 99;
    lineStroke = "#39A9E8"; // cyan-500
    fillGradient = "url(#spo2Grad)";
  } else {
    dataPoints = history.map((h) => h.deep_sleep_minutes);
    unit = "min";
    title = "Restorative Deep Sleep (Slow-Wave Duration)";
    normalMin = 60;
    normalMax = 100;
    lineStroke = "#39A9E8"; // blue-500
    fillGradient = "url(#sleepGrad)";
  }

  const minVal = Math.min(...dataPoints, normalMin) - 3;
  const maxVal = Math.max(...dataPoints, normalMax) + 4;
  const range = Math.max(1, maxVal - minVal);

  const width = 640;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = dataPoints.map((val, idx) => {
    const x = padLeft + (idx / Math.max(1, n - 1)) * plotW;
    const y = padTop + plotH - ((val - minVal) / range) * plotH;
    return { x, y, val };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaStr = `${points[0].x.toFixed(1)},${padTop + plotH} ${polylineStr} ${points[points.length - 1].x.toFixed(1)},${padTop + plotH}`;

  // Normal range band Y
  const normYTop = padTop + plotH - ((normalMax - minVal) / range) * plotH;
  const normYBottom = padTop + plotH - ((normalMin - minVal) / range) * plotH;
  const normBandH = Math.max(2, normYBottom - normYTop);

  // Drift window highlight (last 3 samples)
  const driftStartX = padLeft + (Math.max(0, n - 3) / Math.max(1, n - 1)) * plotW;

  return (
    <div className="bg-[var(--surface-raised,rgba(15,23,42,0.6))] border border-[var(--surface-border,rgba(51,65,85,0.4))] rounded-xl p-4 backdrop-blur-md shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-xs font-semibold text-ink-primary uppercase tracking-wider">{title}</h4>
          <span className="text-[11px] text-ink-muted">
            Continuous wearable telemetry over past 14 days • Amber zone indicates active 72h drift
          </span>
        </div>
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border text-xs">
          <button
            onClick={() => setMetric("hr")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              metric === "hr"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            Resting HR
          </button>
          <button
            onClick={() => setMetric("rmssd")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              metric === "rmssd"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            HRV (RMSSD)
          </button>
          <button
            onClick={() => setMetric("spo2")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              metric === "spo2"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            Nocturnal SpO2
          </button>
          <button
            onClick={() => setMetric("sleep")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              metric === "sleep"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            Deep Sleep
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
          <defs>
            <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="rmssdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39A9E8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#39A9E8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39A9E8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#39A9E8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39A9E8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#39A9E8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Normal Reference Range Band */}
          <rect
            x={padLeft}
            y={normYTop}
            width={plotW}
            height={normBandH}
            fill="currentColor"
            className="text-emerald-500/10"
          />
          <text
            x={width - padRight - 4}
            y={normYTop + 10}
            textAnchor="end"
            className="text-[9px] fill-emerald-500 font-mono"
          >
            Normal: {normalMin}-{normalMax} {unit}
          </text>

          {/* 72h Drift Window Highlight */}
          <rect
            x={driftStartX}
            y={padTop}
            width={width - padRight - driftStartX}
            height={plotH}
            fill="#f59e0b"
            fillOpacity="0.08"
            stroke="#f59e0b"
            strokeDasharray="3 3"
            strokeOpacity="0.3"
          />
          <text
            x={driftStartX + 6}
            y={padTop + 12}
            className="text-[9px] fill-amber-400 font-semibold uppercase tracking-wider"
          >
            72h Drift Window
          </text>

          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke="currentColor"
            className="text-surface-border"
          />

          {/* Area under curve */}
          <polygon points={areaStr} fill={fillGradient} />

          {/* Trend line */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke={lineStroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            const isDrift = idx >= n - 3;
            return (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 4.5 : isDrift ? 3.5 : 2.5}
                  fill={isLast ? lineStroke : isDrift ? "#fbbf24" : "var(--panel,#0f172a)"}
                  stroke={lineStroke}
                  strokeWidth={isLast ? 2 : 1.5}
                />
                {(isLast || idx === 0 || idx === n - 4) && (
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="text-[10px] font-mono font-semibold fill-ink-primary"
                  >
                    {p.val.toFixed(0)} {unit}
                  </text>
                )}
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, idx) => {
            if (idx % 2 !== 0 && idx !== n - 1) return null;
            return (
              <text
                key={`lbl-${idx}`}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[9.5px] fill-ink-muted font-mono"
              >
                {labels[idx]}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted pt-2 border-t border-surface-border">
        <span>Baseline Reference: {dataPoints[0].toFixed(1)} {unit}</span>
        <span className="font-semibold text-ink-primary">
          Current: {dataPoints[dataPoints.length - 1].toFixed(1)} {unit}{" "}
          <span
            className={
              dataPoints[dataPoints.length - 1] > dataPoints[0]
                ? metric === "hr"
                  ? "text-rose-400"
                  : "text-emerald-400"
                : metric === "rmssd" || metric === "spo2" || metric === "sleep"
                ? "text-rose-400"
                : "text-emerald-400"
            }
          >
            ({((dataPoints[dataPoints.length - 1] - dataPoints[0]) / Math.max(1, dataPoints[0]) * 100).toFixed(1)}%)
          </span>
        </span>
      </div>
    </div>
  );
}
