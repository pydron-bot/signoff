/**
 * Life on top of the clips, worked out per fighter each simulation step so
 * a replay shows it the same: the head pitched a few degrees to keep the
 * opponent in view (only in the clips that leave the head free: standing,
 * walking, crouching, blocking, jumping, landing), a blink every few
 * seconds (its timing from the step count and the fighter, never at
 * random; not in a hit reaction or worse), and a face that follows the
 * round: the `hurt` shape creeping in as health falls, `win` on a long
 * combo. The model takes the larger of the clip's own shape and this, so a
 * clip that sets the face keeps it. Pure: no three.js.
 */
import type { MatchState } from '../sim/state';
import { toFloat } from '../sim/fixed';
import { hurtBox } from '../sim/combat';

/** Clips that leave the head free to look. */
export const LOOK_CLIPS: ReadonlySet<string> = new Set(['idle', 'walk_fwd', 'walk_back', 'crouch', 'crouch_idle', 'block_stand', 'block_crouch', 'jump_up', 'jump_fall', 'land', 'land_attack', 'prejump', 'dazed']);
/** Clips that own the face (hit reactions, being thrown about, the K.O.): no blink. */
const NO_BLINK = /^(hit_|stagger|launched|juggle_hit|relaunch|slam|floor_bounce|wall_splat|down|getup|ko|thrown|td_cinematic)/;
/** The most the head pitches (radians), and how much of the angle to the opponent it takes. */
export const LOOK_MAX = 0.3;
const LOOK_SHARE = 0.6;
/** How fast the head and the face follow (of the way, a step). */
const EASE = 0.15;
/** A blink: steps it lasts, and the shut amount each step. */
const BLINK = [0.5, 1, 1, 0.6, 0.25] as const;
/** Steps between blinks: at least this, plus up to BLINK_SPREAD more, different each time. */
const BLINK_GAP = 150;
const BLINK_SPREAD = 130;
/** Hurt creeps in past this much health lost, to HURT_MAX at none left. */
const HURT_FROM = 0.25;
const HURT_MAX = 0.6;
/** A combo this long puts a grin on the attacker's face. */
export const WIN_COMBO = 5;
const WIN_AMOUNT = 0.7;

/** The head's pitch toward the opponent: up (positive) when their head is higher. */
export function lookPitch(dy: number, dx: number): number {
  return Math.max(-LOOK_MAX, Math.min(LOOK_MAX, Math.atan2(dy, Math.max(0.6, Math.abs(dx))) * LOOK_SHARE));
}

/** A cheap, fixed hash of a whole number, 0 to 1. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
}

/** How shut the eyes are at step `frame` for fighter `player`, 0 to 1. */
export function blinkAt(frame: number, player: number): number {
  // Blinks fall in windows of BLINK_GAP + BLINK_SPREAD steps, each at its own offset.
  const span = BLINK_GAP + BLINK_SPREAD;
  const f = frame + player * 97;
  const window = Math.floor(f / span);
  const at = Math.floor(hash(window * 2 + player) * BLINK_SPREAD);
  const t = (f % span) - at;
  return t >= 0 && t < BLINK.length ? BLINK[t] : 0;
}

/** The hurt shape for health left (a share of full). */
export function hurtFor(healthShare: number): number {
  const lost = 1 - Math.max(0, Math.min(1, healthShare));
  return lost <= HURT_FROM ? 0 : (HURT_MAX * (lost - HURT_FROM)) / (1 - HURT_FROM);
}

export class Alive {
  readonly look = [0, 0];
  readonly blink = [0, 0];
  readonly hurt = [0, 0];
  readonly win = [0, 0];

  reset(): void {
    this.look.fill(0);
    this.blink.fill(0);
    this.hurt.fill(0);
    this.win.fill(0);
  }

  /** Once per step, for fighter i, with the clip they show now. */
  step(m: MatchState, i: number, clip: string): void {
    const f = m.fighters[i];
    const o = m.fighters[1 - i];
    let look = 0;
    if (LOOK_CLIPS.has(clip)) {
      const mine = hurtBox(f);
      const theirs = hurtBox(o);
      const dy = toFloat(o.y + theirs.y + theirs.h) - toFloat(f.y + mine.y + mine.h);
      look = lookPitch(dy, toFloat(o.x - f.x));
    }
    this.look[i] += (look - this.look[i]) * EASE;
    this.blink[i] = NO_BLINK.test(clip) ? 0 : blinkAt(m.frame, i);
    this.hurt[i] += (hurtFor(f.health / f.maxHealth) - this.hurt[i]) * EASE;
    // The attacker's combo is counted on the one being hit.
    const grin = o.combo >= WIN_COMBO && (o.mode === 'hitstun' || o.mode === 'launched') ? WIN_AMOUNT : 0;
    this.win[i] += (grin - this.win[i]) * (grin > 0 ? EASE * 2 : EASE * 0.5);
  }
}
