/**
 * Comprehensive Unit Tests for CARDIO-INTELLIGENCE Pulse-Cardiology Subsystem.
 * Tests:
 *  - Discrete matched vs abstain triage safety
 *  - Sub-10ms Moss in-process retrieval latency
 *  - Navier-Stokes multi-singular ischemia mathematics ('multi singular:isma')
 *  - Synchronized multisign signal generator & PTT coupling
 *  - 32-world-languages matrix resolution
 *  - Studio UI rendering with resilient WebGL fallback
 */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { resolveTriageOutcome } from '../src/pulse/engine/retrievalCore';
import { evaluateMultiSingularIschemia, calculateStenosisHemodynamics } from '../src/pulse/engine/multiSingularIschemiaEngine';
import { multisignProcessor } from '../src/pulse/engine/multisignSignalProcessor';
import { WORLD_LANGUAGES, getTranslations } from '../src/pulse/engine/multilingualWorldMatrix';
import { EMERGENCY_PROTOCOLS, getProtocolById } from '../src/pulse/engine/emergencyProtocols';
import UnifiedPulseCardioStudio from '../src/pulse/UnifiedPulseCardioStudio';

describe('Pulse-Cardiology In-Process Retrieval & Triage Safety', () => {
  it('correctly matches Adult Out-of-Hospital Cardiac Arrest with low latency', () => {
    const outcome = resolveTriageOutcome('patient collapsed not breathing need cpr defibrillator');
    expect(outcome.status).toBe('matched');
    if (outcome.status === 'matched') {
      expect(outcome.protocol.id).toBe('CARD-01');
      expect(outcome.protocol.triageLevel).toContain('ESI-1');
      expect(outcome.confidence).toBeGreaterThanOrEqual(0.45);
      expect(outcome.latencyMs).toBeLessThan(10.0);
    }
  });

  it('correctly matches Acute Coronary Syndrome / STEMI cascade with lethal contraindication locks', () => {
    const outcome = resolveTriageOutcome('crushing chest pain radiating to left arm sweating profusely angina stemi');
    expect(outcome.status).toBe('matched');
    if (outcome.status === 'matched') {
      expect(outcome.protocol.id).toBe('ACS-14');
      expect(outcome.protocol.category).toBe('cardiac');
      expect(outcome.protocol.lethalContraindicationLocks?.length).toBeGreaterThan(0);
      expect(outcome.protocol.hemodynamicProfile?.stemiRisk).toBe(true);
    }
  });

  it('strictly abstains when presentation is ambiguous or signal is insufficient (Safety Gate)', () => {
    const outcome = resolveTriageOutcome('feeling weird maybe a headache or something');
    expect(outcome.status).toBe('abstain');
    if (outcome.status === 'abstain') {
      expect(outcome.suggestedQuestions.length).toBeGreaterThan(0);
      expect(outcome.latencyMs).toBeLessThan(10.0);
    }
  });
});

describe('Multi-Singular Ischemia Engine (multi singular:isma)', () => {
  it('solves Navier-Stokes singular perturbation fluid mechanics across stenoses', () => {
    // 75% stenosis in 3.6mm LAD with 16mm lesion
    const ladHemodynamics = calculateStenosisHemodynamics('LAD', 'Left Anterior Descending', 3.6, 75, 16.0, 'Anterior Wall');
    expect(ladHemodynamics.lumenDiameterMm).toBeCloseTo(0.9, 1);
    expect(ladHemodynamics.deltaP_mmHg).toBeGreaterThan(15.0);
    expect(ladHemodynamics.ffr).toBeLessThanOrEqual(0.75); // Ischemic FFR threshold
    expect(ladHemodynamics.ischemicRiskTier).toBe('Critical Singular Ischemia');
    expect(ladHemodynamics.wallShearStressPa).toBeGreaterThan(2.5); // Elevated shear jet
  });

  it('advances through the 6-stage ischemic cascade and generates cryptographic Merkle proofs', () => {
    const state = evaluateMultiSingularIschemia({
      LAD: 80,
      LCX: 70,
      RCA: 50,
      LMCA: 40,
    });

    expect(state.globalIschemiaIndex).toBeGreaterThan(50);
    expect(state.activeCascadeStage).toBe('STAGE_6_PULSE_TRANSIT_COLLAPSE');
    expect(state.therapeuticProofs.length).toBe(4);

    const pciProof = state.therapeuticProofs.find((p) => p.interventionId === 'PCI_STENT');
    expect(pciProof).toBeDefined();
    expect(pciProof?.postInterventionFfr).toBeGreaterThanOrEqual(0.90);
    expect(pciProof?.deltaP_reductionPct).toBeGreaterThan(80.0);
    expect(pciProof?.verificationStatus).toBe('CRYPTOGRAPHICALLY_VERIFIED');
    expect(pciProof?.merkleProofHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('Synchronized Multisign Signal Processing', () => {
  it('generates coherent, coupled samples across all 5 channels', () => {
    const sample = multisignProcessor.sampleAt(1.25, {
      heartRate: 75,
      meanArterialPressure: 95,
      ischemiaSeverityPct: 20,
      rhythm: 'NSR',
    });

    expect(sample.ecgLeadII).toBeDefined();
    expect(sample.abpMmHg).toBeGreaterThan(40);
    expect(sample.abpMmHg).toBeLessThan(180);
    expect(sample.ppgPeripheral).toBeGreaterThanOrEqual(0);
    expect(sample.ppgPeripheral).toBeLessThanOrEqual(1.0);
    expect(sample.capnogramEtCO2).toBeGreaterThanOrEqual(0);
    expect(sample.centralAorticWave).toBeDefined();
  });

  it('prolongs Pulse Transit Time (PTT) as ischemia worsens', () => {
    // Normal myocardium sample
    multisignProcessor.sampleAt(0.5, {
      heartRate: 75,
      meanArterialPressure: 95,
      ischemiaSeverityPct: 0,
      rhythm: 'NSR',
    });
    const normalPtt = multisignProcessor.getPulseTransitTime();

    // Critical ischemia sample
    multisignProcessor.sampleAt(0.5, {
      heartRate: 75,
      meanArterialPressure: 95,
      ischemiaSeverityPct: 90,
      rhythm: 'STEMI',
    });
    const ischemicPtt = multisignProcessor.getPulseTransitTime();

    expect(ischemicPtt).toBeGreaterThan(normalPtt);
  });
});

describe('32 World Languages Matrix', () => {
  it('provides complete multilingual dictionaries across global language families', () => {
    expect(WORLD_LANGUAGES.length).toBeGreaterThanOrEqual(32);

    const testLangs = ['en', 'es', 'zh', 'hi', 'ar', 'fr', 'de', 'ja'] as const;
    for (const lang of testLangs) {
      const dict = getTranslations(lang);
      expect(dict.appTitle).toBeTruthy();
      expect(dict.singularWorkflow).toBeTruthy();
      expect(dict.multiSingularIschemia).toBeTruthy();
      expect(dict.proofVerified).toBeTruthy();
      expect(dict.cprCadence).toBeTruthy();
    }
  });
});

describe('UnifiedPulseCardioStudio UI Component', () => {
  it('renders without errors, showing 3D WebGL safe fallback and telemetry', () => {
    render(
      <MemoryRouter>
        <UnifiedPulseCardioStudio />
      </MemoryRouter>
    );

    // Header and title exist
    expect(screen.getByText(/CARDIO-INTELLIGENCE × Pulse-911/i)).toBeTruthy();

    // In jsdom without WebGL, the safe fallback renders cleanly with data-testid="heart-stub"
    expect(screen.getByTestId('heart-stub')).toBeTruthy();

    // Multisign telemetry elements render
    expect(screen.getByText(/Multisign Cardiology Telemetry/i)).toBeTruthy();
    expect(screen.getByText(/SYNCHRONIZED \(5-CH\)/i)).toBeTruthy();

    // Multi-singular ischemia panel renders
    expect(screen.getByText(/Multi-Singular Ischemia Engine/i)).toBeTruthy();
    expect(screen.getByText(/multi singular:isma/i)).toBeTruthy();
  });
});
