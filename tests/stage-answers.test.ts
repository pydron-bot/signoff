import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { StageAnswers } from '../src/render/stageAnswers';
import { Sparks } from '../src/render/sparks';
import { MIRROR } from '../src/render/reflection';
import { fx } from '../src/sim/fixed';
import type { SimEvent } from '../src/sim';
import { ready } from './sim-helpers';

const ender: SimEvent = { type: 'hit', attacker: 0, defender: 1, move: 'x', damage: 90, height: 'mid', counter: false, combo: 1, weight: 3, dir: 1, x: 0, y: fx(1), crouched: false };

describe('each stage answers in its own way', () => {
  it('Burn’s mirrors flash white on an ender, and fade', () => {
    const a = new StageAnswers(new THREE.Scene(), new Sparks(new THREE.Scene()));
    const m = ready('rox', 'gus', { stage: 'burn' });
    a.onEvents(m, [ender]);
    expect(MIRROR.flash.value).toBeGreaterThan(0.8);
    for (let i = 0; i < 12; i++) a.onEvents(m, []);
    expect(MIRROR.flash.value).toBe(0);
    // Not on another stage.
    a.onEvents(ready('rox', 'gus', { stage: 'news' }), [ender]);
    expect(MIRROR.flash.value).toBe(0);
  });

  it('rain on the lens in the storm only, and not with Reduce Motion', () => {
    const scene = new THREE.Scene();
    const a = new StageAnswers(scene, new Sparks(new THREE.Scene()));
    const cam = new THREE.PerspectiveCamera(30, 16 / 9);
    const rain = scene.children[0];
    const m = ready('dale', 'rox', { stage: 'weather' });
    a.onEvents(m, []);
    a.update(cam);
    expect(rain.visible).toBe(false);
    m.segment = 1;
    a.onEvents(m, []);
    a.update(cam);
    expect(rain.visible).toBe(true);
    a.reduceMotion = true;
    a.onEvents(m, []);
    a.update(cam);
    expect(rain.visible).toBe(false);
  });

  it('a ground bounce near a burner throws sparks off it; far from one, none', () => {
    const sparkScene = new THREE.Scene();
    const a = new StageAnswers(new THREE.Scene(), new Sparks(sparkScene));
    const m = ready('gus', 'rox', { stage: 'kitchen' });
    m.segment = 1;
    const lit = () => sparkScene.children.filter((o) => o.visible).length;
    a.onEvents(m, [{ type: 'relaunch', player: 1, how: 'ground', x: fx(0), y: 0 }]);
    expect(lit()).toBe(0);
    a.onEvents(m, [{ type: 'relaunch', player: 1, how: 'ground', x: fx(3), y: 0 }]);
    expect(lit()).toBe(3);
  });
});
