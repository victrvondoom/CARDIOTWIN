/**
 * Educational diagrams for the calculator studio. Each diagram reads the current
 * inputs and an animation phase in [0, 1), so the picture changes with the numbers
 * and the timeline scrub. These are schematic illustrations, not measured images.
 */

import type { DiagramMode, Values } from "./calculators";

interface CalcDiagramProps {
  mode: DiagramMode;
  values: Values;
  phase: number;
  /** Computed primary result, when the inputs are valid. */
  primary: number | null;
}

const W = 480;
const H = 220;
const BLUE = "#39A9E8";
const ORANGE = "#FF7900";
const GREEN = "#59DFA6";
const YELLOW = "#FFB400";
const RED = "#F0442B";
const INK = "#F7F7F4";
const MUTED = "#96979E";
const LINE = "#292A2E";

function Label({ x, y, text, color = INK, anchor = "start" }: { x: number; y: number; text: string; color?: string; anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} fill={color} fontSize="12" fontFamily="JetBrains Mono, monospace" textAnchor={anchor}>{text}</text>;
}

function Continuity({ values, phase, primary }: CalcDiagramProps) {
  const d = values.lvotDiameterCm ?? 2;
  const lvotH = Math.max(18, Math.min(90, d * 28));
  const orifice = primary === null ? 40 : Math.max(8, Math.min(90, primary * 26));
  const cy = 110;
  const flow = [0, 1, 2, 3, 4, 5].map(i => {
    const t = (phase + i / 6) % 1;
    return { x: 40 + t * 380, y: cy - 12 + (i % 2) * 24 };
  });
  return (
    <g>
      <path d={`M40 ${cy - lvotH / 2} L200 ${cy - lvotH / 2} L240 ${cy - orifice / 2} L240 ${cy + orifice / 2} L200 ${cy + lvotH / 2} L40 ${cy + lvotH / 2} Z`} fill="none" stroke={BLUE} strokeWidth="1.5" />
      <path d={`M240 ${cy - orifice / 2} L280 ${cy - 26} L440 ${cy - 26}`} fill="none" stroke={LINE} strokeWidth="1" />
      <path d={`M240 ${cy + orifice / 2} L280 ${cy + 26} L440 ${cy + 26}`} fill="none" stroke={LINE} strokeWidth="1" />
      {flow.map((dot, index) => (
        <circle key={index} cx={dot.x} cy={dot.y} r="3" fill={index % 2 ? GREEN : ORANGE} opacity="0.85" />
      ))}
      <Label x={40} y={34} text={`LVOT ${d.toFixed(2)} cm`} color={BLUE} />
      <Label x={240} y={194} text="aortic valve" color={ORANGE} anchor="middle" />
      <Label x={440} y={34} text={primary === null ? "AVA: enter inputs" : `AVA ${primary.toFixed(2)} cm²`} color={ORANGE} anchor="end" />
    </g>
  );
}

function Pisa({ values, phase, primary }: CalcDiagramProps) {
  const r = values.aliasingRadiusCm ?? 0.8;
  const scale = 95 / 1.2;
  const origin = { x: 240, y: 200 };
  const ring = (radius: number) => radius * scale;
  const pulse = ring(r) * (0.9 + 0.12 * ((phase * 2) % 1));
  return (
    <g>
      <path d={`M${origin.x - ring(r)} ${origin.y} A${ring(r)} ${ring(r)} 0 0 1 ${origin.x + ring(r)} ${origin.y}`} fill="none" stroke={BLUE} strokeWidth="2" />
      <path d={`M${origin.x - ring(r * 0.6)} ${origin.y} A${ring(r * 0.6)} ${ring(r * 0.6)} 0 0 1 ${origin.x + ring(r * 0.6)} ${origin.y}`} fill="none" stroke={YELLOW} strokeWidth="2" />
      <path d={`M${origin.x - pulse} ${origin.y} A${pulse} ${pulse} 0 0 1 ${origin.x + pulse} ${origin.y}`} fill="none" stroke={ORANGE} strokeWidth="1" opacity={0.6 - 0.4 * ((phase * 2) % 1)} />
      <circle cx={origin.x} cy={origin.y} r="4" fill={RED} />
      <Label x={origin.x + ring(r) + 6} y={origin.y - 6} text={`r ${r.toFixed(2)} cm`} color={BLUE} />
      <Label x={20} y={30} text="PISA hemispheres (colour-Doppler aliasing)" color={MUTED} />
      <Label x={460} y={30} text={primary === null ? "EROA: enter inputs" : `EROA ${primary.toFixed(3)} cm²`} color={ORANGE} anchor="end" />
    </g>
  );
}

function Volumes({ values, phase, primary }: CalcDiagramProps) {
  const edv = values.edvMl ?? 120;
  const esv = values.esvMl ?? 50;
  const beat = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
  const volume = esv + (edv - esv) * beat;
  const radius = 26 + 40 * Math.cbrt(volume / 120);
  const cx = 240;
  const cy = 118;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={radius * 0.82} ry={radius} fill="none" stroke={ORANGE} strokeWidth="2" />
      <ellipse cx={cx} cy={cy} rx={radius * 0.82 * 0.45} ry={radius * 0.45} fill="none" stroke={MUTED} strokeWidth="1" />
      <Label x={20} y={30} text={`EDV ${edv.toFixed(0)} mL`} color={MUTED} />
      <Label x={20} y={48} text={`ESV ${esv.toFixed(0)} mL`} color={MUTED} />
      <Label x={460} y={30} text={`volume now ${volume.toFixed(0)} mL`} color={INK} anchor="end" />
      <Label x={460} y={48} text={primary === null ? "EF: enter inputs" : `EF ${primary.toFixed(1)} %`} color={ORANGE} anchor="end" />
    </g>
  );
}

function Area({ values, phase, primary }: CalcDiagramProps) {
  const eda = values.edaCm2 ?? 20;
  const esa = values.esaCm2 ?? 12;
  const beat = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
  const area = esa + (eda - esa) * beat;
  const scale = Math.sqrt(area / 20);
  const cx = 240;
  const cy = 118;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={70 * scale} ry={52 * scale} fill="rgba(240,68,43,0.12)" stroke={RED} strokeWidth="2" />
      <Label x={20} y={30} text={`EDA ${eda.toFixed(1)} cm²`} color={MUTED} />
      <Label x={20} y={48} text={`ESA ${esa.toFixed(1)} cm²`} color={MUTED} />
      <Label x={460} y={30} text={`area now ${area.toFixed(1)} cm²`} color={INK} anchor="end" />
      <Label x={460} y={48} text={primary === null ? "FAC: enter inputs" : `FAC ${primary.toFixed(1)} %`} color={RED} anchor="end" />
    </g>
  );
}

function Bernoulli({ values, phase, primary }: CalcDiagramProps) {
  const v = values.peakVelocityMs ?? 4;
  const length = 60 + v * 50;
  const barHeight = primary === null ? 20 : Math.min(150, primary * 1.6);
  const travel = (phase * length) % length;
  return (
    <g>
      <rect x="40" y="96" width={length} height="28" fill="rgba(57,169,232,0.12)" stroke={BLUE} strokeWidth="1" />
      <path d={`M40 110 L${40 + length} 110`} stroke={BLUE} strokeWidth="2" />
      <circle cx={40 + travel} cy="110" r="5" fill={ORANGE} />
      <rect x="400" y={190 - barHeight} width="34" height={barHeight} fill={YELLOW} opacity="0.7" />
      <Label x={20} y={30} text={`peak v ${v.toFixed(2)} m/s`} color={BLUE} />
      <Label x={460} y={30} text={primary === null ? "ΔP: enter inputs" : `ΔP ${primary.toFixed(1)} mmHg`} color={YELLOW} anchor="end" />
    </g>
  );
}

function Diastology({ values, phase, primary }: CalcDiagramProps) {
  const e = values.eCmS ?? 80;
  const a = values.aCmS ?? 40;
  const bell = (center: number, height: number, x: number) => height * Math.exp(-((x - center) ** 2) / (2 * 14 ** 2));
  const points = (height: number, center: number) => {
    const out: string[] = [];
    for (let x = 40; x <= 440; x += 4) out.push(`${x},${190 - bell(center, height, x)}`);
    return out.join(" ");
  };
  const cursor = 40 + phase * 400;
  return (
    <g>
      <polyline points={points(e * 1.2, 150)} fill="none" stroke={BLUE} strokeWidth="2" />
      <polyline points={points(a * 1.2, 330)} fill="none" stroke={ORANGE} strokeWidth="2" />
      <line x1={cursor} x2={cursor} y1="60" y2="195" stroke={INK} strokeWidth="1" opacity="0.6" />
      <Label x={60} y={60} text="E" color={BLUE} />
      <Label x={320} y={60} text="A" color={ORANGE} />
      <Label x={460} y={30} text={primary === null ? "E/A: enter inputs" : `E/A ${primary.toFixed(2)}`} color={INK} anchor="end" />
    </g>
  );
}

export default function CalcDiagram(props: CalcDiagramProps) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="calc-diagram"
      role="img"
      aria-label={`Educational ${props.mode} diagram. It updates with the inputs and the timeline.`}
    >
      <rect x="0" y="0" width={W} height={H} fill="#0D0E10" />
      <path d={`M0 ${H - 12} L${W} ${H - 12}`} stroke={LINE} strokeWidth="1" />
      {props.mode === "continuity" && <Continuity {...props} />}
      {props.mode === "pisa" && <Pisa {...props} />}
      {props.mode === "volumes" && <Volumes {...props} />}
      {props.mode === "area" && <Area {...props} />}
      {props.mode === "bernoulli" && <Bernoulli {...props} />}
      {props.mode === "diastology" && <Diastology {...props} />}
    </svg>
  );
}
