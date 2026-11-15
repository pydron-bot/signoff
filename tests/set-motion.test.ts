import { describe, expect, it } from 'vitest';
import { SetMotion } from '../src/render/setMotion';
import { segmentData } from '../src/sim/stages';
import { fx, toFloat } from '../src/sim/fixed';
import type { SimEvent } from '../src/sim';
import { ready } from './sim-helpers';

const hit = (weight: 0 | 1 | 2 | 3, dir = 1): SimEvent => ({ type: 'hit', attacker: 0, defender: 1, move: 'x', damage: 80, height: 'mid', counter: false, combo: 1, weight, dir, x: 0, y: fx(1), crouched: false });

/** A left shelf, a right shelf, a lamp in the middle. */
function rig() {
  const s = new SetMotion();
  s.setNodes([
    { kind: 'shake', x: -6 },
    { kind: 'shake', x: 6 },
    { kind: 'swing', x: 0 },
  ]);
  return s;
}

describe('the set answers the fight', () => {
  it('a heavy blow by the right wall shakes the right shelf, hardly the left', () => {
    const m = ready('rox', 'gus');
    const half = toFloat(segmentData(m.stage, m.segment).halfWidth);
    m.fighters[1].x = fx(half - 0.5);
    const s = rig();
    s.onEvents(m, [hit(2)]);
    let left = 0;
    let right = 0;
    for (let i = 0; i < 10; i++) {
      s.step();
      left = Math.max(left, Math.abs(s.angle[0]));
      right = Math.max(right, Math.abs(s.angle[1]));
    }
    expect(right).toBeGreaterThan(0.01);
    expect(left).toBeLessThan(right * 0.3);
    // Not an ender: the lamp hangs still.
    expect(s.angle[2]).toBe(0);
  });

  it('in the middle, a heavy blow shakes nothing; an ender swings the lamps, which settle', () => {
    const m = ready('rox', 'gus');
    const s = rig();
    s.onEvents(m, [hit(2)]);
    s.step();
    expect(s.angle[0]).toBe(0);
    s.onEvents(m, [hit(3)]);
    let peak = 0;
    for (let i = 0; i < 40; i++) (s.step(), (peak = Math.max(peak, Math.abs(s.angle[2]))));
    expect(peak).toBeGreaterThan(0.05);
    for (let i = 0; i < 600; i++) s.step();
    expect(Math.abs(s.angle[2])).toBeLessThan(0.002);
  });

  it('a wall splat shakes that wall and swings the lamps; a frozen match holds them where they are', () => {
    const m = ready('rox', 'gus');
    const s = rig();
    s.onEvents(m, [{ type: 'relaunch', player: 1, how: 'wall', x: fx(-7), y: fx(1) }]);
    for (let i = 0; i < 3; i++) s.step();
    const held = [...s.angle];
    expect(Math.abs(held[0])).toBeGreaterThan(0.005);
    expect(Math.abs(held[2])).toBeGreaterThan(0);
    // No steps (the freeze, a pause): nothing changes.
    expect([...s.angle]).toEqual(held);
  });

  it('nothing moves with Reduce Motion, and the same events give the same motion', () => {
    const m = ready('rox', 'gus');
    const still = rig();
    still.reduceMotion = true;
    still.onEvents(m, [hit(3)]);
    still.step();
    expect([...still.angle]).toEqual([0, 0, 0]);
    const a = rig();
    const b = rig();
    for (const s of [a, b]) {
      s.onEvents(m, [hit(3, -1)]);
      for (let i = 0; i < 25; i++) s.step();
    }
    expect([...a.angle]).toEqual([...b.angle]);
  });
});
