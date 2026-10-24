/**
 * 3D torso, heart and ultrasound probe for the CardioTwin probe lab.
 *
 * The torso, ribs, lungs and spine are original procedural geometry. The heart is
 * the bundled CC-BY-4.0 reference model (see public/models/core__public_models__README.md),
 * rendered by RealisticHeart. Probe pose, beam and landmark spheres come from the
 * same probeGeometry model that drives the synthetic echo, so the two views stay
 * synchronised by construction.
 */

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

import RealisticHeart from "../RealisticHeart";
import { ANATOMY, type ProbeFrame, type ProbePose, type StructureId } from "./probeGeometry";

export interface ProbeLayers {
  skeleton: boolean;
  lungs: boolean;
  heart: boolean;
  vessels: boolean;
  beam: boolean;
  labels: boolean;
  landmarks: boolean;
  torsoOpacity: number;
  xray: boolean;
}

export const DEFAULT_LAYERS: ProbeLayers = {
  skeleton: true,
  lungs: true,
  heart: true,
  vessels: true,
  beam: true,
  labels: true,
  landmarks: false,
  torsoOpacity: 0.24,
  xray: false,
};

/** Heart placement: the reference model is scaled and offset onto the landmark frame. */
const HEART_POSITION: [number, number, number] = [0.03, -0.01, 0.035];
const HEART_SCALE = 0.13;

const PIXEL_BLUE = "#39A9E8";
const PIXEL_ORANGE = "#FF7900";

export function canUseWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface ProbeTorsoSceneProps {
  frame: ProbeFrame;
  layers: ProbeLayers;
  selected: StructureId | null;
  onSelect: (id: StructureId) => void;
  onPoseDelta: (delta: Partial<ProbePose>) => void;
  heartbeat: boolean;
  reducedMotion: boolean;
  resetSignal: number;
}

interface OrbitHandle {
  enabled: boolean;
  reset: () => void;
}

function Torso({ opacity, xray }: { opacity: number; xray: boolean }) {
  const effective = xray ? Math.min(opacity, 0.06) : opacity;
  const material = (
    <meshStandardMaterial color="#3a3f47" transparent opacity={effective} depthWrite={false} roughness={0.9} />
  );
  return (
    <group>
      <mesh scale={[0.19, 0.31, 0.12]} position={[0, 0.01, 0]}>
        <sphereGeometry args={[1, 48, 32]} />
        {material}
      </mesh>
      <mesh scale={[0.23, 0.065, 0.1]} position={[0, 0.33, 0]}>
        <sphereGeometry args={[1, 32, 20]} />
        {material}
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.14, 32]} />
        {material}
      </mesh>
    </group>
  );
}

function Skeleton({ visible, xray }: { visible: boolean; xray: boolean }) {
  const levels = useMemo(() => [0.2, 0.15, 0.1, 0.05, 0.0, -0.05, -0.1, -0.15, -0.2, -0.25], []);
  if (!visible) return null;
  const color = xray ? "#f4f1e8" : "#c9c3b0";
  const opacity = xray ? 0.9 : 0.3;
  const bone = <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} />;
  return (
    <group>
      {levels.map((y, index) => {
        const radius = 0.165 - index * 0.002;
        const tilt = -0.22 + index * 0.012;
        return [-1, 1].map(side => (
          <mesh
            key={`${y}-${side}`}
            position={[0, y, 0]}
            rotation={[Math.PI / 2 + tilt, side === 1 ? 0 : Math.PI, 0]}
            scale={[1, 0.78, 1]}
          >
            <torusGeometry args={[radius, 0.0065, 8, 48, Math.PI * 0.85]} />
            {bone}
          </mesh>
        ));
      })}
      <mesh position={[0, 0.07, 0.1]} scale={[0.012, 0.22, 0.008]}>
        <boxGeometry args={[1, 1, 1]} />
        {bone}
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={`clavicle-${side}`} position={[side * 0.1, 0.31, 0.04]} rotation={[0, 0, side * -0.25]}>
          <cylinderGeometry args={[0.009, 0.009, 0.18, 12]} />
          {bone}
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={`vertebra-${index}`} position={[0, 0.5 - index * 0.085, -0.1]}>
          <sphereGeometry args={[0.02, 12, 10]} />
          {bone}
        </mesh>
      ))}
    </group>
  );
}

function Lungs({ visible, xray }: { visible: boolean; xray: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.085, 0.0, -0.01]} scale={[0.07, 0.165, 0.08]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#8aa7bd" transparent opacity={xray ? 0.12 : 0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function frameQuaternion(frame: ProbeFrame): THREE.Quaternion {
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...frame.lateral),
    new THREE.Vector3(...frame.dir),
    new THREE.Vector3(...frame.normal),
  );
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function Probe({ frame, onPoseDelta, controls }: {
  frame: ProbeFrame;
  onPoseDelta: (delta: Partial<ProbePose>) => void;
  controls: MutableRefObject<OrbitHandle | null>;
}) {
  const drag = useRef<{ x: number; y: number } | null>(null);
  const { gl } = useThree();
  const orientation = useMemo(() => frameQuaternion(frame), [frame]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!drag.current) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = { x: event.clientX, y: event.clientY };
      onPoseDelta({ rotationDeg: dx * 0.35, tiltDeg: dy * 0.25 });
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      if (controls.current) controls.current.enabled = true;
      gl.domElement.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [controls, gl, onPoseDelta]);

  const onDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    drag.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    if (controls.current) controls.current.enabled = false;
    gl.domElement.style.cursor = "grabbing";
  };

  const onWheel = (event: ThreeEvent<WheelEvent>) => {
    event.stopPropagation();
    onPoseDelta({ depthCm: frame.pose.depthCm + (event.nativeEvent.deltaY > 0 ? 0.5 : -0.5) });
  };

  // The probe handle points away from the body, opposite to the beam.
  return (
    <group position={frame.contact} quaternion={orientation} scale={1.6}>
      <mesh onPointerDown={onDown} onWheel={onWheel}>
        <boxGeometry args={[0.07, 0.026, 0.04]} />
        <meshStandardMaterial color="#1d2026" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.016, 0.014, 0.13, 24]} />
        <meshStandardMaterial color="#c9ced6" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.02, 0.01, 0.02]} />
        <meshStandardMaterial color={PIXEL_BLUE} emissive={PIXEL_BLUE} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Beam({ frame }: { frame: ProbeFrame }) {
  const geometry = useMemo(() => {
    const steps = 48;
    const positions: number[] = [0, 0, 0];
    const indices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const theta = -frame.fanRad / 2 + (frame.fanRad * i) / steps;
      positions.push(Math.sin(theta) * frame.depthM, Math.cos(theta) * frame.depthM, 0);
    }
    for (let i = 1; i <= steps; i++) indices.push(0, i, i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    return g;
  }, [frame.depthM, frame.fanRad]);

  const orientation = useMemo(() => frameQuaternion(frame), [frame]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={frame.contact} quaternion={orientation}>
      <meshBasicMaterial color={PIXEL_BLUE} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Landmarks({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {ANATOMY.map(item => (
        <mesh key={item.id} position={item.center}>
          <sphereGeometry args={[item.kind === "valve" ? 0.006 : item.radius, 16, 12]} />
          <meshBasicMaterial
            color={item.kind === "valve" ? PIXEL_ORANGE : PIXEL_BLUE}
            wireframe
            transparent
            opacity={item.kind === "valve" ? 0.9 : 0.35}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Labels({ visible, selected, onSelect }: { visible: boolean; selected: StructureId | null; onSelect: (id: StructureId) => void }) {
  if (!visible) return null;
  return (
    <group>
      {ANATOMY.map(item => (
        <Html key={item.id} position={item.center} center zIndexRange={[10, 0]}>
          <button
            type="button"
            className={`probe-label${selected === item.id ? " is-selected" : ""}`}
            onClick={() => onSelect(item.id)}
            aria-label={`${item.label}: ${item.description}`}
          >
            {item.label}
          </button>
        </Html>
      ))}
    </group>
  );
}

function SceneContents(props: ProbeTorsoSceneProps) {
  const { frame, layers, selected, onSelect, onPoseDelta, heartbeat, reducedMotion, resetSignal } = props;
  const controls = useRef<OrbitHandle | null>(null);

  useEffect(() => {
    controls.current?.reset();
  }, [resetSignal]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[0.6, 0.9, 1.2]} intensity={0.9} />
      <pointLight position={[-0.6, 0.3, 0.8]} intensity={0.35} color={PIXEL_BLUE} />
      <Torso opacity={layers.torsoOpacity} xray={layers.xray} />
      <Skeleton visible={layers.skeleton} xray={layers.xray} />
      <Lungs visible={layers.lungs} xray={layers.xray} />
      {layers.heart ? (
        <group position={HEART_POSITION} scale={HEART_SCALE}>
          <Suspense fallback={null}>
            <RealisticHeart
              animated={heartbeat && !reducedMotion}
              vesselsVisible={layers.vessels}
              flowVisible={false}
              selectedStructure={selected}
              onSelectStructure={structure => onSelect(structure as StructureId)}
            />
          </Suspense>
        </group>
      ) : null}
      <Landmarks visible={layers.landmarks} />
      {layers.beam ? <Beam frame={frame} /> : null}
      <Probe frame={frame} onPoseDelta={onPoseDelta} controls={controls} />
      <Labels visible={layers.labels} selected={selected} onSelect={onSelect} />
      <OrbitControls
        ref={controls as never}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={0.45}
        maxDistance={1.6}
        target={[0, 0.02, 0]}
        enablePan={false}
      />
    </>
  );
}

export default function ProbeTorsoScene(props: ProbeTorsoSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.06, 0.95], fov: 34, near: 0.01, far: 10 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
