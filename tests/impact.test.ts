import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ImpactScreen } from '../src/render/impact';
import type { HitWeight, SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { ready } from './sim-helpers';

function hit(weight: HitWeight, counter = false): SimEvent {
  return { type: 'hit', attacker: 0, defender: 1, move: 's.FP', damage: 50, height: 'mid', counter, combo: 1, weight, dir: 1, x: fx(0.5), y: fx(1.2), crouched: false };
}

function camera(): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
  c.position.set(0, 1.5, 7);
  c.lookAt(0, 1.15, 0);
  c.updateMatrixWorld();
  return c;
}

describe('the impact layer', () => {
  it("an ender drains the colour from all but the blow for its freeze, a counter's a little longer", () => {
    const m = ready('rox', 'dale');
    const cam = camera();
    const length = (e: SimEvent) => {
      const s = new ImpactScreen();
      s.onEvents([e]);
      let n = 0;
      while (s.project(m, cam).drain > 0 && n < 100) {
        s.step();
        n++;
      }
      return n;
    };
    expect(length(hit(2))).toBe(0);
    expect(length(hit(3))).toBeGreaterThanOrEqual(12);
    expect(length(hit(3, true))).toBeGreaterThan(length(hit(3)));
    // Centred on the contact: right of the middle, at chest height.
    const s = new ImpactScreen();
    s.onEvents([hit(3)]);
    const o = s.project(m, cam);
    expect(o.drain).toBe(1);
    expect(o.drainX).toBeGreaterThan(0.5);
  });

  it('a wall splat sends speed lines out from the wall; Reduce Motion drops them, not the drain', () => {
    const m = ready('rox', 'dale');
    const cam = camera();
    const splat: SimEvent = { type: 'relaunch', player: 1, how: 'wall', x: fx(3), y: fx(1) };
    const s = new ImpactScreen();
    s.onEvents([splat]);
    const o = s.project(m, cam);
    expect(o.speed).toBe(1);
    expect(o.speedX).toBeGreaterThan(0.7);
    const calm = new ImpactScreen();
    calm.reduceMotion = true;
    calm.onEvents([splat, hit(3)]);
    const c = calm.project(m, cam);
    expect(c.speed).toBe(0);
    expect(c.drain).toBe(1);
  });

  it('a jump cancel does not cut short the lines of a wall splat', () => {
    const m = ready('rox', 'dale');
    const s = new ImpactScreen();
    s.onEvents([{ type: 'relaunch', player: 1, how: 'wall', x: fx(3), y: fx(1) }]);
    s.step();
    s.onEvents([{ type: 'jumpCancel', player: 0 }]);
    expect(s.project(m, camera()).speed).toBe(1);
  });
});
