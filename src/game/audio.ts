/**
 * audio.ts — Web Audio synthesized retro SFX + a tiny chiptune loop, all generated at
 * runtime (zero asset files). Mute state persists in localStorage. The unlock listener
 * satisfies autoplay policies: nothing sounds until the first user gesture.
 */

export type SfxId =
  | "ui" | "step" | "gem" | "shrine" | "correct" | "wrong"
  | "hurt" | "badge" | "victory" | "defeat" | "pause";

const MUTE_KEY = "game.muted";

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
function writeMuted(v: boolean): void {
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* session-only */ }
}

/** spec: [type, f0, f1, duration, gain] */
const SPECS: Record<SfxId, [OscillatorType, number, number, number, number]> = {
  ui:      ["square", 520, 660, 0.06, 0.12],
  step:    ["triangle", 140, 110, 0.05, 0.06],
  gem:     ["sine", 660, 1320, 0.14, 0.22],
  shrine:  ["triangle", 330, 660, 0.18, 0.2],
  correct: ["square", 523, 1046, 0.16, 0.22],
  wrong:   ["sawtooth", 220, 110, 0.22, 0.25],
  hurt:    ["sawtooth", 160, 40, 0.3, 0.35],
  badge:   ["square", 784, 1568, 0.2, 0.2],
  victory: ["square", 523, 1568, 0.5, 0.25],
  defeat:  ["sawtooth", 220, 55, 0.7, 0.3],
  pause:   ["sine", 440, 330, 0.1, 0.12],
};

// ——— chiptune loop ———
const TEMPO_MS = 214; // ~140bpm 16ths
const BASS = [110, 0, 110, 0, 131, 0, 110, 0, 98, 0, 98, 0, 131, 0, 147, 0];
const LEAD = [440, 0, 523, 0, 659, 0, 523, 440, 0, 392, 0, 330, 392, 0, 523, 0];

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private disposed = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  muted = false;

  private readonly unlock = () => { this.ensureCtx(); this.detachUnlock(); };

  constructor() {
    this.muted = readMuted();
    window.addEventListener("pointerdown", this.unlock);
    window.addEventListener("keydown", this.unlock);
  }

  private detachUnlock(): void {
    window.removeEventListener("pointerdown", this.unlock);
    window.removeEventListener("keydown", this.unlock);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachUnlock();
    this.stopMusic();
    this.master?.disconnect();
    this.master = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    writeMuted(this.muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  sfx(id: SfxId): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureCtx();
    if (!this.master) return;
    const t = ctx.currentTime;
    const [type, f0, f1, dur, g] = SPECS[id];
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env.gain.setValueAtTime(g, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Two-voice chiptune loop — bass + sparse lead, scheduled on a fixed interval. */
  startMusic(): void {
    if (this.disposed || this.musicTimer) return;
    this.ensureCtx();
    this.musicTimer = setInterval(() => {
      if (this.disposed || this.muted) return;
      const ctx = this.ctx;
      if (!ctx || !this.master) return;
      const t = ctx.currentTime;
      const i = this.stepIndex++ % 16;
      const note = (freq: number, type: OscillatorType, gain: number, dur: number) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(gain, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(env).connect(this.master!);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      };
      if (BASS[i]) note(BASS[i], "triangle", 0.09, 0.19);
      if (LEAD[i]) note(LEAD[i], "square", 0.045, 0.16);
    }, TEMPO_MS);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
