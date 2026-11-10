/**
 * What the CPU learns about its opponent over a match, only from what's on
 * screen and as late as it sees it: what they do once its attack has been
 * blocked, what they do getting up, and how often they jump and throw
 * projectiles. Plain counters; the CPU turns them into odds. A prior keeps
 * early guesses even: the higher it is, the slower it adapts.
 */

/** One frame of the opponent as the CPU saw it (the fields habits read). */
export interface Glimpse {
  mode: string;
  /** A move (or a jump) started on this frame. */
  fresh: boolean;
  /** The move is a throw or a grab. */
  throwing: boolean;
  /** The move can hit (a strike or a projectile). */
  attacking: boolean;
  /** The move throws a projectile. */
  shooting: boolean;
}

/** After its attack is blocked: they throw, they press a button, or they keep blocking. */
export const AFTER_BLOCK_THROW = 0;
export const AFTER_BLOCK_PRESS = 1;
export const AFTER_BLOCK_BLOCK = 2;
/** Getting up: they attack, block (or wait), throw, or jump away. */
export const WAKE_ATTACK = 0;
export const WAKE_BLOCK = 1;
export const WAKE_THROW = 2;
export const WAKE_JUMP = 3;

/** On the CPU's own getup: they throw it, strike it, or leave it. */
export const OKI_THROW = 0;
export const OKI_STRIKE = 1;
export const OKI_WAIT = 2;

/** Frames after a blocked attack, and after getting up, in which their answer counts. */
const AFTER_BLOCK_WINDOW = 30;
const WAKE_WINDOW = 20;
/** Around the CPU's own getup: a move started this soon before it (timed to land as it stands) or this long after counts as their answer. */
const OKI_BEFORE = 14;
const OKI_AFTER = 16;

export class Habits {
  readonly afterBlock = [0, 0, 0];
  readonly wake = [0, 0, 0, 0];
  /** What they do to its own getup. */
  readonly oki = [0, 0, 0];
  jumps = 0;
  shots = 0;
  /** Fight frames watched (for the rates). */
  watched = 0;
  /** The step its attack was last blocked on, and getting up was over on; -1 when not watching. */
  private blockedAt = -1;
  private wokeAt = -1;
  private wasGetup = false;
  /** The step its own getup ends on (-1: not on the floor). */
  private ownUpAt = -1;

  constructor(
    /** Imaginary answers of each kind to start with; 0 learns nothing. */
    readonly prior: number,
  ) {}

  /** Its attack was just blocked (step `at`): watch for their answer. */
  blocked(at: number): void {
    if (this.prior > 0) this.blockedAt = at;
  }

  /** It is getting up, standing on step `at`: watch what they do about it. */
  rising(at: number): void {
    if (this.prior > 0) this.ownUpAt = at;
  }

  /** The glimpse the CPU sees on this step, taken on step `at`. */
  see(g: Glimpse, at: number): void {
    if (this.prior === 0) return;
    this.watched++;
    if (this.ownUpAt >= 0 && at >= this.ownUpAt - OKI_BEFORE) {
      const k = g.fresh && g.throwing ? OKI_THROW : g.fresh && g.attacking ? OKI_STRIKE : at >= this.ownUpAt + OKI_AFTER ? OKI_WAIT : -1;
      if (k >= 0) {
        this.oki[k]++;
        this.ownUpAt = -1;
      }
    }
    if (g.fresh && g.mode === 'prejump') this.jumps++;
    if (g.fresh && g.shooting) this.shots++;
    if (this.blockedAt >= 0 && at > this.blockedAt) {
      // Blockstun first: their answer is the first thing they do after it.
      if (g.fresh && g.throwing) this.answer(this.afterBlock, AFTER_BLOCK_THROW);
      else if (g.fresh && (g.attacking || g.mode === 'prejump')) this.answer(this.afterBlock, AFTER_BLOCK_PRESS);
      else if (at - this.blockedAt >= AFTER_BLOCK_WINDOW) this.answer(this.afterBlock, AFTER_BLOCK_BLOCK);
    }
    const getup = g.mode === 'getup';
    if (this.wasGetup && !getup) this.wokeAt = at;
    this.wasGetup = getup;
    if (this.wokeAt >= 0) {
      if (g.fresh && g.throwing) this.wake[WAKE_THROW]++;
      else if (g.fresh && g.attacking) this.wake[WAKE_ATTACK]++;
      else if (g.mode === 'prejump' || g.mode === 'backdash') this.wake[WAKE_JUMP]++;
      else if (g.mode === 'guard' || at - this.wokeAt >= WAKE_WINDOW) this.wake[WAKE_BLOCK]++;
      else return;
      this.wokeAt = -1;
    }
  }

  private answer(t: number[], k: number): void {
    t[k]++;
    this.blockedAt = -1;
  }

  /** The odds (%) of answer k in a table, the prior included. */
  share(t: readonly number[], k: number): number {
    let total = 0;
    for (let i = 0; i < t.length; i++) total += t[i] + this.prior;
    return Math.floor(((t[k] + this.prior) * 100) / total);
  }

  /** The answer they've given most, if it's at least `pct` of the time (else -1). */
  likely(t: readonly number[], pct: number): number {
    let best = -1;
    let bestShare = pct - 1;
    for (let k = 0; k < t.length; k++) {
      const s = this.share(t, k);
      if (s > bestShare) {
        best = k;
        bestShare = s;
      }
    }
    return best;
  }

  /** Jumps, and projectiles, per ten seconds watched. */
  get jumpRate(): number {
    return this.watched ? Math.floor((this.jumps * 600) / this.watched) : 0;
  }

  get shotRate(): number {
    return this.watched ? Math.floor((this.shots * 600) / this.watched) : 0;
  }
}
