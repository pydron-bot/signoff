/**
 * When the fighters make a sound, read from the match and its events: an
 * effort on a heavy attack (now and then on a lighter one), a shout on
 * every special, a cry when hit that grows with the hit's weight, an "oof"
 * hitting the floor, and a scream on a KO. Each fighter has one voice: a
 * new sound cuts the last, and a cooldown keeps a combo from turning into
 * a wall of grunts (a heavy hit or a KO always gets through). Pure: the
 * dice come in as a function, the sound goes out as cues
 * (src/audio/voice.ts plays them).
 */
import { fighterData, type MatchState, type SimEvent } from '../sim';

/** `talk` is one syllable of speech, for the cold open's lines. */
export type VocalKind = 'effort' | 'shout' | 'pain' | 'oof' | 'scream' | 'talk';

export interface VocalCue {
  player: number;
  kind: VocalKind;
  /** 0 to 1: how big. */
  size: number;
}

/** Steps after a sound before the same fighter makes another (unless it's a heavy hit or a KO). */
export const VOCAL_COOLDOWN = 14;
/** By hit weight (light, medium, heavy, ender): the chance of a cry, and its size. */
const PAIN_CHANCE = [0.3, 0.6, 1, 1] as const;
const PAIN_SIZE = [0.35, 0.55, 0.8, 1] as const;
/** Attacks by their hardest hit: heavy ones get an effort most of the time, light ones rarely. */
const HEAVY = 60;
const MEDIUM = 40;

export class VocalDirector {
  private readonly last = [-999, -999];
  private readonly moveKey = ['', ''];
  private readonly moveFrame = [0, 0];
  private t = 0;
  /** Set each step: the hardest hit of an attack each fighter just started, or -1 (for its whoosh). */
  readonly swings = [-1, -1];

  constructor(private readonly roll: () => number = Math.random) {}

  /** Forget everything (a new match, a replay seek). */
  reset(): void {
    this.last[0] = this.last[1] = -999;
    this.moveKey[0] = this.moveKey[1] = '';
    this.moveFrame[0] = this.moveFrame[1] = 0;
  }

  /** Once per simulation step, after it: the sounds to make now, into `out` (cleared first). */
  step(m: MatchState, ev: readonly SimEvent[], out: VocalCue[]): VocalCue[] {
    out.length = 0;
    this.t++;
    this.swings[0] = this.swings[1] = -1;
    for (const e of ev) {
      switch (e.type) {
        case 'hit': {
          const w = e.weight;
          if (this.roll() < PAIN_CHANCE[w]) this.cue(out, e.defender, 'pain', PAIN_SIZE[w], w >= 2);
          break;
        }
        case 'guardCrush':
          this.cue(out, e.defender, 'pain', 0.5, false);
          break;
        case 'special':
          this.cue(out, e.player, 'shout', 0.8, false);
          break;
        case 'throw':
        case 'superStart':
          this.cue(out, e.type === 'throw' ? e.thrower : e.player, 'shout', 1, true);
          break;
        case 'knockdown':
          if (!m.fighters[e.player].ko && this.roll() < 0.6) this.cue(out, e.player, 'oof', 0.6, false);
          break;
        case 'ko':
          this.cue(out, e.player, 'scream', 1, true);
          break;
        default:
          break;
      }
    }
    // Attacks starting: a normal's effort, by how hard it hits (specials shout from their event).
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const key = f.mode === 'move' ? f.move : '';
      // A new move, or the same one again from the top (frozen in hitstop, it's neither).
      const started = key !== '' && (key !== this.moveKey[i] || f.moveFrame < this.moveFrame[i]);
      this.moveKey[i] = key;
      this.moveFrame[i] = f.moveFrame;
      if (!started) continue;
      const mv = fighterData(f.fighter).moves[f.move];
      if (!mv) continue;
      let hardest = 0;
      for (const h of mv.hits) hardest = Math.max(hardest, h.damage);
      // Anything that strikes swings through the air (specials included).
      if (mv.hits.length && mv.kind !== 'super') this.swings[i] = hardest;
      if (mv.kind !== 'normal' && mv.kind !== 'air') continue;
      const chance = hardest >= HEAVY ? 0.75 : hardest >= MEDIUM ? 0.3 : 0.08;
      if (this.roll() < chance) this.cue(out, i, 'effort', hardest >= HEAVY ? 0.7 : 0.45, false);
    }
    return out;
  }

  /** One sound per fighter per step, the biggest; a cooldown unless `urgent`. */
  private cue(out: VocalCue[], player: number, kind: VocalKind, size: number, urgent: boolean): void {
    if (!urgent && this.t - this.last[player] < VOCAL_COOLDOWN) return;
    for (const c of out) {
      if (c.player !== player) continue;
      if (size > c.size || kind === 'scream') {
        c.kind = kind;
        c.size = size;
      }
      return;
    }
    this.last[player] = this.t;
    out.push({ player, kind, size });
  }
}
