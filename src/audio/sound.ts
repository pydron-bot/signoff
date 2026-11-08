/**
 * Sound, all synthesised with Web Audio (no audio files): hits, blocks,
 * throws, the station ident, the Emergency-Broadcast-style hazard alarm, a
 * laugh track and applause that come in at the wrong moments, and the
 * sign-off tone. The announcer speaks through the browser's speech
 * synthesis where there is one. Presentation only: it listens to events.
 */
import type { MatchState, SimEvent } from '../sim';
import { fighterData } from '../sim';

export type SoundMode = 'on' | 'novoice' | 'off';

export class Sound {
  mode: SoundMode = 'on';
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  /** Audio can only start from a user gesture (iOS): call from the first tap or key. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private get live(): boolean {
    return this.mode !== 'off' && this.ctx !== null && this.ctx.state === 'running';
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', slideTo?: number, at = 0): void {
    const c = this.ctx!;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, gain: number, type: BiquadFilterType = 'bandpass', q = 1, at = 0, attack = 0.002): void {
    const c = this.ctx!;
    const t = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  private say(text: string): void {
    if (this.mode !== 'on' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 0.55;
    u.volume = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  /** A studio audience laughing: overlapping "ha" bursts on vowel formants. */
  private laugh(at = 0): void {
    for (let v = 0; v < 5; v++) {
      const f = 600 + Math.random() * 700;
      const start = at + Math.random() * 0.25;
      for (let k = 0; k < 6; k++) this.noise(0.09, f, 0.08, 'bandpass', 6, start + k * (0.13 + Math.random() * 0.03), 0.01);
    }
  }

  private applause(at = 0, secs = 1.6): void {
    for (let k = 0; k < 60; k++) this.noise(0.03, 1800 + Math.random() * 1500, 0.06, 'bandpass', 2, at + Math.random() * secs);
  }

  /** The station's three-note ident. */
  private ident(): void {
    [523, 659, 784].forEach((f, k) => this.tone(f, 0.5, 0.12, 'sine', undefined, k * 0.14));
  }

  /** The Emergency Broadcast attention signal: 853 and 960 Hz together. */
  private alarm(): void {
    this.tone(853, 0.9, 0.07, 'sine');
    this.tone(960, 0.9, 0.07, 'sine');
  }

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    if (!this.live) return;
    for (const e of ev) {
      switch (e.type) {
        case 'roundStart':
          this.ident();
          this.say(`Round ${e.round}`);
          break;
        case 'fight':
          this.say('On air!');
          break;
        case 'hit': {
          const big = Math.min(1, e.damage / 80);
          this.noise(0.08 + big * 0.06, 1400, 0.25 + big * 0.25, 'lowpass');
          this.tone(140, 0.12 + big * 0.1, 0.35 + big * 0.2, 'sine', 45);
          if (e.counter) this.tone(1600, 0.12, 0.08, 'square', 900);
          break;
        }
        case 'block':
          this.noise(0.04, 3200, 0.18, 'highpass');
          this.tone(880, 0.03, 0.05, 'square');
          break;
        case 'armor':
          this.tone(300, 0.15, 0.2, 'sawtooth', 200);
          break;
        case 'special':
          if (e.move.startsWith('Knock-Knock')) {
            // Two knocks on a wooden door.
            this.tone(180, 0.08, 0.35, 'triangle', 120, 0.05);
            this.tone(180, 0.08, 0.35, 'triangle', 120, 0.25);
            this.say("Knock knock. Who's there?");
          } else this.tone(200, 0.16, 0.06, 'sawtooth', 600);
          break;
        case 'teleport':
          // A puppet string pulled tight.
          this.tone(330, 0.25, 0.1, 'triangle', 990);
          break;
        case 'decoyPop':
          this.tone(900, 0.12, 0.15, 'square', 200);
          this.noise(0.1, 2000, 0.15);
          if (Math.random() < 0.5) this.laugh(0.1);
          break;
        case 'boost':
          [660, 880, 1320].forEach((f, k) => this.tone(f, 0.08, 0.07, 'square', undefined, k * 0.05));
          break;
        case 'projectileClash':
          this.noise(0.25, 900, 0.3);
          break;
        case 'throw':
          // Clocking In punches the time clock.
          if (e.move.startsWith('Clocking In')) this.tone(1400, 0.05, 0.15, 'square', undefined, 0.02);
          this.tone(90, 0.25, 0.4, 'sine', 50);
          this.noise(0.12, 500, 0.2, 'lowpass');
          break;
        case 'throwTech':
          this.tone(1200, 0.04, 0.1, 'square');
          this.tone(1200, 0.04, 0.1, 'square', undefined, 0.07);
          break;
        case 'tapeSkip':
          this.tone(2400, 0.12, 0.06, 'sawtooth', 300);
          break;
        case 'cutAway':
          this.noise(0.35, 400, 0.25, 'bandpass', 0.7);
          this.tone(500, 0.3, 0.1, 'triangle', 1500);
          break;
        case 'superStart':
          this.tone(300, 0.6, 0.12, 'sawtooth', 1200);
          break;
        case 'superHit':
          // Off air: static and the stand-by tone.
          this.noise(2.4, 5000, 0.18, 'highpass', 0.5);
          this.tone(1000, 2.4, 0.06, 'sine');
          break;
        case 'knockdown':
          this.tone(70, 0.3, 0.4, 'sine', 40);
          this.noise(0.2, 300, 0.25, 'lowpass');
          if (Math.random() < 0.25) this.laugh(0.3);
          break;
        case 'ko':
          this.tone(55, 0.9, 0.5, 'sine', 30);
          this.noise(0.6, 4000, 0.15, 'highpass');
          this.say('Knock out');
          break;
        case 'roundOver':
          if (e.reason === 'time') this.say('Time');
          this.applause(0.5);
          break;
        case 'hazardWarn':
          this.alarm();
          break;
        case 'hazardStrike':
          if (e.hazard === 'lightning') {
            this.noise(0.35, 6000, 0.35, 'highpass', 0.5);
            this.tone(60, 0.8, 0.3, 'sine', 35, 0.05);
          } else this.tone(120, 0.35, 0.12, 'sawtooth');
          break;
        case 'hazardHit':
          this.tone(110, 0.3, 0.15, 'square', 90);
          if (Math.random() < 0.5) this.laugh(0.2);
          break;
        case 'propKick':
          this.tone(160, 0.1, 0.3, 'sine', 80);
          this.noise(0.6, 250, 0.08, 'lowpass');
          break;
        case 'commercialBreak':
          [784, 659, 523, 659, 784].forEach((f, k) => this.tone(f, 0.18, 0.08, 'square', undefined, 0.3 + k * 0.16));
          break;
        case 'stayTuned':
          this.say('Stay tuned');
          this.laugh(1.2);
          break;
        case 'finisher':
          // The crowd goes quiet; a low drone under the beating.
          if (e.kind === 'signoff') this.tone(55, 3, 0.12, 'sawtooth', 45);
          break;
        case 'finisherCut':
          if (e.censor === 'off') {
            // The set clicking off, and the whine of the tube dying.
            this.tone(80, 0.08, 0.3, 'square');
            this.tone(15000, 1.2, 0.03, 'sine', 3000, 0.05);
          } else {
            // Off air, but the sound carries on underneath.
            this.noise(e.frames / 60, 5000, 0.16, 'highpass', 0.5);
            this.tone(1000, e.frames / 60, 0.05, 'sine');
          }
          break;
        case 'finisherCard': {
          // The station ident, then the announcer reads the card.
          [523, 659, 784, 1046].forEach((f, k) => this.tone(f, 0.3, 0.07, 'triangle', undefined, k * 0.12));
          this.say(e.kind === 'rerun' ? 'Rerun' : e.kind === 'cancellation' ? 'Cancelled' : 'Sign off');
          if (e.kind !== 'rerun') this.applause(1.0);
          break;
        }
        case 'matchOver':
          // The sign-off tone.
          this.tone(1000, 1.6, 0.08, 'sine');
          if (e.winner >= 0) this.say(`${fighterData(m.fighters[e.winner].fighter).name} wins`);
          break;
      }
    }
  }
}
