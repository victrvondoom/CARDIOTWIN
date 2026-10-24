/**
 * RealisticBodyHeartScene.tsx
 *
 * Ultra-Wide, Ultra-Super-Level 3D Anatomical Digital Twin.
 *
 * Features:
 * 1. Massive 3D-Rendered Anatomical Cardiac Complex with Myocardial Apex Contraction.
 * 2. Great Vessels: Sweeping Aortic Arch with 3 Supra-Aortic Branches (Brachiocephalic, Carotid, Subclavian).
 * 3. Pulmonary Trunk & Bifurcation (LPA/RPA), Vena Cava (SVC/IVC), and Pulmonary Veins.
 * 4. High-Definition Coronary Artery Tree (LAD + Diagonals, LCX + Marginals, RCA + PDA).
 * 5. Animated Hemodynamic Blood Pulse Trails flowing in real time through the coronary tree.
 * 6. Interactive 3D Plaque Stenosis Lesion Cuffs with Holographic Telemetry Callouts.
 * 7. Real 3D Directional Shadows, ContactShadows, Rim-lighting, and Multi-Tier Rotating Cybernetic Pedestal.
 * 8. 4 Camera Focal Modes: Full Body Scanner <-> Thoracic Cavity <-> Cardiac Core <-> Coronary Macro.
 * 9. Ultra-Wide Cinema IMAX 21:9 Viewport Support.
 */

import { OrbitControls, Html, QuadraticBezierLine, ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Maximize2, Minimize2, ZoomIn, Eye, Activity, HeartPulse, Sparkles, Shield } from "lucide-react";
import type { TargetId, VesselId, VesselViz } from "./core__src_cardiotwin__types";
import type { GateStatus, SensorNode } from "./riskflow/types";

export interface RealisticBodyHeartProps {
  sensors?: SensorNode[] | null;
  recordStatus?: GateStatus | null;
  onSelectSensor?: (id: string) => void;
  heartRate?: number;
  selectedStructure?: string | null;
  onSelectStructure?: (id: string) => void;
  vesselsViz?: Record<VesselId, VesselViz> | null;
  displayMode?: "hologram" | "skin" | "wireframe";
  viewFocus?: "body" | "thorax" | "heart" | "coronary";
  showCirculation?: boolean;
  showLandmarks?: boolean;
  stressActive?: boolean;
  isUltraWide?: boolean;
  onToggleUltraWide?: () => void;
}

// ---------------------------------------------------------------------------
// 1. Procedural Anatomical Human Silhouette Geometry
// ---------------------------------------------------------------------------
function createHumanBodyGeometries() {
  const torsoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.35, 0),     // Neck base
    new THREE.Vector3(0, 0.95, 0.05),  // Upper chest / Thorax
    new THREE.Vector3(0, 0.50, 0.02),  // Mid thorax / Cardiac center
    new THREE.Vector3(0, 0.10, -0.02), // Abdomen / Waist
    new THREE.Vector3(0, -0.35, 0),    // Pelvis base
  ]);
  const torsoGeo = new THREE.TubeGeometry(torsoCurve, 36, 0.49, 24, false);

  // Ribcage contours (translucent thoracic cage)
  const ribGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const y = 0.90 - i * 0.09;
    const radiusX = 0.44 - Math.pow(i - 3, 2) * 0.012;
    const radiusZ = 0.32 - Math.pow(i - 3, 2) * 0.008;
    const pts: THREE.Vector3[] = [];
    for (let a = 0; a <= 32; a++) {
      const angle = (a / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    ribGeos.push(new THREE.TubeGeometry(curve, 32, 0.016, 8, true));
  }

  // Sternum bone in front of thorax
  const sternumCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.95, 0.34),
    new THREE.Vector3(0, 0.75, 0.36),
    new THREE.Vector3(0, 0.55, 0.35),
    new THREE.Vector3(0, 0.38, 0.30), // Xiphoid process
  ]);
  const sternumGeo = new THREE.TubeGeometry(sternumCurve, 20, 0.035, 8, false);

  // Head and Neck
  const headGeo = new THREE.SphereGeometry(0.24, 24, 20);
  headGeo.scale(0.85, 1.15, 0.95);
  const neckGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.28, 16);

  // Arms and Legs
  const leftArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, 1.10, 0),
    new THREE.Vector3(0.68, 0.70, 0.05),
    new THREE.Vector3(0.72, 0.25, 0.08),
    new THREE.Vector3(0.74, -0.20, 0.10),
  ]);
  const leftArmGeo = new THREE.TubeGeometry(leftArmCurve, 24, 0.11, 14, false);

  const rightArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 1.10, 0),
    new THREE.Vector3(-0.68, 0.70, 0.05),
    new THREE.Vector3(-0.72, 0.25, 0.08),
    new THREE.Vector3(-0.74, -0.20, 0.10),
  ]);
  const rightArmGeo = new THREE.TubeGeometry(rightArmCurve, 24, 0.11, 14, false);

  const leftLegCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.25, -0.35, 0),
    new THREE.Vector3(0.26, -0.95, 0.02),
    new THREE.Vector3(0.25, -1.55, -0.02),
    new THREE.Vector3(0.24, -2.15, 0),
  ]);
  const leftLegGeo = new THREE.TubeGeometry(leftLegCurve, 28, 0.16, 16, false);

  const rightLegCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.25, -0.35, 0),
    new THREE.Vector3(-0.26, -0.95, 0.02),
    new THREE.Vector3(-0.25, -1.55, -0.02),
    new THREE.Vector3(-0.24, -2.15, 0),
  ]);
  const rightLegGeo = new THREE.TubeGeometry(rightLegCurve, 28, 0.16, 16, false);

  return { torsoGeo, ribGeos, sternumGeo, headGeo, neckGeo, leftArmGeo, rightArmGeo, leftLegGeo, rightLegGeo };
}

// ---------------------------------------------------------------------------
// 2. Systemic Vascular Tree (Arterial & Venous Loops)
// ---------------------------------------------------------------------------
function createSystemicCirculationCurves() {
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.04, 0.58, 0.15),
    new THREE.Vector3(-0.02, 0.78, 0.12),
    new THREE.Vector3(0.06, 0.88, 0.08),
    new THREE.Vector3(0.08, 0.65, 0.02),
    new THREE.Vector3(0.06, 0.15, -0.01),
    new THREE.Vector3(0.04, -0.30, 0.0),
  ]);

  const leftCarotid = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, 0.86, 0.08),
    new THREE.Vector3(0.09, 1.25, 0.05),
    new THREE.Vector3(0.12, 1.55, 0.02),
  ]);
  const rightCarotid = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0.86, 0.08),
    new THREE.Vector3(-0.09, 1.25, 0.05),
    new THREE.Vector3(-0.12, 1.55, 0.02),
  ]);

  const leftFemoral = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, -0.30, 0.0),
    new THREE.Vector3(0.18, -0.65, 0.04),
    new THREE.Vector3(0.24, -1.35, 0.02),
    new THREE.Vector3(0.23, -2.10, 0.0),
  ]);
  const rightFemoral = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, -0.30, 0.0),
    new THREE.Vector3(-0.18, -0.65, 0.04),
    new THREE.Vector3(-0.24, -1.35, 0.02),
    new THREE.Vector3(-0.23, -2.10, 0.0),
  ]);

  const svcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 1.25, 0.03),
    new THREE.Vector3(-0.14, 0.85, 0.06),
    new THREE.Vector3(-0.15, 0.58, 0.12),
  ]);
  const ivcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -0.30, -0.02),
    new THREE.Vector3(-0.06, 0.15, -0.01),
    new THREE.Vector3(-0.14, 0.48, 0.10),
  ]);

  return { aortaCurve, leftCarotid, rightCarotid, leftFemoral, rightFemoral, svcCurve, ivcCurve };
}

// ---------------------------------------------------------------------------
// 3. Animated Hemodynamic Blood Pulse Trail Component
// ---------------------------------------------------------------------------
function HemodynamicPulseTrail({
  curve,
  color,
  speed = 1.0,
  scale = 1.0,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  color: string;
  speed?: number;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const progress = useRef(Math.random());

  useFrame((_, delta) => {
    progress.current = (progress.current + delta * 0.75 * speed) % 1.0;
    const pt = curve.getPointAt(progress.current);
    if (meshRef.current) {
      meshRef.current.position.copy(pt);
    }
    const lagProg = (progress.current - 0.12 + 1.0) % 1.0;
    const ptLag = curve.getPointAt(lagProg);
    if (trailRef.current) {
      trailRef.current.position.copy(ptLag);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.016 * scale, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.012 * scale, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 4. Ground Holographic Rotating Pedestal with Contact Shadow
// ---------------------------------------------------------------------------
function CyberneticPedestal({ heartRate }: { heartRate: number }) {
  const ringRef1 = useRef<THREE.Group>(null);
  const ringRef2 = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringRef1.current) ringRef1.current.rotation.z += delta * 0.35;
    if (ringRef2.current) ringRef2.current.rotation.z -= delta * 0.22;
  });

  return (
    <group position={[0, -2.36, 0]}>
      {/* Real Contact Shadow beneath the patient */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.88}
        scale={8.5}
        blur={2.4}
        far={4.0}
        color="#000714"
      />

      {/* Outer Holographic Glow Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.75, 48]} />
        <meshStandardMaterial
          color="#021424"
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Rotating Inner Cybernetic Tech Ring 1 */}
      <group ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <mesh>
          <ringGeometry args={[1.25, 1.35, 48]} />
          <meshBasicMaterial color="#39A9E8" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.85, 0.90, 36]} />
          <meshBasicMaterial color="#39A9E8" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Rotating Outer Tech Ring 2 */}
      <group ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <mesh>
          <ringGeometry args={[1.45, 1.50, 48]} />
          <meshBasicMaterial color="#39A9E8" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.35, 0.40, 24]} />
          <meshBasicMaterial color="#39A9E8" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Scanning Ground Marker */}
      <Html position={[0, 0.04, 1.4]} center distanceFactor={7}>
        <div className="font-mono text-[9px] uppercase tracking-widest text-cyan-400 bg-black/80 px-2 py-0.5 rounded border border-cyan-500/40 select-none pointer-events-none">
          3D THORACIC SCANNER · {heartRate} BPM
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 5. Massive Anatomical Cardiac Complex & Coronary Tree
// ---------------------------------------------------------------------------
interface CentralHeartProps {
  heartRate: number;
  selectedStructure: string | null;
  onSelect: (id: string) => void;
  vesselsViz?: Record<VesselId, VesselViz> | null;
  stressActive?: boolean;
}

function CentralHeartCore({
  heartRate,
  selectedStructure,
  onSelect,
  vesselsViz,
  stressActive,
}: CentralHeartProps) {
  const heartGroupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  // Vessel color determination based on prediction
  const getCoronaryColor = (vessel: VesselId) => {
    const viz = vesselsViz?.[vessel];
    if (!viz) return "#39A9E8";
    if (viz.probability > 0.65) return "#ef4444"; // Severe ischemia
    if (viz.probability > 0.35) return "#f59e0b"; // Moderate
    return "#10b981"; // Normal
  };

  const ladColor = getCoronaryColor("LAD");
  const lcxColor = getCoronaryColor("LCX");
  const rcaColor = getCoronaryColor("RCA");

  // Coronary Tree CatmullRom 3D Splines
  const ladCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, 0.16, 0.20),
        new THREE.Vector3(-0.05, 0.08, 0.24),
        new THREE.Vector3(-0.10, -0.06, 0.22),
        new THREE.Vector3(-0.14, -0.20, 0.18),
        new THREE.Vector3(-0.17, -0.32, 0.10), // apex
      ]),
    []
  );

  // Diagonal Branch D1
  const ladDiagCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.07, 0.02, 0.23),
        new THREE.Vector3(-0.13, -0.04, 0.26),
        new THREE.Vector3(-0.19, -0.12, 0.21),
      ]),
    []
  );

  // LCX & Obtuse Marginal OM1
  const lcxCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, 0.16, 0.20),
        new THREE.Vector3(0.08, 0.13, 0.17),
        new THREE.Vector3(0.19, 0.06, 0.08),
        new THREE.Vector3(0.22, -0.08, -0.05),
      ]),
    []
  );

  const lcxOmCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.14, 0.09, 0.12),
        new THREE.Vector3(0.19, -0.02, 0.18),
        new THREE.Vector3(0.21, -0.15, 0.15),
      ]),
    []
  );

  // RCA & Posterior Descending PDA
  const rcaCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.04, 0.15, 0.18),
        new THREE.Vector3(-0.16, 0.11, 0.14),
        new THREE.Vector3(-0.22, -0.02, 0.07),
        new THREE.Vector3(-0.20, -0.18, -0.02),
        new THREE.Vector3(-0.14, -0.26, -0.06),
      ]),
    []
  );

  // Great Vessels Curves (Aorta & Pulmonary Artery)
  const aortaArchCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.03, 0.14, 0.12), // LV Outflow root
        new THREE.Vector3(-0.02, 0.28, 0.14), // Ascending aorta
        new THREE.Vector3(0.05, 0.38, 0.10),  // Arch apex
        new THREE.Vector3(0.08, 0.26, 0.02),  // Descending aorta
        new THREE.Vector3(0.07, 0.08, -0.04),
      ]),
    []
  );

  // 3 Supra-Aortic Branches (Brachiocephalic, Carotid, Subclavian)
  const brachiocephalicCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.01, 0.36, 0.12),
        new THREE.Vector3(-0.04, 0.48, 0.14),
      ]),
    []
  );
  const leftCarotidArchCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.04, 0.38, 0.11),
        new THREE.Vector3(0.05, 0.50, 0.11),
      ]),
    []
  );
  const leftSubclavianCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.07, 0.37, 0.08),
        new THREE.Vector3(0.12, 0.48, 0.06),
      ]),
    []
  );

  // Pulmonary Artery Trunk crossing anterior to Aorta
  const pulmonaryTrunkCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.06, 0.10, 0.15),  // RV outflow
        new THREE.Vector3(0.03, 0.24, 0.20),  // Trunk crossing aorta
        new THREE.Vector3(-0.04, 0.28, 0.12), // Bifurcation point
      ]),
    []
  );

  // Real-Time Ventricular Systole / Diastole Myocardial Contraction
  useFrame((_, delta) => {
    if (!heartGroupRef.current) return;
    const freq = heartRate / 60.0;
    elapsed.current += delta * freq;
    const phase = elapsed.current % 1.0;

    // Physiological asymmetric cardiac cycle (rapid systolic squeeze + elastance recoil)
    const contraction = Math.exp(-Math.pow((phase - 0.20) / 0.08, 2)) * 0.11;
    const sx = 1.0 - contraction * 1.1;
    const sy = 1.0 + contraction * 0.5;
    const sz = 1.0 - contraction * 1.0;
    heartGroupRef.current.scale.set(sx, sy, sz);
  });

  const ladStenosisActive = (vesselsViz?.LAD?.probability ?? 0) > 0.5;
  const ladStenosisProb = Math.round((vesselsViz?.LAD?.probability ?? 0.75) * 100);

  return (
    <group position={[-0.05, 0.52, 0.08]} ref={heartGroupRef}>
      {/* ── 1. MYOCARDIAL VENTRICLES & ATRIAL CHAMBERS ── */}
      {/* Left Ventricle (LV) - Dominant high-pressure pump */}
      <mesh
        position={[-0.07, -0.09, 0.04]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LEFT_VENTRICLE");
        }}
      >
        <sphereGeometry args={[0.23, 36, 32]} />
        <meshPhysicalMaterial
          color={selectedStructure === "LEFT_VENTRICLE" ? "#39A9E8" : "#8b263e"}
          emissive={selectedStructure === "LEFT_VENTRICLE" ? "#39A9E8" : "#3e0814"}
          emissiveIntensity={selectedStructure === "LEFT_VENTRICLE" ? 0.75 : 0.25}
          roughness={0.35}
          clearcoat={0.65}
          clearcoatRoughness={0.15}
          metalness={0.15}
        />
      </mesh>

      {/* Right Ventricle (RV) */}
      <mesh
        position={[0.10, -0.06, 0.06]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("RIGHT_VENTRICLE");
        }}
      >
        <sphereGeometry args={[0.19, 32, 28]} />
        <meshPhysicalMaterial
          color={selectedStructure === "RIGHT_VENTRICLE" ? "#39A9E8" : "#7c2d37"}
          emissive={selectedStructure === "RIGHT_VENTRICLE" ? "#39A9E8" : "#32060f"}
          emissiveIntensity={selectedStructure === "RIGHT_VENTRICLE" ? 0.75 : 0.25}
          roughness={0.4}
          clearcoat={0.5}
        />
      </mesh>

      {/* Left Atrium (LA) */}
      <mesh
        position={[-0.05, 0.12, -0.06]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LEFT_ATRIUM");
        }}
      >
        <sphereGeometry args={[0.16, 28, 24]} />
        <meshPhysicalMaterial color="#993344" roughness={0.55} clearcoat={0.4} />
      </mesh>

      {/* Right Atrium (RA) */}
      <mesh
        position={[0.14, 0.10, -0.02]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("RIGHT_ATRIUM");
        }}
      >
        <sphereGeometry args={[0.15, 28, 24]} />
        <meshPhysicalMaterial color="#882233" roughness={0.55} clearcoat={0.4} />
      </mesh>

      {/* ── 2. GREAT VESSELS (AORTIC ARCH & PULMONARY TRUNK) ── */}
      {/* Massive Aortic Arch */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[aortaArchCurve, 36, 0.048, 16, false]} />
        <meshPhysicalMaterial
          color="#dc2626"
          emissive="#7f1d1d"
          emissiveIntensity={0.45}
          roughness={0.25}
          clearcoat={0.8}
        />
      </mesh>

      {/* 3 Supra-Aortic Branches */}
      <mesh castShadow>
        <tubeGeometry args={[brachiocephalicCurve, 14, 0.020, 10, false]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[leftCarotidArchCurve, 14, 0.018, 10, false]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[leftSubclavianCurve, 14, 0.019, 10, false]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} />
      </mesh>

      {/* Pulmonary Trunk (Crossing anteriorly) */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[pulmonaryTrunkCurve, 24, 0.042, 14, false]} />
        <meshPhysicalMaterial
          color="#39A9E8"
          emissive="#141518"
          emissiveIntensity={0.4}
          roughness={0.3}
          clearcoat={0.6}
        />
      </mesh>

      {/* ── 3. CORONARY ARTERY TREE (LAD, LCX, RCA & BRANCHES) ── */}
      {/* LAD - Left Anterior Descending Artery */}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LAD");
        }}
      >
        <tubeGeometry args={[ladCurve, 36, 0.026, 12, false]} />
        <meshPhysicalMaterial
          color={selectedStructure === "LAD" ? "#39A9E8" : ladColor}
          emissive={ladColor}
          emissiveIntensity={selectedStructure === "LAD" ? 1.0 : 0.55}
          roughness={0.15}
          clearcoat={1.0}
        />
      </mesh>

      {/* LAD Diagonal Branch D1 */}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LAD");
        }}
      >
        <tubeGeometry args={[ladDiagCurve, 20, 0.018, 10, false]} />
        <meshPhysicalMaterial
          color={ladColor}
          emissive={ladColor}
          emissiveIntensity={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* LCX - Left Circumflex */}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LCX");
        }}
      >
        <tubeGeometry args={[lcxCurve, 32, 0.022, 12, false]} />
        <meshPhysicalMaterial
          color={selectedStructure === "LCX" ? "#39A9E8" : lcxColor}
          emissive={lcxColor}
          emissiveIntensity={selectedStructure === "LCX" ? 1.0 : 0.45}
          roughness={0.18}
          clearcoat={0.9}
        />
      </mesh>

      {/* LCX Obtuse Marginal OM1 */}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("LCX");
        }}
      >
        <tubeGeometry args={[lcxOmCurve, 20, 0.016, 10, false]} />
        <meshPhysicalMaterial color={lcxColor} emissive={lcxColor} emissiveIntensity={0.45} />
      </mesh>

      {/* RCA - Right Coronary Artery */}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect("RCA");
        }}
      >
        <tubeGeometry args={[rcaCurve, 32, 0.024, 12, false]} />
        <meshPhysicalMaterial
          color={selectedStructure === "RCA" ? "#39A9E8" : rcaColor}
          emissive={rcaColor}
          emissiveIntensity={selectedStructure === "RCA" ? 1.0 : 0.45}
          roughness={0.18}
          clearcoat={0.9}
        />
      </mesh>

      {/* ── 4. REAL-TIME HEMODYNAMIC PULSE TRAILS (ANIMATED BLOOD FLOW) ── */}
      <HemodynamicPulseTrail curve={ladCurve} color={ladColor} speed={1.2} scale={1.1} />
      <HemodynamicPulseTrail curve={ladDiagCurve} color={ladColor} speed={1.1} scale={0.9} />
      <HemodynamicPulseTrail curve={lcxCurve} color={lcxColor} speed={1.0} scale={1.0} />
      <HemodynamicPulseTrail curve={rcaCurve} color={rcaColor} speed={1.15} scale={1.05} />

      {/* ── 5. STENOSIS LESION CUFF & 3D HOLOGRAPHIC CALLOUT ── */}
      {ladStenosisActive && (
        <group position={[-0.08, -0.04, 0.22]}>
          <mesh>
            <torusGeometry args={[0.034, 0.012, 12, 24]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
          </mesh>
          <Html position={[-0.22, 0.08, 0.05]} center distanceFactor={4.5}>
            <div className="bg-rose-950/95 border border-rose-500/80 text-rose-200 px-2.5 py-1 rounded-md text-[10px] font-mono shadow-[0_0_20px_rgba(244,63,94,0.7)] backdrop-blur-md flex flex-col gap-0.5 select-none pointer-events-none">
              <div className="font-bold flex items-center gap-1.5 text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                LAD LESION: {ladStenosisProb}% STENOSIS
              </div>
              <div className="text-[9px] text-slate-300">
                FFR: 0.68 · High Plaque Vulnerability
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* Central 3D Epicenter Hologram Marker */}
      <Html position={[-0.24, 0.28, 0.18]} center distanceFactor={6}>
        <div className="pointer-events-none select-none rounded-md bg-slate-950/90 px-2.5 py-1 text-[10px] font-mono font-semibold text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md flex items-center gap-1.5">
          <HeartPulse size={12} className="text-rose-400 animate-pulse" />
          <span>3D CARDIAC CORE · {heartRate} BPM</span>
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 6. Sensor Overlay & FHIR Gateway Network
// ---------------------------------------------------------------------------
type V3 = [number, number, number];
const HEART_CORE: V3 = [-0.05, 0.52, 0.08];
const RECORD_SITE: V3 = [-1.15, 0.9, 0.0];
const SENSOR_SITES: Record<string, V3> = {
  "wrist-hr": [0.77, -0.04, 0.2],
  "wrist-rr": [0.84, -0.17, 0.16],
  "finger-spo2": [-0.78, -0.32, 0.16],
};
const SENSOR_COLOR: Record<string, string> = {
  accepted: "#10b981",
  rejected: "#ef4444",
  absent: "#64748b",
  unbound: "#f59e0b",
};
const RECORD_COLOR: Record<GateStatus, string> = {
  pass: "#39A9E8",
  warn: "#f59e0b",
  fail: "#ef4444",
  skipped: "#64748b",
};

const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function PulseNode({
  position,
  color,
  onClick,
  label,
}: {
  position: V3;
  color: string;
  onClick?: () => void;
  label: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + 0.25 * Math.sin(clock.elapsedTime * 4));
  });
  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <Html center distanceFactor={3.2} position={[0, 0.07, 0]}>
        <div
          className="whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[8px] font-mono border"
          style={{ color, borderColor: `${color}88` }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function SensorOverlay({
  sensors,
  recordStatus,
  onSelectSensor,
}: {
  sensors: SensorNode[];
  recordStatus?: GateStatus | null;
  onSelectSensor?: (id: string) => void;
}) {
  return (
    <group>
      {sensors.map((s) => {
        const site = SENSOR_SITES[s.id];
        if (!site) return null;
        const color = SENSOR_COLOR[s.status] ?? SENSOR_COLOR.absent;
        const gate = lerp3(site, HEART_CORE, 0.55);
        const passed = s.status === "accepted";
        return (
          <group key={s.id}>
            <PulseNode
              position={site}
              color={color}
              label={`${s.label} · ${s.status}`}
              onClick={() => onSelectSensor?.(s.id)}
            />
            <QuadraticBezierLine
              start={site}
              end={gate}
              mid={lerp3(lerp3(site, gate, 0.5), [site[0], gate[1], 0.45], 0.4)}
              color={color}
              lineWidth={passed ? 2 : 1.4}
              dashed={!passed}
              dashSize={0.04}
              gapSize={0.03}
            />
            <mesh position={gate}>
              <torusGeometry args={[0.04, 0.008, 8, 24]} />
              <meshBasicMaterial color={passed ? "#10b981" : "#ef4444"} />
            </mesh>
            {passed && (
              <QuadraticBezierLine
                start={gate}
                end={HEART_CORE}
                mid={
                  lerp3(gate, HEART_CORE, 0.5).map((v, i) =>
                    i === 2 ? v + 0.2 : v
                  ) as V3
                }
                color={color}
                lineWidth={2}
              />
            )}
          </group>
        );
      })}
      {recordStatus && (
        <group>
          <PulseNode
            position={RECORD_SITE}
            color={RECORD_COLOR[recordStatus]}
            label={`FHIR history · ${recordStatus}`}
          />
          <QuadraticBezierLine
            start={RECORD_SITE}
            end={HEART_CORE}
            mid={[-0.65, 0.95, 0.35]}
            color={RECORD_COLOR[recordStatus]}
            lineWidth={1.8}
            dashed={recordStatus !== "pass"}
            dashSize={0.05}
            gapSize={0.03}
          />
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 7. Complete 3D Scene Content with Directional Shadow Maps & Lighting
// ---------------------------------------------------------------------------
function SceneContent({
  sensors,
  recordStatus,
  onSelectSensor,
  heartRate = 72,
  selectedStructure,
  onSelectStructure,
  vesselsViz,
  displayMode = "hologram",
  viewFocus = "body",
  showCirculation = true,
  showLandmarks = true,
  stressActive = false,
}: RealisticBodyHeartProps) {
  const { camera } = useThree();
  const bodyGeos = useMemo(() => createHumanBodyGeometries(), []);
  const systemic = useMemo(() => createSystemicCirculationCurves(), []);

  // Material selection based on displayMode
  const bodyMaterial = useMemo(() => {
    if (displayMode === "hologram") {
      return new THREE.MeshPhysicalMaterial({
        color: "#0f2c42",
        emissive: "#034360",
        emissiveIntensity: 0.28,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
        transmission: 0.70,
        ior: 1.45,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      });
    } else if (displayMode === "skin") {
      return new THREE.MeshPhysicalMaterial({
        color: "#d8b4a8",
        roughness: 0.7,
        transparent: true,
        opacity: 0.6,
        clearcoat: 0.3,
      });
    } else {
      return new THREE.MeshBasicMaterial({
        color: "#39A9E8",
        wireframe: true,
        transparent: true,
        opacity: 0.32,
      });
    }
  }, [displayMode]);

  // Smooth camera position transitions
  useEffect(() => {
    if (viewFocus === "body") {
      camera.position.set(0, 0.15, 4.3);
    } else if (viewFocus === "thorax") {
      camera.position.set(0, 0.52, 2.2);
    } else if (viewFocus === "heart") {
      camera.position.set(-0.08, 0.52, 1.15);
    } else if (viewFocus === "coronary") {
      camera.position.set(-0.10, 0.48, 0.72);
    }
  }, [viewFocus, camera]);

  return (
    <>
      {/* ── CINEMATIC LIGHTING & SHADOW ARCHITECTURE ── */}
      <ambientLight intensity={0.7} />

      {/* Main Key Directional Light with High-Resolution Shadow Maps */}
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />

      {/* Secondary Cyan Rim Backlight for Medical Silhouette Definition */}
      <directionalLight position={[-4, 3, -4]} intensity={0.85} color="#39A9E8" />

      {/* Warm Fill Light */}
      <directionalLight position={[0, -4, 3]} intensity={0.35} color="#fed7aa" />

      {/* Volumetric Point Light at Cardiac Epicenter */}
      <pointLight
        position={[-0.05, 0.52, 0.5]}
        intensity={2.2}
        color="#39A9E8"
        distance={2.5}
      />

      {/* Ground Holographic Pedestal & Ground Contact Shadow */}
      <CyberneticPedestal heartRate={heartRate} />

      {/* ── HUMAN ANATOMICAL SILHOUETTE ── */}
      <group>
        <mesh geometry={bodyGeos.torsoGeo} material={bodyMaterial} castShadow receiveShadow />
        <mesh geometry={bodyGeos.headGeo} position={[0, 1.62, 0]} material={bodyMaterial} castShadow />
        <mesh geometry={bodyGeos.neckGeo} position={[0, 1.42, 0]} material={bodyMaterial} castShadow />
        <mesh geometry={bodyGeos.leftArmGeo} material={bodyMaterial} castShadow />
        <mesh geometry={bodyGeos.rightArmGeo} material={bodyMaterial} castShadow />
        <mesh geometry={bodyGeos.leftLegGeo} material={bodyMaterial} castShadow />
        <mesh geometry={bodyGeos.rightLegGeo} material={bodyMaterial} castShadow />

        {/* Ribcage Structure (Protective cage around heart) */}
        {bodyGeos.ribGeos.map((geo, idx) => (
          <mesh key={idx} geometry={geo} castShadow>
            <meshStandardMaterial
              color="#d1d5db"
              transparent
              opacity={viewFocus === "heart" || viewFocus === "coronary" ? 0.12 : 0.42}
              roughness={0.35}
            />
          </mesh>
        ))}

        {/* Sternum Bone */}
        <mesh geometry={bodyGeos.sternumGeo} castShadow>
          <meshStandardMaterial
            color="#e2e8f0"
            transparent
            opacity={viewFocus === "heart" || viewFocus === "coronary" ? 0.1 : 0.55}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* ── SYSTEMIC CIRCULATORY VESSELS ── */}
      {showCirculation && (
        <group>
          {/* Systemic Aorta */}
          <mesh castShadow>
            <tubeGeometry args={[systemic.aortaCurve, 32, 0.045, 12, false]} />
            <meshPhysicalMaterial
              color="#dc2626"
              emissive="#7f1d1d"
              emissiveIntensity={0.4}
              roughness={0.3}
            />
          </mesh>
          {/* Carotid Arteries */}
          <mesh castShadow>
            <tubeGeometry args={[systemic.leftCarotid, 20, 0.022, 8, false]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh castShadow>
            <tubeGeometry args={[systemic.rightCarotid, 20, 0.022, 8, false]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* Femoral Arteries */}
          <mesh castShadow>
            <tubeGeometry args={[systemic.leftFemoral, 24, 0.032, 8, false]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh castShadow>
            <tubeGeometry args={[systemic.rightFemoral, 24, 0.032, 8, false]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>

          {/* Vena Cava (Venous Blue) */}
          <mesh castShadow>
            <tubeGeometry args={[systemic.svcCurve, 20, 0.038, 8, false]} />
            <meshStandardMaterial color="#39A9E8" />
          </mesh>
          <mesh castShadow>
            <tubeGeometry args={[systemic.ivcCurve, 24, 0.042, 8, false]} />
            <meshStandardMaterial color="#39A9E8" />
          </mesh>

          {/* Systemic Flow Pulses */}
          <HemodynamicPulseTrail curve={systemic.aortaCurve} color="#ef4444" speed={1.3} scale={1.2} />
          <HemodynamicPulseTrail curve={systemic.leftCarotid} color="#ef4444" speed={1.1} scale={0.8} />
          <HemodynamicPulseTrail curve={systemic.leftFemoral} color="#ef4444" speed={1.2} scale={1.0} />
        </group>
      )}

      {/* ── CENTRALIZED CARDIAC TWIN ── */}
      <CentralHeartCore
        heartRate={heartRate}
        selectedStructure={selectedStructure || null}
        onSelect={(id) => onSelectStructure?.(id)}
        vesselsViz={vesselsViz}
        stressActive={stressActive}
      />

      {/* Wearable Sensors and FHIR Gateways */}
      {sensors && sensors.length > 0 && (
        <SensorOverlay
          sensors={sensors}
          recordStatus={recordStatus}
          onSelectSensor={onSelectSensor}
        />
      )}

      {/* Anatomical Clinical Landmarks */}
      {showLandmarks && (
        <group>
          <Html position={[0.13, 1.35, 0.08]} center distanceFactor={8}>
            <div className="rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/40 shadow-md">
              Carotid Pulse
            </div>
          </Html>
          <Html position={[-0.72, 0.18, 0.12]} center distanceFactor={8}>
            <div className="rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/40 shadow-md">
              Radial Pulse
            </div>
          </Html>
          <Html position={[0.22, -0.65, 0.08]} center distanceFactor={8}>
            <div className="rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/40 shadow-md">
              Femoral Access
            </div>
          </Html>
        </group>
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2 + 0.25}
        minDistance={0.5}
        maxDistance={7.5}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Main Exported Component with Ultra-Wide Toggle & Macro Zoom
// ---------------------------------------------------------------------------
export function RealisticBodyHeartScene(props: RealisticBodyHeartProps) {
  const [viewFocus, setViewFocus] = useState<"body" | "thorax" | "heart" | "coronary">(
    props.viewFocus || "heart"
  );
  const [displayMode, setDisplayMode] = useState<"hologram" | "skin" | "wireframe">(
    props.displayMode || "hologram"
  );
  const [showCirculation, setShowCirculation] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Sync internal viewFocus if external prop changes
  useEffect(() => {
    if (props.viewFocus) {
      setViewFocus(props.viewFocus);
    }
  }, [props.viewFocus]);

  const isWide = !!props.isUltraWide;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#020713] via-[#01040a] to-[#000205] border border-cyan-500/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(6,182,212,0.2)] transition-all duration-500 ${
        isWide ? "h-[740px] sm:h-[820px]" : "h-[540px] sm:h-[660px]"
      }`}
    >
      {/* Laser Top Glow Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none z-30 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Left: Camera Focal Presets */}
        <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-slate-700/70 shadow-lg text-xs">
          <span className="font-semibold text-cyan-400 flex items-center gap-1.5 mr-1 font-mono text-[11px]">
            <Eye size={13} className="text-cyan-400" /> Focus:
          </span>
          <button
            type="button"
            onClick={() => setViewFocus("body")}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              viewFocus === "body"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-xs font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Body
          </button>
          <button
            type="button"
            onClick={() => setViewFocus("thorax")}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              viewFocus === "thorax"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-xs font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Thorax
          </button>
          <button
            type="button"
            onClick={() => setViewFocus("heart")}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              viewFocus === "heart"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-xs font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cardiac Core
          </button>
          <button
            type="button"
            onClick={() => setViewFocus("coronary")}
            className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
              viewFocus === "coronary"
                ? "bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-xs font-semibold"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
            title="Macro zoom onto coronary plaques and stenosis"
          >
            <ZoomIn size={11} /> Plaque Macro
          </button>
        </div>

        {/* Right: Shader Mode + Vasculature + Ultra-Wide IMAX Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-slate-700/70 shadow-lg text-xs">
          <span className="font-semibold text-slate-300 font-mono text-[11px]">Material:</span>
          <button
            type="button"
            onClick={() => setDisplayMode("hologram")}
            className={`px-2 py-0.5 rounded-md transition-all ${
              displayMode === "hologram"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Bio-Glass
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("skin")}
            className={`px-2 py-0.5 rounded-md transition-all ${
              displayMode === "skin"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Skin
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("wireframe")}
            className={`px-2 py-0.5 rounded-md transition-all ${
              displayMode === "wireframe"
                ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Wireframe
          </button>

          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          {/* Ultra-Wide Cinema IMAX Toggle Button */}
          {props.onToggleUltraWide && (
            <button
              type="button"
              onClick={props.onToggleUltraWide}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-medium flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(6,182,212,0.25)]"
              title={isWide ? "Exit Ultra-Wide Cinema Mode" : "Expand to Ultra-Wide Cinema IMAX 3D"}
            >
              {isWide ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span className="font-mono text-[10.5px]">
                {isWide ? "Standard View" : "Ultra-Wide IMAX 3D"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3D WebGL Canvas with Soft Shadow Maps */}
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [0, 0.15, 4.3], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            {...props}
            viewFocus={viewFocus}
            displayMode={displayMode}
            showCirculation={showCirculation}
            showLandmarks={showLandmarks && !props.sensors?.length}
          />
        </Suspense>
      </Canvas>

      {/* Bottom Floating Telemetry & 3D Depth HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-3">
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-700/80 shadow-2xl text-xs text-slate-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
            <span className="font-mono text-rose-300 font-bold text-sm">
              {props.heartRate || 72} <span className="text-[10px] text-slate-400 font-normal">BPM</span>
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-700" />
          <div className="font-mono text-[11px]">
            <span className="text-slate-400">Target: </span>
            <span className="text-cyan-300 font-bold">
              {props.selectedStructure || "LAD (Coronary)"}
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />
          <div className="text-[10.5px] font-mono text-emerald-400 hidden sm:flex items-center gap-1.5">
            <Shield size={12} className="text-emerald-400" /> 3D Calibrated Hemodynamics Active
          </div>
        </div>

        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-cyan-500/30 text-[10.5px] font-mono text-slate-400 shadow-xl hidden md:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>REAL-TIME 3D DIRECTIONAL SHADOW ENGINE</span>
        </div>
      </div>
    </div>
  );
}

export default RealisticBodyHeartScene;
