/**
 * /cardiotwin/case — Evidence-Linked CardioTwin.
 *
 * One synthetic case, shown with its measurements, the calculations derived from them,
 * a what-if engine, an Evidence Difference inspector, the evidence trail, live CROSS-5
 * status, a deterministic MedClear summary and a Pulse 911 handoff. Educational only.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cross5Api, type IntersectionInfo } from "../cross5/core__src_cross5__api";
import {
  DEMO_CASE,
  crossChecks,
  deriveMetrics,
  plainLanguageSummary,
  runWhatIf,
  valuesOf,
  type MeasurementKey,
} from "../cardiotwin/case/syntheticCase";
import "../cardiotwin/case/case-studio.css";

const SLIDERS: Array<{ key: MeasurementKey; label: string; unit: string; min: number; max: number; step: number }> = [
  { key: "lvotDiameterCm", label: "LVOT diameter", unit: "cm", min: 1.6, max: 2.4, step: 0.05 },
  { key: "lvotVtiCm", label: "LVOT VTI", unit: "cm", min: 12, max: 30, step: 0.5 },
  { key: "aorticVtiCm", label: "Aortic valve VTI", unit: "cm", min: 60, max: 160, step: 1 },
];

const PROVENANCE_LABEL = {
  synthetic: "Synthetic",
  external: "External",
  "user-provided": "User-provided",
} as const;

type Cross5State =
  | { status: "loading" }
  | { status: "ready"; frames: number; supported: IntersectionInfo[]; unsupported: IntersectionInfo[]; notice: string }
  | { status: "unavailable"; message: string };

function fmt(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

export default function CardioCaseStudio() {
  const baselineValues = useMemo(() => valuesOf(DEMO_CASE), []);
  const baselineMetrics = useMemo(() => deriveMetrics(DEMO_CASE, baselineValues), [baselineValues]);
  const baselineChecks = useMemo(() => crossChecks(baselineValues, baselineMetrics), [baselineValues, baselineMetrics]);

  const [whatIf, setWhatIf] = useState<Partial<Record<MeasurementKey, number>>>({});
  const [cross5, setCross5] = useState<Cross5State>({ status: "loading" });

  const changes = useMemo(
    () => Object.entries(whatIf).map(([key, to]) => ({ key: key as MeasurementKey, to: to as number })),
    [whatIf],
  );
  const run = useMemo(() => runWhatIf(DEMO_CASE, changes), [changes]);
  const simulatedValues = useMemo(() => valuesOf(DEMO_CASE, whatIf), [whatIf]);
  const simulatedChecks = useMemo(() => crossChecks(simulatedValues, run.simulated), [simulatedValues, run.simulated]);
  const summary = useMemo(
    () => plainLanguageSummary(DEMO_CASE, baselineMetrics, baselineChecks),
    [baselineMetrics, baselineChecks],
  );

  // Live CROSS-5 status. Requires the signed-in session; errors are reported, never faked.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const frames = await cross5Api.frames();
        const ids = frames.frames.map(frame => frame.id);
        const inter = await cross5Api.intersections(ids);
        if (!cancelled) {
          setCross5({
            status: "ready",
            frames: ids.length,
            supported: inter.supported,
            unsupported: inter.unsupported,
            notice: inter.notice,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setCross5({ status: "unavailable", message: error instanceof Error ? error.message : "CROSS-5 did not respond." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSlider = (key: MeasurementKey, value: number) => setWhatIf(current => ({ ...current, [key]: value }));
  const resetWhatIf = () => setWhatIf({});

  return (
    <div className="case-studio">
      <header className="case-head">
        <div>
          <p className="case-kicker">CardioTwin · evidence-linked case</p>
          <h1>{DEMO_CASE.title}</h1>
          <p className="case-sub">{DEMO_CASE.summary}</p>
        </div>
        <nav className="case-links" aria-label="Linked views">
          <Link to="/cardiotwin">Probe lab</Link>
          <Link to="/cardiotwin/calculators?calc=aortic-stenosis-continuity">Calculator</Link>
          <Link to="/cross5">CROSS-5</Link>
          <Link to="/medclear">MedClear</Link>
        </nav>
      </header>

      <div className="case-banner" role="note">
        <strong>Synthetic demonstration case.</strong> All measurements are made up for teaching. The what-if results are educational
        and are not a prediction for any patient, and no treatment is suggested.
      </div>

      <section className="case-section" aria-labelledby="case-measurements">
        <h2 id="case-measurements">Measurements</h2>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Measurement</th>
                <th scope="col">Value</th>
                <th scope="col">Uncertainty</th>
                <th scope="col">Provenance</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CASE.measurements.map(m => (
                <tr key={m.id}>
                  <td className="mono">{m.id}</td>
                  <td>{m.label}</td>
                  <td className="mono">{m.value === null ? "missing" : `${m.value} ${m.unit}`}</td>
                  <td className="mono">± {m.uncertainty} {m.unit}</td>
                  <td><span className={`case-tag case-tag--${m.provenance}`}>{PROVENANCE_LABEL[m.provenance]}</span></td>
                  <td className="mono">{m.timestamp}</td>
                  <td>{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="case-section" aria-labelledby="case-derived">
        <h2 id="case-derived">Derived metrics</h2>
        <div className="case-metrics">
          {baselineMetrics.map(metric => (
            <article key={metric.id} className="case-metric">
              <header>
                <span className="mono">{metric.id}</span>
                <h3>{metric.label}</h3>
              </header>
              <p className="case-metric-value">
                {metric.value === null ? (
                  <span className="case-missing">Cannot calculate: {metric.missingReason}</span>
                ) : (
                  <>
                    <strong>{fmt(metric.value)}</strong> {metric.unit}
                    {metric.uncertainty !== null ? <span className="case-unc"> ± {fmt(metric.uncertainty)}</span> : null}
                  </>
                )}
              </p>
              <p className="case-meta">Formula: {metric.formulaId} · version {metric.formulaVersion}</p>
              <p className="case-meta">Depends on: {metric.dependsOn.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="case-section" aria-labelledby="case-whatif">
        <h2 id="case-whatif">What-if: change one or more inputs</h2>
        <p className="case-note">
          Only the metrics that depend on a changed measurement are recomputed. Uncertainties and the geometry stay fixed.
          Assumptions: one beat, a circular LVOT, and the same measurement error as the baseline.
        </p>
        <div className="case-sliders">
          {SLIDERS.map(slider => {
            const base = DEMO_CASE.measurements.find(m => m.key === slider.key)?.value ?? slider.min;
            const current = whatIf[slider.key] ?? base;
            return (
              <label key={slider.key} className="case-slider">
                <span>{slider.label} <em>{slider.unit}</em></span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={current}
                  onChange={event => setSlider(slider.key, Number(event.target.value))}
                  aria-valuetext={`${current} ${slider.unit}`}
                />
                <output>{current} {slider.unit} {whatIf[slider.key] !== undefined ? `(baseline ${base})` : "(baseline)"}</output>
              </label>
            );
          })}
        </div>
        <div className="case-actions">
          <button type="button" className="case-btn" onClick={resetWhatIf} disabled={changes.length === 0}>Reset to baseline</button>
        </div>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Baseline</th>
                <th scope="col">Simulated</th>
                <th scope="col">Change</th>
                <th scope="col">Changed because</th>
                <th scope="col">Formula</th>
              </tr>
            </thead>
            <tbody>
              {run.diffs.map(diff => (
                <tr key={diff.metric.id} className={diff.changed ? "is-changed" : ""}>
                  <td>{diff.metric.id} · {diff.metric.label}</td>
                  <td className="mono">{fmt(diff.baseline)} {diff.metric.unit}</td>
                  <td className="mono">{fmt(diff.simulated)} {diff.metric.unit}</td>
                  <td className="mono">{diff.delta === null ? "—" : `${diff.delta >= 0 ? "+" : ""}${diff.delta.toFixed(2)}`}</td>
                  <td>{diff.changedBecause.length ? diff.changedBecause.join(", ") : "no changed input"}</td>
                  <td className="mono">{diff.metric.formulaId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {changes.length > 0 ? (
          <p className="case-note">
            Simulated cross-checks: {simulatedChecks.map(check => `${check.id} ${check.verdict}`).join("; ")}.
          </p>
        ) : null}
      </section>

      <section className="case-section" aria-labelledby="case-difference">
        <h2 id="case-difference">Evidence Difference</h2>
        <p className="case-note">Which evidence caused each change. Derived metrics only move when a measurement they depend on moves.</p>
        {changes.length === 0 ? (
          <p className="case-note">No what-if is active. Move a slider to see which evidence changes a result.</p>
        ) : (
          <ul className="case-diff-list">
            {run.diffs.filter(diff => diff.changed).map(diff => (
              <li key={diff.metric.id}>
                <strong>{diff.metric.id}</strong> changed from {fmt(diff.baseline)} to {fmt(diff.simulated)} {diff.metric.unit}
                {" "}because {diff.changedBecause.map(key => DEMO_CASE.measurements.find(m => m.key === key)?.id ?? key).join(", ")} changed.
              </li>
            ))}
          </ul>
        )}
        <h3>Contradictions and missing data</h3>
        <ul className="case-check-list">
          {baselineChecks.map(check => (
            <li key={check.id} className={`case-check case-check--${check.verdict}`}>
              <strong>{check.id}</strong> {check.verdict}: {check.rule} <span className="case-meta">{check.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="case-section" aria-labelledby="case-trail">
        <h2 id="case-trail">Evidence trail</h2>
        <ol className="case-trail">
          {baselineMetrics.map(metric => (
            <li key={metric.id}>
              <span className="mono">{metric.dependsOn.join(" + ")}</span> → <span className="mono">{metric.id}</span> ({metric.formulaId} {metric.formulaVersion})
            </li>
          ))}
        </ol>
      </section>

      <section className="case-section" aria-labelledby="case-cross5">
        <h2 id="case-cross5">CROSS-5 status</h2>
        {cross5.status === "loading" ? <p className="case-note">Checking CROSS-5…</p> : null}
        {cross5.status === "unavailable" ? (
          <p className="case-missing">
            CROSS-5 is unavailable from this page: {cross5.message}. Sign in to the platform to load its intersections. The case numbers above do not depend on it.
          </p>
        ) : null}
        {cross5.status === "ready" ? (
          <>
            <p className="case-note">
              {cross5.frames} frames read from CROSS-5. {cross5.supported.length} supported and {cross5.unsupported.length} unsupported intersections.
              CROSS-5 describes how frames link. It does not validate the numbers in this case.
            </p>
            <p className="case-meta">{cross5.notice}</p>
          </>
        ) : null}
        <p className="case-meta">Open the full studio for every intersection: <Link to="/cross5">CROSS-5 studio</Link>.</p>
      </section>

      <section className="case-section" aria-labelledby="case-medclear">
        <h2 id="case-medclear">Plain-language explanation (MedClear)</h2>
        <p className="case-summary">{summary}</p>
        <p className="case-note">
          Built from the computed metrics above with a fixed template, so it works offline. An AI-written narrative needs the platform started with <code>-AI</code> and a configured model; it is not connected in this build.
        </p>
        <Link to="/medclear">Open MedClear</Link>
      </section>

      <section className="case-section case-handoff" aria-labelledby="case-pulse">
        <h2 id="case-pulse">Pulse 911 handoff</h2>
        <p className="case-note">
          Pulse 911 is a separate emergency simulation. Nothing in this case feeds emergency protocols, dispatch, or ischemia analysis.
        </p>
        <Link to="/pulse">Open the Pulse 911 demo (simulation)</Link>
      </section>
    </div>
  );
}
