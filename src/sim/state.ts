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
  | 'ko'
  /** On their feet but out: the loser while the winner decides how to finish. */
  | 'dazed';

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
  airSpecialUsed: boolean;
  /** The jump being taken off is a jump cancel's hop. */
  hop: boolean;
  /** In a dash: frames until it can be cancelled (Tape Skip's never can). */
  dashFree: number;
  move: string;
  moveFrame: number;
  /** One bit per hit of the current move that has connected. */
  hitMask: number;
  /** The current move has gone over a ducking opponent (said once a move). */
  ducked: boolean;
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
  /** Gideon's donations (0 to DONATIONS_MAX); 0 for everyone else. */
  donations: number;
  hitstop: number;
  /** Hits taken in the current combo (for scaling) and juggle hits. */
  combo: number;
  juggle: number;
  juggleable: boolean;
  /** The moves that have hit this combo, one entry per use (a boosted special counts as its plain move), for repeat scaling. */
  comboMoves: string[];
  /** Spent this combo: the one ground and wall bounce. */
  groundBounced: boolean;
  wallBounced: boolean;
  /** A jump cancel has followed this fighter into the air this combo (once a combo). */
  chased: boolean;
  /** Defence: the delayed getup is used this knockdown; frames left in which a move is a reversal; the move under way is one. */
  getupDelayed: boolean;
  wakeup: number;
  reversal: boolean;
  /** A bounce on its way: off the floor when they land, off the wall when they reach it. */
  bounce: 'none' | 'ground' | 'wall';
  ko: boolean;
  cutAwayUsed: boolean;
  /** The move that took the last of this fighter's health ('' if none), for cancellations. */
  koMove: string;
  /** The directions the winner held as that blow landed (heldDirs), for cancellations that ask for one. */
  koHeld: number;
  tdUsed: boolean;
  /** Frames until Technical Difficulties can be tried again after a miss or a block. */
  tdCooldown: number;
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
  /** On its way back to its owner. */
  back: boolean;
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

export type Phase = 'intro' | 'fight' | 'ko' | 'break' | 'stayTuned' | 'finisher' | 'over';

/** The finisher playing: whose, which, and the step it's on (from 1). */
export interface FinishState {
  player: number;
  id: string;
  frame: number;
}

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
  /** The round's first hit has landed (it's worth a bar). */
  firstHit: boolean;
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
  /** player -1 when no finisher is playing. */
  finish: FinishState;
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
    airSpecialUsed: false,
    hop: false,
    dashFree: 0,
    move: '',
    moveFrame: 0,
    hitMask: 0,
    ducked: false,
    contact: 'none',
    armorUsed: false,
    throwBack: false,
    grabMove: '',
    techable: true,
    victim: false,
    health: d.health,
    maxHealth: d.health,
    meter: 0,
    donations: 0,
    hitstop: 0,
    combo: 0,
    juggle: 0,
    juggleable: false,
    comboMoves: [],
    getupDelayed: false,
    wakeup: 0,
    reversal: false,
    groundBounced: false,
    wallBounced: false,
    chased: false,
    bounce: 'none',
    ko: false,
    cutAwayUsed: false,
    koMove: '',
    koHeld: 0,
    tdUsed: false,
    tdCooldown: 0,
    wins: 0,
    input: createInput(),
  };
}

export function createProjectile(): ProjectileState {
  return { active: false, owner: 0, move: '', spawn: 0, dir: 1, x: 0, y: 0, life: 0, hitsLeft: 0, rehit: 0, back: false };
}

export function saveMatch(m: MatchState): MatchState {
  return structuredClone(m);
}
