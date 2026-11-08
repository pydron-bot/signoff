/**
 * The whole match as plain data: numbers, strings, booleans and arrays of
 * them. Saving and restoring is one structuredClone, which gives training
 * resets and replays now and rollback later. Move data is referenced by id.
 */
import { START_X } from './constants';
import type { Fx } from './fixed';
import { fighterData } from './fighters';
import { createInput, type InputState } from './input';
import type { RngState } from './rng';

export type FighterMode =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'guard'
  | 'prejump'
  | 'air'
  | 'landing'
  | 'dash'
  | 'backdash'
  | 'move'
  | 'hitstun'
  | 'blockstun'
  | 'launched'
  | 'down'
  | 'getup'
  | 'throwing'
  | 'thrown'
  | 'recover'
  | 'cinematic'
  | 'ko';

export interface FighterState {
  fighter: string;
  x: Fx;
  y: Fx;
  vx: Fx;
  vy: Fx;
  facing: 1 | -1;
  /** Pushback: a slide away from the attacker that slows to a stop. */
  slide: Fx;
  slideDir: 1 | -1;
  mode: FighterMode;
  /** Frames left in timed modes, after this one. */
  timer: number;
  crouching: boolean;
  jumpDir: -1 | 0 | 1;
  airAttackUsed: boolean;
  move: string;
  moveFrame: number;
  /** One bit per hit of the current move that has connected. */
  hitMask: number;
  contact: 'none' | 'hit' | 'block';
  armorUsed: boolean;
  throwBack: boolean;
  /** The grab that has this fighter (its damage), and whether Throw can break it. */
  grabMove: string;
  techable: boolean;
  /** In a Technical Difficulties cinematic as the one being hit. */
  victim: boolean;
  health: number;
  maxHealth: number;
  meter: number;
  hitstop: number;
  /** Hits taken in the current combo (for scaling) and juggle hits. */
  combo: number;
  juggle: number;
  juggleable: boolean;
  ko: boolean;
  cutAwayUsed: boolean;
  tdUsed: boolean;
  wins: number;
  input: InputState;
}

export interface ProjectileState {
  active: boolean;
  owner: number;
  /** Where it came from: the owner's move and which spawn. */
  move: string;
  spawn: number;
  dir: 1 | -1;
  x: Fx;
  y: Fx;
  life: number;
  hitsLeft: number;
  rehit: number;
}

/** A stage hazard this round: which spot it picked and whom it has hit this strike. */
export interface HazardState {
  spot: number;
  hitMask: number;
}

export interface PropState {
  x: Fx;
  mode: 'idle' | 'rolling' | 'spent';
  dir: 1 | -1;
  owner: number;
}

export type Phase = 'intro' | 'fight' | 'ko' | 'break' | 'stayTuned' | 'over';

export interface MatchState {
  frame: number;
  phase: Phase;
  phaseTimer: number;
  round: number;
  /** 0-2: which segment of the show is on. */
  segment: number;
  /** Round clock in frames. */
  timer: number;
  /** Frames of fighting this round: stage hazards keep time by it. */
  roundFrame: number;
  /** This round's wind push per frame (signed), 0 for none. */
  wind: Fx;
  hazards: HazardState[];
  props: PropState[];
  stage: string;
  /** Studio rules: one segment, hazards off. */
  studio: boolean;
  roundWinner: number;
  /** -1 until decided; 2 for a drawn match. */
  matchWinner: number;
  rng: RngState;
  fighters: FighterState[];
  projectiles: ProjectileState[];
}

export const PROJECTILE_SLOTS = 8;

export function createFighter(id: string, side: 0 | 1): FighterState {
  const d = fighterData(id);
  return {
    fighter: id,
    x: side === 0 ? -START_X : START_X,
    y: 0,
    vx: 0,
    vy: 0,
    facing: side === 0 ? 1 : -1,
    slide: 0,
    slideDir: 1,
    mode: 'idle',
    timer: 0,
    crouching: false,
    jumpDir: 0,
    airAttackUsed: false,
    move: '',
    moveFrame: 0,
    hitMask: 0,
    contact: 'none',
    armorUsed: false,
    throwBack: false,
    grabMove: '',
    techable: true,
    victim: false,
    health: d.health,
    maxHealth: d.health,
    meter: 0,
    hitstop: 0,
    combo: 0,
    juggle: 0,
    juggleable: false,
    ko: false,
    cutAwayUsed: false,
    tdUsed: false,
    wins: 0,
    input: createInput(),
  };
}

export function createProjectile(): ProjectileState {
  return { active: false, owner: 0, move: '', spawn: 0, dir: 1, x: 0, y: 0, life: 0, hitsLeft: 0, rehit: 0 };
}

export function saveMatch(m: MatchState): MatchState {
  return structuredClone(m);
}
