/**
 * Slow motion on a KO: the game runs at SLOW speed for HOLD steps, then
 * eases back to full speed over RAMP steps. Only the loop's pacing changes
 * (src/game/loop.ts): the simulation still takes the same steps, so
 * replays and the result are untouched. Counted in simulation steps.
 */
import type { MatchState, SimEvent } from '../sim';

export const SLOW = 0.3;
export const HOLD = 30;
export const RAMP = 12;

export class SlowMo {
  private t = -1;

  /** How fast time runs now: 1 normally. */
  get scale(): number {
    if (this.t < 0) return 1;
    if (this.t < HOLD) return SLOW;
    return SLOW + ((1 - SLOW) * (this.t - HOLD)) / RAMP;
  }

  /** Once per simulation step, after it, with that step's events. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    if (this.t >= 0 && ++this.t >= HOLD + RAMP) this.t = -1;
    // A finisher's blows are scripted: it keeps its own pace.
    for (const e of ev) if (e.type === 'ko' && m.phase !== 'finisher') this.t = 0;
  }

  clear(): void {
    this.t = -1;
  }
}
