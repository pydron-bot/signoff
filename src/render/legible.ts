/**
 * Effects take turns, so the fighter always wins the frame. Signal damage,
 * echoes, the cut-in and the impact frames each read alone; stacked on a
 * fighter low on health there is more effect than fighter. Each step this
 * reads what is going on (a cut-in, Technical Difficulties' cinematic, a
 * finisher, an impact frame, each fighter's wear and whether they are
 * attacking) and gives each fighter a scale for their echoes and for the
 * snow bands of their signal damage (the dulling under it always stays):
 *
 * - no echoes during a cut-in, TD's cinematic, a finisher or an impact frame;
 * - echoes halved once a fighter's wear passes ECHO_WORN;
 * - no snow bands on a fighter attacking, in the cut-in, playing TD's
 *   cinematic or a finisher: what they do must read.
 *
 * The cut-in's close-up draws its fighter with wear capped at CUT_IN_WEAR
 * and no snow or echoes, so it shows a face at any health. Pure: no three.js.
 */
import type { SimEvent } from '../sim/events';
import type { MatchState } from '../sim/state';

/** Wear past which a fighter's echoes are halved. */
export const ECHO_WORN = 0.5;
/** The most wear the cut-in's close-up shows (the dulling only: no snow). */
export const CUT_IN_WEAR = 0.3;
/** Steps an impact frame lasts (src/ui/glitch.ts). */
export const IMPACT_STEPS = 3;
/** How far the snow moves toward its target each step: in or out over four. */
const SNOW_EASE = 0.25;

/** What is going on this step. */
export interface Moment {
  /** The fighter in the cut-in's close-up, or -1. */
  cutIn: number;
  /** The fighter playing a finisher (or TD's cinematic), or -1. */
  star: number;
  /** A cinematic of any kind: TD's, or a finisher. */
  cinematic: boolean;
  impact: boolean;
  wear: readonly number[];
  attacking: readonly boolean[];
}

/** Each fighter's scale for an effect, 0 to 1. */
export interface Turns {
  echo: number[];
  snow: number[];
}

/** The table: what each fighter's echoes and snow are scaled by now, into `out`. */
export function turns(now: Moment, out: Turns): Turns {
  const quiet = now.cutIn >= 0 || now.cinematic || now.impact;
  for (let i = 0; i < 2; i++) {
    out.echo[i] = quiet ? 0 : now.wear[i] > ECHO_WORN ? 0.5 : 1;
    out.snow[i] = now.attacking[i] || now.cutIn === i || now.star === i ? 0 : 1;
  }
  return out;
}

/** The close-up's wear for a fighter worn `wear`. */
export function cutInWear(wear: number): number {
  return Math.min(wear, CUT_IN_WEAR);
}

/** Stepped with the match: the table, with the snow easing in and out rather than popping. */
export class Legibility {
  readonly echo = [1, 1];
  readonly snow = [1, 1];
  private readonly target: Turns = { echo: [1, 1], snow: [1, 1] };
  private readonly now: Moment & { attacking: boolean[] } = { cutIn: -1, star: -1, cinematic: false, impact: false, wear: [0, 0], attacking: [false, false] };
  private impactLeft = 0;

  reset(): void {
    this.echo.fill(1);
    this.snow.fill(1);
    this.impactLeft = 0;
  }

  /** Once per step, after it: the match, its events, who is in the cut-in (-1: no one) and each fighter's wear. */
  step(m: MatchState, ev: readonly SimEvent[], cutIn: number, wear: readonly number[]): void {
    if (this.impactLeft > 0) this.impactLeft--;
    for (const e of ev) if ((e.type === 'hit' && e.weight === 3) || e.type === 'ko') this.impactLeft = IMPACT_STEPS;
    const n = this.now;
    n.cutIn = cutIn;
    n.star = m.phase === 'finisher' ? m.finish.player : -1;
    n.cinematic = m.phase === 'finisher';
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      if (f.mode === 'cinematic') {
        n.cinematic = true;
        if (!f.victim) n.star = i;
      }
      n.attacking[i] = f.mode === 'move' || f.mode === 'throwing';
    }
    n.impact = this.impactLeft > 0;
    n.wear = wear;
    const t = turns(n, this.target);
    for (let i = 0; i < 2; i++) {
      this.echo[i] = t.echo[i];
      const d = t.snow[i] - this.snow[i];
      this.snow[i] += Math.max(-SNOW_EASE, Math.min(SNOW_EASE, d));
    }
  }
}
