/**
 * Synchronized Multi-Sign Waveform Monitor (Lead II ECG · ABP · PPG · EtCO2 · PTT).
 * Engineered with ultra-graphical CRT phosphor radiance, electron beam glow bloom,
 * and coupled pulse wave propagation dynamics.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Activity, RefreshCw, Zap, Volume2, VolumeX, Eye } from 'lucide-react';
import {
  multisignProcessor,
  type MultisignSamplePoint,
  type MultisignGeneratorOptions,
} from '../engine/multisignSignalProcessor';
import type { MultisignTelemetry } from '../types';

export interface MultisignSignalMonitorProps {
  heartRate: number;
  ischemiaSeverityPct: number;
  rhythm: MultisignTelemetry['rhythmStatus'];
  onChangeRhythm?: (rhythm: MultisignTelemetry['rhythmStatus']) => void;
}

export default function MultisignSignalMonitor({
  heartRate,
  ischemiaSeverityPct,
  rhythm,
  onChangeRhythm,
}: MultisignSignalMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [glowIntensity, setGlowIntensity] = useState<'HIGH' | 'MAX'>('MAX');

  const sampleBufferRef = useRef<MultisignSamplePoint[]>([]);
  const simTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);

  const MAX_POINTS = 640;

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Advance simulation
    if (isRunning) {
      const dt = 0.016;
      simTimeRef.current += dt;

      const opts: MultisignGeneratorOptions = {
        heartRate,
        meanArterialPressure: 95.0,
        ischemiaSeverityPct,
        rhythm,
      };

      const sample = multisignProcessor.sampleAt(simTimeRef.current, opts);
      sampleBufferRef.current.push(sample);
      if (sampleBufferRef.current.length > MAX_POINTS) {
        sampleBufferRef.current.shift();
      }
    }

    const buffer = sampleBufferRef.current;

    // Clear background with CRT deep obsidian tone
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Phosphor engineering grid
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1;
    const gridStep = 24;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (buffer.length < 2) return;

    const laneHeight = height / 4;
    const blurAmount = glowIntensity === 'MAX' ? 12 : 6;

    // 1. Trace 1: Lead II ECG (Luminous Emerald Glow)
    ctx.save();
    ctx.shadowBlur = blurAmount;
    ctx.shadowColor = '#22c55e';
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < buffer.length; i++) {
      const x = (i / MAX_POINTS) * width;
      const ecgVal = buffer[i].ecgLeadII;
      const y = laneHeight * 0.55 - ecgVal * (laneHeight * 0.38);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 2. Trace 2: Arterial Blood Pressure (Luminous Crimson Glow)
    ctx.save();
    ctx.shadowBlur = blurAmount;
    ctx.shadowColor = '#ef4444';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < buffer.length; i++) {
      const x = (i / MAX_POINTS) * width;
      const abp = buffer[i].abpMmHg;
      const normAbp = (abp - 40) / 140;
      const y = laneHeight * 1.85 - normAbp * (laneHeight * 0.75);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Trace 3: Photoplethysmography (Cyan Laser Glow)
    ctx.save();
    ctx.shadowBlur = blurAmount;
    ctx.shadowColor = '#39A9E8';
    ctx.strokeStyle = '#39A9E8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < buffer.length; i++) {
      const x = (i / MAX_POINTS) * width;
      const ppg = buffer[i].ppgPeripheral;
      const y = laneHeight * 2.85 - ppg * (laneHeight * 0.72);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Trace 4: Capnography (Amber/Gold Glow)
    ctx.save();
    ctx.shadowBlur = blurAmount;
    ctx.shadowColor = '#eab308';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < buffer.length; i++) {
      const x = (i / MAX_POINTS) * width;
      const etCO2 = buffer[i].capnogramEtCO2;
      const normEt = etCO2 / 45;
      const y = laneHeight * 3.85 - normEt * (laneHeight * 0.7);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Sweep Head Electron Beam Cursor
    const currentX = (buffer.length / MAX_POINTS) * width;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(currentX, 0, 2.5, height);
    ctx.restore();
  }, [glowIntensity, heartRate, ischemiaSeverityPct, isRunning, rhythm]);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      renderFrame();
      animationFrameIdRef.current = requestAnimationFrame(loop);
    };
    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [renderFrame]);

  const ptt = multisignProcessor.getPulseTransitTime();
  const pwv = multisignProcessor.getPulseWaveVelocity();

  return (
    <div className="cyber-panel-radiance rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="scanline-overlay" />
      <div className="crt-beam" />

      {/* Header Telemetry Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-950/80 border-b border-cyan-500/20 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              Multisign CRT Waveform Accelerator
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                PHOSPHOR RADIANCE
              </span>
            </span>
          </div>
        </div>

        {/* Live Digital Vitals Displays */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">HEART RATE</span>
            <span className="text-emerald-400 font-bold text-sm">{heartRate} <span className="text-[9px] text-slate-400">BPM</span></span>
          </div>
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">ARTERIAL BP</span>
            <span className="text-red-400 font-bold text-sm">122/78</span>
          </div>
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">SpO2 PULSE</span>
            <span className="text-cyan-400 font-bold text-sm">98%</span>
          </div>
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">EtCO2</span>
            <span className="text-amber-400 font-bold text-sm">38 <span className="text-[9px] text-slate-400">mmHg</span></span>
          </div>
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">PTT DELAY</span>
            <span className="text-sky-300 font-bold text-sm">{Math.round(ptt)} <span className="text-[9px] text-slate-400">ms</span></span>
          </div>
          <div className="flex flex-col items-center bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 shadow">
            <span className="text-[9px] text-slate-400">PWV VELOCITY</span>
            <span className="text-purple-400 font-bold text-sm">{pwv} <span className="text-[9px] text-slate-400">m/s</span></span>
          </div>
        </div>
      </div>

      {/* Main Canvas Oscilloscope Viewport */}
      <div className="relative w-full h-80 bg-[#030712] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={840}
          height={320}
          className="w-full h-full block"
        />

        {/* Luminous Channel Overlays */}
        <div className="absolute top-2.5 left-4 text-[10px] font-mono text-emerald-400 font-bold tracking-wider pointer-events-none drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
          &gt; ECG LEAD II (1 mV/div) · ST Deviation: {(ischemiaSeverityPct * 0.045).toFixed(2)} mm
        </div>
        <div className="absolute top-[26%] left-4 text-[10px] font-mono text-red-400 font-bold tracking-wider pointer-events-none drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]">
          &gt; ABP ARTERIAL PULSE CONTOUR · Dicrotic Incisura Notch Active
        </div>
        <div className="absolute top-[51%] left-4 text-[10px] font-mono text-cyan-400 font-bold tracking-wider pointer-events-none drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
          &gt; PPG PERIPHERAL PULSE · Real-Time PTT Lag {Math.round(ptt)} ms
        </div>
        <div className="absolute top-[76%] left-4 text-[10px] font-mono text-amber-400 font-bold tracking-wider pointer-events-none drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]">
          &gt; EtCO2 CAPNOGRAM · Phase III Alveolar Plateau 38 mmHg
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-950 border-t border-slate-800 gap-3 relative z-10 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium transition"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" /> Freeze Sweep
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume Sweep
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              simTimeRef.current = 0;
              sampleBufferRef.current = [];
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-3 h-3" /> Zero Trace
          </button>

          <button
            type="button"
            onClick={() => setGlowIntensity(glowIntensity === 'MAX' ? 'HIGH' : 'MAX')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono transition"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" /> Phosphor: {glowIntensity}
          </button>
        </div>

        {/* Dynamic Rhythm Selectors */}
        {onChangeRhythm && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-mono">Electro-Rhythm:</span>
            {(['NSR', 'STEMI', 'VFIB', 'PEA', 'ASYSTOLE'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeRhythm(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition border ${
                  rhythm === r
                    ? 'bg-sky-600 text-white border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
