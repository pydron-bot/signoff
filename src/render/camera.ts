/**
 * The fight camera, worked out per simulation step from the match and its
 * events: close enough that the fighters fill most of the screen's height,
 * pulling back only as far as the gap between them needs, rising with
 * jumps and juggles, and stopping short of the walls. Hits move it by their
 * weight: a shake (trauma, squared, so small hits barely stir it), a lean
 * the way the blow travels, and a quick push in on enders, launches, wall
 * splats and boosts. A KO swings it round and in on the loser while the
 * game runs in slow motion (src/game/slowMo.ts). Pure: no three.js, no
 * clock, no Math.random; the arena copies `shot` onto the real camera.
 */
import type { MatchState, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';

/** Vertical field of view, degrees. */
export const FOV = 30;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** Closest the fight comes: about 3.4 m of height in view, so a fighter fills half the screen. */
export const NEAR = 6.4;
export const FAR = 16;
/** Room kept beside each fighter, metres. */
export const SIDE_ROOM = 1.7;
/** A finisher comes closer still. */
const FINISH_NEAR = 4.8;
const FINISH_ROOM = 1.3;
/** Where the camera looks, metres up: about chest height, so the feet sit near the bottom. */
const LOOK_Y = 1.15;
/** Looking slightly down: camera height above the target per metre of distance. */
const TILT = 0.065;
/** Of the frame's half-width, how much may pass beyond a wall. */
const PAST_WALL = 0.2;

/** By hit weight (light, medium, heavy, ender): trauma added, lean the way the blow travels (m), and push in (m). */
const TRAUMA = [0.18, 0.28, 0.45, 0.62] as const;
const LEAN = [0.02, 0.04, 0.08, 0.14] as const;
const PUSH = [0, 0, 0.12, 0.4] as const;
const SHAKE_X = 0.22;
const SHAKE_Y = 0.16;
const SHAKE_ROLL = 0.035;
const TRAUMA_DECAY = 0.05;

/** The KO swing, in steps: in, held, out. */
const KO_IN = 6;
const KO_HOLD = 70;
const KO_OUT = 50;
const KO_ORBIT = 0.22;
const KO_CLOSER = 0.25;

/** Where the camera is and what it looks at, in metres (three.js space). */
export interface Shot {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  /** Radians about the view axis. */
  roll: number;
}

export class CameraRig {
  /** Width over height of the view. */
  aspect = 16 / 9;
  /** Drops the shake, the lean, the push-ins and the KO swing; framing stays. */
  reduceMotion = false;
  readonly shot: Shot = { x: 0, y: LOOK_Y + NEAR * TILT, z: NEAR, tx: 0, ty: LOOK_Y, roll: 0 };
  private fx = 0;
  private fy = LOOK_Y;
  private fz = 10;
  private snap = true;
  private trauma = 0;
  private lean = 0;
  private push = 0;
  private pushTarget = 0;
  private t = 0;
  /** The KO swing: who went down, which side it swings to, and steps since (-1: none). */
  private koLoser = 0;
  private koSide = 1;
  private koT = -1;

  /** Jump straight to the framing on the next step (a new match, a replay seek, a new round). */
  reset(): void {
    this.snap = true;
    this.trauma = this.lean = this.push = this.pushTarget = 0;
    this.koT = -1;
  }

  /** Once per simulation step, after it, with that step's events. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    this.t++;
    for (const e of ev) this.react(m, e);
    const [a, b] = m.fighters;
    const ax = toFloat(a.x);
    const bx = toFloat(b.x);
    const high = Math.max(toFloat(a.y), toFloat(b.y), 0);
    const finisher = m.phase === 'finisher';
    const gap = Math.abs(ax - bx);
    const near = finisher ? FINISH_NEAR : NEAR;
    const room = finisher ? FINISH_ROOM : SIDE_ROOM;
    let z = Math.min(FAR, Math.max(near, (gap + 2 * room) / (2 * TAN * this.aspect))) + high;
    let x = (ax + bx) / 2;
    let y = (finisher ? 1.05 : LOOK_Y) + high * 0.6;
    // The KO: in on the loser (not with Reduce Motion).
    const k = this.reduceMotion ? 0 : this.koWeight();
    if (k > 0) {
      const l = m.fighters[this.koLoser];
      x += (toFloat(l.x) - x) * 0.5 * k;
      y += (toFloat(l.y) + 0.9 - y) * 0.4 * k;
      z *= 1 - KO_CLOSER * k;
    }
    // Stop short of the walls, letting a little past them show.
    const halfWidth = toFloat(segmentData(m.stage, m.segment).halfWidth);
    const reach = Math.max(0, halfWidth - z * TAN * this.aspect * (1 - PAST_WALL));
    x = Math.max(-reach, Math.min(reach, x));
    if (this.snap) {
      this.fx = x;
      this.fy = y;
      this.fz = z;
      this.snap = false;
    } else {
      this.fx += (x - this.fx) * 0.18;
      this.fy += (y - this.fy) * 0.1;
      this.fz += (z - this.fz) * 0.12;
    }
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY);
    this.lean *= 0.8;
    this.push += (this.pushTarget - this.push) * 0.35;
    this.pushTarget *= 0.88;
    if (this.koT >= 0 && ++this.koT > KO_IN + KO_HOLD + KO_OUT) this.koT = -1;
    this.compose();
  }

  private react(m: MatchState, e: SimEvent): void {
    switch (e.type) {
      case 'roundStart':
        this.reset();
        break;
      case 'hit':
        this.kick(TRAUMA[e.weight] + (e.counter ? 0.1 : 0), PUSH[e.weight]);
        this.lean = Math.max(-0.25, Math.min(0.25, this.lean + e.dir * LEAN[e.weight]));
        break;
      case 'guardCrush':
        this.kick(0.35, 0.15);
        break;
      case 'relaunch':
        this.kick(e.how === 'special' ? 0.3 : 0.4, e.how === 'wall' ? 0.6 : 0.45);
        break;
      case 'boost':
        this.kick(0, 0.45);
        break;
      case 'superStart':
        this.kick(0, 0.6);
        break;
      case 'superHit':
        this.kick(0.8, 0);
        break;
      case 'hazardStrike':
        this.kick(e.hazard === 'lightning' ? 0.55 : e.hazard === 'lamps' ? 0.45 : e.hazard === 'shards' ? 0.35 : 0.28, 0);
        break;
      case 'ko': {
        this.kick(0.7, 0);
        if (m.phase === 'finisher') break;
        const l = m.fighters[e.player];
        const w = m.fighters[1 - e.player];
        this.koLoser = e.player;
        this.koSide = l.x >= w.x ? 1 : -1;
        this.koT = 0;
        break;
      }
      default:
        break;
    }
  }

  private kick(trauma: number, push: number): void {
    this.trauma = Math.min(1, this.trauma + trauma);
    this.pushTarget = Math.max(this.pushTarget, push);
  }

  /** 0 to 1: how far into the KO swing. */
  private koWeight(): number {
    const t = this.koT;
    if (t < 0) return 0;
    if (t < KO_IN) return t / KO_IN;
    if (t < KO_IN + KO_HOLD) return 1;
    return Math.max(0, 1 - (t - KO_IN - KO_HOLD) / KO_OUT);
  }

  private compose(): void {
    const s = this.shot;
    const calm = this.reduceMotion;
    const lean = calm ? 0 : this.lean;
    const d = Math.max(3.5, this.fz - (calm ? 0 : this.push));
    const orbit = calm ? 0 : KO_ORBIT * this.koSide * this.koWeight();
    s.tx = this.fx + lean;
    s.ty = this.fy;
    s.x = s.tx + Math.sin(orbit) * d;
    s.z = Math.cos(orbit) * d;
    s.y = s.ty + d * TILT;
    s.roll = 0;
    if (calm || this.trauma <= 0) return;
    const amp = this.trauma * this.trauma;
    const t = this.t;
    const sx = amp * SHAKE_X * wobble(t, 0);
    const sy = amp * SHAKE_Y * wobble(t, 1);
    s.x += sx;
    s.y += sy;
    s.tx += sx * 0.5;
    s.ty += sy * 0.5;
    s.roll = amp * SHAKE_ROLL * wobble(t, 2);
  }
}

/** Shake noise in -1..1 that changes every step without repeating soon: two sines, out of step. */
function wobble(t: number, k: number): number {
  return Math.sin(t * 1.93 + k * 17.1) * 0.6 + Math.sin(t * 4.71 + k * 3.3) * 0.4;
}

/** Half the width in view at the fighters' plane, at distance `z`. */
export function halfView(z: number, aspect: number): number {
  return z * TAN * aspect;
}

/** Half the height in view at the fighters' plane, at distance `z`. */
export function halfHeight(z: number): number {
  return z * TAN;
}
