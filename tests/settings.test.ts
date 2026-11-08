import { describe, expect, it } from 'vitest';
import { OPTIONS, defaults, parseSettings, reducedMotion } from '../src/game/settings';

describe('settings', () => {
  it('bad or missing values fall back to the defaults', () => {
    expect(parseSettings(null)).toEqual(defaults());
    expect(parseSettings({ censor: 9, vhs: -1, music: 1.5, touchSide: 1 })).toEqual({ ...defaults(), touchSide: 1 });
  });
  it('every default is a valid option', () => {
    const d = defaults();
    for (const k of Object.keys(d) as (keyof typeof d)[]) expect(OPTIONS[k][d[k]]).toBeDefined();
  });
  it('motion follows the system unless overridden', () => {
    expect(reducedMotion({ ...defaults(), motion: 0 }, true)).toBe(true);
    expect(reducedMotion({ ...defaults(), motion: 2 }, true)).toBe(false);
    expect(reducedMotion({ ...defaults(), motion: 1 }, false)).toBe(true);
  });
});
