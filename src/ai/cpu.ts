/**
 * The CPU opponent. It sends input frames like a player and only looks at
 * what a player could see on screen: positions, what the opponent is doing
 * (its animation), health and meter, and projectiles in flight. It sees the
 * opponent a few frames late (its reaction time) and knows its own state.
 * It has its own seeded random numbers, so a match against it replays
 * exactly from the same seed.
 */
import { BAR, Input, METER_MAX, TD_HEALTH_PCT, fighterData, moveData, stringMoves, type FighterData, type FighterState, type FinisherData, type MatchState, type MoveData } from '../sim';
import { fx, type Fx } from '../sim/fixed';
import { createRng, nextInt, type RngState } from '../sim/rng';
import { propInReach } from '../sim/stage';
import { segmentData } from '../sim/stages';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, INTERACT, METER } = Input;

export type CpuLevel = 'easy' | 'normal' | 'hard';

interface Level {
  /** Frames late it sees the opponent. */
  delay: number;
  /** Percent chances. */
  block: number;
  tech: number;
  antiAir: number;
  boost: number;
  /** Chance a decoy draws its attention. */
  fooled: number;
  /** Frames between decisions. */
  think: number;
}

const LEVELS: Readonly<Record<CpuLevel, Level>> = {
  easy: { delay: 24, block: 20, tech: 10, antiAir: 15, boost: 0, fooled: 70, think: 26 },
  normal: { delay: 15, block: 50, tech: 35, antiAir: 45, boost: 30, fooled: 40, think: 14 },
  hard: { delay: 10, block: 78, tech: 60, antiAir: 75, boost: 80, fooled: 15, think: 7 },
};

const HISTORY = 32;
/** Steps of nothing before entering a finisher. */
const SETTLE = 14;
/** Where it stands for each finisher range (centre distance). */
const FINISH_BAND = { close: [0, fx(1.0)], mid: [fx(1.65), fx(2.05)], far: [fx(2.8), fx(99)] } as const;

/** What the CPU saw of its opponent on one frame. */
interface Seen {
  x: Fx;
  y: Fx;
  mode: string;
  move: string;
  /** Visibly mid-attack within reach, or a projectile coming. */
  threat: boolean;
  low: boolean;
  /** An opponent's projectile coming this way. */
  projectile: boolean;
  /** Visibly stuck in the recovery of a move. */
  recovering: boolean;
  /** Winding up an attack that can't be blocked, in reach. */
  unblockable: boolean;
  /** Holding a guard. */
  guarding: boolean;
}

/** A plan gives the input for each frame until it returns null. */
type Plan = (me: FighterState, t: number) => number | null;

export class Cpu {
  private readonly rng: RngState;
  private readonly level: Level;
  private readonly seen: Seen[] = Array.from({ length: HISTORY }, () => ({ x: 0, y: 0, mode: 'idle', move: '', threat: false, low: false, projectile: false, recovering: false, unblockable: false, guarding: false }));
  private frames = 0;
  private plan: Plan | null = null;
  private planT = 0;
  private wait = 0;
  /** Knocked down: whether to stay down a moment (decided once a knockdown); -1 until decided. */
  private stayDown = -1;
  private techTried = false;
  /** Whether the opponent's current decoy has its attention. */
  private decoyFools = false;
  private decoyWas = false;
  /** It has a decoy of its own out. */
  private ownDecoy = false;
  /** After winning: the finisher it chose (null: it lets the moment pass) and the step of entering it. */
  private finishing: { fin: FinisherData | null; t: number } | null = null;

  constructor(
    private readonly player: 0 | 1,
    level: CpuLevel,
    seed: number,
  ) {
    this.level = LEVELS[level];
    this.rng = createRng(seed);
  }

  /** "Stay tuned" after it won: pick a finisher, walk into its range, enter it like a player would. */
  private finish(me: FighterState, them: FighterState): number {
    if (!this.finishing) {
      const all = fighterData(me.fighter).finishers;
      const signOffs = all.filter((f) => f.kind === 'signoff');
      const pass = this.level === LEVELS.easy ? 50 : 10;
      // Mostly a Sign-Off; now and then it shows mercy.
      const fin = this.roll(pass) ? null : this.roll(10) ? (all.find((f) => f.kind === 'rerun') ?? null) : signOffs[nextInt(this.rng, signOffs.length)];
      this.finishing = { fin, t: 0 };
    }
    const f = this.finishing.fin;
    if (!f || them.mode !== 'dazed') return 0;
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    const back = me.facing > 0 ? LEFT : RIGHT;
    if (this.finishing.t === 0 && f.range !== 'any') {
      // Well inside the range, so the taps' few steps of walking don't carry it out.
      const dist = Math.abs(them.x - me.x);
      const [lo, hi] = FINISH_BAND[f.range];
      if (dist < lo) return back;
      if (dist > hi) return fwd;
    }
    // A pause (so a tap doesn't read as a dash after walking), each tap held two steps with a gap, then the button.
    const t = this.finishing.t++;
    if (t < SETTLE) return 0;
    const k = t - SETTLE;
    const tap = Math.floor(k / 4);
    if (tap < f.input.length) {
      if (k % 4 >= 2) return 0;
      const d = f.input[tap];
      return d === 'f' ? fwd : d === 'b' ? back : d === 'd' ? DOWN : UP;
    }
    return tap === f.input.length && k % 4 === 0 ? (f.button === 'block' ? BLOCK : Input.ATTACK_BITS[f.button]) : 0;
  }

  private roll(pct: number): boolean {
    return nextInt(this.rng, 100) < pct;
  }

  /** This frame's input. Call once per step, before stepping the match. */
  next(m: MatchState): number {
    const me = m.fighters[this.player];
    const them = m.fighters[1 - this.player];
    this.observe(m, me, them);
    if (m.phase === 'stayTuned' && m.matchWinner === this.player) return this.finish(me, them);
    if (m.phase !== 'fight') {
      this.plan = null;
      if (m.phase === 'intro') this.finishing = null;
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
    // Knocked down: sometimes hold Down to get up late, as often as it techs throws.
    if (me.mode === 'down') {
      if (this.stayDown < 0) this.stayDown = this.roll(this.level.tech / 2) ? 1 : 0;
      return this.stayDown ? DOWN : 0;
    }
    this.stayDown = -1;
    if ((me.mode === 'hitstun' || me.mode === 'launched') && me.meter >= METER_MAX && !me.cutAwayUsed && this.roll(2)) return METER;

    if (this.plan) {
      const out = this.plan(me, this.planT++);
      if (out !== null) return out;
      this.plan = null;
    }
    if (!actionable(me)) return 0;
    // A marked hazard is on screen for everyone: step out of it.
    const away = this.hazardEscape(m, me);
    if (away) {
      this.start(hold(away, 18));
      return this.next0(me);
    }
    // An unblockable is jumped, not blocked.
    if (s.unblockable && this.roll(this.level.block)) {
      this.start(hold(UP | (me.facing > 0 ? LEFT : RIGHT), 4));
      return this.next0(me);
    }
    const style = fighterData(me.fighter).style;
    if (s.threat && style === 'zoner' && Math.abs(s.x - me.x) < fx(1.2) && this.roll(this.level.block / 4)) {
      // Heat Lightning goes through the attack.
      this.start(tap(SPECIAL));
      return this.next0(me);
    }
    // Footsies reads the attack coming with the teleprompter.
    if (s.threat && !s.projectile && style === 'footsies' && Math.abs(s.x - me.x) < fx(1.8) && this.roll(this.level.block / 4)) {
      this.start(this.special(me, (me.facing > 0 ? LEFT : RIGHT) | SPECIAL));
      return this.next0(me);
    }
    // Rushdown jumps over projectiles from range.
    if (s.projectile && (style === 'rushdown' || style === 'trickster') && this.roll(this.level.antiAir)) {
      this.start(hold(UP | (me.facing > 0 ? RIGHT : LEFT), 4));
      return this.next0(me);
    }
    if (s.threat && this.roll(this.level.block)) {
      this.start(hold(BLOCK | (s.low ? DOWN : 0), 12 + nextInt(this.rng, 10)));
      return this.next0(me);
    }
    if (this.wait > 0) {
      this.wait--;
      return 0;
    }
    if (propInReach(m, me) >= 0 && this.roll(35)) this.start(tap(INTERACT));
    else this.decide(me, s);
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
    s.guarding = them.mode === 'guard' || them.mode === 'blockstun';
    // A decoy on screen may draw its attention: decided once per decoy.
    let decoyX: Fx | null = null;
    for (let p = 0; p < m.projectiles.length; p++) {
      const P = m.projectiles[p];
      if (P.active && P.owner !== this.player && moveData(them.fighter, P.move).spawns[P.spawn].projectile.decoy) decoyX = P.x;
    }
    this.ownDecoy = false;
    for (let p = 0; p < m.projectiles.length; p++) {
      const P = m.projectiles[p];
      if (P.active && P.owner === this.player && moveData(me.fighter, P.move).spawns[P.spawn].projectile.decoy) this.ownDecoy = true;
    }
    if (decoyX !== null && !this.decoyWas) this.decoyFools = this.roll(this.level.fooled);
    this.decoyWas = decoyX !== null;
    if (decoyX !== null && this.decoyFools) {
      s.x = decoyX;
      s.y = 0;
    }
    const dist = Math.abs(them.x - me.x);
    let threat = false;
    let low = false;
    s.recovering = false;
    s.unblockable = false;
    if (them.mode === 'move') {
      const mv = moveData(them.fighter, them.move);
      s.recovering = mv.lastActive > 0 && them.moveFrame > mv.lastActive && mv.total - them.moveFrame > 8;
      threat = mv.hits.length > 0 && dist < reach(mv) + fx(0.4);
      s.unblockable = threat && mv.hits.some((h) => h.height === 'unblockable');
      // A crouching attack is the tell for a low.
      low = mv.stance === 'crouch';
    }
    let projectile = false;
    for (const p of m.projectiles) {
      if (!p.active || p.owner === this.player || Math.sign(me.x - p.x) !== p.dir) continue;
      const near = Math.abs(p.x - me.x);
      if (near < fx(2.2)) threat = true;
      if (near > fx(1.4) && near < fx(3.2) && p.y < fx(1)) projectile = true;
    }
    s.threat = threat;
    s.projectile = projectile;
    s.low = low;
  }

  /** A direction out of an announced hazard about to strike here, or 0. */
  private hazardEscape(m: MatchState, me: FighterState): number {
    const seg = segmentData(m.stage, m.segment);
    for (let k = 0; k < m.hazards.length; k++) {
      const hz = seg.hazards[k];
      const t = (m.roundFrame - hz.first) % hz.period;
      if (m.roundFrame < hz.first || t >= hz.warn) continue;
      const spots = hz.all ? hz.spots : [hz.spots[m.hazards[k].spot]];
      for (const x of spots) {
        if (Math.abs(me.x - x) < hz.halfW + fx(0.5)) return me.x >= x ? RIGHT : LEFT;
      }
    }
    return 0;
  }

  private decide(me: FighterState, s: Seen): void {
    const d = fighterData(me.fighter);
    const dist = Math.abs(s.x - me.x);
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    const back = me.facing > 0 ? LEFT : RIGHT;
    const r = nextInt(this.rng, 100);

    if (!me.tdUsed && me.health * 100 < me.maxHealth * TD_HEALTH_PCT && dist < fx(1.3) && this.roll(25)) {
      this.start(tap(BLOCK | SPECIAL, BLOCK));
      return;
    }
    if (s.y > fx(0.3) && dist < fx(1.6) && this.roll(this.level.antiAir)) {
      this.start(tap(DOWN | BP));
      return;
    }
    // Punish what it can see recovering.
    if (s.recovering && dist < fx(1.3) && this.roll(this.level.antiAir)) {
      this.start(d.style === 'grappler' && r < 50 ? this.special(me, fwd | SPECIAL) : r < 60 ? this.string(d, me) : tap(DOWN | BK));
      return;
    }
    if (s.recovering && d.style === 'rushdown' && dist < fx(2.4) && this.roll(this.level.antiAir)) {
      this.start(this.special(me, back | SPECIAL));
      return;
    }
    // Now and then it goes over the top: a jump-in, with an air attack or its air special.
    if (dist > fx(1.3) && dist < fx(2.8) && this.roll(this.level === LEVELS.easy ? 4 : 8)) {
      this.start(this.jumpIn(me, d));
      return;
    }
    switch (d.style) {
      case 'zoner':
        return this.zoner(me, d, dist, r, fwd, back);
      case 'rushdown':
        return this.rushdown(me, d, dist, r, fwd, back);
      case 'grappler':
        return this.grappler(me, d, s, dist, r, fwd, back);
      case 'trickster':
        return this.trickster(me, d, s, dist, r, fwd, back);
      case 'footsies':
        return this.footsies(me, d, dist, r, fwd, back);
      case 'midrange':
        return this.midrange(me, d, dist, r, fwd, back);
      case 'allrounder':
        return this.allrounder(me, d, dist, r, fwd, back);
    }
  }

  /** A bit of everything: the plate from range to collect, the blast when it's paid for, a heal when hurt and holding a donation. */
  private allrounder(me: FighterState, d: FighterData, dist: Fx, r: number, fwd: number, back: number): void {
    const blessed = me.donations >= 2;
    if (me.donations >= 1 && me.health * 3 < me.maxHealth && dist > fx(2.2) && r < 50) {
      this.start(this.special(me, DOWN | SPECIAL));
      return;
    }
    if (dist < fx(1.1)) {
      if (blessed && r < 30) this.start(this.special(me, SPECIAL));
      else if (r < 45) this.start(this.string(d, me));
      else if (r < 57) this.start(tap(THROW));
      else if (r < 67) this.start(this.special(me, DOWN | SPECIAL));
      else if (r < 77) this.start(tap(DOWN | BK));
      else this.start(taps([back, 0, back]));
    } else if (dist < fx(1.8)) {
      if (r < 25) this.start(tap(BK));
      else if (r < 40) this.start(tap(DOWN | FK));
      else if (r < 55) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 75) this.start(hold(fwd, 10));
      else this.start(hold(back, 10));
    } else {
      if (r < 45) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 80) this.start(hold(fwd, 16));
      else this.start(hold(0, 10));
    }
  }

  /** Holds the space at the tip of the cleaver: long pokes, fire on the floor as they come in, pans from range, the mallet up close. */
  private midrange(me: FighterState, d: FighterData, dist: Fx, r: number, fwd: number, back: number): void {
    if (dist < fx(1.05)) {
      if (r < 35) this.start(this.string(d, me));
      else if (r < 50) this.start(this.special(me, SPECIAL));
      else if (r < 60) this.start(tap(THROW));
      else if (r < 75) this.start(tap(back | BP));
      else this.start(hold(back, 14));
    } else if (dist < fx(1.9)) {
      if (r < 22) this.start(tap(BK));
      else if (r < 38) this.start(tap(BP));
      else if (r < 50) this.start(tap(DOWN | FK));
      else if (r < 60) this.start(this.special(me, DOWN | SPECIAL));
      else if (r < 72) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 82) this.start(tap(back | BP));
      else this.start(hold(back, 10));
    } else if (dist > fx(2.6)) {
      if (r < 40) this.start(this.special(me, back | SPECIAL));
      else if (r < 75) this.start(hold(fwd, 16));
      else this.start(hold(0, 10));
    } else {
      if (r < 30) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 50) this.start(this.special(me, back | SPECIAL));
      else if (r < 80) this.start(hold(fwd, 8));
      else this.start(hold(back, 8));
    }
  }

  /** Keeps out: projectiles from range, the lasso at mid range. */
  private zoner(me: FighterState, d: FighterData, dist: Fx, r: number, fwd: number, back: number): void {
    if (dist < fx(1.05)) {
      if (r < 50) this.start(this.string(d, me));
      else if (r < 62) this.start(tap(THROW));
      else if (r < 74) this.start(tap(DOWN | BK));
      else if (r < 86) this.start(this.special(me, back | SPECIAL));
      else this.start(taps([back, 0, back]));
    } else if (dist > fx(2.6)) {
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
  }

  /** Gets in and stays in. */
  private rushdown(me: FighterState, d: FighterData, dist: Fx, r: number, fwd: number, back: number): void {
    if (dist < fx(1.05)) {
      if (r < 50) this.start(this.string(d, me));
      else if (r < 62) this.start(tap(THROW));
      else if (r < 74) this.start(tap(DOWN | FK));
      else if (r < 86) this.start(this.special(me, DOWN | SPECIAL));
      else this.start(hold(BLOCK, 16));
      return;
    }
    if (r < 40) this.start(taps([fwd, 0, fwd]));
    else if (r < 60) this.start(hold(fwd, 24));
    else if (r < 72 && dist < fx(2.2)) this.start(this.special(me, back | SPECIAL));
    else if (r < 78 && dist < fx(2.0)) this.start(this.special(me, fwd | SPECIAL));
    else if (r < 86 && dist > fx(1.2) && dist < fx(2.6)) this.start(this.special(me, SPECIAL));
    else if (r < 92) this.start(hold(UP | fwd, 4));
    else this.start(hold(fwd, 12));
  }

  /** Walks in behind armour; grabs anyone who blocks. */
  private grappler(me: FighterState, d: FighterData, s: Seen, dist: Fx, r: number, fwd: number, back: number): void {
    if (dist < fx(1.1)) {
      const grab = s.guarding ? 40 : 22;
      if (r < grab) this.start(this.special(me, fwd | SPECIAL));
      // A guard he can't grab through: the stiff arm crushes it.
      else if (s.guarding && d.normals.f.FK && r < grab + 10) this.start(tap(fwd | FK));
      else if (r < grab + 25) this.start(this.string(d, me));
      else if (r < grab + 33) this.start(tap(THROW));
      else if (r < grab + 40) this.start(tap(DOWN | BK));
      else this.start(hold(BLOCK, 14));
    } else if (dist < fx(2.2)) {
      if (r < 25) this.start(this.special(me, DOWN | SPECIAL));
      else if (r < 42) this.start(this.special(me, back | SPECIAL));
      else if (r < 70) this.start(hold(fwd, 20));
      else if (r < 88) this.start(this.special(me, SPECIAL));
      else this.start(taps([fwd, 0, fwd]));
    } else {
      if (r < 45) this.start(hold(fwd, 30));
      else if (r < 65) this.start(taps([fwd, 0, fwd]));
      else if (r < 85) this.start(this.special(me, SPECIAL));
      else this.start(hold(back, 10));
    }
  }

  /** Never where you expect: teleports, decoys, the joke, but mostly pressure. */
  private trickster(me: FighterState, d: FighterData, s: Seen, dist: Fx, r: number, fwd: number, back: number): void {
    const puppetOut = this.ownDecoy;
    if (dist < fx(1.05)) {
      const joke = s.guarding ? 18 : 6;
      if (r < 55) this.start(this.string(d, me));
      else if (r < 66) this.start(tap(THROW));
      else if (r < 66 + joke) this.start(this.special(me, DOWN | SPECIAL));
      else if (r < 78 + joke) this.start(tap(back | BP));
      else this.start(this.special(me, back | SPECIAL));
    } else if (dist < fx(2.5)) {
      if (r < 12) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 20 && !puppetOut) this.start(this.special(me, SPECIAL));
      else if (r < 75) this.start(taps([fwd, 0, fwd]));
      else if (r < 88) this.start(hold(UP | fwd, 4));
      else this.start(hold(fwd, 14));
    } else {
      if (r < 20 && !puppetOut) this.start(this.special(me, SPECIAL));
      else if (r < 70) this.start(taps([fwd, 0, fwd]));
      else if (r < 85) this.start(this.special(me, fwd | SPECIAL));
      else this.start(hold(fwd, 24));
    }
  }

  /** Lives at the tip of her normals: pokes, steps in and out to bait a whiff, the live feed from range. */
  private footsies(me: FighterState, d: FighterData, dist: Fx, r: number, fwd: number, back: number): void {
    if (dist < fx(1.05)) {
      if (r < 45) this.start(this.string(d, me));
      else if (r < 57) this.start(tap(THROW));
      else if (r < 67) this.start(this.special(me, SPECIAL));
      else if (r < 77) this.start(tap(DOWN | FK));
      else this.start(taps([back, 0, back]));
    } else if (dist < fx(1.6)) {
      if (r < 25) this.start(tap(BK));
      else if (r < 42) this.start(tap(FK));
      else if (r < 55) this.start(tap(DOWN | FK));
      else if (r < 65) this.start(tap(fwd | FK));
      else if (r < 72) this.start(this.special(me, DOWN | SPECIAL));
      else if (r < 86) this.start(hold(back, 10));
      else this.start(hold(fwd, 8));
    } else if (dist > fx(2.6)) {
      if (r < 35) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 80) this.start(hold(fwd, 20));
      else this.start(hold(0, 10));
    } else {
      if (r < 20) this.start(this.special(me, fwd | SPECIAL));
      else if (r < 60) this.start(hold(fwd, 10));
      else if (r < 75) this.start(tap(fwd | FK));
      else this.start(hold(back, 8));
    }
  }

  /** A jump forward: an air special near the top (boosted when it can), or an attack on the way down. */
  private jumpIn(me: FighterState, d: FighterData): Plan {
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    const special = Object.keys(d.airSpecials).length > 0 && this.roll(45);
    const boost = special && me.meter >= BAR && this.roll(this.level.boost);
    const btn = this.roll(50) ? FK : BK;
    let pressedAt = -1;
    return (f, t) => {
      if (t < 4) return UP | fwd;
      if (f.mode === 'prejump') return 0;
      if (f.mode !== 'air' && f.mode !== 'move') return t < 10 ? 0 : null;
      if (special && f.mode === 'air' && f.vy <= fx(0.03) && pressedAt < 0) {
        pressedAt = t;
        return SPECIAL;
      }
      if (boost && pressedAt >= 0 && t === pressedAt + 3) return SPECIAL;
      if (!special && f.mode === 'air' && f.vy < 0 && f.y < fx(1.3)) return btn;
      return 0;
    };
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
