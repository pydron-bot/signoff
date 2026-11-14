import { describe, expect, it } from 'vitest';
import { MatchFigures, figureRows } from '../src/game/matchFigures';
import { createMatch, step, type SimEvent } from '../src/sim';
import { Cpu } from '../src/ai/cpu';

describe('the results’ figures come from the match’s events', () => {
  it('a whole CPU match: damage matches the health lost, rounds match the winner', () => {
    const m = createMatch({ p1: 'rox', p2: 'gus', seed: 11 });
    const cpus = [new Cpu(0, 'hard', 3), new Cpu(1, 'hard', 4)];
    const f = new MatchFigures();
    const ev: SimEvent[] = [];
    let lost = [0, 0];
    let hits = 0;
    for (let t = 0; t < 60 * 60 * 6 && m.matchWinner < 0; t++) {
      ev.length = 0;
      const before = m.fighters.map((x) => x.health);
      step(m, cpus[0].next(m), cpus[1].next(m), ev);
      f.step(m, ev);
      for (const e of ev) if (e.type === 'hit') hits++;
      if (m.phase === 'fight' || m.phase === 'ko') for (let i = 0; i < 2; i++) lost[i] += Math.max(0, before[i] - m.fighters[i].health);
    }
    expect(m.matchWinner).toBeGreaterThanOrEqual(0);
    expect(hits).toBeGreaterThan(0);
    expect(f.sides[m.matchWinner].rounds).toBe(2);
    expect(f.sides[0].damage + f.sides[1].damage + f.hazard).toBeGreaterThanOrEqual(lost[0] + lost[1]);
    expect(f.sides[0].firstHits + f.sides[1].firstHits).toBeGreaterThanOrEqual(2);
    expect(f.steps).toBeGreaterThan(60 * 10);
    expect(f.time()).toMatch(/^\d+:\d\d$/);
  });

  it('the best combo is the longest, then the one that did most', () => {
    const f = new MatchFigures();
    const m = createMatch({ p1: 'rox', p2: 'gus' });
    const hit = (combo: number, damage: number): SimEvent => ({ type: 'hit', attacker: 0, defender: 1, move: 'x', damage, height: 'mid', counter: combo === 2, combo, weight: 1, dir: 1, x: 0, y: 0, crouched: false });
    f.step(m, [hit(1, 40), hit(2, 30), hit(3, 20)]);
    f.step(m, [hit(1, 100), hit(2, 100)]);
    f.step(m, [hit(1, 10), hit(2, 10), hit(3, 10)]);
    expect(f.sides[0].bestCombo).toBe(3);
    expect(f.sides[0].bestComboDamage).toBe(90);
    expect(f.sides[0].counters).toBe(3);
    const rows = figureRows(f, [1000, 1000]);
    expect(rows.find((r) => r[0] === 'BEST COMBO')![1]).toBe('3 HITS 9%');
    expect(rows.find((r) => r[0] === 'DAMAGE')![1]).toBe('320');
  });
});
