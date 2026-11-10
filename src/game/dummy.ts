/**
 * Training's dummy: what player 2 does when nobody plays it. It guards (or
 * doesn't), holds a stance, answers after blocking, after being hit and on
 * getting up, breaks combos with Cut Away, and plays back what the player
 * recorded for it. It may peek at the attacker's move to block the right
 * height, or block flawlessly (the CPU may not). Deterministic: its coin
 * flips come from its own seeded generator. No DOM here.
 */
import { BAR, FLAWLESS_WINDOW, METER_MAX, Input, fighterData, moveData, type FighterState, type Height, type MatchState, type SpecialDir } from '../sim';
import { touchesFighter } from '../sim/combat';
import { createRng, nextInt, type RngState } from '../sim/rng';

const { UP, DOWN, LEFT, RIGHT, FP, BLOCK, SPECIAL, THROW, METER } = Input;

/** after: lets the first hit land, then blocks until things go quiet. random: blocks about half the attacks. flawless: presses Block just before each hit. */
export type Guard = 'none' | 'all' | 'after' | 'random' | 'flawless';
export const GUARDS: readonly Guard[] = ['none', 'all', 'after', 'random', 'flawless'];
/** stand: blocks at whatever height the hit needs. crouch: crouches and blocks crouching (overheads hit it). duck: crouches without Block (highs and throws go over, the rest hits). */
export type DummyStance = 'stand' | 'crouch' | 'duck';
export const STANCES: readonly DummyStance[] = ['stand', 'crouch', 'duck'];
/** What it does the moment it can act again. stayDown (on getting up only) is the delayed getup; recording plays the slot. */
export type Answer = 'none' | 'jab' | 'throw' | 'reversal' | 'boost' | 'jump' | 'backdash' | 'recording' | 'stayDown';
export const ANSWERS: readonly Answer[] = ['none', 'jab', 'throw', 'reversal', 'boost', 'jump', 'backdash', 'recording'];
export const WAKEUPS: readonly Answer[] = [...ANSWERS, 'stayDown'];
/** Held at none, one bar or full, or as a match plays it and full again at rest. */
export type MeterLevel = 'empty' | 'one' | 'full' | 'refill';
export const METER_LEVELS: readonly MeterLevel[] = ['empty', 'one', 'full', 'refill'];
/** A recording played over and over, or once from every reset. */
export type Playback = 'off' | 'loop' | 'reset';
export const PLAYBACKS: readonly Playback[] = ['off', 'loop', 'reset'];

export interface DummySettings {
  guard: Guard;
  stance: DummyStance;
  afterBlock: Answer;
  afterHit: Answer;
  wakeup: Answer;
  meter: MeterLevel;
  cutAway: boolean;
  /** The recording slot (0-2) that RECORD fills and playback plays. */
  slot: number;
  playback: Playback;
}

export function defaultDummy(): DummySettings {
  return { guard: 'none', stance: 'stand', afterBlock: 'none', afterHit: 'none', wakeup: 'none', meter: 'refill', cutAway: false, slot: 0, playback: 'off' };
}

export const SLOTS = 3;
/** Ten seconds a recording. */
export const RECORD_FRAMES = 600;
/** Frames at rest with nothing coming before 'after' guard drops its guard again. */
const QUIET = 30;
/** Flawless: Block goes down this many steps before the hit lands (inside FLAWLESS_WINDOW). */
const FLAWLESS_LEAD = FLAWLESS_WINDOW >> 1;
/** Steps ahead a projectile is followed to see whether it will reach. */
const LOOKAHEAD = 4;
const NONE = 999;
/** No answer under way. */
const IDLE = -NONE;

/** Directions relative to facing and back: left and right swap when facing left (the same swap both ways). */
export function relative(bits: number, facing: number): number {
  if (facing === 1) return bits;
  return (bits & ~(LEFT | RIGHT)) | (bits & LEFT ? RIGHT : 0) | (bits & RIGHT ? LEFT : 0);
}

function dirBits(dir: SpecialDir, facing: number): number {
  return dir === 'f' ? (facing === 1 ? RIGHT : LEFT) : dir === 'b' ? (facing === 1 ? LEFT : RIGHT) : dir === 'd' ? DOWN : 0;
}

export interface SpecialPick {
  dir: SpecialDir;
  id: string;
}

const reversals = new Map<string, SpecialPick>();
const boosts = new Map<string, SpecialPick>();
const DIRS: readonly SpecialDir[] = ['n', 'f', 'b', 'd'];

/** The special a fighter wakes up with: one with an invincible start, else armour, else the fastest that hits. */
export function reversalSpecial(fighter: string): SpecialPick {
  let pick = reversals.get(fighter);
  if (pick) return pick;
  const d = fighterData(fighter);
  let best: SpecialPick | null = null;
  let score = Infinity;
  for (const dir of DIRS) {
    const id = d.specials[dir];
    if (!id) continue;
    const m = d.moves[id];
    if (!m.startup && !m.invuln) continue;
    const s = (m.invuln ? 0 : m.armor ? 1000 : 2000) + m.startup;
    if (s < score) {
      score = s;
      best = { dir, id };
    }
  }
  pick = best ?? { dir: 'f', id: d.specials.f };
  reversals.set(fighter, pick);
  return pick;
}

/** The special it boosts: the reversal if that has a boost, else the first that has one and hits. */
export function boostSpecial(fighter: string): SpecialPick {
  let pick = boosts.get(fighter);
  if (pick) return pick;
  const d = fighterData(fighter);
  const r = reversalSpecial(fighter);
  pick = d.moves[r.id].boost && d.moves[r.id].startup ? r : undefined;
  for (const dir of DIRS) {
    if (pick) break;
    const id = d.specials[dir];
    if (id && d.moves[id].boost && d.moves[id].startup) pick = { dir, id };
  }
  pick ??= r;
  boosts.set(fighter, pick);
  return pick;
}

/** A recording: inputs with directions relative to facing, run-length encoded as the replays are ([bits, steps] pairs). */
export interface Recording {
  frames: number;
  runs: number[];
}

/** The recording step by step, for playback. */
function expand(r: Recording): Uint16Array {
  const out = new Uint16Array(r.frames);
  let at = 0;
  for (let i = 0; i < r.runs.length; i += 2) {
    out.fill(r.runs[i], at, at + r.runs[i + 1]);
    at += r.runs[i + 1];
  }
  return out;
}

/** The next hit that could land on the dummy: steps until it can (0: this coming step) and its height. */
interface Incoming {
  n: number;
  height: Height;
}

export class TrainingDummy {
  settings: DummySettings = defaultDummy();
  /** Recorded slots (null: empty). */
  readonly slots: (Recording | null)[] = Array.from({ length: SLOTS }, () => null);
  private readonly played: (Uint16Array | null)[] = Array.from({ length: SLOTS }, () => null);
  private rng: RngState;
  /** 'after' guard: hit since things were last quiet. */
  private hitSeen = false;
  private quiet = 0;
  /** 'random' guard: this attack's coin, and the attacker's move it was thrown for. */
  private roll = false;
  private lastMove = '';
  private lastFrame = 0;
  /** The answer under way, and the step of it: 0 is the first step the dummy can act, negative before. */
  private answer: Answer = 'none';
  private r = IDLE;
  /** Playback: the step reached in the slot, or -1. */
  private play = -1;
  private playSlot = 0;
  private readonly inc: Incoming = { n: NONE, height: 'mid' };
  /** Recording: the slot being filled (-1: not recording), and whether the first input has come. */
  private recSlot = -1;
  private recRuns: number[] = [];
  private recFrames = 0;

  constructor(readonly seed = 1) {
    this.rng = createRng(seed);
  }

  /** Back to the start: no answer under way, guard fresh, and playback from the top if it plays on reset. */
  reset(): void {
    this.hitSeen = false;
    this.quiet = 0;
    this.lastMove = '';
    this.r = IDLE;
    this.play = -1;
    if (this.settings.playback !== 'off' && this.played[this.settings.slot]) {
      this.play = 0;
      this.playSlot = this.settings.slot;
    }
  }

  get recording(): boolean {
    return this.recSlot >= 0;
  }

  /** Steps recorded so far (0 until the first input). */
  get recorded(): number {
    return this.recFrames;
  }

  /** The player takes control of the dummy; recording starts on their first input. */
  startRecording(slot = this.settings.slot): void {
    this.recSlot = slot;
    this.recRuns = [];
    this.recFrames = 0;
    this.play = -1;
  }

  /** Recording: the player's input this step (screen directions) becomes the dummy's; true once the ten seconds are up. */
  record(bits: number, facing: number): boolean {
    if (this.recSlot < 0) return true;
    if (this.recFrames === 0 && bits === 0) return false;
    const rel = relative(bits, facing);
    const runs = this.recRuns;
    const n = runs.length;
    if (n && runs[n - 2] === rel) runs[n - 1]++;
    else runs.push(rel, 1);
    return ++this.recFrames >= RECORD_FRAMES;
  }

  /** Ends the recording and keeps it in its slot (unless nothing was pressed). */
  stopRecording(): void {
    if (this.recSlot < 0) return;
    if (this.recFrames > 0) this.store(this.recSlot, { frames: this.recFrames, runs: this.recRuns });
    this.recSlot = -1;
    this.recRuns = [];
    this.recFrames = 0;
  }

  store(slot: number, r: Recording | null): void {
    this.slots[slot] = r;
    this.played[slot] = r && r.frames > 0 ? expand(r) : null;
    if (this.playSlot === slot) this.play = -1;
  }

  /** P2's input for the coming step, read from the match before it. */
  next(m: MatchState, side = 1): number {
    const s = this.settings;
    const d = m.fighters[side];
    this.watch(m, side);

    // A recording playing on a loop or from a reset comes before everything else.
    if (s.playback === 'off') this.play = -1;
    else if (s.playback === 'loop' && (this.play < 0 || this.play >= (this.played[this.playSlot]?.length ?? 0))) {
      this.playSlot = s.slot;
      this.play = this.played[s.slot] ? 0 : -1;
    }
    if (this.play >= 0) {
      const rec = this.played[this.playSlot];
      if (rec && this.play < rec.length) return relative(rec[this.play++], d.facing);
      this.play = -1;
    }

    // Cut Away as soon as a combo is on it (the second hit), tapped so each press is fresh.
    if (s.cutAway && (d.mode === 'hitstun' || d.mode === 'launched') && d.combo >= 2 && d.meter >= METER_MAX && !d.cutAwayUsed && !d.ko) return m.frame & 1 ? METER : 0;
    if (s.wakeup === 'stayDown' && d.mode === 'down') return DOWN;

    // The answer: armed while it's stunned, counted from the step it can act.
    const left = stunLeft(d);
    if (left >= 0) {
      this.answer = d.mode === 'blockstun' ? s.afterBlock : d.mode === 'hitstun' ? s.afterHit : s.wakeup;
      this.r = -left;
    } else if (this.r !== IDLE) {
      this.r = this.r < 0 ? IDLE : this.r + 1;
      if (this.r > this.answerEnd(this.answer)) this.r = IDLE;
    }
    const guard = this.guard(m, side);
    if (this.r === IDLE || this.answer === 'none' || this.answer === 'stayDown') return guard;
    const bits = this.answerBits(d, this.r);
    return this.r < 0 ? bits | guard : bits;
  }

  /** Keeps track of what the attacker is up to: a new move rolls the 'random' coin; a hit or a quiet spell sets 'after'. */
  private watch(m: MatchState, side: number): void {
    const d = m.fighters[side];
    const a = m.fighters[1 - side];
    if (a.mode === 'move' && (a.move !== this.lastMove || a.moveFrame < this.lastFrame)) this.roll = nextInt(this.rng, 2) === 0;
    this.lastMove = a.mode === 'move' ? a.move : '';
    this.lastFrame = a.mode === 'move' ? a.moveFrame : 0;
    if (d.mode === 'hitstun' || d.mode === 'launched' || d.mode === 'thrown') {
      this.hitSeen = true;
      this.quiet = 0;
    } else if (free(d) && a.mode !== 'move' && ++this.quiet >= QUIET) this.hitSeen = false;
  }

  /** What it holds to guard (or not) this step. */
  private guard(m: MatchState, side: number): number {
    const s = this.settings;
    if (s.stance === 'duck') return DOWN;
    const crouch = s.stance === 'crouch' ? DOWN : 0;
    const inc = this.inc;
    incoming(m, side, inc);
    let block: boolean;
    switch (s.guard) {
      case 'none':
        block = false;
        break;
      case 'all':
        block = true;
        break;
      case 'after':
        block = this.hitSeen;
        break;
      case 'random':
        block = this.roll;
        break;
      case 'flawless':
        // Down a step or two before the hit: never held from earlier, or it wouldn't be flawless.
        block = inc.n <= FLAWLESS_LEAD;
        break;
    }
    if (!block) return crouch;
    if (s.stance === 'crouch' || inc.n === NONE) return BLOCK | crouch;
    return inc.height === 'low' ? BLOCK | DOWN : inc.height === 'overhead' ? BLOCK : BLOCK | crouch;
  }

  private answerEnd(a: Answer): number {
    switch (a) {
      case 'boost':
        return 3;
      case 'jump':
        return 2;
      case 'recording':
        return (this.played[this.settings.slot]?.length ?? 0) - 1;
      default:
        return 0;
    }
  }

  /** The answer's input on its step r (directions turned by the way the dummy faces). */
  private answerBits(d: FighterState, r: number): number {
    const f = d.facing;
    switch (this.answer) {
      case 'jab':
        return r === 0 ? FP : 0;
      case 'throw':
        return r === 0 ? THROW : 0;
      case 'reversal':
        return r === 0 ? dirBits(reversalSpecial(d.fighter).dir, f) | SPECIAL : 0;
      case 'boost':
        // Special, and again three steps later: the boost.
        return r === 0 ? dirBits(boostSpecial(d.fighter).dir, f) | SPECIAL : r === 3 && d.meter >= BAR ? SPECIAL : 0;
      case 'jump':
        return r >= 0 ? UP : 0;
      case 'backdash':
        // Back, let go, back: the second tap lands as it can act.
        return r === -2 || r === 0 ? dirBits('b', f) : 0;
      case 'recording': {
        const rec = this.played[this.settings.slot];
        return rec && r >= 0 && r < rec.length ? relative(rec[r], f) : 0;
      }
      default:
        return 0;
    }
  }
}

function free(f: FighterState): boolean {
  return f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard';
}

/** Steps before a stunned fighter acts again (0: it acts on the coming step), or -1 if it isn't in a stun that ends by itself. */
export function stunLeft(f: FighterState): number {
  switch (f.mode) {
    case 'blockstun':
    case 'hitstun':
    case 'getup':
      return f.hitstop + f.timer;
    case 'down':
    case 'launched':
      // Too far off to matter: armed for the wakeup, nothing pressed yet.
      return NONE;
    default:
      return -1;
  }
}

/**
 * The next hit coming at fighter `di`: the attacker's move's next hit that
 * hasn't connected, or a projectile about to reach them. The hit lands on
 * the step its frame comes round, after the attacker's freeze.
 */
function incoming(m: MatchState, di: number, out: Incoming): void {
  out.n = NONE;
  const a = m.fighters[1 - di];
  const d = m.fighters[di];
  if (a.mode === 'move') {
    const mv = moveData(a.fighter, a.move);
    for (let k = 0; k < mv.hits.length; k++) {
      const h = mv.hits[k];
      if (a.hitMask & (1 << k) || h.frames[1] < a.moveFrame) continue;
      out.n = a.hitstop + Math.max(0, h.frames[0] - a.moveFrame - 1);
      out.height = h.height;
      break;
    }
  }
  for (const p of m.projectiles) {
    if (!p.active || p.owner === di) continue;
    const pd = moveData(m.fighters[p.owner].fighter, p.move).spawns[p.spawn].projectile;
    if (pd.decoy) continue;
    const waiting = Math.max(0, (pd.delay ?? 0) - (pd.life - p.life));
    for (let k = 0; k <= LOOKAHEAD && k < out.n; k++) {
      const go = Math.max(0, k + 1 - waiting);
      if (touchesFighter(p.x + p.dir * pd.vx * go, p.y + pd.vy * go, p.dir, pd.box, d)) {
        out.n = Math.max(k, p.rehit);
        out.height = pd.effect.height;
        break;
      }
    }
  }
}

const GUARD_TEXT: Readonly<Record<Guard, string>> = { none: 'no guard', all: 'blocks all', after: 'blocks after the first hit', random: 'blocks at random', flawless: 'blocks flawlessly' };
const ANSWER_TEXT: Readonly<Record<Answer, string>> = { none: '', jab: 'jab', throw: 'throw', reversal: 'reversal', boost: 'boosted special', jump: 'jump', backdash: 'backdash', recording: 'recording', stayDown: 'stays down' };

/** The dummy in a line, for training's readout. */
export function dummySummary(s: DummySettings): string {
  const parts = [s.stance === 'duck' ? 'ducks' : GUARD_TEXT[s.guard]];
  if (s.stance === 'crouch') parts.push('crouching');
  if (s.afterBlock !== 'none') parts.push(`after a block: ${ANSWER_TEXT[s.afterBlock]}`);
  if (s.afterHit !== 'none') parts.push(`after a hit: ${ANSWER_TEXT[s.afterHit]}`);
  if (s.wakeup !== 'none') parts.push(`getting up: ${ANSWER_TEXT[s.wakeup]}`);
  if (s.cutAway) parts.push('Cut Away');
  if (s.playback !== 'off') parts.push(`slot ${s.slot + 1} ${s.playback === 'loop' ? 'on a loop' : 'from each reset'}`);
  return `Dummy: ${parts.join(' · ')}`;
}
