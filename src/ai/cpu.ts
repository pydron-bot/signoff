/**
 * The CPU opponent. It sends input frames like a player and only looks at
 * what a player could see on screen: positions, what the opponent is doing
 * (its animation), health and meter, and projectiles in flight. It sees the
 * opponent a few frames late (its reaction time) and knows its own state.
 * It has its own seeded random numbers, so a match against it replays
 * exactly from the same seed.
 *
 * When an opener hits it carries on with the fighter's combo guide for that
 * opener (src/ai/routes.ts), punishes with the biggest route the frames
 * allow, spends meter on Tape Skip and Cut Away when they're worth it, and
 * learns the opponent's habits as the match goes (src/ai/habits.ts).
 */
import { BAR, GETUP_FRAMES, Input, METER_MAX, TAPE_SKIP_FRAMES, canTD, fighterData, frameData, isSafe, moveData, stringMoves, type FighterData, type FighterState, type FinisherData, type MatchState, type MoveData } from '../sim';
import { fx, type Fx } from '../sim/fixed';
import { createRng, nextInt, type RngState } from '../sim/rng';
import { backToWall, stageFinisher } from '../sim/finisher';
import { propInReach } from '../sim/stage';
import { segmentData } from '../sim/stages';
import { GUIDE_DUMMY } from '../game/comboGuides';
import { AFTER_BLOCK_BLOCK, AFTER_BLOCK_PRESS, AFTER_BLOCK_THROW, Habits, WAKE_ATTACK, WAKE_BLOCK, WAKE_JUMP, type Glimpse } from './habits';
import { RouteRun, openerBits, routeAfter, routeOf, warm, type Opener } from './routes';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, INTERACT, METER } = Input;

/** DIRECTOR is the last Arcade fight's, not offered in the menu. */
export type CpuLevel = 'easy' | 'normal' | 'hard' | 'director';

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
  /** Chance an opener that hit is carried on into its combo route. */
  convert: number;
  /** Chance it acts on what it has learned (after a blocked attack, on a getup, a ducker). */
  read: number;
  /** How slowly it learns their habits (imaginary answers to start with); 0 never learns. */
  prior: number;
  /** Chance it Tape Skips a blocked unsafe move, or a hit to extend the combo. */
  tapeSkip: number;
  /** Chance it Cut Aways once it judges a combo worth breaking. */
  cutAway: number;
  /** Chance it sets up a timed attack on a getup. */
  meaty: number;
  /** Chance an approach is dash, Block (the wavedash) rather than a plain dash. */
  dashBlock: number;
}

const HARD: Level = { delay: 10, block: 78, tech: 60, antiAir: 75, boost: 80, fooled: 15, think: 7, convert: 80, read: 50, prior: 3, tapeSkip: 60, cutAway: 80, meaty: 60, dashBlock: 40 };

const LEVELS: Readonly<Record<CpuLevel, Level>> = {
  easy: { delay: 24, block: 20, tech: 10, antiAir: 15, boost: 0, fooled: 70, think: 26, convert: 0, read: 0, prior: 0, tapeSkip: 0, cutAway: 15, meaty: 0, dashBlock: 0 },
  normal: { delay: 15, block: 50, tech: 35, antiAir: 45, boost: 30, fooled: 40, think: 14, convert: 33, read: 25, prior: 6, tapeSkip: 25, cutAway: 45, meaty: 30, dashBlock: 20 },
  hard: HARD,
  // Hard's eyes and hands; it converts nearly everything and reads you fastest.
  director: { ...HARD, convert: 96, read: 70, prior: 2, tapeSkip: 75, cutAway: 90, meaty: 70, dashBlock: 50 },
};

const HISTORY = 32;
/** Steps of nothing before entering a finisher. */
const SETTLE = 14;
/** Where it stands for each finisher range (centre distance). */
const FINISH_BAND = { close: [0, fx(1.0)], mid: [fx(1.65), fx(2.05)], far: [fx(2.8), fx(99)] } as const;
/** How sure (%) it must be of a habit before it plays against it. */
const SURE = 40;
/** A chase's first air button, frames after take-off, and the frames between its buttons. */
const CHASE_FIRST = 2;
const CHASE_GAP = 8;
const ATTACK: Readonly<Record<string, number>> = { FP, BP, FK, BK };
/** How much further out than a route was measured to hold it still tries it. */
const ROUTE_SLACK = fx(0.05);
/** A blocked attack is answered (duck, block, throw) only this soon after. */
const READ_FRESH = 40;

/** What the CPU saw of its opponent on one frame. */
interface Seen extends Glimpse {
  x: Fx;
  y: Fx;
  move: string;
  /** Visibly mid-attack within reach, or a projectile coming. */
  threat: boolean;
  /** The threat is blocked crouching: a crouching attack, or a projectile low (or high: ducking goes under it). */
  low: boolean;
  /** An opponent's projectile coming this way. */
  projectile: boolean;
  /** Visibly stuck in the recovery of a move. */
  recovering: boolean;
  /** Frames left of the move they're in (0 if none): the animation shows how far through it they are. */
  left: number;
  /** Winding up an attack that can't be blocked, in reach. */
  unblockable: boolean;
  /** Holding a guard. */
  guarding: boolean;
  /** Low to the floor (crouching, crouch-guarding). */
  crouching: boolean;
}

/** Counts of what the CPU chose to do. */
export interface CpuTally {
  /** Combo routes it carried an opener into, and anti-airs it chased with a jump cancel. */
  routes: number;
  chases: number;
  /** Openers pressed to punish something it saw recovering. */
  punishes: number;
  /** Getups it set something up for, answers to a blocked attack it played from a read, and duckers it checked. */
  wakeups: number;
  reads: number;
  checks: number;
  dashBlocks: number;
}

/** A plan gives the input for each frame until it returns null. A soft one (walking) gives way when something's coming. */
type Plan = ((me: FighterState, t: number) => number | null) & { soft?: boolean };

export class Cpu {
  private readonly rng: RngState;
  private readonly level: Level;
  private readonly seen: Seen[] = Array.from({ length: HISTORY }, () => ({
    x: 0,
    y: 0,
    mode: 'idle',
    move: '',
    threat: false,
    low: false,
    projectile: false,
    recovering: false,
    left: 0,
    unblockable: false,
    guarding: false,
    crouching: false,
    fresh: false,
    throwing: false,
    attacking: false,
    shooting: false,
  }));
  private frames = 0;
  private plan: Plan | null = null;
  private planT = 0;
  private wait = 0;
  /** Knocked down: whether to stay down a moment (decided once a knockdown); -1 until decided. */
  private stayDown = -1;
  private techTried = false;
  /** Getting up: what it holds to wake up guarding (decided once a getup); -1 until decided. */
  private wakeGuard = -1;
  /** Whether the opponent's current decoy has its attention. */
  private decoyFools = false;
  private decoyWas = false;
  /** It has a decoy of its own out. */
  private ownDecoy = false;
  /** After winning: the finisher it chose (null: it lets the moment pass) and the step of entering it. */
  private finishing: { fin: FinisherData | null; t: number } | null = null;
  /** The opponent as last seen (undelayed), to tell a move starting. */
  private themMode = 'idle';
  private themMove = '';
  private themFrame = 0;
  /** The opponent's fighter (their size is on screen). */
  private foe = '';
  /** The opponent was in the air on the step before this one (an anti-air feels different from a punish). */
  private foeUp = false;
  private foeWasUp = false;
  /** What it sees now (its reaction time late), for plans to look at. */
  private view: Seen;
  private viewMode = 'idle';
  /** Its own moves: a count of them, the step the current one started, the hits it has landed and when. */
  private ownSeq = 0;
  private ownMove = '';
  private ownFrame = 0;
  private ownStart = 0;
  private ownMask = 0;
  private hitAt = -1;
  /** The move it last had blocked, the step that happened, and the last blocked move it answered. */
  private blockedSeq = -1;
  private blockedAt = -1;
  private readSeq = -1;
  /** The moves it has considered converting, and Tape Skipping. */
  private confirmSeq = -1;
  private skipSeq = -1;
  /** The combo route under way, if any. */
  private route: RouteRun | null = null;
  /** The move it's blocking ('' before it has looked, '-' once weighed or not worth weighing). */
  private blockedBy = '';
  /** The combo count it last weighed a Cut Away at. */
  private cutCombo = 0;
  /** The step it saw the opponent start getting up (-1: not yet). */
  private getupAt = -1;
  /** What it has learned of the opponent this match. */
  readonly habits: Habits;
  /** What it chose to do, counted over the match: for the tests and the balance bench. */
  readonly tally: CpuTally = { routes: 0, chases: 0, punishes: 0, wakeups: 0, reads: 0, checks: 0, dashBlocks: 0 };

  constructor(
    private readonly player: 0 | 1,
    level: CpuLevel,
    seed: number,
  ) {
    this.level = LEVELS[level];
    this.rng = createRng(seed);
    this.habits = new Habits(this.level.prior);
    this.view = this.seen[0];
  }

  /** "Stay tuned" after it won: pick a finisher, walk into its range, enter it like a player would. */
  private finish(m: MatchState, me: FighterState, them: FighterState): number {
    if (!this.finishing) {
      const all = fighterData(me.fighter).finishers;
      const signOffs = all.filter((f) => f.kind === 'signoff');
      const pass = this.level === LEVELS.easy ? 50 : 10;
      // Mostly a Sign-Off (the stage's own if they're against a wall); now and then it shows mercy.
      const wall = backToWall(m, this.player) && this.roll(40);
      const fin = this.roll(pass) ? null : this.roll(10) ? (all.find((f) => f.kind === 'rerun') ?? null) : wall ? stageFinisher(m.stage, me.fighter) : signOffs[nextInt(this.rng, signOffs.length)];
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
    const now = this.frames - 1;
    this.self(me, now);
    if (m.phase === 'stayTuned' && m.matchWinner === this.player) return this.finish(m, me, them);
    if (m.phase !== 'fight') {
      this.plan = null;
      this.route = null;
      if (m.phase === 'intro') {
        this.finishing = null;
        // Its routes are measured a little each step before the bell, not all on its first hit.
        if (this.level.convert > 0) warm(me.fighter);
      }
      return 0;
    }
    const at = now - Math.min(this.level.delay, now);
    const s = this.seen[at % HISTORY];
    this.view = s;
    this.habits.see(s, at);
    if (s.mode === 'getup' && this.viewMode !== 'getup') this.getupAt = at;
    this.viewMode = s.mode;

    if (me.mode === 'thrown') {
      this.route = null;
      if (!this.techTried) {
        this.techTried = true;
        if (this.roll(this.level.tech)) return THROW;
      }
      return 0;
    }
    this.techTried = false;
    // Knocked down: sometimes hold Down to get up late, as often as it techs throws.
    if (me.mode === 'down') {
      this.route = null;
      if (this.stayDown < 0) this.stayDown = this.roll(this.level.tech / 2) ? 1 : 0;
      return this.stayDown ? DOWN : 0;
    }
    this.stayDown = -1;
    // Getting up with them close: guard on the first frame up (crouching mostly: a high goes over it), now and then.
    if (me.mode === 'getup') {
      if (this.wakeGuard < 0) this.wakeGuard = Math.abs(s.x - me.x) < fx(1.6) && this.roll((this.level.block * 3) / 5) ? (this.roll(60) ? BLOCK | DOWN : BLOCK) : 0;
      return this.wakeGuard;
    }
    this.wakeGuard = -1;
    if (me.combo === 0) this.cutCombo = 0;
    if (this.cutAway(me)) return METER;

    if (this.route) {
      const out = this.runRoute(me, s, now);
      if (out !== null) return out;
    }
    const conf = this.confirm(me, them, s, now);
    if (conf !== null) return conf;
    const skip = this.tapeSkip(me);
    if (skip) return skip;
    const pun = this.punishBlocked(me, them);
    if (pun) return pun;

    if (this.plan?.soft && s.threat && actionable(me)) this.plan = null;
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
    // Its attack was just blocked: answer what they usually do next.
    if (this.blockedSeq !== this.readSeq && now - this.blockedAt < READ_FRESH) {
      this.readSeq = this.blockedSeq;
      if (this.afterBlocked(me)) return this.next0(me);
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

  /** Keeps track of its own moves: when each started, when it hit, when it was blocked. */
  private self(me: FighterState, now: number): void {
    if (me.mode !== 'move') {
      this.ownMove = '';
      this.ownFrame = 0;
      this.ownMask = 0;
      return;
    }
    // A boost swaps the move for its boosted version mid-move: the same move still.
    const boosted = this.ownMove !== '' && moveData(me.fighter, this.ownMove).boost === me.move;
    if (me.moveFrame < this.ownFrame || (me.move !== this.ownMove && !boosted)) {
      this.ownSeq++;
      this.ownStart = now - me.moveFrame;
    }
    if (me.hitMask !== this.ownMask && me.hitMask !== 0) {
      if (me.contact === 'hit') this.hitAt = now;
      else if (me.contact === 'block') {
        this.blockedSeq = this.ownSeq;
        this.blockedAt = now;
        this.habits.blocked(now);
      }
    }
    this.ownMove = me.move;
    this.ownFrame = me.moveFrame;
    this.ownMask = me.hitMask;
  }

  /** The route's press for this step (0 between presses), or null once it's over or has visibly dropped. */
  private runRoute(me: FighterState, s: Seen, now: number): number | null {
    const r = this.route!;
    // Hit, blocked or done: back to playing. Before each press: are they still reeling? Only what it has seen since its last hit counts.
    if (r.done || !inRoute(me) || (me.mode === 'move' && me.contact === 'block') || (r.due(now) && now - this.level.delay > this.hitAt + 1 && s.mode !== 'hitstun' && s.mode !== 'launched')) {
      this.route = null;
      // The route's own last move doesn't open another.
      this.confirmSeq = this.ownSeq;
      return null;
    }
    return r.due(now) ? r.input(now, me.facing) : 0;
  }

  /** An opener just hit: carry on into its route (once a move, by level). */
  private confirm(me: FighterState, them: FighterState, s: Seen, now: number): number | null {
    if (this.route || me.mode !== 'move' || me.contact !== 'hit' || this.confirmSeq === this.ownSeq) return null;
    this.confirmSeq = this.ownSeq;
    if (!this.roll(this.level.convert)) return null;
    // Caught in the air (an anti-air): the guides start on the ground, so it chases them up instead.
    if (this.foeWasUp) {
      const mv = moveData(me.fighter, me.move);
      if (!opensJuggle(mv) || !mv.cancel) return null;
      this.tally.chases++;
      this.start(this.chase(me, mv.cancel[0]));
      return this.next0(me);
    }
    // Their health bar, against what each route does to the guide's dummy.
    const killPct = Math.floor((them.health * 100) / fighterData(GUIDE_DUMMY).health);
    const r = routeAfter(me.fighter, me.move, me.meter, this.spare(me, 1) && this.roll(this.level.boost), killPct);
    // Too far out for the route to hold together: the string it was in goes on instead.
    if (!r || Math.abs(them.x - me.x) > r.far + ROUTE_SLACK) return null;
    // A counter hit freezes longer than the guide's opener did: its clock waits that out.
    const run = new RouteRun(r, this.ownStart + Math.max(0, me.hitstop - r.stop), now);
    if (run.done) return null;
    this.route = run;
    this.tally.routes++;
    this.plan = null;
    return this.runRoute(me, s, now);
  }

  /**
   * A jump cancel out of a launcher that hit, then the fighter's air string
   * on the way up and its air special: the hop meets the body as it rises,
   * so the timing is the same for everyone.
   */
  private chase(me: FighterState, cancel: number): Plan {
    const d = fighterData(me.fighter);
    const path = d.airStrings.length ? d.airStrings[0].path : ['j.FP'];
    const special = Object.keys(d.airSpecials).length > 0;
    let up = false;
    let airAt = -1;
    return (f, t) => {
      if (t > 90) return null;
      if (airAt < 0) {
        if (f.mode === 'move') {
          if (up || f.moveFrame < cancel - 1) return 0;
          up = true;
          return UP;
        }
        if (f.mode === 'prejump') return 0;
        if (f.mode !== 'air') return null;
        airAt = t;
      }
      // The first button just after take-off, each next one as it can chain, then the special.
      const u = t - airAt - CHASE_FIRST;
      if (u >= 0 && u % CHASE_GAP === 0) {
        const k = u / CHASE_GAP;
        if (k < path.length) return ATTACK[path[k].slice(path[k].indexOf('.') + 1)] ?? 0;
        if (k === path.length && special) return SPECIAL;
      }
      return f.mode === 'air' || f.mode === 'move' ? 0 : null;
    };
  }

  /** Bars it can spend: once its health is at stake it saves for Cut Away (a full meter), until that's used. */
  private spare(me: FighterState, bars: number): boolean {
    if (me.meter < bars * BAR) return false;
    return me.cutAwayUsed || me.health * 2 >= me.maxHealth;
  }

  /**
   * Tape Skip: out of a blocked move that's unsafe, so it isn't punished; out
   * of a hit that leaves them reeling, to dash in and go again. Weighed once a move.
   */
  private tapeSkip(me: FighterState): number {
    if (me.mode !== 'move' || this.route || this.skipSeq === this.ownSeq || this.level.tapeSkip === 0 || !this.spare(me, 1)) return 0;
    const mv = moveData(me.fighter, me.move);
    if (mv.stance === 'air' || mv.kind === 'throw' || mv.kind === 'super' || mv.startup === 0 || me.moveFrame < mv.startup) return 0;
    if (me.contact === 'block') {
      // Not while the string can still go on.
      if (me.moveFrame <= mv.lastActive || (hasChain(mv) && mv.cancel && me.moveFrame <= mv.cancel[1])) return 0;
      this.skipSeq = this.ownSeq;
      const onBlock = frameData(mv).onBlock;
      if (onBlock === null || isSafe(onBlock) || mv.total - me.moveFrame <= TAPE_SKIP_FRAMES + 2 || !this.roll(this.level.tapeSkip)) return 0;
      this.plan = null;
      return METER;
    }
    if (me.contact !== 'hit' || hasChain(mv)) return 0;
    const n = mv.hits.length;
    if (!n || (me.hitMask & (1 << (n - 1))) === 0) return 0;
    this.skipSeq = this.ownSeq;
    // Still reeling once the dash is over, for long enough that a jab gets there.
    const last = mv.hits[n - 1];
    const jab = moveData(me.fighter, fighterData(me.fighter).normals.s.FP).startup;
    if (last.launch !== undefined || last.knockdown || last.hitstun < TAPE_SKIP_FRAMES + jab + 2 || !this.roll(this.level.tapeSkip)) return 0;
    this.start(this.afterDash(FP));
    return METER;
  }

  /** Once a dash is over, press this (a route can take it from there). */
  private afterDash(bits: number): Plan {
    let sent = false;
    return (f, t) => {
      if (sent || t > 30) return null;
      if (!actionable(f)) return 0;
      sent = true;
      return bits;
    };
  }

  /** Cut Away when the combo on it is long or its health is at stake, weighed once a hit. */
  private cutAway(me: FighterState): boolean {
    if (me.meter < METER_MAX || me.cutAwayUsed || me.combo === this.cutCombo) return false;
    if (me.mode !== 'hitstun' && !(me.mode === 'launched' && me.juggleable)) return false;
    this.cutCombo = me.combo;
    const pct = (me.health * 100) / me.maxHealth;
    const worth = me.combo >= 4 || (me.combo >= 2 && pct < 50) || pct < 20;
    return worth && this.roll(this.level.cutAway);
  }

  /** Its attack was blocked and the string is over: duck their throw, block their button, or throw their guard. */
  private afterBlocked(me: FighterState): boolean {
    if (!this.roll(this.level.read)) return false;
    const h = this.habits;
    const k = h.likely(h.afterBlock, SURE);
    if (k >= 0) this.tally.reads++;
    if (k === AFTER_BLOCK_THROW) {
      // A neutral duck goes under a throw; a whiffed throw is punished (decide sees it recovering).
      this.start(this.duck(16));
      return true;
    }
    if (k === AFTER_BLOCK_PRESS) {
      this.start(hold(BLOCK, 14));
      return true;
    }
    if (k === AFTER_BLOCK_BLOCK) {
      this.start(this.roll(50) ? tap(THROW) : this.opener(me, this.roll(50) ? 'low' : 'overhead'));
      return true;
    }
    return false;
  }

  /** Down without Block for a while, until something it can punish shows. */
  private duck(frames: number): Plan {
    return (_f, t) => (t >= frames || (t > 0 && this.view.recovering) ? null : DOWN);
  }

  /** Press a route's opener (the route follows if it hits); a jab if the fighter has no such route. */
  private opener(me: FighterState, kind: Opener): Plan {
    const r = routeOf(me.fighter, kind);
    return tap(r ? openerBits(r, me.facing) : FP);
  }

  private observe(m: MatchState, me: FighterState, them: FighterState): void {
    const s = this.seen[this.frames % HISTORY];
    this.frames++;
    this.foe = them.fighter;
    this.foeWasUp = this.foeUp;
    this.foeUp = them.y > 0;
    s.x = them.x;
    s.y = them.y;
    s.mode = them.mode;
    s.move = them.move;
    s.guarding = them.mode === 'guard' || them.mode === 'blockstun';
    s.crouching = them.crouching && them.y === 0;
    // A move (or a jump) starting is the moment it's noticed.
    s.fresh = (them.mode === 'move' && (this.themMode !== 'move' || them.move !== this.themMove || them.moveFrame < this.themFrame)) || (them.mode === 'prejump' && this.themMode !== 'prejump');
    this.themMode = them.mode;
    this.themMove = them.move;
    this.themFrame = them.moveFrame;
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
    s.left = 0;
    s.throwing = false;
    s.attacking = false;
    s.shooting = false;
    if (them.mode === 'move') {
      const mv = moveData(them.fighter, them.move);
      s.left = mv.total - them.moveFrame;
      s.recovering = mv.lastActive > 0 && them.moveFrame > mv.lastActive && s.left > 8;
      s.throwing = mv.throwData !== undefined;
      s.shooting = mv.spawns.length > 0;
      s.attacking = mv.hits.length > 0 || s.shooting;
      threat = mv.hits.length > 0 && dist < reach(mv) + fx(0.4);
      s.unblockable = threat && mv.hits.some((h) => h.height === 'unblockable');
      // A crouching attack is the tell for a low.
      low = mv.stance === 'crouch';
      // Winding up a throw of something: blocked by where it will fly (on the floor low; a high one is ducked under).
      for (let k = 0; k < mv.spawns.length; k++) {
        const pd = mv.spawns[k].projectile;
        if (pd.decoy || mv.spawns[k].frame < them.moveFrame || dist > fx(3.2)) continue;
        threat = true;
        if (pd.effect.height === 'low' || pd.effect.height === 'high') low = true;
      }
    }
    let projectile = false;
    for (let p = 0; p < m.projectiles.length; p++) {
      const P = m.projectiles[p];
      if (!P.active || P.owner === this.player) continue;
      const pd = moveData(them.fighter, P.move).spawns[P.spawn].projectile;
      // One that comes back (the plate) is still a threat once it's gone past.
      if (Math.sign(me.x - P.x) !== P.dir && (pd.returnAfter === undefined || P.back)) continue;
      const near = Math.abs(P.x - me.x);
      if (near < fx(2.2)) {
        threat = true;
        // Where it flies is on screen: one on the floor is blocked low, and a crouching guard goes under a high one.
        if (pd.effect.height === 'low' || pd.effect.height === 'high') low = true;
      }
      if (near > fx(1.4) && near < fx(3.2) && P.y < fx(1)) projectile = true;
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
    const h = this.habits;

    if (canTD(me) && dist < fx(1.3) && this.roll(25)) {
      this.start(tap(BLOCK | SPECIAL, BLOCK));
      return;
    }
    // Someone who jumps a lot gets the launcher sooner.
    if (s.y > fx(0.3) && dist < fx(1.6) && this.roll(this.level.antiAir + Math.min(15, h.jumpRate * 3))) {
      this.start(tap(DOWN | BP));
      return;
    }
    if (s.recovering && this.punish(me, d, s, dist, r, fwd, back)) return;
    // On the floor: wait for them to get up (a delayed getup is waited out), then something timed for it.
    if ((s.mode === 'down' || s.mode === 'getup') && this.roll(this.level.meaty)) {
      this.tally.wakeups++;
      this.start(this.wakeup(me, d));
      return;
    }
    // A neutral duck is checked with a mid, or a low that leads somewhere.
    if (s.mode === 'crouch' && !s.guarding && dist < fx(1.0) && this.roll(this.level.read)) {
      this.tally.checks++;
      this.start(this.roll(50) ? tap(DOWN | FP) : this.opener(me, 'low'));
      return;
    }
    // Up close, now and then the mix-up a route starts from: low against a standing guard, overhead against a crouching one.
    if (dist < fx(1.0) && this.level.convert > 0 && this.roll(25)) {
      this.start(this.opener(me, s.guarding ? (s.crouching ? 'overhead' : 'low') : this.roll(60) ? 'jab' : 'low'));
      return;
    }
    // Against projectiles, it comes in behind a guard.
    if (dist > fx(1.8) && d.style !== 'zoner' && h.shotRate >= 3 && this.roll(this.level.read)) {
      this.start(this.dashBlock(me, 2));
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

  /**
   * Blocking a move it knows is unsafe (a player learns the frame data): as
   * the blockstun ends, the punish route if the frames allow its launcher,
   * else the jab route, else nothing. Weighed once a blockstun.
   */
  private punishBlocked(me: FighterState, them: FighterState): number {
    if (me.mode !== 'blockstun') {
      this.blockedBy = '';
      return 0;
    }
    // The move on its guard, as it lands: an ender (no string to come), not a projectile.
    if (this.blockedBy === '') this.blockedBy = them.mode === 'move' ? them.move : '-';
    if (me.timer > 1 || this.blockedBy === '-') return 0;
    const mv = moveData(them.fighter, this.blockedBy);
    this.blockedBy = '-';
    if (hasChain(mv) || mv.spawns.length) return 0;
    const onBlock = frameData(mv).onBlock;
    if (onBlock === null || !this.roll(this.level.antiAir)) return 0;
    const hurt = fighterData(them.fighter).hurt.stand;
    const dist = Math.abs(them.x - me.x);
    for (const kind of PUNISHERS) {
      const rt = routeOf(me.fighter, kind);
      if (rt && rt.startup <= -onBlock && dist <= rt.reach + hurt.x + hurt.w) {
        this.tally.punishes++;
        // Pressed a step early: the buffer brings it out on the first free frame.
        this.plan = null;
        return openerBits(rt, me.facing);
      }
    }
    return 0;
  }

  /**
   * Something it sees recovering: the punish route if the frames they have
   * left allow its launcher, else the jab route, else (out of reach) the
   * fighter's own answer, else nothing.
   */
  private punish(me: FighterState, d: FighterData, s: Seen, dist: Fx, r: number, fwd: number, back: number): boolean {
    if (!this.roll(this.level.antiAir)) return false;
    // What it saw, less the time it took to see it.
    const left = s.left - this.level.delay;
    const hurt = fighterData(this.foe).hurt.stand;
    const body = hurt.x + hurt.w;
    for (const kind of PUNISHERS) {
      const rt = routeOf(me.fighter, kind);
      if (rt && left >= rt.startup && dist <= rt.reach + body) {
        this.tally.punishes++;
        this.start(tap(openerBits(rt, me.facing)));
        return true;
      }
    }
    if (d.style === 'grappler' && dist < fx(1.3) && r < 50) {
      this.start(this.special(me, fwd | SPECIAL));
      return true;
    }
    if (d.style === 'rushdown' && dist > fx(1.3) && dist < fx(2.4)) {
      this.start(this.special(me, back | SPECIAL));
      return true;
    }
    return false;
  }

  /**
   * On their getup, by what they've shown: a strike timed to land as they
   * stand (a throw loses to it), a throw if they block, a guard if they
   * attack, room if they jump. It times it from seeing the getup start, so
   * a delayed getup doesn't catch it out.
   */
  private wakeup(me: FighterState, d: FighterData): Plan {
    const h = this.habits;
    const k = h.likely(h.wake, SURE);
    const answer = k === WAKE_ATTACK ? 'block' : k === WAKE_BLOCK ? 'throw' : k === WAKE_JUMP ? 'wait' : 'strike';
    const rt = routeOf(me.fighter, this.roll(50) ? 'low' : 'jab');
    const thr = moveData(me.fighter, d.throwMove).throwData!;
    const startup = answer === 'throw' ? thr.frames[0] : rt ? rt.startup : moveData(me.fighter, d.normals.s.FP).startup;
    const bits = answer === 'throw' ? THROW : rt ? openerBits(rt, me.facing) : FP;
    const near = answer === 'throw' ? thr.range - fx(0.2) : Math.min(rt ? rt.reach : fx(0.9), fx(0.9));
    const since = this.frames - 1;
    let sent = false;
    return (f, t) => {
      if (sent || t > 150) return null;
      const now = since + t;
      const v = this.view;
      const fwd = f.facing > 0 ? RIGHT : LEFT;
      const step = Math.abs(v.x - f.x) > near ? fwd : 0;
      // Not up yet: close in and wait.
      if (this.getupAt < since - this.level.delay - GETUP_FRAMES) return v.mode === 'down' || v.mode === 'getup' || v.mode === 'launched' ? step : null;
      // The first step they can act on (seen getting up on getupAt, a step after it began).
      const up = this.getupAt + GETUP_FRAMES;
      if (answer === 'block') return now < up + 12 ? BLOCK : null;
      if (answer === 'wait') return now < up + 8 ? 0 : null;
      // Active on that step.
      const pressAt = up - startup;
      if (now < pressAt) return step;
      if (now > pressAt + 2) return null;
      sent = true;
      return bits;
    };
  }

  /** A dash in: now and then dash, Block (cancelled once it's committed), again, to come in behind a guard. */
  private dash(me: FighterState): Plan {
    const fwd = me.facing > 0 ? RIGHT : LEFT;
    return this.roll(this.level.dashBlock) ? this.dashBlock(me, 1 + nextInt(this.rng, 2)) : taps([fwd, 0, fwd]);
  }

  private dashBlock(_me: FighterState, n: number): Plan {
    this.tally.dashBlocks++;
    let k = 0;
    let from = 0;
    let guardAt = -1;
    return (f, t) => {
      const u = t - from;
      if (u < 3) return u === 1 ? 0 : f.facing > 0 ? RIGHT : LEFT;
      if (guardAt < 0) {
        if (f.mode === 'dash') return f.dashFree === 0 ? BLOCK : 0;
        // The dash didn't come out, or something else happened.
        if (f.mode !== 'guard' || u > 40) return null;
        guardAt = t;
      }
      // Held while anything's coming (crouching for a low or a high projectile).
      if (t - guardAt < 3 || this.view.threat) return BLOCK | (this.view.low ? DOWN : 0);
      if (++k >= n || Math.abs(this.view.x - f.x) < fx(1.4)) return null;
      from = t + 1;
      guardAt = -1;
      return 0;
    };
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
    if (r < 40) this.start(this.dash(me));
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
      else this.start(this.dash(me));
    } else {
      if (r < 45) this.start(hold(fwd, 30));
      else if (r < 65) this.start(this.dash(me));
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
      else if (r < 75) this.start(this.dash(me));
      else if (r < 88) this.start(hold(UP | fwd, 4));
      else this.start(hold(fwd, 14));
    } else {
      if (r < 20 && !puppetOut) this.start(this.special(me, SPECIAL));
      else if (r < 70) this.start(this.dash(me));
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
    const boost = special && this.spare(me, 1) && this.roll(this.level.boost);
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
    const boost = this.spare(me, 1) && this.roll(this.level.boost);
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

/** What it punishes with, best first. */
const PUNISHERS: readonly Opener[] = ['punish', 'jab'];

/** Its own state lets a route go on: in a move, between moves, or in a jump cancel's hop or a Tape Skip. */
function inRoute(f: FighterState): boolean {
  switch (f.mode) {
    case 'move':
    case 'idle':
    case 'walk':
    case 'crouch':
    case 'landing':
    case 'prejump':
    case 'air':
    case 'dash':
      return true;
    default:
      return false;
  }
}

/** Its last hit launches or bounces them: it can be followed up (and jump-cancelled). */
function opensJuggle(mv: MoveData): boolean {
  const h = mv.hits[mv.hits.length - 1];
  return h !== undefined && h.launch !== undefined;
}

/** A string can go on from it. */
function hasChain(mv: MoveData): boolean {
  for (const _ in mv.chain) return true;
  return false;
}

function actionable(f: FighterState): boolean {
  return f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard';
}

function hold(bits: number, frames: number): Plan {
  const p: Plan = (_m, t) => (t < frames ? bits : null);
  // Walking or crouching only.
  p.soft = (bits & ~(LEFT | RIGHT | DOWN)) === 0;
  return p;
}

/** Press once (with `hold` kept down), then let go. */
function tap(bits: number, held = 0): Plan {
  return (_m, t) => (t === 0 ? bits : t < 3 ? held : null);
}

function taps(seq: number[]): Plan {
  return (_m, t) => (t < seq.length ? seq[t] : null);
}
