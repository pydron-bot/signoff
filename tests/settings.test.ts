import { describe, expect, it } from 'vitest';
import { OPTIONS, defaults, parseSettings, reducedMotion, touchShown } from '../src/game/settings';

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

describe('screen buttons with a gamepad', () => {
  it('a pad playing player 1 hides them, unless they are set to show always; no touchscreen, none', () => {
    const d = defaults();
    expect(touchShown(d, true, 0, false)).toBe(true);
    expect(touchShown(d, true, 1, false)).toBe(false);
    expect(touchShown({ ...d, touchPad: 1 }, true, 1, false)).toBe(true);
    expect(touchShown(d, false, 0, false)).toBe(false);
  });

  it('in VS PLAYER one pad is player 2: player 1 keeps the screen until a second pad', () => {
    const d = defaults();
    expect(touchShown(d, true, 1, true)).toBe(true);
    expect(touchShown(d, true, 2, true)).toBe(false);
  });
});
