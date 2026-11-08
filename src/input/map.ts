/**
 * Turning devices into input frames, as pure functions so they can be
 * tested: keyboard codes and gamepad buttons to bits, plus button chords
 * (U + J for Throw, Y + B for the meter).
 */
import { Input } from '../sim';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, INTERACT, METER } = Input;

/** KeyboardEvent.code → bit. Throw is U + J; Technical Difficulties is Block + Special. */
export const KEYS: Readonly<Record<string, number>> = {
  KeyW: UP,
  KeyS: DOWN,
  KeyA: LEFT,
  KeyD: RIGHT,
  KeyU: FP,
  KeyI: BP,
  KeyJ: FK,
  KeyK: BK,
  KeyL: BLOCK,
  KeyO: SPECIAL,
  Semicolon: INTERACT,
  Space: METER,
};

export function keyBits(held: ReadonlySet<string>): number {
  let bits = 0;
  for (const code of held) bits |= KEYS[code] ?? 0;
  return bits;
}

/**
 * Two buttons pressed together stand for a third. A chord member pressed
 * alone is held back a couple of frames so a slightly staggered chord
 * doesn't start the single button's attack first.
 */
export class Chord {
  private alone = 0;
  private on = false;
  /** The member being held back, let through if it's released before the grace ends. */
  private waiting = 0;

  constructor(
    private readonly a: number,
    private readonly b: number,
    private readonly out: number,
    private readonly grace = 2,
  ) {}

  apply(raw: number): number {
    const both = this.a | this.b;
    const hasA = (raw & this.a) !== 0;
    const hasB = (raw & this.b) !== 0;
    if (hasA && hasB) {
      this.on = true;
      this.alone = 0;
      this.waiting = 0;
      return (raw & ~both) | this.out;
    }
    if (!hasA && !hasB) {
      const late = this.waiting;
      this.on = false;
      this.alone = 0;
      this.waiting = 0;
      return raw | late;
    }
    // One member held: after a chord, swallow it until released; otherwise wait out the grace.
    if (this.on) return raw & ~both;
    if (this.alone < this.grace) {
      this.alone++;
      this.waiting = raw & both;
      return raw & ~both;
    }
    this.waiting = 0;
    return raw;
  }
}

export function keyboardChords(): Chord[] {
  return [new Chord(FP, FK, THROW)];
}

export function padChords(): Chord[] {
  return [new Chord(BP, BK, METER)];
}

export function applyChords(chords: readonly Chord[], raw: number): number {
  for (const c of chords) raw = c.apply(raw);
  return raw;
}

export interface PadLike {
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  readonly axes: readonly number[];
}

const STICK_DEAD = 0.45;
const TRIGGER = 0.4;

/** Standard mapping, Xbox labels: X/Y punches, A/B kicks, RB block, RT special, LB throw, LT interact. */
export function padBits(p: PadLike): number {
  const btn = (i: number) => {
    const b = p.buttons[i];
    return b !== undefined && (b.pressed || b.value > TRIGGER);
  };
  let bits = 0;
  if (btn(2)) bits |= FP;
  if (btn(3)) bits |= BP;
  if (btn(0)) bits |= FK;
  if (btn(1)) bits |= BK;
  if (btn(5)) bits |= BLOCK;
  if (btn(7)) bits |= SPECIAL;
  if (btn(4)) bits |= THROW;
  if (btn(6)) bits |= INTERACT;
  const x = p.axes[0] ?? 0;
  const y = p.axes[1] ?? 0;
  if (btn(12) || y < -STICK_DEAD) bits |= UP;
  if (btn(13) || y > STICK_DEAD) bits |= DOWN;
  if (btn(14) || x < -STICK_DEAD) bits |= LEFT;
  if (btn(15) || x > STICK_DEAD) bits |= RIGHT;
  return bits;
}

/** Up and down together cancel out, as do left and right. */
export function cleanDirections(bits: number): number {
  if ((bits & (UP | DOWN)) === (UP | DOWN)) bits &= ~(UP | DOWN);
  if ((bits & (LEFT | RIGHT)) === (LEFT | RIGHT)) bits &= ~(LEFT | RIGHT);
  return bits;
}
