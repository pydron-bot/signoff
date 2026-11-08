/**
 * Fixed-point numbers for the simulation: integers counting 1/65536ths
 * (16.16). The fight must play out the same on every browser, so simulation
 * code never uses fractional floats. Values stay within ±32768 units (int32
 * raw); every intermediate here is an integer below 2^53, so it is exact.
 * Results round toward minus infinity, like an arithmetic shift.
 */
export type Fx = number;

export const SHIFT = 16;
export const ONE: Fx = 1 << SHIFT;
export const HALF: Fx = ONE >> 1;

/** A whole number or a literal tuning value, rounded to the nearest 1/65536. Only for constants and data, not per-step maths. */
export function fx(n: number): Fx {
  return Math.round(n * ONE);
}

/** For display and debugging only: never feed this back into the simulation. */
export function toFloat(a: Fx): number {
  return a / ONE;
}

/** a·b. A full raw product can pass 2^53 and lose bits, so a is split into whole and fraction parts. */
export function mul(a: Fx, b: Fx): Fx {
  const whole = Math.floor(a / ONE);
  const frac = a - whole * ONE;
  return whole * b + Math.floor((frac * b) / ONE);
}

/** a/b. IEEE division is correctly rounded on every engine, so this is deterministic. */
export function div(a: Fx, b: Fx): Fx {
  if (b === 0) throw new RangeError('fixed-point division by zero');
  return Math.floor((a * ONE) / b);
}

export function clamp(a: Fx, lo: Fx, hi: Fx): Fx {
  return a < lo ? lo : a > hi ? hi : a;
}

/** Moves a toward target by at most step (step ≥ 0). */
export function approach(a: Fx, target: Fx, step: Fx): Fx {
  return a < target ? Math.min(a + step, target) : Math.max(a - step, target);
}
