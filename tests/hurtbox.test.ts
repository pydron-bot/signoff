// The body's hurtbox follows its state: thrown up or knocked down, the body
// falls back, so the box is long and low, lying behind them.
import { describe, expect, it } from 'vitest';
import { FIGHTERS } from '../src/sim';
import { hittable, hurtBox, touchesFighter } from '../src/sim/combat';
import { box } from '../src/sim/fighters/build';
import { fx, toFloat } from '../src/sim/fixed';
import { place, ready } from './sim-helpers';

describe('hurtboxes', () => {
  for (const f of Object.values(FIGHTERS)) {
    it(`${f.name}: the juggle box is long and low, and lies behind them`, () => {
      const j = f.hurt.juggle;
      expect(j.w).toBeGreaterThan(j.h);
      expect(j.w).toBeGreaterThan(f.hurt.air.w * 2);
      expect(j.h).toBeLessThan(f.hurt.air.h / 1.5);
      // More of it behind the centre than in front: they fall backwards.
      expect(-toFloat(j.x)).toBeGreaterThan(toFloat(j.x + j.w));
    });
  }

  it('a launched body is hit where it lies, not where it stood', () => {
    const m = ready('dale', 'rox');
    place(m, -0.5, 0.5);
    const d = m.fighters[1];
    d.mode = 'launched';
    d.juggleable = true;
    d.y = fx(0.4);
    expect(hurtBox(d)).toBe(FIGHTERS.rox.hurt.juggle);
    // A fist where an upright head would be (1.6–1.9 m up) passes over them.
    expect(touchesFighter(fx(-0.5), 0, 1, box(0.6, 1.2, 1.6, 1.9), d)).toBe(false);
    // A kick at waist height behind their centre (where the head now is) lands.
    expect(touchesFighter(fx(-0.5), 0, 1, box(1.3, 1.6, 0.7, 1.0), d)).toBe(true);
  });

  it('on the floor the box lies flat and nothing can hit it', () => {
    const m = ready('dale', 'rox');
    const d = m.fighters[1];
    d.mode = 'down';
    expect(hurtBox(d)).toBe(FIGHTERS.rox.hurt.juggle);
    expect(hittable(d)).toBe(false);
  });
});
