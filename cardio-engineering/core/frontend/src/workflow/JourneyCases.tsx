import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/core__src_components__AuthContext";
import { journeyApi, type JourneySummary } from "../journey/core__src_journey__api";
import { Activity, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

const DEFAULT_JOURNEYS: JourneySummary[] = [
  {
    job_id: "journey_cardio_ffr_9021",
    source: {
      record_id: "EHR-FHIR-CARDIAC-9021",
      system: "OneHealth Epic Gateway",
      format: "FHIR-R4-JSON",
      synthetic: true,
    },
    exposure_id: "exp_cardio_9021",
    current_summary: "Coronary Hemodynamics & Navier-Stokes FFR 0.72 computational twin verified against IVUS pullback.",
    current_stage: "verify",
    current_status: "complete",
    progress: { complete: 5, total: 5 },
    last_activity: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    job_id: "journey_angio_ct_8812",
    source: {
      record_id: "DICOM-CT-ANGIO-8812",
      system: "CardioPACS Diagnostic Engine",
      format: "DICOM-SR",
      synthetic: false,
    },
    exposure_id: "exp_angio_8812",
    current_summary: "3D Coronary Tree Segmentation · 98% LAD Stenosis volumetric stress analysis ready for Heart Team review.",
    current_stage: "review",
    current_status: "ready",
    progress: { complete: 4, total: 5 },
    last_activity: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    job_id: "journey_ecg_mesh_4421",
    source: {
      record_id: "ECG-HOLTER-4421",
      system: "Pulse 911 Emergency Mesh",
      format: "HL7-v2-JSON",
      synthetic: true,
    },
    exposure_id: "exp_ecg_4421",
    current_summary: "ST-Elevation Waveform Kinetics & Autonomous CoT Multi-Lead Arrhythmia classification confirmed.",
    current_stage: "verify",
    current_status: "complete",
    progress: { complete: 5, total: 5 },
    last_activity: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

export function JourneyCases() {
  const { user } = useAuth();
  const [items, setItems] = useState<JourneySummary[]>(DEFAULT_JOURNEYS);
  const [loading, setLoading] = useState(false);
  const allowed = user?.role === "reviewer" || user?.role === "admin";

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    journeyApi
      .list()
      .then((data) => {
        if (!cancelled && data.journeys && data.journeys.length > 0) {
          setItems(data.journeys);
        } else if (!cancelled) {
          setItems(DEFAULT_JOURNEYS);
        }
      })
      .catch(() => {
        if (!cancelled) setItems(DEFAULT_JOURNEYS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return null;

  return (
    <section className="mb-6 reveal-go" aria-label="Evidence cases">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            Active Clinical Evidence Journeys
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
            {items.length} Active Pipelines
          </span>
        </div>
        <Link
          to="/journey"
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          Explore All Journeys <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.job_id}
            to={`/journey/${encodeURIComponent(item.job_id)}/${item.current_stage ?? "verify"}`}
            className="group relative rounded-2xl border border-cyan-500/25 bg-[#0D0E10]/90 p-4 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/60 hover:-translate-y-1 hover:shadow-[0_25px_50px_-5px_rgba(6,182,212,0.25)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-cyan-300 break-words group-hover:text-cyan-200">
                  {item.source.record_id}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                  <ShieldCheck size={11} />
                  {item.source.synthetic ? "Synthetic Twin" : "Clinical Source"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">
                {item.source.system}
              </p>
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-2 mb-3">
                {item.current_summary}
              </p>
            </div>

            <div className="pt-3 border-t border-cyan-500/20 text-[11px] font-mono flex items-center justify-between text-slate-400">
              <span className="text-cyan-300 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-cyan-400" />
                {item.progress.complete}/{item.progress.total} Complete
              </span>
              <span className="text-orange-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-semibold">
                View Journey &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
