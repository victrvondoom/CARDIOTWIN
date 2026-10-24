/**
 * Web Audio Paper Sound Generator
 * Generates an organic, natural page-turning friction & rustle sound
 * with zero external audio assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isPaperSoundEnabled(): boolean {
  try {
    return localStorage.getItem("cardiotwin-paper-sound") !== "muted";
  } catch {
    return true;
  }
}

export function setPaperSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("cardiotwin-paper-sound", enabled ? "enabled" : "muted");
  } catch {}
}

/**
 * Synthesizes a realistic physical paper leaf turn.
 * Dual acoustic component:
 * 1. Bandpass-filtered shaped white/pink noise (page friction against book folio)
 * 2. Subtle damped low-frequency thud (paper landing on stack)
 */
export function playPaperTurnSound(): void {
  if (!isPaperSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.32;

  // 1. Friction Noise (paper sliding and curling)
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  // Generate pinkish-brown friction noise
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + white * 0.05;
    b1 = 0.96 * b1 + white * 0.11;
    b2 = 0.86 * b2 + white * 0.25;
    output[i] = (b0 + b1 + b2) * 0.35;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  // Dynamic bandpass filter sweep: mimics paper sliding from edge to spine
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(320, now + duration);
  filter.Q.setValueAtTime(2.2, now);

  // Volume envelope for the rustle
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.04);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseNode.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseNode.start(now);
  noiseNode.stop(now + duration);

  // 2. Soft Page Landing Thud
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(65, now + 0.16);
  osc.frequency.exponentialRampToValueAtTime(32, now + duration);

  oscGain.gain.setValueAtTime(0.001, now + 0.16);
  oscGain.gain.linearRampToValueAtTime(0.12, now + 0.20);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.05);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now + 0.16);
  osc.stop(now + duration + 0.05);
}
