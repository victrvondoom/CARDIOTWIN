/**
 * /cardiotwin/calculators — cardiovascular calculator studio.
 *
 * Left rail: categories. Middle column: searchable calculators with favourites.
 * Right area: formula, validated inputs, worked example, outputs, timeline diagram
 * and the source of each equation. Outputs are raw values for education only.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import CalcDiagram from "../cardiotwin/calc/CalcDiagram";
import {
  CALCULATORS,
  CATEGORIES,
  calculatorById,
  categoryCount,
  searchCalculators,
  workedExample,
  type CalculatorSpec,
  type CategoryId,
  type Values,
} from "../cardiotwin/calc/calculators";
import "../cardiotwin/calc/calculator-studio.css";

const FAVOURITES_KEY = "cardiotwin.calculators.favourites";
const TIMELINE_MS = 3200;

function loadFavourites(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FAVOURITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    // Storage can be unavailable (private mode, blocked). Favourites simply reset.
    return new Set();
  }
}

function saveFavourites(favourites: Set<string>) {
  try {
    window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites]));
  } catch {
    // Non-essential: the favourites still work for this page view.
  }
}

function blankValues(spec: CalculatorSpec): Record<string, string> {
  return Object.fromEntries(spec.inputs.map(input => [input.key, ""]));
}

function parseValues(spec: CalculatorSpec, raw: Record<string, string>): Values {
  return Object.fromEntries(spec.inputs.map(input => {
    const text = raw[input.key]?.trim() ?? "";
    return [input.key, text === "" ? Number.NaN : Number(text)];
  }));
}

export default function CardioCalculatorStudio() {
  const [params, setParams] = useSearchParams();
  const initial = calculatorById(params.get("calc")) ?? CALCULATORS[0];
  const [categoryId, setCategoryId] = useState<CategoryId | "all">(initial.category);
  const [query, setQuery] = useState("");
  const [favourites, setFavourites] = useState<Set<string>>(loadFavourites);
  const [showFavourites, setShowFavourites] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(initial.id);
  const [raw, setRaw] = useState<Record<string, string>>(() => blankValues(initial));
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const lastFrame = useRef<number | null>(null);

  const spec = calculatorById(selectedId) ?? CALCULATORS[0];
  const values = useMemo(() => parseValues(spec, raw), [spec, raw]);
  const result = useMemo(() => spec.compute(values), [spec, values]);
  const primary = result.ok ? result.value[0].value : null;

  // Deep link: keep ?calc= in sync with the selected calculator.
  useEffect(() => {
    if (params.get("calc") === selectedId) return;
    const next = new URLSearchParams(params);
    next.set("calc", selectedId);
    setParams(next, { replace: true });
  }, [selectedId, params, setParams]);

  // Timeline: plays the cardiac cycle when enabled.
  useEffect(() => {
    if (!playing) {
      lastFrame.current = null;
      return undefined;
    }
    let frame = 0;
    const tick = (now: number) => {
      const last = lastFrame.current ?? now;
      lastFrame.current = now;
      setPhase(value => (value + (now - last) / TIMELINE_MS) % 1);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  const visible = useMemo(() => {
    const base = query.trim() ? searchCalculators(query) : CALCULATORS;
    return base.filter(item => {
      if (showFavourites && !favourites.has(item.id)) return false;
      if (!query.trim() && categoryId !== "all" && item.category !== categoryId) return false;
      return true;
    });
  }, [query, categoryId, showFavourites, favourites]);

  const chooseCalculator = (id: string) => {
    const next = calculatorById(id);
    if (!next) return;
    setSelectedId(id);
    setRaw(blankValues(next));
    setPhase(0);
  };

  const toggleFavourite = (id: string) => {
    setFavourites(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavourites(next);
      return next;
    });
  };

  const fillExample = () => setRaw(Object.fromEntries(spec.inputs.map(input => [input.key, String(input.example)])));

  const categoryLabel = CATEGORIES.find(item => item.id === spec.category)?.label ?? "";
  const categoryAccent = CATEGORIES.find(item => item.id === spec.category)?.accent ?? "var(--p-orange)";

  return (
    <div className="calc-studio">
      <header className="calc-top">
        <div>
          <p className="calc-kicker">CardioTwin · calculators</p>
          <h1>Cardiovascular calculators</h1>
        </div>
        <div className="calc-search">
          <label htmlFor="calc-search" className="visually-hidden">Search calculators</label>
          <input
            id="calc-search"
            type="search"
            placeholder="Search calculators (e.g. RV size, aortic stenosis)"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
        <nav className="calc-links" aria-label="Related views">
          <Link to="/cardiotwin">Probe lab</Link>
          <Link to="/cardiotwin/case">Case studio</Link>
          <Link to="/cross5">CROSS-5</Link>
        </nav>
      </header>

      <div className="calc-body">
        <nav className="calc-rail" aria-label="Categories">
          <button
            type="button"
            className={categoryId === "all" && !showFavourites ? "is-active" : ""}
            onClick={() => { setCategoryId("all"); setShowFavourites(false); }}
          >
            All calculators <span>{CALCULATORS.length}</span>
          </button>
          <button type="button" className={showFavourites ? "is-active" : ""} onClick={() => setShowFavourites(value => !value)}>
            Favourites <span>{favourites.size}</span>
          </button>
          {CATEGORIES.map(category => {
            const count = categoryCount(category.id);
            return (
              <button
                key={category.id}
                type="button"
                className={categoryId === category.id && !showFavourites ? "is-active" : ""}
                onClick={() => { setCategoryId(category.id); setShowFavourites(false); }}
              >
                <i style={{ background: category.accent }} aria-hidden="true" />
                {category.label}
                <span>{count}</span>
                {count === 0 ? <em className="visually-hidden">No validated calculator implemented yet.</em> : null}
              </button>
            );
          })}
        </nav>

        <section className="calc-list" aria-label="Calculators">
          {visible.length === 0 ? (
            <p className="calc-empty">
              {showFavourites ? "No favourites yet. Use the heart on a calculator to pin it here." : "No calculator matches this search or category yet."}
            </p>
          ) : null}
          {visible.map(item => (
            <div key={item.id} className={`calc-card${item.id === selectedId ? " is-selected" : ""}`}>
              <button type="button" className="calc-card-main" onClick={() => chooseCalculator(item.id)} aria-pressed={item.id === selectedId}>
                <span className="calc-card-name">{item.name}</span>
                <span className="calc-card-summary">{item.summary}</span>
              </button>
              <button
                type="button"
                className="calc-fav"
                onClick={() => toggleFavourite(item.id)}
                aria-pressed={favourites.has(item.id)}
                aria-label={`${favourites.has(item.id) ? "Remove" : "Add"} ${item.name} ${favourites.has(item.id) ? "from" : "to"} favourites`}
              >
                {favourites.has(item.id) ? "♥" : "♡"}
              </button>
            </div>
          ))}
        </section>

        <section className="calc-work" aria-label="Working area" style={{ ["--cat" as string]: categoryAccent }}>
          <div className="calc-work-head">
            <div>
              <p className="calc-category">{categoryLabel}</p>
              <h2>{spec.name}</h2>
            </div>
            <div className="calc-work-actions">
              <button type="button" className="calc-btn" onClick={fillExample}>Try a worked example</button>
              <button type="button" className="calc-btn" onClick={() => setRaw(blankValues(spec))}>Clear inputs</button>
            </div>
          </div>

          <div className="calc-formula" aria-label="Formula">
            {spec.formula.map(line => <p key={line}>{line}</p>)}
            <p className="calc-source">{spec.source}</p>
          </div>

          <div className="calc-inputs">
            {spec.inputs.map(input => {
              const numeric = values[input.key];
              const invalid = raw[input.key] !== undefined && raw[input.key] !== "" && (!Number.isFinite(numeric) || numeric < input.min || numeric > input.max);
              return (
                <label key={input.key} className={`calc-field${invalid ? " is-invalid" : ""}`}>
                  <span>{input.label} <em>{input.unit}</em></span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={input.step}
                    min={input.min}
                    max={input.max}
                    value={raw[input.key] ?? ""}
                    placeholder={`${input.min}–${input.max}`}
                    aria-describedby={`${input.key}-help`}
                    aria-invalid={invalid}
                    onChange={event => setRaw(current => ({ ...current, [input.key]: event.target.value }))}
                  />
                  <small id={`${input.key}-help`}>
                    {invalid ? `Enter a value from ${input.min} to ${input.max} ${input.unit}.` : input.help}
                  </small>
                </label>
              );
            })}
          </div>

          <div className="calc-outputs" aria-live="polite">
            {result.ok ? (
              result.value.map((output, index) => {
                const meta = spec.outputs[index];
                return (
                  <div key={output.label} className="calc-output">
                    <span>{output.label}</span>
                    <strong>{output.value.toFixed(meta.digits)}{meta.unit ? ` ${meta.unit}` : ""}</strong>
                  </div>
                );
              })
            ) : (
              <p className="calc-missing">
                <strong>Missing or invalid measurement.</strong> {result.message} The raw result appears once every input is valid.
              </p>
            )}
            <p className="calc-note">Raw mathematical outputs for education. No clinical threshold is applied. These are not a diagnosis.</p>
          </div>

          <div className="calc-diagram-wrap">
            <CalcDiagram mode={spec.diagram} values={result.ok ? values : workedExample(spec)} phase={phase} primary={primary} />
            <div className="calc-timeline" role="group" aria-label="Diagram timeline">
              <button type="button" className="calc-btn" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>
                {playing ? "Pause" : "Play"}
              </button>
              <label>
                Timeline
                <input
                  type="range"
                  min={0}
                  max={0.99}
                  step={0.01}
                  value={phase}
                  onChange={event => setPhase(Number(event.target.value))}
                  aria-valuetext={`${Math.round(phase * 100)}% through the cycle`}
                />
              </label>
            </div>
          </div>

          <div className="calc-explain">
            <h3>Why it works</h3>
            <p>{spec.explain}</p>
            <p className="calc-trace">
              Source and version: {spec.source} Unit tests: <code>{spec.testFile}</code>.
            </p>
            <button type="button" className="calc-btn" onClick={() => toggleFavourite(spec.id)} aria-pressed={favourites.has(spec.id)}>
              {favourites.has(spec.id) ? "Remove from favourites" : "Add to favourites"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
