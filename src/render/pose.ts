/**
 * Which animation clip each fighter shows, and at which frame, read from the
 * match state. Moves play by their own move frame; other states count the
 * simulation steps since the fighter entered them (frozen in hitstop, like
 * the sim), so the pose on screen always matches the hitboxes. Pure: no
 * three.js, no clock. Clip names and lengths: docs/BLENDER-TODO.md.
 */
import { INTRO_FRAMES } from '../sim/constants';
import type { SimEvent } from '../sim/events';
import type { FighterState, MatchState } from '../sim/state';
import { segmentData, type PropData } from '../sim/stages';


/** Top level, so the per-frame check makes no closure. */
function isThrown(p: PropData): boolean {
  return p.thrown === true;
}
export interface Pose {
  clip: string;
  /** 1-based, as in the move data. Past the clip's end: hold its last frame, or wrap if it loops. */
  frame: number;
  loop: boolean;
}

/** State clips that loop. */
export const LOOPS: ReadonlySet<string> = new Set(['idle', 'walk_fwd', 'walk_back', 'crouch_idle', 'dazed']);
/**
 * Clips asked of the art that may not be in a GLB yet, and what stands in
 * for them meanwhile (docs/BLENDER-TODO.md).
 */
export const STAND_INS: Readonly<Record<string, string>> = {
  // Picking up and throwing a prop (the boombox, step 14).
  interact_throw: 'interact',
  // Juggle reactions (step 16): the held end of `launched`.
  juggle_hit: 'launched',
  relaunch: 'launched',
  slam: 'launched',
  floor_bounce: 'launched',
  wall_splat: 'launched',
};
/** Stand-ins shown at their last frame, not played from the start (the juggle reactions hold `launched`'s pose). */
export const HELD_STAND_INS: ReadonlySet<string> = new Set(['juggle_hit', 'relaunch', 'slam', 'floor_bounce', 'wall_splat']);

/** The clip to show for a fighter's clip that isn't in the GLB yet, if there is one. */
export function standIn(fighter: string, clip: string): string | undefined {
  return STAND_INS[`${fighter}:${clip}`] ?? STAND_INS[clip];
}
/** Frames of the `crouch` clip before `crouch_idle` takes over. */
export const CROUCH_IN = 6;

interface Track {
  /** The state being counted: a clip name, or 'move' / 'throwing' / 'crouch'. */
  state: string;
  /** Steps since entering it (0 on the first). */
  since: number;
  /** The clip chosen on entry, for states that remember a choice. */
  clip: string;
  /** Move frame on entry (a grab carries on from where it caught). */
  base: number;
  /** Skips the crouch-in when already low (after a crouching move or block). */
  low: boolean;
  wasCrouching: boolean;
  hitstop: number;
}

function newTrack(): Track {
  return { state: '', since: 0, clip: '', base: 0, low: false, wasCrouching: false, hitstop: 0 };
}

const NEUTRAL: ReadonlySet<string> = new Set(['idle', 'walk', 'crouch']);

/** The state a fighter is in, for counting: a literal, so this allocates nothing. */
function stateOf(m: MatchState, i: number): string {
  const f = m.fighters[i];
  if (m.phase === 'intro') return 'intro';
  // The winner's pose, except while walking into range for a finisher or playing one.
  const posing = m.phase === 'ko' || m.phase === 'over' || (m.phase === 'stayTuned' && f.mode === 'idle');
  if (posing && m.roundWinner === i && NEUTRAL.has(f.mode)) return 'win';
  switch (f.mode) {
    case 'move':
      return 'move';
    case 'idle':
    case 'recover':
      return 'idle';
    case 'walk':
      return f.vx * f.facing > 0 ? 'walk_fwd' : 'walk_back';
    case 'crouch':
      return 'crouch';
    case 'guard':
    case 'blockstun':
      return f.crouching ? 'block_crouch' : 'block_stand';
    case 'air':
      return f.vy > 0 ? 'jump_up' : 'jump_fall';
    case 'landing':
      return 'landing';
    case 'hitstun':
      return 'hitstun';
    case 'cinematic':
      return f.victim ? 'hitstun' : 'td_cinematic';
    default:
      // prejump, dash, backdash, launched, down, getup, throwing, thrown, ko, dazed: the clip is the mode.
      return f.mode;
  }
}

export class PoseTracker {
  private readonly tracks = [newTrack(), newTrack()];

  /** Forget everything (a new match). */
  reset(): void {
    this.tracks[0] = newTrack();
    this.tracks[1] = newTrack();
  }

  /** Once per simulation step, after it, with that step's events. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const t = this.tracks[i];
      const s = stateOf(m, i);
      if (s !== t.state) {
        this.enter(t, f, s);
        // Two victory poses: the round number picks one.
        if (s === 'win') t.clip = m.round % 2 === 0 ? 'win_2' : 'win';
      }
      // The sim froze this fighter if hitstop was left over from the last step.
      else if (t.hitstop === 0) t.since++;
      t.hitstop = f.hitstop;
      t.wasCrouching = f.crouching;
    }
    // A fresh hit restarts the reaction, high or low; Tape Skip's dash has a clip of its own.
    for (const e of ev) {
      if (e.type === 'tapeSkip') {
        const t = this.tracks[e.player];
        if (t.state === 'dash') t.clip = 'tape_skip';
        continue;
      }
      if (e.type !== 'hit' && e.type !== 'hazardHit') continue;
      const i = e.type === 'hit' ? e.defender : e.player;
      const t = this.tracks[i];
      const f = m.fighters[i];
      if (t.state === 'launched' && !f.ko && e.type === 'hit') {
        // Hit again in the air: a slam into the floor, or a jolt that ends back in the juggle pose.
        if (f.bounce === 'ground') this.react(t, 'slam');
        else if (f.juggle > 0 && f.juggleable) this.react(t, 'juggle_hit');
        continue;
      }
      if (t.state !== 'hitstun') continue;
      t.since = 0;
      t.clip = (e.type === 'hit' && e.height === 'low') || f.crouching ? 'hit_low' : 'hit_high';
    }
    // Popped back up: by a boosted special, off the floor or off the wall (after the hit that caused it, so it wins).
    for (const e of ev) {
      if (e.type !== 'relaunch') continue;
      const t = this.tracks[e.player];
      if (t.state === 'launched') this.react(t, e.how === 'special' ? 'relaunch' : e.how === 'ground' ? 'floor_bounce' : 'wall_splat');
    }
  }

  private react(t: Track, clip: string): void {
    t.clip = clip;
    t.since = 0;
  }

  private enter(t: Track, f: FighterState, s: string): void {
    t.low = s === 'crouch' && t.wasCrouching;
    t.state = s;
    t.since = 0;
    t.base = f.moveFrame;
    // Landing from an air attack takes longer (the sim set the longer timer).
    if (s === 'landing') t.clip = f.timer >= 2 ? 'land_attack' : 'land';
    else if (s === 'hitstun') t.clip = f.crouching ? 'hit_low' : 'hit_high';
    else t.clip = s;
  }

  /** Fighter i's pose for the latest step, into `out`. */
  pose(m: MatchState, i: number, out: Pose): Pose {
    const f = m.fighters[i];
    const t = this.tracks[i];
    // Before the first step (a new match), read the state directly.
    const s = t.state || stateOf(m, i);
    const since = t.state ? t.since : 0;
    out.loop = false;
    switch (s) {
      case 'intro':
        // Two intros, alternating by round and player, so the two fighters differ.
        out.clip = (m.round + i) % 2 === 0 ? 'intro_2' : 'intro';
        out.frame = Math.min(INTRO_FRAMES, Math.max(1, INTRO_FRAMES - m.phaseTimer + 1));
        return out;
      case 'move':
        // Interact throws a prop where the segment's prop is thrown, and kicks it otherwise.
        out.clip = f.move === 'interact' && segmentData(m.stage, m.segment).props.some(isThrown) ? 'interact_throw' : f.move;
        out.frame = f.moveFrame;
        return out;
      case 'throwing':
        // The grab's clip carries on from the frame it caught on.
        out.clip = f.move;
        out.frame = t.base + since;
        return out;
      case 'crouch':
        if (t.low || since >= CROUCH_IN) {
          out.clip = 'crouch_idle';
          out.loop = true;
          out.frame = (t.low ? since : since - CROUCH_IN) + 1;
        } else {
          out.clip = 'crouch';
          out.frame = since + 1;
        }
        return out;
      default:
        out.clip = t.state ? t.clip : s === 'hitstun' ? 'hit_high' : s === 'landing' ? 'land' : s;
        out.loop = LOOPS.has(out.clip);
        out.frame = since + 1;
        return out;
    }
  }
}
