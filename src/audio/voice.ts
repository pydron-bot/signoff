/**
 * The fighters' voices, synthesised: a buzzing source at the fighter's
 * pitch, breath on top, shaped into a vowel by three formant filters, with
 * a pitch contour for each kind of sound (a quick "hah" for an effort, a
 * long falling "aagh" for a KO). Each fighter has a profile: how high, how
 * big a throat, how breathy, how rough; the preacher has a vibrato and the
 * dummy's jaw clacks. One voice per fighter: a new sound cuts the last.
 * No audio files (docs/DESIGN.md, Audio).
 */
import type { VocalKind } from './vocals';

export interface VoiceProfile {
  /** Speaking pitch, Hz. */
  readonly pitch: number;
  /** Formants scaled by this: 1 a man's throat, about 1.17 a woman's, more a puppet's. */
  readonly tract: number;
  /** 0 to 1: breath mixed into the voice. */
  readonly breath: number;
  /** 0 to 1: roughness (saturation and a rattle in the pitch). */
  readonly grit: number;
  /** Vibrato: depth in semitones, rate in Hz. */
  readonly vibrato?: readonly [number, number];
  /** A wooden clack at each end: the dummy's jaw. */
  readonly clack?: boolean;
}

export const VOICES: Readonly<Record<string, VoiceProfile>> = {
  dale: { pitch: 118, tract: 1.0, breath: 0.25, grit: 0.15 },
  rox: { pitch: 225, tract: 1.17, breath: 0.45, grit: 0.05 },
  hollis: { pitch: 86, tract: 0.9, breath: 0.2, grit: 0.45 },
  mumbles: { pitch: 290, tract: 1.35, breath: 0.1, grit: 0.25, clack: true },
  margaret: { pitch: 195, tract: 1.12, breath: 0.2, grit: 0 },
  gus: { pitch: 102, tract: 0.95, breath: 0.3, grit: 0.35 },
  gideon: { pitch: 128, tract: 1.0, breath: 0.2, grit: 0.15, vibrato: [0.6, 6] },
};
const DEFAULT_VOICE: VoiceProfile = VOICES.dale;

/** Formants (Hz) of the vowels these sounds use. */
type Vowel = readonly [number, number, number];
const AH: Vowel = [800, 1200, 2500];
const UH: Vowel = [640, 1190, 2390];
const OH: Vowel = [470, 900, 2400];
const EH: Vowel = [580, 1800, 2500];
const OO: Vowel = [350, 800, 2300];

interface Shape {
  /** Vowels to pick from, each a start and an end. */
  vowels: readonly (readonly [Vowel, Vowel])[];
  /** Length at size 0 and added at size 1, seconds. */
  dur: readonly [number, number];
  /** Pitch at the start, the peak (a quarter in) and the end, times the speaking pitch. */
  pitch: readonly [number, number, number];
  /** Breath at the onset (the "h"), 0 to 1. */
  h: number;
  /** Loudness. */
  gain: number;
  /** Extra roughness on top of the voice's own. */
  grit: number;
}

const SHAPES: Readonly<Record<VocalKind, Shape>> = {
  effort: { vowels: [[AH, AH], [UH, UH], [EH, EH]], dur: [0.11, 0.1], pitch: [1.15, 1.3, 0.9], h: 0.8, gain: 0.5, grit: 0 },
  shout: { vowels: [[AH, AH], [EH, AH]], dur: [0.22, 0.14], pitch: [1.2, 1.45, 1.0], h: 0.6, gain: 0.7, grit: 0.1 },
  pain: { vowels: [[UH, UH], [OH, UH], [AH, UH]], dur: [0.12, 0.28], pitch: [1.55, 1.6, 0.8], h: 0.4, gain: 0.65, grit: 0.25 },
  oof: { vowels: [[OO, UH]], dur: [0.16, 0.06], pitch: [0.95, 0.95, 0.7], h: 1, gain: 0.55, grit: 0.1 },
  scream: { vowels: [[AH, AH], [EH, AH]], dur: [0.75, 0.2], pitch: [1.6, 1.85, 0.7], h: 0.3, gain: 0.75, grit: 0.45 },
  // A syllable of speech: short, near the speaking pitch, any vowel to any other.
  talk: { vowels: [[AH, EH], [OH, AH], [EH, OO], [UH, AH], [OO, EH]], dur: [0.07, 0.08], pitch: [1.0, 1.12, 0.92], h: 0.2, gain: 0.32, grit: 0 },
};

/** The three formants: sharpness, and how loud each is. */
const Q = [7, 9, 10] as const;
const FORMANT_GAIN = [1, 0.55, 0.28] as const;
/** Band-pass filters take most of a buzz's energy: make it back up. */
const MAKEUP = 3.2;
/** How much of the unfiltered low end goes in (before MAKEUP). */
const CHEST = 0.12;

export class Voices {
  private readonly current: (GainNode | null)[] = [null, null];
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
    private readonly noise: AudioBuffer,
  ) {}

  /** Fighter `player` (voice `id`) makes a sound of `kind`, 0 to 1 big. */
  say(player: number, id: string, kind: VocalKind, size: number): void {
    const c = this.ctx;
    const t = c.currentTime + 0.005;
    const v = VOICES[id] ?? DEFAULT_VOICE;
    const s = SHAPES[kind];
    // One voice each: the last sound stops short.
    const prev = this.current[player];
    if (prev) {
      prev.gain.cancelScheduledValues(t);
      prev.gain.setTargetAtTime(0, t, 0.012);
    }
    const dur = s.dur[0] + s.dur[1] * size;
    const end = t + dur;
    const f0 = v.pitch * (0.94 + Math.random() * 0.12);
    const [from, to] = s.vowels[Math.floor(Math.random() * s.vowels.length)];

    // The buzz, its pitch contour, and a vibrato or a rattle.
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0 * s.pitch[0], t);
    osc.frequency.linearRampToValueAtTime(f0 * s.pitch[1], t + dur * 0.25);
    osc.frequency.exponentialRampToValueAtTime(f0 * s.pitch[2], end);
    const grit = Math.min(1, v.grit + s.grit * size);
    let lfo: OscillatorNode | null = null;
    if (v.vibrato || grit > 0.2) {
      lfo = c.createOscillator();
      const depth = c.createGain();
      if (v.vibrato) {
        lfo.frequency.value = v.vibrato[1];
        depth.gain.value = f0 * (2 ** (v.vibrato[0] / 12) - 1);
      } else {
        // A rattle in the throat: fast and shallow.
        lfo.frequency.value = 26 + grit * 18;
        depth.gain.value = f0 * 0.06 * grit;
      }
      lfo.connect(depth).connect(osc.frequency);
    }
    const voiced = c.createGain();
    voiced.gain.value = 1 - v.breath * 0.5;
    const src = c.createGain();
    osc.connect(voiced).connect(src);

    // Breath: strong at the onset (the "h"), then the voice's own level.
    const nz = c.createBufferSource();
    nz.buffer = this.noise;
    nz.loop = true;
    const breath = c.createGain();
    breath.gain.setValueAtTime(s.h * 1.4, t);
    breath.gain.exponentialRampToValueAtTime(Math.max(0.02, v.breath * 0.9), t + 0.05);
    nz.connect(breath).connect(src);

    // The vowel: three formants, gliding from one vowel to the next.
    const vowel = c.createGain();
    vowel.gain.value = MAKEUP;
    for (let k = 0; k < 3; k++) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = Q[k];
      bp.frequency.setValueAtTime(from[k] * v.tract, t);
      bp.frequency.linearRampToValueAtTime(to[k] * v.tract, end);
      const g = c.createGain();
      g.gain.value = FORMANT_GAIN[k];
      src.connect(bp).connect(g).connect(vowel);
    }
    // The chest: the buzz's own low end, which the formants filter out, so a deep voice sounds deep.
    const chest = c.createBiquadFilter();
    chest.type = 'lowpass';
    chest.frequency.value = 320;
    const chestGain = c.createGain();
    chestGain.gain.value = CHEST;
    voiced.connect(chest).connect(chestGain).connect(vowel);

    // Roughness, then the envelope: in fast, held, out.
    const shaper = c.createWaveShaper();
    shaper.curve = this.curve(Math.round(1 + grit * 6));
    const env = c.createGain();
    const peak = s.gain * (0.6 + 0.4 * size);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    env.gain.setValueAtTime(peak, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    vowel.connect(shaper).connect(env).connect(this.out);
    this.current[player] = env;

    osc.start(t);
    nz.start(t, Math.random());
    lfo?.start(t);
    const stop = end + 0.05;
    osc.stop(stop);
    nz.stop(stop);
    lfo?.stop(stop);
    osc.onended = () => {
      if (this.current[player] === env) this.current[player] = null;
      env.disconnect();
    };
    if (v.clack) {
      this.clack(t);
      this.clack(end - 0.02);
    }
  }

  /** A wooden knock: the dummy's jaw opening or shutting. */
  private clack(at: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1700, at);
    o.frequency.exponentialRampToValueAtTime(900, at + 0.025);
    g.gain.setValueAtTime(0.25, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    o.connect(g).connect(this.out);
    o.start(at);
    o.stop(at + 0.05);
  }

  /** A soft-clipping curve, `k` times driven; made once per drive. */
  private curve(k: number): Float32Array<ArrayBuffer> {
    let cv = this.curves.get(k);
    if (!cv) {
      cv = new Float32Array(new ArrayBuffer(256 * 4));
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * 2 - 1;
        cv[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      this.curves.set(k, cv);
    }
    return cv;
  }
}
