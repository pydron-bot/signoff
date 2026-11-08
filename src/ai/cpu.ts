/**
 * The CPU opponent. It sends input frames like a player and only looks at
 * what a player could see on screen: positions, what the opponent is doing
 * (its animation), health and meter, and projectiles in flight. It sees the
 * opponent a few frames late (its reaction time) and knows its own state.
 * It has its own seeded random numbers, so a match against it replays
 * exactly from the same seed.
 */
import { BAR, Input, TD_HEALTH_PCT, fighterData, moveData, stringMoves, type FighterData, type FighterState, type MatchState, type MoveData } from '../sim';
import { fx, type Fx } from '../sim/fixed';
import { createRng, nextInt, type RngState } from '../sim/rng';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, METER } = Input;

export type CpuLevel = 'easy' | 'normal' | 'hard';

interface Level {
  /** Frames late it sees the opponent. */
  delay: number;
  /** Percent chances. */
  block: number;
  tech: number;
  antiAir: number;
  boost: number;
  /** Frames between decisions. */
  think: number;
}

const LEVELS: Readonly<Record<CpuLevel, Level>> = {
  easy: { delay: 24, block: 20, tech: 10, antiAir: 15, boost: 0, think: 26 },
  normal: { delay: 15, block: 50, tech: 35, antiAir: 45, boost: 30, think: 14 },
  hard: { delay: 10, block: 78, tech: 60, antiAir: 75, boost: 80, think: 7 },
};

const HISTORY = 32;

/** What the CPU saw of its opponent on one frame. */
interface Seen {
  x: Fx;
  y: Fx;
  mode: string;
  move: string;
  /** Visibly mid-attack within reach, or a projectile coming. */
  threat: boolean;
  low: boolean;
}

/** A plan gives the input for each frame until it returns null. */
type Plan = (me: FighterState, t: number) => number | null;

export class Cpu {
  private readonly rng: RngState;
  private readonly level: Level;
  private readonly seen: Seen[] = Array.from({ length: HISTORY }, () => ({ x: 0, y: 0, mode: 'idle', move: '', threat: false, low: false }));
  private frames = 0;
  private plan: Plan | null = null;
  private planT = 0;
  private wait = 0;
  private techTried = false;

  constructor(
    private readonly player: 0 | 1,
    level: CpuLevel,
    seed: number,
  ) {
    this.level = LEVELS[level];
    this.rng = createRng(seed);
  }

  private roll(pct: number): boolean {
    return nextInt(this.rng, 100) < pct;
  }

  /** This frame's input. Call once per step, before stepping the match. */
  next(m: MatchState): number {
    const me = m.fighters[this.player];
    const them = m.fighters[1 - this.player];
    this.observe(m, me, them);
    if (m.phase !== 'fight') {
      this.plan = null;
      return 0;
    }
    const s = this.seen[(this.frames - 1 - Math.min(this.level.delay, this.frames - 1) + HISTORY * 4) % HISTORY];

    if (me.mode === 'thrown') {
      if (!this.techTried) {
        this.techTried = true;
        if (this.roll(this.level.tech)) return THROW;
      }
      return 0;
    }
    this.techTried = false;
    if ((me.mode === 'hitstun' || me.mode === 'launched') && me.meter >= 2 * BAR && !me.cutAwayUsed && this.roll(2)) return METER;

    if (this.plan) {
      const out = this.plan(me, this.planT++);
      if (out !== null) return out;
      this.plan = null;
    }
    if (!actionable(me)) return 0;
    if (s.threat && this.roll(this.level.block)) {
      this.start(hold(BLOCK | (s.low ? DOWN : 0), 12 + nextInt(this.rng, 10)));
      return this.next0(me);
    }
    if (this.wait > 0) {
      this.wait--;
      return 0;
    }
    this.decide(me, s);
    this.wait = this.level.think + nextInt(this.rng, this.level.think);
    return this.next0(me);
  }

  private next0(me: FighterState): number {
    if (!this.plan) return 0;
    const out = this.plan(me, this.planT++);
    if (out === null) this.plan = null;
    return out ?? 0;
  }

  private start(p: Plan): void {
    this.plan = p;
    this.planT = 0;
  }

  private observe(m: MatchState, me: FighterState, them: FighterState): void {
    const s = this.seen[this.frames % HISTORY];
    this.frames++;
    s.x = them.x;
    s.y = them.y;
    s.mode = them.mode;
    s.move = them.move;
    const dist = Math.abs(them.x - me.x);
    let threat = false;
    let low = false;
    if (them.mode === 'move') {
      const mv = moveData(them.fighter, them.move);
      threat = mv.hits.length > 0 && dist < reach(mv) + fx(0.4);
      // A crouching attack is the tell for a low.
      low = mv.stance === 'crouch';
    }
    for (const p of m.projectiles) {
      if (p.active && p.owner !== this.player && Math.abs(p.x - me.x) < fx(2.2) && Math.sign(me.x - p.x) === p.dir) threat = true;
    }
    s.threat = threat;
    s.low = low;
  }

  private decide(me: FighterState, s: Seen): void {
    const d = fighterData(me.fighter);
    const dist = Math.abs(s.x - me.x);
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    const back = me.facing > 0 ? LEFT : RIGHT;
    const zoner = me.fighter === 'dale';
    const r = nextInt(this.rng, 100);

    if (!me.tdUsed && me.health * 100 < me.maxHealth * TD_HEALTH_PCT && dist < fx(1.3) && this.roll(25)) {
      this.start(tap(BLOCK | SPECIAL, BLOCK));
      return;
    }
    if (s.y > fx(0.3) && dist < fx(1.6) && this.roll(this.level.antiAir)) {
      this.start(tap(DOWN | BP));
      return;
    }
    if (dist < fx(1.05)) {
      if (r < 50) this.start(this.string(d, me));
      else if (r < 62) this.start(tap(THROW));
      else if (r < 74) this.start(tap(DOWN | (zoner ? BK : FK)));
      else if (r < 86) this.start(this.special(me, (zoner ? back : DOWN) | SPECIAL));
      else this.start(zoner ? taps([back, 0, back]) : hold(BLOCK, 16));
      return;
    }
    if (zoner) {
      if (dist > fx(2.6)) {
        if (r < 45) this.start(this.special(me, fwd | SPECIAL));
        else if (r < 70) this.start(this.special(me, DOWN | SPECIAL));
        else if (r < 85) this.start(hold(fwd, 20));
        else this.start(hold(0, 10));
      } else if (dist > fx(1.4)) {
        if (r < 35) this.start(this.special(me, back | SPECIAL));
        else if (r < 55) this.start(tap(DOWN | FK));
        else if (r < 80) this.start(hold(back, 18));
        else this.start(this.special(me, fwd | SPECIAL));
      } else {
        this.start(r < 50 ? hold(fwd, 10) : r < 75 ? tap(DOWN | FK) : taps([back, 0, back]));
      }
      return;
    }
    // Rushdown: get in.
    if (r < 40) this.start(taps([fwd, 0, fwd]));
    else if (r < 60) this.start(hold(fwd, 24));
    else if (r < 72 && dist < fx(2.2)) this.start(this.special(me, back | SPECIAL));
    else if (r < 82 && dist < fx(2.0)) this.start(this.special(me, fwd | SPECIAL));
    else if (r < 92) this.start(hold(UP | fwd, 4));
    else this.start(hold(fwd, 12));
  }

  /** A special, boosted when it has the meter and the nerve. */
  private special(me: FighterState, bits: number): Plan {
    const boost = me.meter >= BAR && this.roll(this.level.boost);
    return (_m, t) => (t === 0 ? bits : t === 3 && boost ? SPECIAL : t < 6 ? 0 : null);
  }

  /** One of the fighter's strings, each button pressed as the previous step can chain. */
  private string(d: FighterData, me: FighterState): Plan {
    const s = d.strings[nextInt(this.rng, d.strings.length)];
    const seq = stringMoves(d, s)!;
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    const first = seq[0];
    const startBits = first.startsWith('c.') ? DOWN : first.startsWith('f.') ? fwd : 0;
    const btn = (b: string) => ({ FP, BP, FK, BK })[b as 'FP'] ?? 0;
    const pressed = new Set<number>();
    return (f, t) => {
      if (t === 0) return startBits | btn(first.slice(2));
      if (f.mode !== 'move') return t < 3 ? 0 : null;
      const k = seq.indexOf(f.move);
      if (k < 0 || k + 1 >= seq.length) return 0;
      const mv: MoveData = d.moves[f.move];
      if (!pressed.has(k) && f.moveFrame >= Math.max(2, (mv.cancel?.[0] ?? 2) - 3)) {
        pressed.add(k);
        return btn(s.path[k + 1]);
      }
      return 0;
    };
  }
}

function reach(mv: MoveData): Fx {
  let r = 0;
  for (const h of mv.hits) r = Math.max(r, h.box.x + h.box.w);
  return r;
}

function actionable(f: FighterState): boolean {
  return f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard';
}

function hold(bits: number, frames: number): Plan {
  return (_m, t) => (t < frames ? bits : null);
}

/** Press once (with `hold` kept down), then let go. */
function tap(bits: number, held = 0): Plan {
  return (_m, t) => (t === 0 ? bits : t < 3 ? held : null);
}

function taps(seq: number[]): Plan {
  return (_m, t) => (t < seq.length ? seq[t] : null);
}
