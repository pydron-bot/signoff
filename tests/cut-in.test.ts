import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CutIn } from '../src/render/cutIn';
import { ready, place } from './sim-helpers';

describe('the super cut-in', () => {
  it('a super shows a close-up band that slides in from the fighter’s side, then out', () => {
    const m = ready('rox', 'dale');
    place(m, -1, 1);
    const c = new CutIn();
    expect(c.place(m, 16 / 9).on).toBe(0);
    c.onEvents([{ type: 'superStart', player: 0 }]);
    const first = c.place(m, 16 / 9).x0;
    // Player 0 is on the left: it comes in from the left edge.
    expect(first).toBeLessThan(0);
    let steps = 0;
    while (c.active) {
      c.step();
      steps++;
    }
    expect(steps).toBeGreaterThanOrEqual(30);
    const right = new CutIn();
    right.onEvents([{ type: 'superStart', player: 1 }]);
    for (let i = 0; i < 6; i++) right.step();
    const r = right.place(m, 16 / 9);
    expect(r.x1).toBeLessThanOrEqual(1);
    expect(r.x1).toBeGreaterThan(0.9);
  });

  it('looks at the fighter’s face from the side they face', () => {
    const m = ready('rox', 'dale');
    place(m, -1, 1);
    const c = new CutIn();
    c.onEvents([{ type: 'superStart', player: 0 }]);
    c.place(m, 16 / 9);
    const face = new THREE.Vector3(-1, 1.5, 0).project(c.camera);
    expect(Math.abs(face.x)).toBeLessThan(0.3);
    expect(c.camera.position.x).toBeGreaterThan(-1);
  });

  it('a boost is shorter, and doesn’t cut short the other fighter’s super', () => {
    const c = new CutIn();
    c.onEvents([{ type: 'boost', player: 0, move: 'x' }]);
    let n = 0;
    while (c.active) {
      c.step();
      n++;
    }
    expect(n).toBeLessThan(20);
    c.onEvents([{ type: 'superStart', player: 1 }]);
    c.step();
    c.onEvents([{ type: 'boost', player: 0, move: 'x' }]);
    for (let i = 0; i < 20; i++) c.step();
    expect(c.active).toBe(true);
  });
});
