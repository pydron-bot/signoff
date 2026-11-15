import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Marks } from '../src/render/marks';
import { fx } from '../src/sim/fixed';
import { ready } from './sim-helpers';

/** A stand-in for Dale's fx_crack: a flat quad. */
function crack(): THREE.Object3D {
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial());
}

function counts(scene: THREE.Scene): number[] {
  return scene.children.map((o) => (o as THREE.InstancedMesh).count);
}

describe('marks on the set', () => {
  it('a ground bounce leaves a crack and a scuff, a knockdown a scuff; they last the round, fade, and go', () => {
    const scene = new THREE.Scene();
    const marks = new Marks(scene);
    marks.useCrack(crack());
    const m = ready('rox', 'gus');
    marks.onEvents(m, [{ type: 'relaunch', player: 1, how: 'ground', x: fx(1), y: 0 }, { type: 'knockdown', player: 0 }]);
    marks.step();
    // Scuffs first (made at construction), then the cracks.
    expect(counts(scene)).toEqual([2, 1]);
    for (let i = 0; i < 1000; i++) marks.step();
    expect(counts(scene)).toEqual([2, 1]);
    for (let i = 0; i < 600; i++) marks.step();
    expect(counts(scene)).toEqual([0, 0]);
  });

  it('a new round wipes them; without the art, only scuffs', () => {
    const scene = new THREE.Scene();
    const marks = new Marks(scene);
    const m = ready('rox', 'gus');
    marks.onEvents(m, [{ type: 'relaunch', player: 1, how: 'wall', x: fx(-7), y: fx(1) }, { type: 'knockdown', player: 1 }]);
    marks.step();
    expect(counts(scene)).toEqual([1]);
    marks.onEvents(m, [{ type: 'roundStart', round: 2, segment: 1 }]);
    marks.step();
    expect(counts(scene)).toEqual([0]);
  });
});
