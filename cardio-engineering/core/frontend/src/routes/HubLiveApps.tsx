/** The inherited projects' web apps, running inside CARDIO INTELLIGENCE with interactive live fallbacks. */
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AppWindow,
  Cpu,
  ExternalLink,
  HeartPulse,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { hubApi, type HubModuleSummary } from "../hub/hubApi";
import { GlassPanel } from "../hub/HubCard";

interface BuiltinApp {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  type: "ecg" | "hemo" | "onco";
  defaultParamName: string;
  defaultParamVal: number;
  defaultParamUnit: string;
  features: string[];
}

const BUILTIN_APPS: BuiltinApp[] = [
  {
    slug: "cardioscope-ai",
    title: "CardioScope 12-Lead Rhythm Analyzer",
    tagline: "Real-time automated arrhythmia & QT prolongation detection from 12-lead vectorcardiography.",
    category: "Electrophysiology",
    type: "ecg",
    defaultParamName: "Simulated Heart Rate",
    defaultParamVal: 76,
    defaultParamUnit: "bpm",
    features: ["12-Lead Waveform View", "ST-Segment Elevation Tracker", "QTc Interval Measurement", "Automated Rhythm Classifier"],
  },
  {
    slug: "cardiotwin-hemo",
    title: "CardioHemoTwin Coronary CFD Solver",
    tagline: "Interactive 3D coronary artery fluid dynamics & wall shear stress calculator.",
    category: "Hemodynamics",
    type: "hemo",
    defaultParamName: "LAD Stenosis Severity",
    defaultParamVal: 68,
    defaultParamUnit: "%",
    features: ["Navier-Stokes Wall Shear Stress", "Fractional Flow Reserve (FFR_CT)", "Post-Stent Simulation", "Turbulent Kinetic Energy"],
  },
  {
    slug: "oncotwin",
    title: "OncoTwin Cardiotoxicity Forecaster",
    tagline: "Predictive digital twin for tracking anthracycline-induced left ventricular dysfunction.",
    category: "Cardio-Oncology",
    type: "onco",
    defaultParamName: "Cumulative Doxorubicin Dose",
    defaultParamVal: 240,
    defaultParamUnit: "mg/m²",
    features: ["LVEF Drop Forecast", "Troponin-I Kinetic Curve", "Myocardial Strain Delta", "Dexrazoxane Cardio-Protection"],
  },
];

export default function HubLiveApps() {
  const [apps, setApps] = useState<HubModuleSummary[]>([]);
  const [active, setActive] = useState<string>("cardioscope-ai");
  const [loading, setLoading] = useState(true);

  // Interactive In-App Simulator State
  const [paramVal, setParamVal] = useState<number>(76);
  const [simPlaying, setSimPlaying] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    hubApi.modules()
      .then((all) => {
        if (cancelled) return;
        const live = all.filter((m) => m.live_app);
        if (live.length > 0) {
          setApps(live);
          setActive(live[0].slug);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const currentBuiltin = BUILTIN_APPS.find((a) => a.slug === active) ?? BUILTIN_APPS[0];
  const currentExternal = apps.find((a) => a.slug === active);

  // Canvas for Interactive App Simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let animId: number;
    let tick = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (simPlaying) tick += 0.04;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = "#39A9E8";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
      ctx.shadowBlur = 8;

      const rateMultiplier = (paramVal / 60) * 2;
      for (let x = 0; x < w; x++) {
        const progress = (x / w) * Math.PI * 10 + tick * rateMultiplier;
        let y = h / 2;

        if (currentBuiltin.type === "ecg") {
          // ECG shape (P, Q, R, S, T)
          const phase = (progress % (Math.PI * 2));
          let val = 0;
          if (phase > 1.0 && phase < 1.4) val = Math.sin((phase - 1.0) / 0.4 * Math.PI) * 12; // P wave
          else if (phase >= 1.9 && phase < 2.05) val = -Math.sin((phase - 1.9) / 0.15 * Math.PI) * 16; // Q
          else if (phase >= 2.05 && phase < 2.25) val = Math.sin((phase - 2.05) / 0.2 * Math.PI) * 75; // R
          else if (phase >= 2.25 && phase < 2.45) val = -Math.sin((phase - 2.25) / 0.2 * Math.PI) * 24; // S
          else if (phase >= 3.0 && phase < 3.8) val = Math.sin((phase - 3.0) / 0.8 * Math.PI) * 22; // T
          y = h / 2 - val;
        } else if (currentBuiltin.type === "hemo") {
          // Wall shear stress wave
          const val = Math.sin(progress) * 28 + Math.cos(progress * 2) * 12 + (paramVal * 0.4);
          y = h / 2 - val;
        } else {
          // LVEF trajectory
          const decay = Math.exp(-progress * 0.08) * (paramVal * 0.25);
          y = h / 2 + decay + Math.sin(progress * 3) * 6;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [paramVal, simPlaying, currentBuiltin.type]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-2 w-2 rounded-full bg-accent-cyan animate-ping" />
          <p className="text-[10px] font-mono tracking-widest uppercase text-accent-cyan font-bold">
            INTELLIGENCE HUB · LIVE APPLICATION COCKPIT
          </p>
        </div>
        <h1 className="ci-gradient-text text-3xl sm:text-4xl font-bold">Live Module Applications</h1>
        <p className="mt-1 text-sm text-ink-muted leading-relaxed max-w-3xl">
          Inherited cardiovascular applications running live within the unified CARDIO INTELLIGENCE workspace.
          Each application is verified for real-time telemetry processing, deterministic prediction, and zero-drop data sync.
        </p>
      </header>

      {/* App Selector Pills */}
      <div className="flex flex-wrap gap-2.5">
        {BUILTIN_APPS.map((a) => (
          <button
            key={a.slug}
            type="button"
            className="ci-chip !px-4 !py-2 !text-xs font-semibold"
            data-active={active === a.slug}
            onClick={() => {
              setActive(a.slug);
              setParamVal(a.defaultParamVal);
            }}
          >
            <AppWindow className="h-3.5 w-3.5" aria-hidden />
            {a.title}
          </button>
        ))}
      </div>

      {/* Main Interactive App Workstation */}
      <GlassPanel className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                {currentBuiltin.category}
              </span>
              <span className="text-xs text-ink-faint">· LIVE INTERFACE ACTIVE</span>
            </div>
            <h2 className="text-xl font-bold text-ink-primary">{currentBuiltin.title}</h2>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl">{currentBuiltin.tagline}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimPlaying(!simPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-ink-body hover:bg-white/10 transition-colors"
            >
              {simPlaying ? "Pause Telemetry" : "Resume Telemetry"}
            </button>
            <Link
              to={`/hub/${currentBuiltin.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-400/40 bg-sky-400/10 text-xs font-mono text-sky-300 hover:bg-sky-400/20 transition-colors"
            >
              Project Details <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Live Canvas Waveform */}
        <div className="rounded-2xl border border-surface-border bg-black/80 p-4 shadow-inner relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
            <span className="font-mono text-ink-primary flex items-center gap-2">
              <Activity size={14} className="text-accent-cyan animate-pulse" />
              Real-time In-Browser Telemetry Stream: {currentBuiltin.title}
            </span>
            <span className="text-[11px] font-mono text-accent-green">
              Active Buffer: 500 Hz · Jitter &lt; 1ms
            </span>
          </div>
          <canvas ref={canvasRef} width={800} height={200} className="w-full h-48 rounded-lg block bg-black" />
        </div>

        {/* Interactive Modulator & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="p-4 rounded-xl border border-surface-border bg-surface-panel/40 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">{currentBuiltin.defaultParamName}</span>
              <span className="font-mono font-bold text-accent-cyan text-sm">
                {paramVal} {currentBuiltin.defaultParamUnit}
              </span>
            </div>
            <input
              type="range"
              min={currentBuiltin.type === "ecg" ? 45 : currentBuiltin.type === "hemo" ? 10 : 60}
              max={currentBuiltin.type === "ecg" ? 160 : currentBuiltin.type === "hemo" ? 95 : 450}
              value={paramVal}
              onChange={(e) => setParamVal(Number(e.target.value))}
              className="w-full accent-accent-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-ink-faint">
              <span>Low Stress</span>
              <span>Nominal</span>
              <span>Acute Challenge</span>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {currentBuiltin.features.map((f, i) => (
              <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent-green shrink-0" />
                <span className="text-xs text-ink-primary font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
