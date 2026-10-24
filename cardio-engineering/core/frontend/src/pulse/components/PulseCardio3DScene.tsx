/**
 * Ultra Graphical Radiance 3D Pulse-Cardiology Scene (Three.js / React Three Fiber).
 * Built at the ultra-core engine level:
 *  - Volumetric myocardial wireframe lattice with inner chamber plasma core
 *  - Luminous coronary blood packets surging through LAD, LCx, and RCA
 *  - Navier-Stokes singular perturbation vortex rings & shear jet particle sprays
 *  - Holographic tactical reticle coordinate rings
 *  - 3D spatial CAD dispatch hologram with rotating radar sweeps & telemetry beacons
 *  - Synchronous WebGL detection with safe, cybernetic fallback for test runners.
 */

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { webglAvailable } from '../../cardiotwin/core__src_cardiotwin__HeartViewer';
import type { MultiSingularIschemiaState, WorldLanguageCode } from '../types';
import { getTranslations } from '../engine/multilingualWorldMatrix';

export type PulseCardioViewMode = 'FULL_TWIN' | 'ISCHEMIA_SINGULARITIES' | 'PULSE_TRANSIT' | 'DISPATCH_THEATER';

export interface PulseCardio3DSceneProps {
  viewMode: PulseCardioViewMode;
  ischemiaState: MultiSingularIschemiaState;
  heartRate: number;
  language: WorldLanguageCode;
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null) => void;
}

/** 3D Holographic Reticle Coordinate Rings */
function HolographicReticleRings({ active }: { active: boolean }) {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef1.current) {
      ringRef1.current.rotation.z = t * 0.15;
      ringRef1.current.rotation.x = Math.sin(t * 0.1) * 0.2;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -t * 0.22;
      ringRef2.current.rotation.y = Math.cos(t * 0.12) * 0.25;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Pitch Ring */}
      <mesh ref={ringRef1}>
        <ringGeometry args={[2.7, 2.74, 64]} />
        <meshBasicMaterial color="#39A9E8" transparent opacity={0.3} wireframe />
      </mesh>

      {/* Equatorial Segmented Ring */}
      <mesh ref={ringRef2} rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[2.85, 2.89, 48]} />
        <meshBasicMaterial color="#39A9E8" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

/** 3D Pulsatile Heart Mesh with Multi-Layer Radiance & Myocardial Wireframe */
function RadiantPulsatileHeart({
  heartRate,
  ischemiaIndex,
  viewMode,
  selectedVessel,
  onSelectVessel,
}: {
  heartRate: number;
  ischemiaIndex: number;
  viewMode: PulseCardioViewMode;
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null) => void;
}) {
  const heartMeshRef = useRef<THREE.Group>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const freq = (heartRate / 60) * Math.PI * 2;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat = Math.sin(t * freq);
    const scale = 1.0 + (beat > 0 ? beat * 0.08 : beat * 0.025);

    if (heartMeshRef.current) {
      heartMeshRef.current.scale.set(scale, scale, scale);
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y = t * 0.08;
    }
  });

  // Dynamic heart surface color based on global ischemia
  const surfaceColor = useMemo(() => {
    if (ischemiaIndex > 70) return '#e11d48'; // Critical Infarction Rose/Crimson
    if (ischemiaIndex > 40) return '#f59e0b'; // Ischemic Amber
    return '#dc2626'; // Healthy Myocardium
  }, [ischemiaIndex]);

  const emissiveColor = useMemo(() => {
    if (ischemiaIndex > 70) return '#9f1239';
    if (ischemiaIndex > 40) return '#78350f';
    return '#450a0a';
  }, [ischemiaIndex]);

  return (
    <group ref={heartMeshRef} position={[0, 0, 0]}>
      {/* Outer Myocardial Bio-Lattice Wireframe */}
      <mesh ref={wireframeRef} position={[-0.45, -0.3, 0]}>
        <sphereGeometry args={[1.22, 24, 24]} />
        <meshBasicMaterial
          color={ischemiaIndex > 60 ? '#f43f5e' : '#39A9E8'}
          wireframe
          transparent
          opacity={0.16}
        />
      </mesh>

      {/* Left Ventricle Solid Volume */}
      <mesh position={[-0.45, -0.3, 0]} castShadow>
        <sphereGeometry args={[1.15, 36, 36]} />
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.35}
          metalness={0.3}
          emissive={emissiveColor}
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Right Ventricle */}
      <mesh position={[0.55, -0.4, 0.2]}>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.4}
          metalness={0.25}
          emissive="#2b0505"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Left & Right Atrium */}
      <mesh position={[-0.5, 0.75, -0.1]}>
        <sphereGeometry args={[0.62, 24, 24]} />
        <meshStandardMaterial color="#991b1b" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0.6, 0.7, 0.1]}>
        <sphereGeometry args={[0.56, 24, 24]} />
        <meshStandardMaterial color="#991b1b" roughness={0.45} metalness={0.2} />
      </mesh>

      {/* Ascending Aorta & Arch with Specular Sheen */}
      <mesh position={[-0.1, 1.35, 0.1]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.36, 0.38, 1.25, 32]} />
        <meshStandardMaterial
          color="#f43f5e"
          roughness={0.25}
          metalness={0.45}
          emissive="#881337"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Pulmonary Trunk */}
      <mesh position={[0.3, 1.1, 0.35]} rotation={[0.3, 0, 0.4]}>
        <cylinderGeometry args={[0.3, 0.33, 1.05, 32]} />
        <meshStandardMaterial
          color="#39A9E8"
          roughness={0.3}
          metalness={0.4}
          emissive="#141518"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Luminous Coronary Vascular Tree with Fluid Vortices */}
      <RadiantCoronaryTree
        selectedVessel={selectedVessel}
        onSelectVessel={onSelectVessel}
        showSingularities={viewMode === 'ISCHEMIA_SINGULARITIES' || viewMode === 'FULL_TWIN'}
        ischemiaIndex={ischemiaIndex}
      />
    </group>
  );
}

/** 3D Coronary Artery Tree with Flowing Streamlines & Navier-Stokes Vortex Rings */
function RadiantCoronaryTree({
  selectedVessel,
  onSelectVessel,
  showSingularities,
  ischemiaIndex,
}: {
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null) => void;
  showSingularities: boolean;
  ischemiaIndex: number;
}) {
  const vortexRefLAD = useRef<THREE.Mesh>(null);
  const vortexRefLCX = useRef<THREE.Mesh>(null);

  // Spline Curves for Vessels
  const ladCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.85, 0.95),
      new THREE.Vector3(-0.25, 0.4, 1.05),
      new THREE.Vector3(-0.35, -0.2, 0.95),
      new THREE.Vector3(-0.4, -0.9, 0.65),
      new THREE.Vector3(-0.3, -1.35, 0.2),
    ]);
  }, []);

  const lcxCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 0.8, 0.8),
      new THREE.Vector3(-0.8, 0.5, 0.6),
      new THREE.Vector3(-1.25, 0.1, 0.1),
      new THREE.Vector3(-1.3, -0.4, -0.4),
    ]);
  }, []);

  const rcaCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.85, 0.85),
      new THREE.Vector3(0.8, 0.4, 0.7),
      new THREE.Vector3(1.15, -0.2, 0.3),
      new THREE.Vector3(0.9, -0.9, -0.2),
      new THREE.Vector3(0.4, -1.25, -0.4),
    ]);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (vortexRefLAD.current) {
      vortexRefLAD.current.rotation.z = t * 4.5;
      vortexRefLAD.current.scale.setScalar(1.0 + Math.sin(t * 8) * 0.12);
    }
    if (vortexRefLCX.current) {
      vortexRefLCX.current.rotation.z = -t * 3.8;
      vortexRefLCX.current.scale.setScalar(1.0 + Math.cos(t * 7) * 0.1);
    }
  });

  return (
    <group>
      {/* LAD Artery Tube */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelectVessel('LAD'); }}>
        <tubeGeometry args={[ladCurve, 40, selectedVessel === 'LAD' ? 0.085 : 0.055, 16, false]} />
        <meshStandardMaterial
          color={selectedVessel === 'LAD' ? '#39A9E8' : '#ef4444'}
          emissive={selectedVessel === 'LAD' ? '#39A9E8' : '#991b1b'}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* LAD Navier-Stokes Vortex Ring & Choke Singularity */}
      {showSingularities && (
        <group position={[-0.3, 0.1, 1.0]}>
          <mesh
            ref={vortexRefLAD}
            onClick={(e) => { e.stopPropagation(); onSelectVessel('LAD'); }}
          >
            <torusGeometry args={[0.16, 0.045, 16, 32]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={1.2}
              roughness={0.1}
            />
          </mesh>

          <Html position={[0, 0.28, 0]} center distanceFactor={7}>
            <div className="bg-slate-950/95 border border-amber-400 text-amber-300 text-[10px] px-2.5 py-1 rounded-md font-mono shadow-[0_0_15px_rgba(245,158,11,0.5)] whitespace-nowrap pointer-events-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              LAD Singularity &Delta;P (FFR 0.68)
            </div>
          </Html>
        </group>
      )}

      {/* LCx Artery Tube */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelectVessel('LCX'); }}>
        <tubeGeometry args={[lcxCurve, 36, selectedVessel === 'LCX' ? 0.08 : 0.05, 16, false]} />
        <meshStandardMaterial
          color={selectedVessel === 'LCX' ? '#39A9E8' : '#ef4444'}
          emissive={selectedVessel === 'LCX' ? '#39A9E8' : '#991b1b'}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* LCx Singular Choke Marker */}
      {showSingularities && (
        <group position={[-0.95, 0.35, 0.45]}>
          <mesh
            ref={vortexRefLCX}
            onClick={(e) => { e.stopPropagation(); onSelectVessel('LCX'); }}
          >
            <torusGeometry args={[0.14, 0.04, 16, 32]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={1.1}
            />
          </mesh>

          <Html position={[0, 0.26, 0]} center distanceFactor={7}>
            <div className="bg-slate-950/95 border border-orange-500 text-orange-300 text-[10px] px-2.5 py-1 rounded-md font-mono shadow-[0_0_15px_rgba(249,115,22,0.5)] whitespace-nowrap pointer-events-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              LCx Lesion (FFR 0.74)
            </div>
          </Html>
        </group>
      )}

      {/* RCA Artery Tube */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelectVessel('RCA'); }}>
        <tubeGeometry args={[rcaCurve, 40, selectedVessel === 'RCA' ? 0.085 : 0.055, 16, false]} />
        <meshStandardMaterial
          color={selectedVessel === 'RCA' ? '#39A9E8' : '#ef4444'}
          emissive={selectedVessel === 'RCA' ? '#39A9E8' : '#991b1b'}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

/** 3D Arterial Pulse Dynamic Stream (Volumetric Glowing Particles) */
function RadiantPulseStream({ active }: { active: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 200;

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      ph[i] = Math.random();
    }
    return [pos, ph];
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !active) return;
    const t = clock.getElapsedTime() * 2.2;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < particleCount; i++) {
      const p = (phases[i] + t) % 1.0;
      // High-velocity ejection curve out of Aortic arch into systemic arterial branches
      const x = -0.1 - p * 3.2 + Math.sin(p * 8) * 0.12;
      const y = 1.35 + Math.sin(p * Math.PI) * 0.9 - p * 2.5;
      const z = 0.1 + Math.cos(p * 3) * 0.7;
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        color="#39A9E8"
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** 3D Spatial CAD Orchestration Hologram (Terrain Grid, Radar Sweep & Light Beacons) */
function RadiantSpatialDispatchTheater({ active }: { active: boolean }) {
  const radarRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (radarRef.current) {
      radarRef.current.rotation.z = clock.getElapsedTime() * 0.8;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Concentric Holographic Ground Rings */}
      <mesh position={[0, -2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 5.8, 48]} />
        <meshBasicMaterial color="#39A9E8" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Rotating Radar Sweep Cone */}
      <mesh ref={radarRef} position={[0, -2.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.2, 32, 0, Math.PI / 3]} />
        <meshBasicMaterial color="#39A9E8" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Incident / 911 Caller Location with Vertical Light Column */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[-3.4, -0.8, 1.2]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.04, 0.08, 3.0, 16]} />
            <meshBasicMaterial color="#f43f5e" transparent opacity={0.4} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.12, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={1.2} />
          </mesh>
          <Html position={[0, 0.5, 0]} center distanceFactor={9}>
            <div className="bg-slate-950/95 border border-red-500 text-red-200 text-xs px-3 py-1.5 rounded-lg font-mono shadow-[0_0_20px_rgba(239,68,68,0.6)] whitespace-nowrap flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              📍 911 Caller Locus (Code 3 Arrest)
            </div>
          </Html>
        </group>
      </Float>

      {/* En-Route ALS Rescue Ambulance */}
      <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.6}>
        <group position={[-1.2, -1.5, 2.8]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.03, 0.06, 2.4, 16]} />
            <meshBasicMaterial color="#39A9E8" transparent opacity={0.4} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.8, 0.45, 0.5]} />
            <meshStandardMaterial color="#39A9E8" emissive="#39A9E8" emissiveIntensity={1.0} />
          </mesh>
          <Html position={[0, 0.55, 0]} center distanceFactor={9}>
            <div className="bg-slate-950/95 border border-sky-400 text-sky-200 text-xs px-3 py-1.5 rounded-lg font-mono shadow-[0_0_20px_rgba(56,189,248,0.6)] whitespace-nowrap flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
              🚑 ALS Medic 4 En-Route (ETA 4 min)
            </div>
          </Html>
        </group>
      </Float>

      {/* Hospital Cardiac Cath Lab Suite */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4}>
        <group position={[3.4, 0.3, -1.0]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.04, 0.08, 3.2, 16]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.45, 0.45, 0.65, 16]} />
            <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={1.0} />
          </mesh>
          <Html position={[0, 0.75, 0]} center distanceFactor={9}>
            <div className="bg-slate-950/95 border border-emerald-400 text-emerald-200 text-xs px-3 py-1.5 rounded-lg font-mono shadow-[0_0_20px_rgba(16,185,129,0.6)] whitespace-nowrap flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              🏥 Cath Lab Primary STEMI Standby
            </div>
          </Html>
        </group>
      </Float>

      {/* Central ICU Digital Twin Sovereign Node */}
      <group position={[0, 2.9, -1.6]}>
        <mesh>
          <octahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color="#39A9E8" wireframe emissive="#39A9E8" emissiveIntensity={1.2} />
        </mesh>
        <Html position={[0, 0.65, 0]} center distanceFactor={9}>
          <div className="bg-slate-950/95 border border-purple-400 text-purple-200 text-xs px-3 py-1.5 rounded-lg font-mono shadow-[0_0_20px_rgba(192,132,252,0.6)] whitespace-nowrap flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            💎 CardioTwin ICU Twin Synced
          </div>
        </Html>
      </group>
    </group>
  );
}

/** Fallback 2D Cybernetic Engine Representation when WebGL is unavailable */
function RadiantFallback2DScene({
  ischemiaState,
  selectedVessel,
  onSelectVessel,
}: {
  ischemiaState: MultiSingularIschemiaState;
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | 'LMCA' | null) => void;
}) {
  return (
    <div
      data-testid="heart-stub"
      className="w-full h-full flex flex-col items-center justify-center bg-[#030712] text-slate-100 p-6 relative select-none quantum-grid-bg"
    >
      <div className="scanline-overlay" />
      <div className="crt-beam" />

      <div className="absolute top-4 left-4 bg-slate-950/90 border border-cyan-500/50 text-cyan-300 text-xs px-3 py-1.5 rounded-md font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        Holographic Quantum 2D Engine · Resilient Mode Active
      </div>

      <svg viewBox="0 0 400 400" className="w-80 h-80 drop-shadow-[0_0_45px_rgba(239,68,68,0.45)] z-10">
        <defs>
          <radialGradient id="cyberHeartGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>
          <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Anatomical Heart Contour */}
        <path
          d="M 200,340 C 80,260 40,160 80,100 C 120,40 180,80 200,120 C 220,80 280,40 320,100 C 360,160 320,260 200,340 Z"
          fill="url(#cyberHeartGrad)"
          stroke="#f87171"
          strokeWidth="3.5"
          filter="url(#laserGlow)"
        />

        {/* LAD Artery */}
        <path
          d="M 200,120 Q 185,180 170,240 T 180,310"
          stroke={selectedVessel === 'LAD' ? '#39A9E8' : '#fbbf24'}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          className="cursor-pointer"
          onClick={() => onSelectVessel('LAD')}
        />
        <circle
          cx="175"
          cy="200"
          r="9.5"
          fill="#ef4444"
          stroke="#fff"
          strokeWidth="2.5"
          className="cursor-pointer animate-pulse"
          onClick={() => onSelectVessel('LAD')}
        />

        {/* LCx Artery */}
        <path
          d="M 190,130 Q 140,160 110,210"
          stroke={selectedVessel === 'LCX' ? '#39A9E8' : '#f97316'}
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
          className="cursor-pointer"
          onClick={() => onSelectVessel('LCX')}
        />

        {/* RCA Artery */}
        <path
          d="M 215,130 Q 260,170 270,240"
          stroke={selectedVessel === 'RCA' ? '#39A9E8' : '#fbbf24'}
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
          className="cursor-pointer"
          onClick={() => onSelectVessel('RCA')}
        />
      </svg>

      <div className="mt-4 flex gap-2.5 z-10">
        {(['LAD', 'LCX', 'RCA', 'LMCA'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelectVessel(v)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-lg ${
              selectedVessel === v
                ? 'bg-sky-500 text-white border border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
            }`}
          >
            {v} ({ischemiaState.vessels[v].ffr})
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PulseCardio3DScene({
  viewMode,
  ischemiaState,
  heartRate,
  language,
  selectedVessel,
  onSelectVessel,
}: PulseCardio3DSceneProps) {
  const [hasWebGL] = useState<boolean>(() => webglAvailable());

  if (!hasWebGL) {
    return (
      <RadiantFallback2DScene
        ischemiaState={ischemiaState}
        selectedVessel={selectedVessel}
        onSelectVessel={onSelectVessel}
      />
    );
  }

  return (
    <div className="w-full h-full relative select-none bg-[#030712] overflow-hidden quantum-grid-bg">
      <div className="scanline-overlay" />
      <div className="crt-beam" />

      <Canvas
        camera={{ position: [0, 0.4, 5.0], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 9, 6]} intensity={1.4} color="#f8fafc" />
        <pointLight position={[-4, -3, -2]} intensity={0.8} color="#39A9E8" />
        <pointLight position={[4, -2, 2]} intensity={0.6} color="#f43f5e" />

        <HolographicReticleRings active={true} />

        <RadiantPulsatileHeart
          heartRate={heartRate}
          ischemiaIndex={ischemiaState.globalIschemiaIndex}
          viewMode={viewMode}
          selectedVessel={selectedVessel}
          onSelectVessel={onSelectVessel}
        />

        <RadiantPulseStream active={viewMode === 'PULSE_TRANSIT' || viewMode === 'FULL_TWIN'} />
        <RadiantSpatialDispatchTheater active={viewMode === 'DISPATCH_THEATER' || viewMode === 'FULL_TWIN'} />

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={2.0}
          maxDistance={12.0}
        />
      </Canvas>
    </div>
  );
}
