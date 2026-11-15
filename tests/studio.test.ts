import * as THREE from 'three';
import { StageDepth } from '../src/render/depth';
import type { StageArt } from '../src/render/stageModel';
import { describe, expect, it } from 'vitest';
import { Studio } from '../src/render/studio';
import { fx } from '../src/sim/fixed';
import type { SimEvent } from '../src/sim';
import { place, ready } from './sim-helpers';

const CREW = [-6, 6];

describe('the studio working', () => {
  it('the live camera is the one on the side the fight has moved to, and it doesn’t flicker in the middle', () => {
    const m = ready('rox', 'gus');
    const s = new Studio();
    place(m, 1, 3);
    s.step(m, [], CREW, 3);
    expect(s.live).toBe(1);
    place(m, -0.6, 0.4);
    s.step(m, [], CREW, 3);
    expect(s.live).toBe(1);
    place(m, -3, -1);
    s.step(m, [], CREW, 3);
    expect(s.live).toBe(-1);
  });

  it('the crew turn their heads toward the fight, a little at a time', () => {
    const m = ready('rox', 'gus');
    place(m, 3, 5);
    const s = new Studio();
    s.step(m, [], CREW, 3);
    expect(s.heads[0]).toBeGreaterThan(0);
    const first = s.heads[0];
    for (let i = 0; i < 200; i++) s.step(m, [], CREW, 3);
    expect(s.heads[0]).toBeGreaterThan(first);
    expect(s.heads[0]).toBeLessThanOrEqual(0.7);
    // The right crew looks left-ish... toward x = 4 from 6: negative.
    expect(s.heads[1]).toBeLessThan(0);
  });

  it('an ender leans the audience in, then back', () => {
    const m = ready('rox', 'gus');
    const s = new Studio();
    const ender: SimEvent = { type: 'hit', attacker: 0, defender: 1, move: 'x', damage: 90, height: 'mid', counter: false, combo: 1, weight: 3, dir: 1, x: 0, y: fx(1), crouched: false };
    s.step(m, [ender], CREW, 3);
    let peak = 0;
    for (let i = 0; i < 20; i++) (s.step(m, [], CREW, 3), (peak = Math.max(peak, s.lean)));
    expect(peak).toBeGreaterThan(0.1);
    for (let i = 0; i < 60; i++) s.step(m, [], CREW, 3);
    expect(s.lean).toBe(0);
  });
});


/** Stand-in step-33 art: the two cameras with their tallies, the crew with heads. */
function art(withStudio: boolean): StageArt {
  const objects = new Map<string, THREE.Object3D>();
  for (const side of ['left', 'right']) {
    const cam = new THREE.Group();
    cam.name = `fg_${side}`;
    cam.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshLambertMaterial({ color: 0x808080 })));
    if (withStudio) {
      const tally = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshLambertMaterial({ emissive: 0xff0000, emissiveIntensity: 2 }));
      tally.name = `tally_${side}`;
      cam.add(tally);
      const crew = new THREE.Group();
      crew.name = `crew_${side}`;
      crew.position.set(side === 'left' ? -6 : 6, 0, 3);
      const head = new THREE.Object3D();
      head.name = `crew_${side}_head`;
      crew.add(head);
      objects.set(crew.name, crew);
    }
    objects.set(cam.name, cam);
  }
  return { objects, lights: [], lightMaps: new Map(), setMaterials: [] };
}

describe('the studio on the set (stand-in art)', () => {
  it('lights only the live camera’s tally and turns the crew’s heads; without the art, nothing to do', () => {
    const d = new StageDepth();
    d.useArt(art(true));
    const s = new Studio();
    s.live = 1;
    s.heads[0] = 0.3;
    d.studio(s);
    const tally = (side: string) => (d.root.getObjectByName(`tally_${side}`) as THREE.Mesh).material as THREE.MeshLambertMaterial;
    expect(tally('right').emissiveIntensity).toBe(2);
    expect(tally('left').emissiveIntensity).toBeLessThan(0.2);
    expect(d.crewX).toEqual([-6, 6]);
    const head = d.root.getObjectByName('crew_left_head')!;
    expect(head.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0.3);
    const bare = new StageDepth();
    bare.useArt(art(false));
    expect(() => bare.studio(s)).not.toThrow();
  });
});
