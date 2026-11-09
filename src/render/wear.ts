/**
 * Signal damage: how broken up each fighter's picture is, 0 to 1. It grows
 * as their health falls, and some of it carries over the commercial break,
 * so a fighter who lost a round starts the next one already breaking up.
 * Read from the match and its events once per step (display only: the sim
 * knows nothing of it). Pure: no three.js.
 */
import type { SimEvent } from '../sim/events';
import type { MatchState } from '../sim/state';

/** How much of a round's wear is still there after the break. */
export const WEAR_CARRY = 0.6;
/** At no health left, how far toward fully broken the round's damage goes (the rest is carried wear). */
export const WEAR_FROM_HEALTH = 0.85;

export class WearTracker {
  /** Each fighter's wear now. */
  readonly wear = [0, 0];
  /** What carried over from earlier rounds. */
  private readonly carried = [0, 0];

  reset(): void {
    this.wear.fill(0);
    this.carried.fill(0);
  }

  step(m: MatchState, ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'commercialBreak') for (let i = 0; i < 2; i++) this.carried[i] = this.wear[i] * WEAR_CARRY;
      // A new match from the top.
      else if (e.type === 'roundStart' && e.round === 1) this.carried.fill(0);
    }
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      // Between rounds, health is back to full but the damage isn't.
      if (m.phase === 'break') continue;
      const lost = 1 - Math.max(0, f.health) / f.maxHealth;
      const c = this.carried[i];
      this.wear[i] = Math.min(1, c + (1 - c) * lost * WEAR_FROM_HEALTH);
    }
  }
}
