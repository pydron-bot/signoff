/**
 * Sound, synthesised with Web Audio, with recordings taking over slot by
 * slot as they're added (src/audio/clips.ts, docs/AUDIO-TODO.md): hits, blocks,
 * throws, the station ident, the Emergency-Broadcast-style hazard alarm, a
 * laugh track and applause that come in at the wrong moments, and the
 * sign-off tone. The announcer speaks through the browser's speech
 * synthesis where there is one. Presentation only: it listens to events.
 */
import type { HitWeight, MatchState, SimEvent } from '../sim';
import { INTRO_FRAMES, STEPS_PER_SECOND, fighterData } from '../sim';
import { Music } from './music';
import { timbre, type Timbre } from './timbre';
import { VocalDirector, type VocalCue } from './vocals';
import { Voices } from './voice';
import { HITS, hitLayers, slotKey, voiceSlot } from './clips';
import { SampleBank } from './samples';
import { SCORES } from './score';

export type SoundMode = 'on' | 'novoice' | 'off';

/** Hit layers by weight (light, medium, heavy, ender), and by what hit. */
const SNAP_DUR = [0.025, 0.035, 0.05, 0.07] as const;
const SNAP_GAIN = [0.22, 0.28, 0.34, 0.4] as const;
const THUD_DUR = [0.07, 0.11, 0.17, 0.26] as const;
const THUD_GAIN = [0.28, 0.38, 0.5, 0.62] as const;
const CRUNCH_DUR = [0, 0.05, 0.09, 0.15] as const;
const CRUNCH_GAIN = [0, 0.14, 0.24, 0.32] as const;
const SNAP_FREQ: Readonly<Record<Timbre, number>> = { punch: 2600, kick: 1700, special: 2000, metal: 3500, blade: 5000, wood: 1400 };
const THUD_FREQ: Readonly<Record<Timbre, number>> = { punch: 170, kick: 115, special: 140, metal: 160, blade: 150, wood: 190 };
/** Recorded hit layers' loudness by weight (light, medium, heavy, ender). */
const SAMPLE_GAIN: Readonly<Record<string, readonly [number, number, number, number]>> = {
  snap: [0.45, 0.55, 0.65, 0.75],
  thud: [0.5, 0.65, 0.8, 0.95],
  crunch: [0, 0.4, 0.6, 0.75],
  boom: [0, 0, 0, 0.9],
};
/** Recorded voices: loudness, and how far each take's pitch may wander (so repeats sound less alike). */
const VOICE_GAIN = 0.9;
const VOICE_JITTER = 0.04;
/** Damage from which a swing's whoosh is the heavy one. */
const HEAVY_SWING = 60;

export class Sound {
  mode: SoundMode = 'on';
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private music: Music | null = null;
  /** The cue for the round on air, to pick up again after a pause. */
  private cue: { stage: string; segment: number } | null = null;
  /** 0 to 1 (Settings). */
  musicVolume = 1;
  /** Older iOS: the silent <audio> that lets Web Audio play through the silent switch. */
  private silentLoop: HTMLAudioElement | null = null;
  /** The fighters' voices: when (vocals.ts) and how (voice.ts). */
  private voices: Voices | null = null;
  private readonly vocals = new VocalDirector();
  private readonly cues: VocalCue[] = [];
  /** The recordings, where there are any. */
  readonly samples = new SampleBank();
  /** Each fighter's recorded voice now playing: a new sound cuts it, as the synth does. */
  private readonly voiceSrc: (AudioBufferSourceNode | null)[] = [null, null];

  /**
   * Audio can only start from a user gesture (iOS): call from every tap and
   * key. Also resumes after iOS interrupts the audio (a call, the app in
   * the background), and asks to play through the silent switch.
   */
  unlock(): void {
    this.throughSilentSwitch();
    if (this.ctx) {
      if (this.ctx.state !== 'running') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    // A bus compressor: hits can be loud without clipping, and duck the music a touch when they land.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 5;
    comp.attack.value = 0.002;
    comp.release.value = 0.18;
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.music = new Music(this.ctx, this.master, this.noiseBuf);
    this.voices = new Voices(this.ctx, this.master, this.noiseBuf);
    this.samples.load(this.ctx);
    this.music.setVolume(this.musicVolume);
  }

  /**
   * iOS mutes Web Audio with the silent switch: it plays in the "ambient"
   * category. Safari 17 lets a page ask for "playback" instead (it plays
   * through the switch, as a game's sound should, and pauses other apps'
   * music); older iOS switches when an <audio> element plays, so a silent
   * one loops there. With the sound off, back to ambient.
   */
  private throughSilentSwitch(): void {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    const want = this.mode === 'off' ? 'ambient' : 'playback';
    if (session) {
      if (session.type !== want) session.type = want;
      return;
    }
    if (want !== 'playback' || this.silentLoop || !/iP(hone|ad|od)/.test(navigator.userAgent)) return;
    const a = new Audio(silentWavUrl());
    a.loop = true;
    a.setAttribute('playsinline', '');
    void a.play().catch(() => undefined);
    this.silentLoop = a;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    this.music?.setVolume(v);
  }

  /** The show's music for a segment, after the round call. */
  private playMusic(stage: string, segment: number, delay: number): void {
    this.cue = { stage, segment };
    const c = SCORES[stage]?.[segment];
    if (c && this.music && this.mode !== 'off' && this.musicVolume > 0) this.music.play(c, delay);
  }

  /** Off the air: leaving a match, or the sound turned off. */
  stopMusic(fade = 0.3): void {
    this.cue = null;
    this.music?.stop(fade);
  }

  /** Paused, the music stops; resumed, the segment's loop starts again. */
  pauseMusic(on: boolean): void {
    if (!this.music) return;
    if (on) this.music.stop(0.15);
    else if (this.cue && this.live) this.playMusic(this.cue.stage, this.cue.segment, 0.1);
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

  /**
   * A hit, built in layers by weight: a snap (what hit), a thud (the body
   * taking it), a crunch from medium up, and on an ender a sub drop and a
   * tape warble; then the ring of a pan, the shing of a blade or the knock
   * of a stick.
   */
  /**
   * A recording from the bank: a take of the slot, a touch off pitch.
   * Returns the source, or null if the slot has no recording (the caller
   * synthesises instead).
   */
  private sample(key: string, gain: number, rate = 1, jitter = 0.03, at = 0): AudioBufferSourceNode | null {
    const buf = this.samples.take(key);
    if (!buf) return null;
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master!);
    src.start(c.currentTime + at);
    src.onended = () => g.disconnect();
    return src;
  }

  /** A fighter's recorded voice for this slot, cutting their last; false if there's no recording. */
  private voice(player: number, key: string, gain: number): boolean {
    if (!this.samples.has(key)) return false;
    const prev = this.voiceSrc[player];
    if (prev) {
      try {
        prev.stop();
      } catch {
        // Already over.
      }
    }
    this.voiceSrc[player] = this.sample(key, gain, 1, VOICE_JITTER);
    return true;
  }

  /** Stops both fighters' recorded voices (the cold open skipped). */
  hush(): void {
    for (let i = 0; i < 2; i++) {
      try {
        this.voiceSrc[i]?.stop();
      } catch {
        // Already over.
      }
      this.voiceSrc[i] = null;
    }
  }

  /** A cold open line's recording, if there is one: true if it's playing. */
  line(player: number, key: string): boolean {
    if (!this.live) return false;
    return this.voice(player, key, VOICE_GAIN);
  }

  /** How long a recorded line lasts (0 without one), so the caption can wait for it. */
  lineSeconds(key: string): number {
    return this.samples.seconds(key);
  }

  /** A hit, layer by layer: each recorded layer plays its recording, the rest are synthesised. */
  private hit(w: HitWeight, t: Timbre): void {
    // Heavier hits play their recordings a little lower.
    const rate = 1.06 - 0.04 * w;
    for (const layer of hitLayers(w, t)) {
      const kind = layer === 'thud' || layer === 'crunch' || layer === 'boom' ? layer : 'snap';
      if (this.sample(slotKey(HITS, layer), SAMPLE_GAIN[kind][w], rate)) continue;
      if (kind === 'snap') this.snapSynth(w, t);
      else if (kind === 'thud') this.tone(THUD_FREQ[t], THUD_DUR[w], THUD_GAIN[w], 'sine', 42);
      else if (kind === 'crunch') this.noise(CRUNCH_DUR[w], 650, CRUNCH_GAIN[w], 'bandpass', 1.3, 0.005);
      else {
        this.tone(62, 0.45, 0.45, 'sine', 28);
        this.tone(180, 0.18, 0.06, 'sawtooth', 55, 0.01);
      }
    }
  }

  /** The synthesised snap: the contact, and the ring, shing or knock of a prop. */
  private snapSynth(w: HitWeight, t: Timbre): void {
    this.noise(SNAP_DUR[w], SNAP_FREQ[t], SNAP_GAIN[w], 'highpass', 0.8);
    if (t === 'metal') {
      this.tone(880, 0.35, 0.06, 'triangle');
      this.tone(1294, 0.3, 0.05, 'triangle');
      this.tone(2210, 0.2, 0.03, 'sine');
    } else if (t === 'blade') {
      this.noise(0.18, 6500, 0.12, 'highpass', 0.7, 0, 0.01);
      this.tone(2600, 0.15, 0.03, 'triangle', 2200);
    } else if (t === 'wood') this.tone(420, 0.06, 0.2, 'triangle', 300);
  }

  /** One syllable of a fighter talking (the cold open's lines). */
  babble(player: number, fighter: string): void {
    if (!this.live) return;
    this.voices?.say(player, fighter, 'talk', Math.random());
  }

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    if (!this.live) return;
    for (const c of this.vocals.step(m, ev, this.cues)) {
      const f = m.fighters[c.player].fighter;
      const slot = voiceSlot(c.kind, c.size);
      // The fighter's recording if there is one, the synthesised voice if not.
      if (slot && this.voice(c.player, slotKey(f, slot), VOICE_GAIN * (0.75 + 0.25 * c.size))) continue;
      this.voices?.say(c.player, f, c.kind, c.size);
    }
    // Attacks cutting the air (recorded only: the synth has no whoosh).
    for (let i = 0; i < 2; i++) {
      const s = this.vocals.swings[i];
      if (s >= 0) this.sample(slotKey(HITS, s >= HEAVY_SWING ? 'whoosh_heavy' : 'whoosh_light'), 0.35, 1, 0.06);
    }
    for (const e of ev) {
      switch (e.type) {
        case 'roundStart':
          this.vocals.reset();
          // The music starts with the fight, so its beat keeps time with the round clock (Burnout's shards fall on it).
          this.playMusic(m.stage, e.segment, INTRO_FRAMES / STEPS_PER_SECOND);
          this.ident();
          this.say(`Round ${e.round}`);
          break;
        case 'fight':
          this.say('On air!');
          break;
        case 'hit': {
          const f = m.fighters[e.attacker].fighter;
          this.hit(e.weight, timbre(e.move, fighterData(f).moves[e.move]));
          if (e.counter) this.tone(1600, 0.12, 0.08, 'square', 900);
          break;
        }
        case 'block':
          if (this.sample(slotKey(HITS, 'block'), 0.55)) break;
          this.noise(0.04, 3200, 0.18, 'highpass');
          this.tone(880, 0.03, 0.05, 'square');
          break;
        case 'armor':
          this.tone(300, 0.15, 0.2, 'sawtooth', 200);
          break;
        case 'donation':
          // Coins in the plate, or the organ when they're spent.
          if (e.spent) [262, 330, 392].forEach((f, k) => this.tone(f, 0.6, 0.06, 'sine', undefined, k * 0.02));
          else this.tone(1760, 0.12, 0.05, 'triangle', 2200);
          break;
        case 'heal':
          [523, 659, 784, 1047].forEach((f, k) => this.tone(f, 0.25, 0.05, 'sine', undefined, k * 0.08));
          break;
        case 'guardCrush':
          // The guard gives: a dull crack and a cymbal.
          this.tone(140, 0.25, 0.25, 'square', 70);
          this.noise(0.5, 6000, 0.15, 'highpass');
          break;
        case 'counter':
          // The teleprompter's bell: she saw it coming.
          this.tone(1320, 0.4, 0.12, 'sine');
          this.tone(1980, 0.3, 0.06, 'sine', undefined, 0.02);
          break;
        case 'flawless':
          // A clean, high ping: the timing was right.
          this.tone(2400, 0.12, 0.08, 'triangle');
          break;
        case 'punish':
          this.tone(330, 0.18, 0.12, 'square', 165);
          break;
        case 'reversal':
          this.tone(440, 0.2, 0.08, 'sawtooth', 880);
          break;
        case 'superReady':
          // The test tone coming back on: Technical Difficulties is there again.
          this.tone(1000, 0.25, 0.06, 'sine');
          break;
        case 'jumpCancel':
          this.noise(0.08, 2400, 0.08, 'highpass');
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
          if (this.sample(slotKey(HITS, 'throw'), 0.8)) break;
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
        case 'relaunch':
          // A thud off the floor or wall; a relaunch rings like the boost.
          if (e.how === 'special') this.tone(440, 0.15, 0.1, 'square', 1320);
          else {
            this.tone(80, 0.2, 0.4, 'sine', 50);
            this.noise(0.15, 400, 0.25, 'lowpass');
          }
          break;
        case 'firstHit':
          // The station's ident chime: the first hit is worth a bar.
          this.tone(880, 0.12, 0.08, 'sine');
          this.tone(1320, 0.2, 0.08, 'sine', undefined, 0.08);
          break;
        case 'knockdown':
          if (!this.sample(slotKey(HITS, 'bodyfall'), 0.8)) {
            this.tone(70, 0.3, 0.4, 'sine', 40);
            this.noise(0.2, 300, 0.25, 'lowpass');
          }
          if (Math.random() < 0.25) this.laugh(0.3);
          break;
        case 'ko':
          this.tone(55, 0.9, 0.5, 'sine', 30);
          this.noise(0.6, 4000, 0.15, 'highpass');
          this.say('Knock out');
          break;
        case 'roundOver':
          this.music?.stop(1.5);
          // The winner's line (recorded only), once the K.O. has rung out.
          if (e.winner >= 0) this.sample(slotKey(m.fighters[e.winner].fighter, 'win'), VOICE_GAIN, 1, 0, 1.2);
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
          } else if (e.hazard === 'shards') {
            // Glass: a bright smash as it lands.
            this.noise(0.4, 4000, 0.3, 'highpass', 0.15);
            this.tone(2200, 0.25, 0.06, 'triangle', 1400, 0.15);
          } else if (e.hazard === 'lamps') {
            // A lamp: the bulb pops, then the housing hits the floor.
            this.noise(0.15, 5000, 0.2, 'highpass');
            this.tone(90, 0.5, 0.3, 'square', 45, 0.12);
            this.noise(0.4, 600, 0.25, 'lowpass', 1, 0.12);
          } else if (e.hazard === 'flare') {
            // The fat catches: a whoomph.
            this.noise(0.6, 400, 0.35, 'lowpass');
            this.noise(0.4, 2500, 0.12, 'bandpass', 1, 0.05);
          } else if (e.hazard === 'riser') {
            // Hydraulics.
            this.tone(70, 0.6, 0.18, 'sawtooth', 140);
          } else this.tone(120, 0.35, 0.12, 'sawtooth');
          break;
        case 'stageCue':
          // A Stage Sign-Off: the set's own hazard, louder, on the loser.
          if (e.stage === 'weather') {
            this.noise(0.5, 6000, 0.45, 'highpass', 0.5);
            this.tone(55, 1.4, 0.4, 'sine', 30, 0.05);
          } else if (e.stage === 'burn') {
            this.noise(0.7, 4000, 0.4, 'highpass', 0.2);
            this.tone(2200, 0.4, 0.08, 'triangle', 1200, 0.1);
          } else if (e.stage === 'news') {
            this.noise(0.2, 5000, 0.25, 'highpass');
            this.tone(80, 0.7, 0.4, 'square', 40, 0.08);
            this.noise(0.6, 600, 0.35, 'lowpass', 1, 0.08);
          } else {
            this.noise(1.2, 400, 0.45, 'lowpass');
            this.noise(0.8, 2500, 0.15, 'bandpass', 1, 0.05);
          }
          break;
        case 'hazardHit':
          this.tone(110, 0.3, 0.15, 'square', 90);
          if (Math.random() < 0.5) this.laugh(0.2);
          break;
        case 'propKick':
          // The boombox goes with a blast of its own tape.
          if (e.prop === 'boombox') this.tone(330, 0.3, 0.1, 'square', 660);
          // The desk scrapes across the floor.
          if (e.prop === 'desk') this.noise(0.7, 900, 0.12, 'bandpass');
          // Pans clang; knives rattle.
          if (e.prop === 'pot') this.tone(520, 0.5, 0.1, 'triangle', 480);
          if (e.prop === 'knives') this.noise(0.25, 7000, 0.12, 'highpass');
          this.tone(160, 0.1, 0.3, 'sine', 80);
          this.noise(0.6, 250, 0.08, 'lowpass');
          break;
        case 'commercialBreak':
          this.music?.stop(0.2);
          [784, 659, 523, 659, 784].forEach((f, k) => this.tone(f, 0.18, 0.08, 'square', undefined, 0.3 + k * 0.16));
          break;
        case 'stayTuned':
          this.say('Stay tuned');
          this.laugh(1.2);
          break;
        case 'finisher':
          this.music?.stop(0.4);
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

/** A tenth of a second of silence as a WAV (8 kHz, 8-bit mono), for the silent loop. */
function silentWavUrl(): string {
  const n = 800;
  const b = new DataView(new ArrayBuffer(44 + n));
  const text = (at: number, t: string) => [...t].forEach((c, k) => b.setUint8(at + k, c.charCodeAt(0)));
  text(0, 'RIFF');
  b.setUint32(4, 36 + n, true);
  text(8, 'WAVEfmt ');
  b.setUint32(16, 16, true);
  b.setUint16(20, 1, true);
  b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true);
  b.setUint32(28, 8000, true);
  b.setUint16(32, 1, true);
  b.setUint16(34, 8, true);
  text(36, 'data');
  b.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
}
