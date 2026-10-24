/**
 * Synchronized Multi-Sign Cardiovascular & Pulse Wave Signal Processor.
 * Interconnects peripheral pulse propagation with cardiac electrophysiology,
 * arterial hemodynamics, and capnography in a unified temporal matrix.
 */

import type { MultisignTelemetry } from '../types';

export interface MultisignSamplePoint {
  timeMs: number;
  ecgLeadII: number;       // mV (-0.5 to 1.8)
  abpMmHg: number;         // mmHg (40 to 180)
  ppgPeripheral: number;   // normalized (0 to 1.0)
  capnogramEtCO2: number;  // mmHg (0 to 45)
  centralAorticWave: number; // normalized
}

export interface MultisignGeneratorOptions {
  heartRate: number;              // bpm (40 to 180)
  meanArterialPressure: number;   // mmHg (50 to 140)
  ischemiaSeverityPct: number;    // 0 to 100%
  rhythm: MultisignTelemetry['rhythmStatus'];
}

export class MultisignSignalProcessor {
  private lastRPeakTimeMs = 0;
  private pttMs = 210.0; // Baseline Pulse Transit Time

  /**
   * Generates a single synchronous sample across all 5 interconnected channels.
   * t: current simulation time in seconds.
   */
  public sampleAt(t: number, options: MultisignGeneratorOptions): MultisignSamplePoint {
    const { heartRate, meanArterialPressure, ischemiaSeverityPct, rhythm } = options;
    const periodSec = 60.0 / Math.max(30, heartRate);
    const phase = (t % periodSec) / periodSec; // 0 to 1 within current cardiac cycle

    // Ischemia-driven ST elevation (0 to 4.5 mm / 0.45 mV)
    const stElevationMv = (ischemiaSeverityPct / 100) * 0.45;

    // Ischemia prolongs Pulse Transit Time (LV dP/dt reduction slows aortic ejection)
    const currentPttMs = 200.0 + (ischemiaSeverityPct / 100) * 80.0;
    this.pttMs = currentPttMs;

    // 1. Lead II ECG Waveform
    let ecg = 0;
    if (rhythm === 'VFIB') {
      // Coarse chaotic ventricular fibrillation
      ecg = Math.sin(t * 18.0) * 0.4 + Math.sin(t * 31.0) * 0.35 + (Math.random() - 0.5) * 0.15;
    } else if (rhythm === 'ASYSTOLE') {
      ecg = (Math.random() - 0.5) * 0.04;
    } else {
      // P-wave (atrial depolarization)
      if (phase >= 0.08 && phase <= 0.16) {
        ecg += 0.18 * Math.sin(((phase - 0.08) / 0.08) * Math.PI);
      }
      // QRS Complex (ventricular depolarization)
      if (phase >= 0.20 && phase <= 0.28) {
        const qrsPhase = (phase - 0.20) / 0.08;
        if (qrsPhase < 0.25) {
          ecg -= 0.25 * Math.sin((qrsPhase / 0.25) * Math.PI); // Q-wave
        } else if (qrsPhase < 0.75) {
          ecg += 1.65 * Math.sin(((qrsPhase - 0.25) / 0.50) * Math.PI); // R-wave
        } else {
          ecg -= 0.35 * Math.sin(((qrsPhase - 0.75) / 0.25) * Math.PI); // S-wave
        }
      }
      // ST-Segment with Ischemic Elevation / Depression
      if (phase >= 0.28 && phase <= 0.44) {
        ecg += stElevationMv;
      }
      // T-wave (ventricular repolarization)
      if (phase >= 0.44 && phase <= 0.62) {
        const tWaveAmp = 0.35 + (ischemiaSeverityPct > 60 ? -0.25 : 0.05); // T-wave inversion in high ischemia
        ecg += tWaveAmp * Math.sin(((phase - 0.44) / 0.18) * Math.PI);
      }
    }

    // 2. Arterial Blood Pressure (ABP) Waveform
    // Anacrotic upstroke occurs at phase 0.25 (aortic valve opening)
    let abp = 0;
    const pulsePressure = Math.max(15, 45 - (ischemiaSeverityPct / 100) * 20); // Narrowed pulse pressure in ischemia
    const diastolic = Math.max(40, meanArterialPressure - pulsePressure * 0.4);
    const systolic = diastolic + pulsePressure;

    if (rhythm === 'VFIB' || rhythm === 'ASYSTOLE') {
      abp = 15.0 + Math.sin(t * 1.5) * 3.0; // Loss of pulsatile arterial pressure
    } else {
      if (phase < 0.25) {
        // Late diastole exponential decay
        abp = diastolic + 8.0 * Math.exp(-(phase + 1 - 0.6) * 3);
      } else if (phase >= 0.25 && phase < 0.42) {
        // Systolic anacrotic limb to peak
        const sPhase = (phase - 0.25) / 0.17;
        abp = diastolic + pulsePressure * Math.sin(sPhase * (Math.PI / 2));
      } else if (phase >= 0.42 && phase < 0.54) {
        // Incisura / Dicrotic notch at aortic valve closure
        const dPhase = (phase - 0.42) / 0.12;
        // Ischemia blunts dicrotic notch
        const dicroticProminence = Math.max(0.1, 1.0 - (ischemiaSeverityPct / 100) * 0.8);
        abp = systolic - pulsePressure * 0.35 * dPhase + (Math.sin(dPhase * Math.PI) * 4.0 * dicroticProminence);
      } else {
        // Diastolic runoff
        const rPhase = (phase - 0.54) / 0.46;
        abp = diastolic + pulsePressure * 0.45 * Math.exp(-rPhase * 2.2);
      }
    }

    // 3. Photoplethysmogram (PPG Peripheral Pulse)
    // Delayed by PTT relative to ECG R-peak
    const pttFraction = (this.pttMs / 1000) / periodSec;
    const ppgPhase = ((phase - pttFraction) + 1.0) % 1.0;
    let ppg = 0;
    if (rhythm === 'VFIB' || rhythm === 'ASYSTOLE') {
      ppg = 0.05 + (Math.random() - 0.5) * 0.02;
    } else {
      if (ppgPhase >= 0.20 && ppgPhase < 0.55) {
        const up = (ppgPhase - 0.20) / 0.35;
        ppg = Math.sin(up * Math.PI);
        // Secondary reflection peak (dicrotic wave in PPG)
        if (up > 0.5) {
          ppg += Math.sin((up - 0.5) * 2 * Math.PI) * 0.2 * (1.0 - ischemiaSeverityPct / 120);
        }
      } else {
        ppg = 0.08 * Math.exp(-ppgPhase * 1.5);
      }
    }
    ppg = Math.max(0, Math.min(1.0, ppg));

    // 4. Capnogram (EtCO2 - End Tidal CO2)
    // Synchronized with respiratory cycle (~14 breaths / min -> 4.28 sec cycle)
    const respPeriod = 4.28;
    const respPhase = (t % respPeriod) / respPeriod;
    let etCO2 = 0;
    // Perfusion-dependent EtCO2: Drops drastically in cardiac arrest or low cardiac output shock
    const targetEtCO2 = rhythm === 'VFIB' || rhythm === 'ASYSTOLE'
      ? 8.0 // Low EtCO2 in arrest without CPR
      : Math.max(18, 38.0 - (ischemiaSeverityPct / 100) * 12.0);

    if (respPhase < 0.25) {
      // Expiratory upstroke (Phase II)
      etCO2 = targetEtCO2 * Math.pow(respPhase / 0.25, 1.8);
    } else if (respPhase < 0.58) {
      // Alveolar plateau (Phase III)
      etCO2 = targetEtCO2 * (0.92 + ((respPhase - 0.25) / 0.33) * 0.08);
    } else if (respPhase < 0.65) {
      // Inspiratory rapid downstroke (Phase IV)
      etCO2 = targetEtCO2 * (1.0 - (respPhase - 0.58) / 0.07);
    } else {
      // Baseline inspiration (Phase I)
      etCO2 = 0.5;
    }

    // 5. Central Aortic Pulse Wave (directly at aortic root)
    const centralAorticWave = Math.max(0, (abp - diastolic) / Math.max(1, pulsePressure));

    return {
      timeMs: Math.round(t * 1000),
      ecgLeadII: Number(ecg.toFixed(3)),
      abpMmHg: Number(abp.toFixed(1)),
      ppgPeripheral: Number(ppg.toFixed(3)),
      capnogramEtCO2: Number(etCO2.toFixed(1)),
      centralAorticWave: Number(centralAorticWave.toFixed(3)),
    };
  }

  public getPulseTransitTime(): number {
    return this.pttMs;
  }

  public getPulseWaveVelocity(): number {
    // PWV = distance (0.8m aorta to radial) / PTT (s)
    const distanceMeters = 0.85;
    return Number((distanceMeters / (this.pttMs / 1000)).toFixed(1));
  }
}

export const multisignProcessor = new MultisignSignalProcessor();
