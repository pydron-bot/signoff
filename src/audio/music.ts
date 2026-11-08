/**
 * Plays the score (src/audio/score.ts) with Web Audio: a look-ahead
 * scheduler queues each 16th step a little before it sounds, so the timing
 * holds even when frames drop. Presentation only; Sound starts and stops it
 * from the match's events.
 */
import { loopSteps, noteHz, type Cue, type Part } from './score';

const LOOKAHEAD = 0.25;
const TICK_MS = 50;

export class Music {
  private readonly out: GainNode;
  private cue: Cue | null = null;
  private step = 0;
  private next = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 1;

  constructor(
    private readonly ctx: AudioContext,
    master: AudioNode,
    private readonly noise: AudioBuffer,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(master);
  }

  /** 0 to 1, from Settings. */
  setVolume(v: number): void {
    this.volume = v;
    if (this.cue) this.out.gain.setTargetAtTime(0.32 * v, this.ctx.currentTime, 0.05);
  }

  get playing(): string {
    return this.cue?.name ?? '';
  }

  /** Starts a cue from its top, `delay` seconds from now (after the round call). */
  play(cue: Cue, delay = 0): void {
    this.stop(0);
    this.cue = cue;
    this.step = 0;
    this.next = this.ctx.currentTime + delay;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(0.32 * this.volume, this.next);
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Fades out over `fade` seconds. */
  stop(fade = 0.6): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cue = null;
    const g = this.out.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    if (fade > 0) g.setTargetAtTime(0, t, fade / 3);
    else g.setValueAtTime(0, t);
  }

  private schedule(): void {
    const c = this.cue;
    if (!c) return;
    const dur = 60 / c.bpm / 4;
    const n = loopSteps(c);
    while (this.next < this.ctx.currentTime + LOOKAHEAD) {
      const s = this.step % n;
      for (const p of c.parts) {
        const note = p.notes[s % p.notes.length];
        if (note) this.voice(p, note, this.next, dur * (p.hold ?? 1));
      }
      const d = c.drums[s % c.drums.length];
      if (d !== '.') this.drum(d, this.next);
      this.step++;
      this.next += dur;
    }
  }

  private voice(p: Part, note: number, t: number, len: number): void {
    const c = this.ctx;
    const hz = noteHz(note);
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    const oscs: OscillatorNode[] = [];
    const osc = (type: OscillatorType, detune = 0) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = hz;
      o.detune.value = detune;
      o.connect(f);
      oscs.push(o);
    };
    let attack = 0.005;
    let release = 0.08;
    switch (p.voice) {
      case 'bass':
        osc('square');
        osc('triangle', -1200);
        f.frequency.value = 600;
        break;
      case 'pad':
        // Two saws a little apart: the 1987 string machine (more apart in the flood).
        osc('sawtooth', -9);
        osc('sawtooth', 9);
        f.frequency.value = 1400;
        attack = 0.25;
        release = 0.4;
        break;
      case 'lead':
        osc('square');
        f.frequency.value = 3200;
        attack = 0.01;
        release = 0.12;
        break;
      case 'arp':
        osc('sawtooth');
        f.frequency.value = 2400;
        release = 0.05;
        break;
      case 'pluck':
        osc('triangle');
        osc('sine', 1200);
        f.frequency.value = 5000;
        release = 0.6;
        break;
    }
    f.connect(g).connect(this.out);
    const end = t + Math.max(len, 0.04);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p.gain, t + attack);
    g.gain.setValueAtTime(p.gain, Math.max(t + attack, end - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, end + release);
    for (const o of oscs) {
      o.start(t);
      o.stop(end + release + 0.05);
    }
  }

  private drum(d: string, t: number): void {
    const c = this.ctx;
    if (d === 'k') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + 0.22);
      return;
    }
    // Snare (s, S accented) and hat (h): filtered noise.
    const hat = d === 'h';
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = hat ? 'highpass' : 'bandpass';
    f.frequency.value = hat ? 7000 : 1800;
    const g = c.createGain();
    const peak = hat ? 0.08 : d === 'S' ? 0.4 : 0.28;
    const len = hat ? 0.04 : 0.14;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, (t * 7.3) % 0.9);
    s.stop(t + len + 0.02);
  }
}
