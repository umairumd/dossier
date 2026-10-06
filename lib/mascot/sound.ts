/**
 * Tiny Web Audio synth for mascot sounds (original tones — no audio files, no licence
 * issues). Off by default; the host decides when to enable it (user setting).
 */
import type { SoundName } from "./engine";

export interface Synth {
  enabled: boolean;
  volume: number;
  play(name: SoundName): void;
}

export function createSynth(volume = 0.5): Synth {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  const synth: Synth = {
    enabled: false,
    volume,
    play(name) {
      if (!synth.enabled || typeof window === "undefined") return;
      if (!ctx) {
        const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return;
        ctx = new C();
        master = ctx.createGain();
        master.connect(ctx.destination);
      }
      if (!master) return;
      master.gain.value = synth.volume;
      if (ctx.state === "suspended") void ctx.resume();
      const c = ctx;
      const out = master;
      const T = (f: number, to: number, d: number, g: number, delay = 0, type: OscillatorType = "sine") => {
        const t = c.currentTime + delay;
        const o = c.createOscillator();
        const n = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + d * 0.9);
        n.gain.setValueAtTime(0.0001, t);
        n.gain.exponentialRampToValueAtTime(g, t + 0.006);
        n.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(n); n.connect(out); o.start(t); o.stop(t + d + 0.05);
      };
      switch (name) {
        case "greet": [523.25, 659.25, 783.99].forEach((f, i) => T(f, 0, 0.32, 0.05, i * 0.085)); break;
        case "slap": T(240, 90, 0.09, 0.08, 0, "triangle"); break;
        case "annoyed": T(320, 260, 0.12, 0.03, 0, "square"); T(300, 240, 0.12, 0.025, 0.13, "square"); break;
        case "angry": T(180, 120, 0.25, 0.05, 0, "sawtooth"); break;
        case "charge": T(200, 900, 0.7, 0.04, 0, "sawtooth"); break;
        case "boom": T(140, 40, 0.6, 0.12, 0, "triangle"); [880, 1175, 1568].forEach((f, i) => T(f, 0, 0.25, 0.03, 0.05 + i * 0.04)); break;
        case "land": T(260, 120, 0.12, 0.07, 0, "triangle"); break;
        case "dizzy": T(1200, 300, 0.7, 0.03, 0, "triangle"); break;
        case "work": T(880, 0, 0.07, 0.03); T(1320, 0, 0.08, 0.03, 0.07); break;
        case "think": T(560, 840, 0.22, 0.03, 0, "triangle"); break;
        case "search": T(1000, 1500, 0.1, 0.025); T(1100, 1600, 0.1, 0.025, 0.12); break;
        case "approval": T(740, 0, 0.12, 0.05); T(988, 0, 0.2, 0.05, 0.1); break;
        case "question": T(600, 950, 0.22, 0.04, 0, "triangle"); break;
        case "error": T(330, 190, 0.28, 0.06, 0, "triangle"); break;
        case "finish": [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => T(f, 0, 0.28, 0.04, i * 0.07)); break;
        case "rate": T(520, 330, 0.38, 0.04, 0, "triangle"); break;
        case "sleep": T(420, 300, 0.7, 0.02); break;
        case "love": T(1046.5, 0, 0.15, 0.04); T(1318.5, 0, 0.22, 0.04, 0.1); break;
        case "proud": [783.99, 1046.5, 1318.5].forEach((f, i) => T(f, 0, 0.2, 0.04, i * 0.06)); break;
        case "wink": T(1500, 1900, 0.07, 0.03); break;
        case "yawn": T(520, 240, 0.7, 0.03, 0, "triangle"); break;
        case "pop": T(700, 1400, 0.07, 0.04); break;
        case "gulp": T(340, 120, 0.16, 0.1); T(210, 80, 0.22, 0.08, 0.1); break;
        case "approve": T(660, 0, 0.18, 0.05); T(990, 0, 0.3, 0.05, 0.08); break;
        case "blip": T(1480, 0, 0.07, 0.035); break;
        case "celebrate": [659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => T(f, 0, 0.3, 0.035, i * 0.06)); break;
      }
    },
  };
  return synth;
}
