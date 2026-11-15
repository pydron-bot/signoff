import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Alive, LOOK_MAX, WIN_COMBO, blinkAt, hurtFor, lookPitch } from '../src/render/alive';
import { FighterModel, type FighterArt } from '../src/render/fighterModel';
import { fx } from '../src/sim/fixed';
import { place, ready } from './sim-helpers';

describe('the fighters look alive (pure)', () => {
  it('the head pitches toward the opponent, a few degrees at most', () => {
    expect(lookPitch(0, 2)).toBe(0);
    expect(lookPitch(1, 2)).toBeGreaterThan(0);
    expect(lookPitch(-1, 2)).toBeLessThan(0);
    expect(lookPitch(50, 0.1)).toBe(LOOK_MAX);
  });

  it('blinks every few seconds, never two fighters together for long, and the same every time', () => {
    for (const p of [0, 1]) {
      const shut: number[] = [];
      for (let t = 0; t < 60 * 60; t++) if (blinkAt(t, p) === 1 && blinkAt(t - 1, p) < 1) shut.push(t);
      // Between 12 and 25 blinks a minute's worth of steps.
      expect(shut.length).toBeGreaterThanOrEqual(12);
      expect(shut.length).toBeLessThanOrEqual(25);
      for (let k = 1; k < shut.length; k++) expect(shut[k] - shut[k - 1]).toBeGreaterThan(30);
    }
    const a = Array.from({ length: 2000 }, (_, t) => blinkAt(t, 0));
    expect(a).toEqual(Array.from({ length: 2000 }, (_, t) => blinkAt(t, 0)));
    expect(a).not.toEqual(Array.from({ length: 2000 }, (_, t) => blinkAt(t, 1)));
  });

  it('hurt creeps in as health falls', () => {
    expect(hurtFor(1)).toBe(0);
    expect(hurtFor(0.8)).toBe(0);
    expect(hurtFor(0.4)).toBeGreaterThan(0);
    expect(hurtFor(0)).toBeGreaterThan(hurtFor(0.4));
  });

  it('looks only in clips that leave the head free; grins on a long combo; no blink in a hit reaction', () => {
    const m = ready('rox', 'gus');
    place(m, -1, 1);
    m.fighters[1].y = fx(1.5);
    const a = new Alive();
    for (let i = 0; i < 60; i++) a.step(m, 0, 'idle');
    expect(a.look[0]).toBeGreaterThan(0.05);
    for (let i = 0; i < 60; i++) a.step(m, 0, 's.FP');
    expect(Math.abs(a.look[0])).toBeLessThan(0.01);
    m.fighters[1].combo = WIN_COMBO;
    m.fighters[1].mode = 'hitstun';
    for (let i = 0; i < 30; i++) a.step(m, 0, 'idle');
    expect(a.win[0]).toBeGreaterThan(0.4);
    for (let t = 0; t < 600; t++) {
      m.frame = t;
      a.step(m, 1, 'hit_head_heavy');
      expect(a.blink[1]).toBe(0);
    }
  });
});

/** A stand-in GLB: a body with hurt, win and blink shapes, and a head bone under a turned neck. */
function art(withBlink: boolean): FighterArt {
  const scene = new THREE.Group();
  const geo = new THREE.BoxGeometry();
  const names = withBlink ? ['hurt', 'win', 'blink'] : ['hurt', 'win'];
  geo.morphAttributes.position = names.map(() => geo.getAttribute('position').clone());
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  body.name = 'body';
  body.updateMorphTargets();
  body.morphTargetDictionary = Object.fromEntries(names.map((n, i) => [n, i]));
  const neck = new THREE.Object3D();
  neck.name = 'neck';
  neck.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7);
  const head = new THREE.Object3D();
  head.name = 'head';
  neck.add(head);
  scene.add(body, neck);
  const idle = new THREE.AnimationClip('idle', 0.5, [new THREE.NumberKeyframeTrack('body.morphTargetInfluences[hurt]', [0, 0.5], [0.2, 0.2])]);
  return { id: 'dale', scene, clips: new Map([['idle', idle]]), fx: new Map() };
}

describe('the fighters look alive (the model)', () => {
  it('adds to the clip’s face without piling up, and turns the head about its own sideways axis', () => {
    const model = new FighterModel(art(true));
    model.pose('idle', 1, true);
    const body = model.root.getObjectByName('body') as THREE.Mesh;
    const head = model.root.getObjectByName('head')!;
    const before = head.quaternion.clone();
    model.alive(0.2, 1, 0.1, 0.5);
    model.alive(0.2, 1, 0.1, 0.5);
    const inf = body.morphTargetInfluences!;
    // The clip's hurt (0.2) beats ours (0.1); win and blink are ours.
    expect(inf[0]).toBeCloseTo(0.2);
    expect(inf[1]).toBeCloseTo(0.5);
    expect(inf[2]).toBe(1);
    // Turned once, not twice, and back to the clip's pose when the look goes.
    expect(head.quaternion.angleTo(before)).toBeCloseTo(0.2, 3);
    model.alive(0, 0, 0, 0);
    expect(head.quaternion.angleTo(before)).toBeLessThan(1e-6);
    expect(model.canBlink).toBe(true);
  });

  it('without a blink shape in the art, there is simply no blink', () => {
    const model = new FighterModel(art(false));
    model.pose('idle', 1, true);
    expect(model.canBlink).toBe(false);
    expect(() => model.alive(0, 1, 0, 0)).not.toThrow();
  });
});
