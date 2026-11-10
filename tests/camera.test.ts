// The fight camera (src/render/camera.ts) and the KO's slow motion
// (src/game/slowMo.ts): pure, so they're checked here without three.js.
import { describe, expect, it } from 'vitest';
import { FixedStep } from '../src/game/loop';
import { HOLD, RAMP, SLOW, SlowMo } from '../src/game/slowMo';
import { CameraRig, NEAR, halfHeight, halfView } from '../src/render/camera';
import { createMatch, type HitWeight, type MatchState, type SimEvent } from '../src/sim';
import { fx, toFloat } from '../src/sim/fixed';
import { segmentData } from '../src/sim/stages';
import { place, ready } from './sim-helpers';

const ASPECTS = { desktop: 16 / 9, iphone: 852 / 393 };

/** The rig settled on a match: stepped until it stops moving. */
function settled(m: MatchState, aspect: number, reduceMotion = false, buttons = 0): CameraRig {
  const rig = new CameraRig();
  rig.aspect = aspect;
  rig.reduceMotion = reduceMotion;
  rig.buttons = buttons;
  for (let i = 0; i < 200; i++) rig.step(m, []);
  return rig;
}

function hit(weight: HitWeight): SimEvent {
  return { type: 'hit', attacker: 0, defender: 1, move: 's.FP', damage: 50, height: 'mid', counter: false, combo: 1, weight, dir: 1, x: 0, y: fx(1.2), crouched: false };
}

describe('camera framing', () => {
  it('the cold open frames the new match close on the first step, whatever it framed before', () => {
    const rig = new CameraRig();
    rig.aspect = ASPECTS.iphone;
    // The match behind the title, far off to one side.
    const before = ready('rox', 'dale');
    const half = toFloat(segmentData('weather', 0).halfWidth);
    place(before, half - 1.5, half - 0.5);
    for (let i = 0; i < 200; i++) rig.step(before, []);
    // A new match, still in its intro (the cold open steps nothing).
    const m = createMatch({ p1: 'margaret', p2: 'gus', seed: 1 });
    rig.reset();
    rig.opening = true;
    rig.step(m, []);
    const s = rig.shot;
    const a = toFloat(m.fighters[0].x);
    const b = toFloat(m.fighters[1].x);
    expect(Math.abs(s.tx - (a + b) / 2)).toBeLessThan(0.01);
    expect(Math.abs(s.x - s.tx)).toBeLessThan(0.01);
    expect(halfView(s.z, ASPECTS.iphone)).toBeGreaterThan(Math.abs(b - a) / 2 + 0.5);
    // Not the establishing shot: no further back than the fight would be.
    const wide = new CameraRig();
    wide.aspect = ASPECTS.iphone;
    wide.step(m, []);
    expect(s.z).toBeLessThan(wide.shot.z * 0.8);
  });

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

  // The iPhone's touch buttons: 250 points of 852, on the right (or, swapped, the left).
  const SHARE = 262 / 852;
  /** Where x sits across the screen, -1 (left edge) to 1 (right edge). */
  const across = (x: number, s: { tx: number; z: number }) => (x - s.tx) / halfView(s.z, ASPECTS.iphone);

  for (const side of [1, -1]) {
    const where = side > 0 ? 'right' : 'left';
    it(`with touch buttons on the ${where}, keeps the fighters beside them, even at that wall`, () => {
      const half = toFloat(segmentData('kitchen', 0).halfWidth);
      for (let gap = 0.8; gap <= 4; gap += 0.4) {
        for (const centre of [0, 2, half - 0.4 - gap / 2]) {
          const m = ready('gus', 'rox');
          m.stage = 'kitchen';
          place(m, side * centre - gap / 2, side * centre + gap / 2);
          const s = settled(m, ASPECTS.iphone, false, side * SHARE).shot;
          const at = `gap ${gap.toFixed(1)} at ${centre.toFixed(1)}`;
          // The body nearer the buttons (half a metre wide) stops short of them; both stay on screen.
          const near = side * across(side * (centre + gap / 2 + 0.45), s);
          const far = side * across(side * (centre - gap / 2 - 0.45), s);
          expect(near, at).toBeLessThan(1 - 2 * SHARE + 0.06);
          expect(far, at).toBeGreaterThan(-1);
        }
      }
    });
  }

  it('with touch buttons up, the other wall frames as it did without them', () => {
    const m = ready('gus', 'rox');
    m.stage = 'kitchen';
    const half = toFloat(segmentData('kitchen', 0).halfWidth);
    place(m, -half + 0.4, -half + 1.4);
    const bare = settled(m, ASPECTS.iphone).shot;
    const buttons = settled(m, ASPECTS.iphone, false, SHARE).shot;
    expect(buttons.tx).toBeCloseTo(bare.tx, 3);
    expect(buttons.z).toBeCloseTo(bare.z, 3);
  });

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
