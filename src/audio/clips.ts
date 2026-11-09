/**
 * The recorded sounds the game can use: every slot a fighter's voice has,
 * the shared hit layers, and the cold open's lines. Each slot takes a few
 * takes (`effort_heavy_1.m4a`, `_2`, ...) and plays a different one each
 * time; a slot with no recordings yet keeps the synthesised sound. Files
 * live under public/assets/audio/<fighter or hits>/, listed in its
 * index.json (`npm run audio:index`). The recording script is
 * docs/AUDIO-TODO.md. Pure: no Web Audio here.
 */
import type { VocalKind } from './vocals';
import type { Timbre } from './timbre';
import type { HitWeight } from '../sim';

export interface Slot {
  readonly id: string;
  /** How many takes to record (the game uses however many there are, from one). */
  readonly count: number;
  /** When it plays, for the recording script. */
  readonly when: string;
}

/** Every fighter's voice. */
export const VOICE_SLOTS: readonly Slot[] = [
  { id: 'effort_light', count: 3, when: 'a light or medium attack starting (now and then, not every jab)' },
  { id: 'effort_heavy', count: 3, when: 'a heavy attack starting (most of them)' },
  { id: 'shout', count: 4, when: 'every special, throw and Technical Difficulties' },
  { id: 'pain_light', count: 3, when: 'hit by a light or medium blow' },
  { id: 'pain_heavy', count: 3, when: 'hit hard: a heavy blow, a launcher, a crushed guard' },
  { id: 'oof', count: 2, when: 'landing on the floor after a knockdown' },
  { id: 'scream', count: 2, when: 'the K.O.' },
  { id: 'win', count: 2, when: 'winning a round (the lines are in the script)' },
];

/** Shared by everyone: the layers of a hit, and the body's other noises. */
export const HIT_SLOTS: readonly Slot[] = [
  { id: 'snap_punch', count: 4, when: 'the contact of a punch: the sharp front of every punch' },
  { id: 'snap_kick', count: 4, when: 'the contact of a kick: duller and bigger than a punch' },
  { id: 'snap_special', count: 3, when: 'the contact of a special or a finisher blow' },
  { id: 'metal', count: 3, when: "a pan, a ladle or the collection plate (instead of the snap): Gus's skillet, Gideon's plate" },
  { id: 'blade', count: 3, when: "a cleaver or a knife (instead of the snap): Gus's knives" },
  { id: 'wood', count: 3, when: "a nightstick or a rolling pin (instead of the snap): Hollis's stick" },
  { id: 'thud', count: 4, when: 'the body under every hit: the weight' },
  { id: 'crunch', count: 4, when: 'on top, for medium hits and up: the hurt' },
  { id: 'boom', count: 2, when: 'on top of a launcher, knockdown or K.O.: a low hit with a tail' },
  { id: 'block', count: 4, when: 'a blocked hit: forearms taking it' },
  { id: 'bodyfall', count: 3, when: 'a body hitting the studio floor' },
  { id: 'throw', count: 2, when: 'a throw slamming them down' },
  { id: 'whoosh_light', count: 3, when: 'a fast attack cutting the air' },
  { id: 'whoosh_heavy', count: 3, when: 'a heavy attack cutting the air' },
];

export const HITS = 'hits';

/** What each fighter says when they win a round. */
export const WIN_LINES: Readonly<Record<string, readonly [string, string]>> = {
  dale: ["And that's the weather.", 'Back to you in the studio!'],
  rox: ['And... cool down.', "Don't forget to stretch!"],
  mumbles: ["Again! Let's play again!", 'Into the toy chest you go.'],
  hollis: ['Logged.', 'All quiet. For now.'],
  margaret: ['And that was the news.', "I'm Margaret Okafor. Good night."],
  gus: ['Order up.', 'Bon appétit.'],
  gideon: ['Hallelujah!', 'Give generously.'],
};

/** A slot's key in the bank: `dale/effort_heavy`, `hits/thud`, `rox/line_open_2`. */
export function slotKey(group: string, slot: string): string {
  return `${group}/${slot}`;
}

/** The voice slot for a vocal cue, or null for one only the synth makes (the cold open's babble). */
export function voiceSlot(kind: VocalKind, size: number): string | null {
  switch (kind) {
    case 'effort':
      return size >= 0.6 ? 'effort_heavy' : 'effort_light';
    case 'pain':
      return size >= 0.7 ? 'pain_heavy' : 'pain_light';
    case 'shout':
    case 'oof':
    case 'scream':
      return kind;
    default:
      return null;
  }
}

/** The snap of a hit for what it was made with: a prop's own sound, or the punch's, kick's or special's. */
export function snapSlot(t: Timbre): string {
  return t === 'metal' || t === 'blade' || t === 'wood' ? t : `snap_${t}`;
}

/** The layers a hit is built from, by weight: the snap and the thud always, the crunch from medium, the boom on an ender. */
export function hitLayers(w: HitWeight, t: Timbre): string[] {
  const out = [snapSlot(t), 'thud'];
  if (w >= 1) out.push('crunch');
  if (w === 3) out.push('boom');
  return out;
}

/**
 * Reads a file's path under assets/audio (`dale/shout_2.m4a`,
 * `gus/line_reply_1.m4a`) into its slot key, or null if it isn't one the
 * game knows. Lines have one take and no number.
 */
export function parseClip(path: string, fighters: readonly string[], lines: (fighter: string) => readonly string[]): string | null {
  const m = /^([a-z]+)\/([a-z0-9_]+?)(?:_(\d+))?\.m4a$/.exec(path);
  if (!m) return null;
  const [, group, name, n] = m;
  if (group === HITS) {
    const s = HIT_SLOTS.find((x) => x.id === name);
    return s && n && Number(n) >= 1 ? slotKey(group, name) : null;
  }
  if (!fighters.includes(group)) return null;
  // A line: the number, if any, is part of its id (open_2, reply_1).
  const line = /^line_(.+)$/.exec(n ? `${name}_${n}` : name);
  if (line) return lines(group).includes(line[1]) ? slotKey(group, `line_${line[1]}`) : null;
  const s = VOICE_SLOTS.find((x) => x.id === name);
  return s && n && Number(n) >= 1 ? slotKey(group, name) : null;
}

/**
 * Picks takes so the same one never plays twice running: a random one of
 * the others. `rand` gives 0 to 1.
 */
export class Takes {
  private readonly last = new Map<string, number>();

  pick(key: string, count: number, rand: () => number): number {
    if (count <= 1) return 0;
    const prev = this.last.get(key) ?? -1;
    let k = Math.floor(rand() * (prev < 0 ? count : count - 1));
    if (prev >= 0 && k >= prev) k++;
    this.last.set(key, k);
    return k;
  }
}
