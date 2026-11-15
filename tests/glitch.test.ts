import { describe, expect, it } from 'vitest';
import { KO_STATIC_STEPS, koStatic } from '../src/ui/glitch';

describe('the K.O.’s static takes its turn', () => {
  it('hits hard for a few steps, then clears to a veil the pose reads through, then goes', () => {
    expect(koStatic(0)).toBeGreaterThanOrEqual(0.55);
    expect(koStatic(3)).toBeGreaterThanOrEqual(0.55);
    for (let t = 8; t < KO_STATIC_STEPS - 4; t++) expect(koStatic(t)).toBeLessThanOrEqual(0.15);
    for (let t = 1; t < KO_STATIC_STEPS; t++) expect(koStatic(t)).toBeLessThanOrEqual(koStatic(t - 1));
    expect(koStatic(KO_STATIC_STEPS - 1)).toBeLessThan(0.05);
  });
});
