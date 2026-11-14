/**
 * The studio working round the fight, worked out per simulation step: which
 * foreground camera is "live" (its tally lit: the one on the side the fight
 * has moved to, held until it has clearly moved to the other), where the
 * crew's heads turn to follow the fight, and the Arcade audience leaning in
 * on an ender. Pure: no three.js; src/render/depth.ts and arena.ts show it.
 */
import type { SimEvent } from '../sim/events';
import type { MatchState } from '../sim/state';
import { toFloat } from '../sim/fixed';

/** The fight's middle must pass this far over to switch the live camera (m). */
const SWITCH_AT = 0.9;
/** The most a crew head turns (radians), and how fast it follows (of the way, a step). */
const HEAD_MAX = 0.7;
const HEAD_EASE = 0.06;
/** The audience leaning in: how far (radians) and over how many steps it eases back. */
const LEAN = 0.16;
const LEAN_STEPS = 50;

export class Studio {
  /** −1 the left camera, 1 the right. */
  live: -1 | 1 = -1;
  /** Each crew head's turn (radians, toward +x positive): left, right. */
  readonly heads = [0, 0];
  /** How far the audience leans in, 0 to LEAN. */
  lean = 0;
  private leanLeft = 0;

  reset(): void {
    this.live = -1;
    this.heads[0] = this.heads[1] = 0;
    this.lean = 0;
    this.leanLeft = 0;
  }

  /** Once per step; `crewX` the crew's x on each side (where they stand), their distance from the fight's plane `crewZ`. */
  step(m: MatchState, ev: readonly SimEvent[], crewX: readonly number[], crewZ: number): void {
    const mid = (toFloat(m.fighters[0].x) + toFloat(m.fighters[1].x)) / 2;
    if (mid > SWITCH_AT) this.live = 1;
    else if (mid < -SWITCH_AT) this.live = -1;
    for (let i = 0; i < 2; i++) {
      const want = Math.max(-HEAD_MAX, Math.min(HEAD_MAX, Math.atan2(mid - crewX[i], Math.max(0.5, crewZ))));
      this.heads[i] += (want - this.heads[i]) * HEAD_EASE;
    }
    for (const e of ev) if (e.type === 'hit' && e.weight === 3) this.leanLeft = LEAN_STEPS;
    if (this.leanLeft > 0) this.leanLeft--;
    // In fast, out slowly.
    const t = this.leanLeft / LEAN_STEPS;
    this.lean = LEAN * (t > 0.8 ? (1 - t) / 0.2 : t / 0.8);
  }
}
