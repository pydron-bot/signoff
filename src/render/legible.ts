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
 * - no echoes on a body that isn't moving under its own power (in a hit
 *   reaction, launched, bouncing, thrown, down), whatever its speed;
 * - no snow bands on a fighter attacking, in the cut-in, playing TD's
 *   cinematic or a finisher: what they do must read.
 *
 * The cut-in's close-up draws its fighter with wear capped at CUT_IN_WEAR
 * and no snow or echoes, so it shows a face at any health.
 *
 * An ender's contact takes turns too (contactTurns): the impact frame has
 * the first two steps to itself, then the zoom blur rushes in, and only
 * when that's done do the colour split and the tracking tear run: three
 * beats that each read, not one grey smear. (The composite spares the
 * fighters from the blur, the drain and the negative by their mask:
 * src/render/post.ts.) Pure: no three.js.
 */
import type { SimEvent } from '../sim/events';
import type { MatchState } from '../sim/state';

/** Wear past which a fighter's echoes are halved. */
export const ECHO_WORN = 0.5;
/** The most wear the cut-in's close-up shows (the dulling only: no snow). */
export const CUT_IN_WEAR = 0.3;
/** Steps an impact frame lasts (src/ui/glitch.ts). */
export const IMPACT_STEPS = 3;
/** Steps since an ender, when there hasn't been one. */
const NO_ENDER = 9999;
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
  /** Not moving under their own power: hit, launched, bouncing, thrown or down. */
  reeling: readonly boolean[];
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
    out.echo[i] = quiet || now.reeling[i] ? 0 : now.wear[i] > ECHO_WORN ? 0.5 : 1;
    out.snow[i] = now.attacking[i] || now.cutIn === i || now.star === i ? 0 : 1;
  }
  return out;
}

/** Modes in which a body is thrown about, not moving itself: its speed earns no echoes. */
const REELING: ReadonlySet<string> = new Set(['hitstun', 'launched', 'down', 'getup', 'thrown', 'ko', 'dazed']);
export function isReeling(mode: string, victim: boolean): boolean {
  return REELING.has(mode) || (mode === 'cinematic' && victim);
}

/**
 * An ender's contact, in steps since it landed: the impact frame alone for
 * CONTACT_IMPACT steps, then the zoom blur (src/render/impact.ts holds it
 * back as long), and the tape (the split and the tear, src/ui/glitch.ts)
 * from CONTACT_TAPE, as the blur dies.
 */
export const CONTACT_IMPACT = 2;
export const CONTACT_TAPE = 8;

/** Scales for the zoom blur, the colour split and the tracking tear on a contact frame. */
export interface ContactTurns {
  zoom: number;
  split: number;
  tear: number;
}

/** What each is scaled by `t` steps after an ender landed (a large `t`, or none: everything as it is). */
export function contactTurns(t: number, out: ContactTurns): ContactTurns {
  // The negative has the first steps to itself.
  out.zoom = t < CONTACT_IMPACT ? 0 : 1;
  // The tape reacts once the blur has rushed in, not on top of it.
  out.split = out.tear = t < CONTACT_TAPE ? 0 : 1;
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
  /** An ender's contact: what the zoom blur, the colour split and the tear are scaled by this step. */
  readonly contact: ContactTurns = { zoom: 1, split: 1, tear: 1 };
  private readonly now: Moment & { attacking: boolean[]; reeling: boolean[] } = { cutIn: -1, star: -1, cinematic: false, impact: false, wear: [0, 0], attacking: [false, false], reeling: [false, false] };
  private impactLeft = 0;
  /** Steps since the last ender landed (large: none lately). */
  private sinceEnder = NO_ENDER;

  reset(): void {
    this.echo.fill(1);
    this.snow.fill(1);
    this.impactLeft = 0;
    this.sinceEnder = NO_ENDER;
    contactTurns(NO_ENDER, this.contact);
  }

  /** Once per step, after it: the match, its events, who is in the cut-in (-1: no one) and each fighter's wear. */
  step(m: MatchState, ev: readonly SimEvent[], cutIn: number, wear: readonly number[]): void {
    if (this.impactLeft > 0) this.impactLeft--;
    if (this.sinceEnder < NO_ENDER) this.sinceEnder++;
    for (const e of ev) {
      if ((e.type === 'hit' && e.weight === 3) || e.type === 'ko') this.impactLeft = IMPACT_STEPS;
      if (e.type === 'hit' && e.weight === 3) this.sinceEnder = 0;
    }
    contactTurns(this.sinceEnder, this.contact);
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
      n.reeling[i] = isReeling(f.mode, f.victim);
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
