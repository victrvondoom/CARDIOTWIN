/**
 * Web Audio API Acoustic CPR Metronome and Resuscitation Audio Guidance.
 * Emits 110 BPM acoustic clicks (AHA 'Stayin Alive' target cadence)
 * with precise audio context scheduling to eliminate timing jitter.
 */

class ResuscitationAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private bpm = 110;
  private listeners: Array<(playing: boolean) => void> = [];

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /** Plays a short, percussive acoustic click with wooden woodblock resonance */
  public playClick(highPitch = false): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = highPitch ? 880 : 660; // 880Hz downbeat, 660Hz upbeat
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Rapid exponential volume envelope (40ms click)
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public startPacer(bpm = 110): void {
    if (this.isPlaying) return;
    this.bpm = bpm;
    this.isPlaying = true;
    this.notify();

    let beatCount = 0;
    const intervalMs = (60 / this.bpm) * 1000;

    // First click immediately
    this.playClick(true);
    beatCount++;

    this.intervalId = window.setInterval(() => {
      const isDownbeat = beatCount % 4 === 0;
      this.playClick(isDownbeat);
      beatCount++;
    }, intervalMs);
  }

  public stopPacer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    this.notify();
  }

  public togglePacer(bpm = 110): boolean {
    if (this.isPlaying) {
      this.stopPacer();
    } else {
      this.startPacer(bpm);
    }
    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getBpm(): number {
    return this.bpm;
  }

  public subscribe(listener: (playing: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.isPlaying);
    }
  }

  /** Speaks text aloud using browser SpeechSynthesis if supported */
  public speakText(text: string, lang = 'en-US'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis failures
    }
  }
}

export const resuscitationAudio = new ResuscitationAudioEngine();
