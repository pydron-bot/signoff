/**
 * The simulation's random numbers: mulberry32 on 32-bit integer maths, so a
 * seed gives the same sequence everywhere. Its whole state is one number,
 * which the match state saves and restores with everything else (replays,
 * training resets, rollback). Never use Math.random in simulation code.
 */
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed | 0 };
}

/** The next unsigned 32-bit integer. */
export function nextU32(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) | 0;
  let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/** An integer in [0, n), n ≥ 1. The tiny modulo bias doesn't matter for a fight. */
export function nextInt(r: RngState, n: number): number {
  return nextU32(r) % n;
}
