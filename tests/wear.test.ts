// Signal damage: grows as health falls, and part of it stays over the break.
import { describe, expect, it } from 'vitest';
import { createMatch, type SimEvent } from '../src/sim';
import { WEAR_CARRY, WEAR_FROM_HEALTH, WearTracker } from '../src/render/wear';

describe('signal damage', () => {
  it('none at full health; more as health falls', () => {
    const m = createMatch({ p1: 'dale', p2: 'rox' });
    const w = new WearTracker();
    w.step(m, []);
    expect(w.wear).toEqual([0, 0]);
    m.fighters[1].health = m.fighters[1].maxHealth / 2;
    w.step(m, []);
    expect(w.wear[1]).toBeCloseTo(0.5 * WEAR_FROM_HEALTH);
    m.fighters[1].health = 0;
    w.step(m, []);
    expect(w.wear[1]).toBeCloseTo(WEAR_FROM_HEALTH);
    expect(w.wear[0]).toBe(0);
  });

  it('part of it carries over the break, and the next round builds on it', () => {
    const m = createMatch({ p1: 'dale', p2: 'rox' });
    const w = new WearTracker();
    m.fighters[1].health = 0;
    w.step(m, []);
    const before = w.wear[1];
    const brk: SimEvent[] = [{ type: 'commercialBreak', nextSegment: 1 }];
    m.phase = 'break';
    w.step(m, brk);
    m.phase = 'intro';
    m.fighters[1].health = m.fighters[1].maxHealth;
    w.step(m, [{ type: 'roundStart', round: 2, segment: 1 }]);
    expect(w.wear[1]).toBeCloseTo(before * WEAR_CARRY);
    m.fighters[1].health = m.fighters[1].maxHealth / 2;
    w.step(m, []);
    expect(w.wear[1]).toBeGreaterThan(before * WEAR_CARRY);
    expect(w.wear[1]).toBeLessThanOrEqual(1);
    // A new match starts clean.
    m.fighters[1].health = m.fighters[1].maxHealth;
    w.step(m, [{ type: 'roundStart', round: 1, segment: 0 }]);
    expect(w.wear[1]).toBe(0);
  });
});
