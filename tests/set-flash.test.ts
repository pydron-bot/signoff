import { describe, expect, it } from 'vitest';
import { FLASH_SLOTS, MOVE_GLOW, PROJECTILE_GLOW, SetFlash } from '../src/render/setFlash';
import { FIGHTERS, moveData, type MatchState, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { ready } from './sim-helpers';

function hit(weight: 0 | 1 | 2 | 3, x = 0, counter = false): SimEvent {
  return { type: 'hit', attacker: 0, defender: 1, move: 's.FP', damage: 50, height: 'mid', counter, combo: 1, weight, dir: 1, x: fx(x), y: fx(1.2), crouched: false };
}

/** Gus's Flambé in flight at x. */
function flambe(m: MatchState, x: number): void {
  const p = m.projectiles[0];
  p.active = true;
  p.owner = 0;
  p.move = 'Flambé';
  p.spawn = 0;
  p.x = fx(x);
  p.y = 0;
}

describe('the fight lights the set', () => {
  it('a blow flashes at the contact, brighter the heavier, and fades', () => {
    const m = ready('rox', 'dale');
    const light = new SetFlash();
    light.onEvents(m, [hit(0, -1)]);
    light.step(m);
    const small = light.lit[0].power;
    expect(light.lit[0].x).toBeCloseTo(-1.2, 1);
    const big = new SetFlash();
    big.onEvents(m, [hit(3)]);
    big.step(m);
    expect(big.lit[0].power).toBeGreaterThan(small * 2);
    for (let i = 0; i < 30; i++) big.step(m);
    expect(big.lit.length).toBe(0);
  });

  it('a fireball lights the set as it flies, and goes out with it', () => {
    const m = ready('gus', 'dale');
    const light = new SetFlash();
    flambe(m, 1);
    light.step(m);
    expect(light.lit).toHaveLength(1);
    expect(light.lit[0].x).toBe(1);
    flambe(m, 2.5);
    light.step(m);
    expect(light.lit[0].x).toBe(2.5);
    m.projectiles[0].active = false;
    light.step(m);
    expect(light.lit).toHaveLength(0);
  });

  it('a burning special glows while it is out, and not before', () => {
    const m = ready('gideon', 'dale');
    const f = m.fighters[0];
    const mv = moveData('gideon', 'Fire and Brimstone');
    const light = new SetFlash();
    f.mode = 'move';
    f.move = 'Fire and Brimstone';
    f.moveFrame = 1;
    light.step(m);
    expect(light.lit).toHaveLength(0);
    f.moveFrame = mv.hits[0].frames[0];
    light.step(m);
    expect(light.lit).toHaveLength(1);
    expect(light.lit[0].power).toBeGreaterThan(1);
  });

  it(`keeps the ${FLASH_SLOTS} brightest when more are going`, () => {
    const m = ready('gus', 'dale');
    const light = new SetFlash();
    flambe(m, 0);
    light.onEvents(m, [hit(0, -2), hit(0, -1), hit(1, 1), hit(1, 2), hit(3, 3)]);
    light.step(m);
    expect(light.lit).toHaveLength(FLASH_SLOTS);
    const powers = light.lit.map((s) => s.power);
    // The light jab at -2 is the one left out.
    expect(light.lit.some((s) => Math.abs(s.x + 2.2) < 0.01)).toBe(false);
    expect(Math.min(...powers)).toBeGreaterThan(0.5);
  });

  it('every glow names a real fighter and move', () => {
    for (const [fighter, table] of [...Object.entries(PROJECTILE_GLOW), ...Object.entries(MOVE_GLOW)]) {
      expect(FIGHTERS[fighter], fighter).toBeDefined();
      for (const move of Object.keys(table)) if (move !== '*') expect(() => moveData(fighter, move), `${fighter} ${move}`).not.toThrow();
    }
  });
});
