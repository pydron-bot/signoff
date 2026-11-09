// The fight camera (src/render/camera.ts) and the KO's slow motion
// (src/game/slowMo.ts): pure, so they're checked here without three.js.
import { describe, expect, it } from 'vitest';
import { FixedStep } from '../src/game/loop';
import { HOLD, RAMP, SLOW, SlowMo } from '../src/game/slowMo';
import { CameraRig, NEAR, halfHeight, halfView } from '../src/render/camera';
import type { HitWeight, MatchState, SimEvent } from '../src/sim';
import { fx, toFloat } from '../src/sim/fixed';
import { segmentData } from '../src/sim/stages';
import { place, ready } from './sim-helpers';

const ASPECTS = { desktop: 16 / 9, iphone: 852 / 393 };

/** The rig settled on a match: stepped until it stops moving. */
function settled(m: MatchState, aspect: number, reduceMotion = false): CameraRig {
  const rig = new CameraRig();
  rig.aspect = aspect;
  rig.reduceMotion = reduceMotion;
  for (let i = 0; i < 200; i++) rig.step(m, []);
  return rig;
}

function hit(weight: HitWeight): SimEvent {
  return { type: 'hit', attacker: 0, defender: 1, move: 's.FP', damage: 50, height: 'mid', counter: false, combo: 1, weight, dir: 1, x: 0, y: fx(1.2) };
}

describe('camera framing', () => {
  it('up close, a fighter fills about half the height of the screen', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const s = settled(m, ASPECTS.desktop).shot;
    expect(s.z).toBeCloseTo(NEAR, 1);
    expect(1.8 / (2 * halfHeight(s.z))).toBeGreaterThan(0.45);
    // Feet in the bottom fifth, head below the HUD.
    const bottom = s.ty - halfHeight(s.z);
    expect((0 - bottom) / (2 * halfHeight(s.z))).toBeLessThan(0.2);
    expect(bottom).toBeLessThan(0);
  });

  for (const [name, aspect] of Object.entries(ASPECTS)) {
    it(`keeps both fighters in shot at every distance and against either wall (${name})`, () => {
      const half = toFloat(segmentData('weather', 0).halfWidth);
      for (let gap = 0.6; gap <= 2 * half; gap += 0.4) {
        for (const centre of [0, half - gap / 2, -(half - gap / 2)]) {
          const m = ready('rox', 'dale');
          place(m, centre - gap / 2, centre + gap / 2);
          const s = settled(m, aspect).shot;
          const w = halfView(s.z, aspect);
          const at = `gap ${gap.toFixed(1)} at ${centre.toFixed(1)}`;
          expect(centre - gap / 2 - 0.5, at).toBeGreaterThanOrEqual(s.tx - w - 1e-6);
          expect(centre + gap / 2 + 0.5, at).toBeLessThanOrEqual(s.tx + w + 1e-6);
        }
      }
    });
  }

  it('rises and pulls back for a body in the air', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const ground = { ...settled(m, ASPECTS.desktop).shot };
    m.fighters[1].y = fx(1.8);
    const air = settled(m, ASPECTS.desktop).shot;
    expect(air.ty).toBeGreaterThan(ground.ty);
    expect(air.z).toBeGreaterThan(ground.z);
    // The body in the air is in shot, head and all.
    expect(1.8 + 1.9).toBeLessThan(air.ty + halfHeight(air.z));
  });
});

describe('camera reactions', () => {
  it('shakes more the heavier the hit, and settles again', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const moved = (w: HitWeight) => {
      const rig = settled(m, ASPECTS.desktop);
      const rest = { ...rig.shot };
      let most = 0;
      rig.step(m, [hit(w)]);
      for (let i = 0; i < 12; i++) {
        most = Math.max(most, Math.abs(rig.shot.x - rest.x) + Math.abs(rig.shot.y - rest.y));
        rig.step(m, []);
      }
      for (let i = 0; i < 60; i++) rig.step(m, []);
      expect(rig.shot.x).toBeCloseTo(rest.x, 3);
      expect(rig.shot.z).toBeCloseTo(rest.z, 3);
      return most;
    };
    expect(moved(3)).toBeGreaterThan(moved(2));
    expect(moved(2)).toBeGreaterThan(moved(0));
  });

  it('pushes in on an ender', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const rig = settled(m, ASPECTS.desktop);
    const rest = rig.shot.z;
    rig.step(m, [hit(3)]);
    for (let i = 0; i < 4; i++) rig.step(m, []);
    expect(rig.shot.z).toBeLessThan(rest - 0.1);
  });

  it('with Reduce Motion, hits move nothing', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const rig = settled(m, ASPECTS.desktop, true);
    const rest = { ...rig.shot };
    rig.step(m, [hit(3), { type: 'ko', player: 1 }]);
    for (let i = 0; i < 10; i++) rig.step(m, []);
    expect(rig.shot.x).toBeCloseTo(rest.x, 3);
    expect(rig.shot.roll).toBe(0);
  });

  it('a KO swings round and in on the loser, then back', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const rig = settled(m, ASPECTS.desktop);
    const rest = { ...rig.shot };
    rig.step(m, [{ type: 'ko', player: 1 }]);
    for (let i = 0; i < 40; i++) rig.step(m, []);
    // Off to the loser's side, closer, still looking at them.
    expect(rig.shot.x).toBeGreaterThan(rest.x + 0.5);
    expect(Math.hypot(rig.shot.x - rig.shot.tx, rig.shot.z)).toBeLessThan(rest.z);
    for (let i = 0; i < 200; i++) rig.step(m, []);
    expect(rig.shot.x).toBeCloseTo(rest.x, 3);
    expect(rig.shot.z).toBeCloseTo(rest.z, 3);
  });
});

describe('slow motion', () => {
  it('a KO slows time, then eases back to full speed', () => {
    const m = ready('rox', 'dale');
    const s = new SlowMo();
    expect(s.scale).toBe(1);
    s.step(m, [{ type: 'ko', player: 1 }]);
    expect(s.scale).toBe(SLOW);
    for (let i = 0; i <= HOLD; i++) s.step(m, []);
    expect(s.scale).toBeGreaterThan(SLOW);
    expect(s.scale).toBeLessThan(1);
    for (let i = 1; i < RAMP; i++) s.step(m, []);
    expect(s.scale).toBe(1);
  });

  it('a finisher keeps its own pace', () => {
    const m = ready('rox', 'dale');
    m.phase = 'finisher';
    const s = new SlowMo();
    s.step(m, [{ type: 'ko', player: 1 }]);
    expect(s.scale).toBe(1);
  });

  it('the fixed step runs fewer steps while time is slowed', () => {
    const f = new FixedStep();
    let n = 0;
    for (let i = 0; i <= 60; i++) n += f.advance(i * (1000 / 60), 0.5);
    expect(n).toBeGreaterThanOrEqual(29);
    expect(n).toBeLessThanOrEqual(31);
  });
});
