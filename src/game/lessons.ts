/**
 * Lessons: short drills, each a start, a dummy script and a test of what
 * the player did, read from the step's events. Most are played with the
 * player's own fighter against Rox (the combo guides' dummy); every lesson
 * carries the presses that solve it, and the tests play them for every
 * fighter it's offered to, so a lesson that can't be cleared fails the
 * build. No DOM here.
 */
import { BAR, METER_MAX, STAY_TUNED_FRAMES, Input, fighterData, moveData, type MatchState, type SimEvent } from '../sim';
import { beginStayTuned } from '../sim/finisher';
import { fx } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import { guideInput, guides, GUIDE_DUMMY } from './comboGuides';
import { boostSpecial, relative } from './dummy';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, METER } = Input;
/** Presses as the scripts write them: f and b relative to facing (written as facing right). */
const TOKENS: Readonly<Record<string, number>> = { f: RIGHT, b: LEFT, d: DOWN, u: UP, FP, BP, FK, BK, SP: SPECIAL, BL: BLOCK, TH: THROW, M: METER };

/** Input held from step `from` to step `to` (inclusive) of an attempt. */
export interface Hold {
  from: number;
  to: number;
  bits: number;
}

/** A hold of presses written as 'BL d' (to ≥ from; one step if left out). */
export function hold(from: number, press: string, to = from): Hold {
  let bits = 0;
  for (const p of press.split(' ')) bits |= TOKENS[p] ?? 0;
  return { from, to, bits };
}

/** The input on step t of a script, turned by the way the fighter faces. */
export function scriptInput(script: readonly Hold[], t: number, facing: number): number {
  let bits = 0;
  for (const h of script) if (t >= h.from && t <= h.to) bits |= h.bits;
  return relative(bits, facing);
}

/** What happened in an attempt so far, for the lesson's test. */
export interface Attempt {
  /** Steps into the attempt (the first is 1). */
  t: number;
  /** The dummy was in the air as this step began. */
  dummyAir: boolean;
  /** Counts and marks the test keeps. */
  n: number;
  seen: boolean;
}

/** Cleared, or what went wrong, or still going. */
export type Verdict = 'pass' | string | null;

export interface Lesson {
  id: string;
  name: string;
  /** The instruction on screen. */
  caption: string;
  /** Played as this fighter; the player's own if not given. */
  p1?: string;
  /** Steps an attempt may take before it counts as missed. */
  time: number;
  /** What the timeout says (a pass for drills that are about surviving). */
  timeout?: Verdict;
  /** The start, from the round under way at round-start positions. */
  setup(m: MatchState): void;
  /** The dummy's input on step t of the attempt (from 1). */
  dummy(m: MatchState, t: number): number;
  /** Reads a step's events (from `from`). */
  judge(a: Attempt, ev: readonly SimEvent[], from: number, m: MatchState): Verdict;
  /** The presses that solve it, for a fighter. */
  solution(fighter: string): readonly Hold[];
}

/** Puts the fighters `gap` metres apart about centre (or with the dummy's back to the right wall), facing each other. */
function place(m: MatchState, gap: number, wall = false): void {
  const [a, d] = m.fighters;
  const g = fx(gap);
  if (wall) {
    d.x = segmentData(m.stage, m.segment).halfWidth - fighterData(d.fighter).pushW;
    a.x = d.x - g;
  } else {
    a.x = -(g >> 1);
    d.x = g >> 1;
  }
  a.facing = 1;
  d.facing = -1;
}

/** A script for the dummy, written facing right. */
function dummyScript(script: readonly Hold[]): (m: MatchState, t: number) => number {
  return (m, t) => scriptInput(script, t, m.fighters[1].facing);
}

function hitOnPlayer(ev: readonly SimEvent[], from: number): boolean {
  for (let i = from; i < ev.length; i++) {
    const e = ev[i];
    if (e.type === 'hit' && e.defender === 0) return true;
  }
  return false;
}

function any(ev: readonly SimEvent[], from: number, test: (e: SimEvent) => boolean): boolean {
  for (let i = from; i < ev.length; i++) if (test(ev[i])) return true;
  return false;
}

/** A move's first active frame for a fighter, so a solution can time a press off it. */
function startup(fighter: string, id: string): number {
  return moveData(fighter, id).startup;
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'block',
    name: 'Block high, then low',
    caption: 'Hold BLOCK for the overhead (it comes down from above), then ↓ BLOCK for the low kick.',
    time: 110,
    setup: (m) => place(m, 1.0),
    dummy: dummyScript([hold(20, 'f FK'), hold(62, 'd FK', 63), hold(63, 'd', 80)]),
    judge(a, ev, from) {
      if (hitOnPlayer(ev, from)) return a.n === 0 ? 'Hit by the overhead: stand to block it' : 'Hit by the low: crouch (↓ BLOCK) to block it';
      if (any(ev, from, (e) => e.type === 'block' && e.defender === 0) && ++a.n === 2) return 'pass';
      return null;
    },
    solution: () => [hold(1, 'BL', 50), hold(51, 'BL d', 100)],
  },
  {
    id: 'antiair',
    name: 'Anti-air',
    caption: 'Rox jumps in: hit her in the air before she lands (↓ BP rises to meet her).',
    time: 120,
    setup: (m) => place(m, 2.6),
    dummy: dummyScript([hold(10, 'u f', 12), hold(36, 'BK')]),
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'hit' && e.attacker === 0) && a.dummyAir) return 'pass';
      if (hitOnPlayer(ev, from)) return 'She landed it: hit her on the way down';
      return null;
    },
    solution: () => [hold(30, 'd BP')],
  },
  {
    id: 'punish',
    name: 'Punish a blocked sweep',
    caption: 'Block the sweep low (↓ BLOCK), then hit back as she recovers: ↓ BP launches.',
    time: 120,
    setup: (m) => place(m, 1.0),
    dummy: dummyScript([hold(20, 'd BK'), hold(21, 'd', 24)]),
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'punish' && e.player === 0)) return 'pass';
      if (hitOnPlayer(ev, from)) return 'Swept: block it low first';
      if (any(ev, from, (e) => e.type === 'hit' && e.attacker === 0)) a.seen = true;
      return a.seen && a.t > 90 ? 'Too late: she had recovered' : null;
    },
    solution: () => [hold(1, 'BL d', 40), hold(41, 'd', 50), hold(41, 'BP')],
  },
  {
    id: 'flawless',
    name: 'Flawless block',
    caption: 'Press BLOCK just before the lunge lands (not held from earlier): no chip, and you recover sooner.',
    time: 80,
    setup: (m) => place(m, 1.0),
    dummy: dummyScript([hold(30, 'f BP')]),
    judge(_a, ev, from) {
      if (any(ev, from, (e) => e.type === 'flawless' && e.player === 0)) return 'pass';
      if (any(ev, from, (e) => e.type === 'block' && e.defender === 0)) return 'Blocked, but too early: press it just before the hit';
      if (hitOnPlayer(ev, from)) return 'Too late: press BLOCK a moment sooner';
      return null;
    },
    solution: () => [hold(37, 'BL', 60)],
  },
  {
    id: 'tech',
    name: 'Break a throw',
    caption: 'She grabs you: press THROW straight away to break it.',
    time: 90,
    setup: (m) => place(m, 0.8),
    dummy: dummyScript([hold(20, 'TH')]),
    judge(_a, ev, from) {
      if (any(ev, from, (e) => e.type === 'throwTech')) return 'pass';
      if (hitOnPlayer(ev, from)) return 'Thrown: press THROW as she grabs you';
      return null;
    },
    solution: () => [hold(27, 'TH')],
  },
  {
    id: 'duck',
    name: 'Duck a throw and launch',
    caption: 'Hold ↓ (no BLOCK) and the throw goes over you; then ↓ BP while she misses.',
    time: 100,
    setup: (m) => place(m, 0.8),
    dummy: dummyScript([hold(20, 'TH')]),
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'ducked' && e.player === 0)) a.seen = true;
      if (a.seen && any(ev, from, (e) => e.type === 'hit' && e.attacker === 0)) return 'pass';
      if (hitOnPlayer(ev, from)) return 'Thrown: hold ↓ without BLOCK';
      return null;
    },
    solution: () => [hold(1, 'd', 29), hold(30, 'd BP')],
  },
  {
    id: 'getup',
    name: 'Stay down',
    caption: "You're down and she's waiting: hold ↓ to get up later, and her kick misses.",
    time: 110,
    timeout: 'pass',
    setup(m) {
      place(m, 0.9);
      const a = m.fighters[0];
      a.mode = 'down';
      a.timer = 25;
    },
    // Timed to meet a getup on the usual frame.
    dummy: dummyScript([hold(38, 'FK')]),
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'delayedGetup' && e.player === 0)) a.seen = true;
      if (hitOnPlayer(ev, from)) return 'Caught getting up: hold ↓ while you are down';
      return a.seen || a.t < 80 ? null : 'Up too soon: hold ↓ while you are down';
    },
    solution: () => [hold(1, 'd', 30)],
  },
  {
    id: 'boost',
    name: 'Boost a special',
    caption: 'A special, then SP again straight away (SP SP): the boosted version, for a bar.',
    time: 120,
    setup(m) {
      place(m, 0.9);
      m.fighters[0].meter = BAR;
    },
    dummy: () => 0,
    judge(a, ev, from) {
      for (let i = from; i < ev.length; i++) {
        const e = ev[i];
        if (e.type === 'boost' && e.player === 0) a.seen = true;
        if (a.seen && e.type === 'hit' && e.attacker === 0 && e.move.endsWith('+')) return 'pass';
      }
      return null;
    },
    solution(f) {
      const dir = { n: '', f: 'f ', b: 'b ', d: 'd ' }[boostSpecial(f).dir];
      return [hold(10, `${dir}SP`), hold(13, 'SP')];
    },
  },
  {
    id: 'tapeskip',
    name: 'Tape Skip',
    caption: 'Your kick is blocked: METER as it recovers, and Tape Skip cancels it into a dash (1 bar).',
    time: 100,
    setup(m) {
      place(m, 1.0);
      m.fighters[0].meter = BAR;
    },
    dummy: () => BLOCK,
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'block' && e.attacker === 0)) a.seen = true;
      if (any(ev, from, (e) => e.type === 'tapeSkip' && e.player === 0)) return a.seen ? 'pass' : 'Skipped before it was blocked: wait for the block';
      return null;
    },
    solution: (f) => [hold(10, 'BK'), hold(10 + startup(f, fighterData(f).normals.s.BK) + 10, 'M')],
  },
  {
    id: 'cutaway',
    name: 'Cut Away',
    caption: 'Full meter and caught in a combo: press METER while you are being hit to break it.',
    time: 200,
    setup(m) {
      place(m, 0.8);
      m.fighters[0].meter = METER_MAX;
    },
    // Rox's own combo from her jab.
    dummy: (m, t) => guideInput(guides(GUIDE_DUMMY)[0], t - 10, m.fighters[1].facing),
    judge(a, ev, from) {
      if (any(ev, from, (e) => e.type === 'cutAway' && e.player === 0)) return 'pass';
      if (hitOnPlayer(ev, from)) a.n++;
      return null;
    },
    solution: () => [hold(26, 'M'), hold(30, 'M'), hold(34, 'M')],
  },
  {
    id: 'td',
    name: 'Technical Difficulties',
    caption: 'Under 30% health: BLOCK + SP, close up. Land it and it is gone for the match.',
    time: 120,
    setup(m) {
      place(m, 0.9);
      const a = m.fighters[0];
      a.health = Math.floor(a.maxHealth / 4);
    },
    dummy: () => 0,
    judge: (_a, ev, from) => (any(ev, from, (e) => e.type === 'superHit' && e.player === 0) ? 'pass' : null),
    solution: () => [hold(8, 'BL', 12), hold(10, 'SP')],
  },
  {
    id: 'signoff',
    name: 'A Sign-Off',
    caption: 'Stay tuned: close up with her back to the wall, → ↓ BLOCK is the Stage Sign-Off.',
    time: 240,
    setup(m) {
      place(m, 1.0, true);
      const [a, d] = m.fighters;
      a.wins = 2;
      d.health = 0;
      d.ko = true;
      m.phase = 'stayTuned';
      m.phaseTimer = STAY_TUNED_FRAMES;
      m.matchWinner = 0;
      beginStayTuned(m);
    },
    dummy: () => 0,
    judge: (_a, ev, from) => (any(ev, from, (e) => e.type === 'finisher' && e.player === 0 && e.kind === 'signoff') ? 'pass' : null),
    solution: () => [hold(10, 'f'), hold(14, 'd'), hold(17, 'BL')],
  },
];

export function lesson(id: string): Lesson | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/** Where cleared lessons are kept, by id. */
export const LESSONS_KEY = 'signoff.lessons';

/** One lesson being played: the attempt's step, its test, and how it went. */
export class LessonRun {
  readonly attempt: Attempt = { t: 0, dummyAir: false, n: 0, seen: false };
  /** null while the attempt goes on. */
  result: Verdict = null;
  passes = 0;
  /** Bumped on every change, so a caption can tell when to rebuild. */
  version = 0;

  constructor(readonly lesson: Lesson) {}

  restart(): void {
    const a = this.attempt;
    a.t = 0;
    a.dummyAir = false;
    a.n = 0;
    a.seen = false;
    this.result = null;
    this.version++;
  }

  /** The dummy's input for the coming step. */
  dummy(m: MatchState): number {
    this.attempt.dummyAir = m.fighters[1].y > 0;
    return this.result === null ? this.lesson.dummy(m, this.attempt.t + 1) : 0;
  }

  /** After each step, with that step's events from `from`. */
  after(m: MatchState, ev: readonly SimEvent[], from: number): void {
    if (this.result !== null) return;
    const a = this.attempt;
    a.t++;
    let v = this.lesson.judge(a, ev, from, m);
    if (v === null && a.t >= this.lesson.time) v = this.lesson.timeout ?? 'Too slow: try again';
    if (v === null) return;
    this.result = v;
    if (v === 'pass') this.passes++;
    this.version++;
  }
}

/** The lesson's caption, and how the last attempt went. */
export function lessonLine(run: LessonRun): string {
  const r = run.result;
  const status = r === 'pass' ? 'CLEARED · again, or Esc for the next' : r ?? (run.passes ? `cleared ×${run.passes}` : '');
  return `${run.lesson.name.toUpperCase()} · ${run.lesson.caption}${status ? `\n${status}` : ''}`;
}
