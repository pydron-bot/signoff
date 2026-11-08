import { describe, expect, it } from 'vitest';
import { ONE, approach, clamp, div, fx, mul } from '../src/sim/fixed';
import { createRng, nextInt, nextU32 } from '../src/sim/rng';

describe('fixed point', () => {
  it('multiplies and divides exactly, rounding down', () => {
    expect(mul(fx(2), fx(3.5))).toBe(fx(7));
    expect(mul(fx(-1.5), fx(2))).toBe(fx(-3));
    expect(div(fx(7), fx(2))).toBe(fx(3.5));
    expect(div(ONE, fx(3))).toBe(21845);
    expect(div(-ONE, fx(3))).toBe(-21846);
    expect(mul(-1, ONE >> 1)).toBe(-1);
    expect(() => div(ONE, 0)).toThrow(RangeError);
  });

  it('stays exact across the whole ±32768 range', () => {
    // A raw product of these passes 2^53; the split keeps every bit.
    expect(mul(fx(30000), fx(1.5))).toBe(fx(45000));
    expect(mul(fx(-20000), fx(-1.25))).toBe(fx(25000));
    expect(mul(fx(32767) + 12345, ONE)).toBe(fx(32767) + 12345);
    expect(mul(fx(181.5), fx(181.5))).toBe(fx(32942.25));
  });

  it('clamps and approaches', () => {
    expect(clamp(fx(5), 0, fx(3))).toBe(fx(3));
    expect(approach(fx(1), fx(2), fx(0.25))).toBe(fx(1.25));
    expect(approach(fx(1), 0, fx(4))).toBe(0);
  });
});

describe('rng', () => {
  it('repeats a seed exactly and continues from a saved state', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const seqA = Array.from({ length: 5 }, () => nextU32(a));
    expect(Array.from({ length: 5 }, () => nextU32(b))).toEqual(seqA);
    const saved = { ...a };
    const next = nextU32(a);
    expect(nextU32(saved)).toBe(next);
  });

  it('gives the known mulberry32 sequence (catches a change to the generator)', () => {
    const r = createRng(1);
    expect([nextU32(r), nextU32(r), nextU32(r)]).toEqual([2693262067, 11749833, 2265367787]);
  });

  it('keeps ints in range', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = nextInt(r, 6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
    }
  });
});
