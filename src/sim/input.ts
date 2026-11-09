/**
 * Input frames: one number per player per step, a bitmask of what is held.
 * Touch, keyboard, gamepad and the CPU all produce these, and they are the
 * only way into the simulation. Directions are absolute (screen left and
 * right); the sim turns them into forward and back by facing.
 *
 * Each player's InputState remembers, per bit, how long ago it was last
 * pressed, which gives the 8-frame buffer, dashes and motion inputs. It is
 * plain data and part of the match state.
 */
import { BOOST_TAP, BUFFER, DASH_WINDOW, MOTION_WINDOW } from './constants';
import { ATTACKS, type Attack, type SpecialDir } from './types';

export const UP = 1 << 0;
export const DOWN = 1 << 1;
export const LEFT = 1 << 2;
export const RIGHT = 1 << 3;
export const FP = 1 << 4;
export const BP = 1 << 5;
export const FK = 1 << 6;
export const BK = 1 << 7;
export const BLOCK = 1 << 8;
export const SPECIAL = 1 << 9;
export const THROW = 1 << 10;
export const INTERACT = 1 << 11;
/** Tape Skip / Cut Away (Space, or tapping the meter). */
export const METER = 1 << 12;
export const INPUT_BITS = 13;

export const ATTACK_BITS: Readonly<Record<Attack, number>> = { FP, BP, FK, BK };

/** Age of a press that never happened or was used up. */
export const NEVER = 255;
const HISTORY = 16;

export interface InputState {
  held: number;
  /** Frames since each bit was last pressed. */
  age: number[];
  /** For each bit, the frames between its last two presses (double taps). */
  gap: number[];
  /** The direction read when Special was last pressed. */
  specialDir: SpecialDir;
  hist: number[];
  histPos: number;
}

export function createInput(): InputState {
  return {
    held: 0,
    age: new Array<number>(INPUT_BITS).fill(NEVER),
    gap: new Array<number>(INPUT_BITS).fill(NEVER),
    specialDir: 'n',
    hist: new Array<number>(HISTORY).fill(0),
    histPos: 0,
  };
}

export function bitIndex(bit: number): number {
  return 31 - Math.clz32(bit);
}

export function forwardBit(facing: number): number {
  return facing > 0 ? RIGHT : LEFT;
}

export function backBit(facing: number): number {
  return facing > 0 ? LEFT : RIGHT;
}

/**
 * Takes this step's raw input. While frozen in hitstop, presses still
 * register but don't age, so a buffered cancel survives the freeze.
 */
export function readInput(inp: InputState, raw: number, facing: number, frozen: boolean): void {
  if (!frozen) {
    for (let i = 0; i < INPUT_BITS; i++) if (inp.age[i] < NEVER) inp.age[i]++;
  }
  inp.histPos = (inp.histPos + 1) % HISTORY;
  inp.hist[inp.histPos] = raw;
  const pressed = raw & ~inp.held;
  inp.held = raw;
  if (pressed === 0) return;
  for (let i = 0; i < INPUT_BITS; i++) {
    if (pressed & (1 << i)) {
      inp.gap[i] = inp.age[i];
      inp.age[i] = 0;
    }
  }
  if (pressed & SPECIAL) {
    // The second tap of a boost keeps the first tap's direction, so letting go of it in between doesn't change the special.
    const dir = specialDirection(inp, facing);
    if (dir !== 'n' || inp.gap[bitIndex(SPECIAL)] > BOOST_TAP) inp.specialDir = dir;
  }
}

/** Pressed within the buffer, and fewer than `since` frames ago (pass a move's frame to ignore presses from before it). */
export function pressed(inp: InputState, bit: number, since = NEVER): boolean {
  const a = inp.age[bitIndex(bit)];
  return a <= BUFFER && a < since;
}

export function consume(inp: InputState, bit: number): void {
  inp.age[bitIndex(bit)] = NEVER;
}

/** A second tap of a direction soon after the first. */
export function doubleTapped(inp: InputState, bit: number): boolean {
  const i = bitIndex(bit);
  return inp.age[i] <= BUFFER && inp.gap[i] <= DASH_WINDOW;
}

/** The most recently pressed attack button still in the buffer. */
export function bufferedAttack(inp: InputState, since = NEVER): Attack | null {
  let best: Attack | null = null;
  let bestAge = NEVER;
  for (const a of ATTACKS) {
    const age = inp.age[bitIndex(ATTACK_BITS[a])];
    if (age <= BUFFER && age < since && age < bestAge) {
      best = a;
      bestAge = age;
    }
  }
  return best;
}

/**
 * Direction + Special is the main way in; a quarter circle towards or away
 * gives exactly the same move, for players who expect motions.
 */
function specialDirection(inp: InputState, facing: number): SpecialDir {
  const fwd = forwardBit(facing);
  const back = backBit(facing);
  if (quarterCircle(inp, fwd)) return 'f';
  if (quarterCircle(inp, back)) return 'b';
  if (inp.held & DOWN) return 'd';
  if (inp.held & fwd) return 'f';
  if (inp.held & back) return 'b';
  return 'n';
}

/** Down, down + side, side, in that order, within the motion window (scanned newest first). */
function quarterCircle(inp: InputState, side: number): boolean {
  let stage = 0;
  for (let k = 0; k < MOTION_WINDOW; k++) {
    const raw = inp.hist[(inp.histPos - k + HISTORY) % HISTORY];
    const d = (raw & DOWN) !== 0;
    const s = (raw & side) !== 0;
    if (stage === 0 && s && !d) stage = 1;
    else if (stage === 1 && s && d) stage = 2;
    else if (stage === 2 && d && !s) return true;
  }
  return false;
}
