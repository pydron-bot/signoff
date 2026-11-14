// Each of the balance bench's measures (tests/bench.ts), checked over fixed
// seeds: a few matches, so it runs with the other tests (the whole bench is
// `npm run matchups`).
import { describe, expect, it } from 'vitest';
import { BAR, Input, createMatch, fighterData } from '../src/sim';
import { bench, openingDamage, openingsToWin, pairKey } from './bench';
import { place, ready, run } from './sim-helpers';

const PAIR = [['rox', 'gus']] as const;
const studio = bench({ level: 'hard', seeds: 3, pairs: PAIR });

describe('the balance bench', () => {
  it('counts every hit into an opening, and openings to win are health over their average', () => {
    const hits = (a: string) => Object.values(studio.moves[a]).reduce((s, r) => s + r.damage, 0);
    for (const [a, o] of [['rox', 'gus'], ['gus', 'rox']]) {
      const op = studio.openings[a][o];
      expect(op.n).toBeGreaterThan(0);
      expect(op.damage).toBe(hits(a));
      expect(op.n2).toBeLessThanOrEqual(op.n);
      expect(op.damage2).toBeLessThanOrEqual(op.damage);
      expect(openingsToWin(studio, a, o)).toBeCloseTo(fighterData(o).health / openingDamage(studio, a, o), 6);
      // Openings carried past one hit do more on average.
      expect(openingDamage(studio, a, o, true)).toBeGreaterThan(openingDamage(studio, a, o));
    }
    expect(studio.combos.length).toBe(studio.openings.rox.gus.n + studio.openings.gus.rox.n);
  });

  it('counts comebacks and matches turned round after losing round 1', () => {
    expect(studio.lowRounds).toBeGreaterThan(0);
    expect(studio.comebacks).toBeLessThanOrEqual(studio.lowRounds);
    expect(studio.lowRounds).toBeLessThanOrEqual(studio.rounds);
    expect(studio.decidedFirstRounds).toBe(3);
    expect(studio.turnarounds).toBeLessThanOrEqual(studio.decidedFirstRounds);
  });

  it('counts time-outs and round length by matchup, and the time at each range', () => {
    const k = pairKey(studio.ids, 'gus', 'rox');
    expect(k).toBe('rox|gus');
    expect(studio.pairRounds[k]).toBe(studio.rounds);
    expect(studio.pairTimeouts[k] ?? 0).toBe(studio.timeouts);
    expect(studio.pairSteps[k]).toBe(studio.roundSteps);
    // Every fighting step is at one range.
    for (const id of ['rox', 'gus']) expect(studio.ranges[id].reduce((s, x) => s + x, 0)).toBe(studio.roundSteps);
    expect(studio.ranges.dale.reduce((s, x) => s + x, 0)).toBe(0);
  });

  it('weighs the first hit: the same seeds with the bonus at a bar, half a bar and nothing', () => {
    const meterAfterFirstHit = (firstHitMeter?: number) => {
      const m = ready('rox', 'gus', { firstHitMeter });
      place(m, 0, 0.6);
      const ev = run(m, 20, (_, t) => (t === 0 ? Input.FP : 0));
      expect(ev.some((e) => e.type === 'firstHit')).toBe(true);
      return m.fighters[0].meter;
    };
    const bar = meterAfterFirstHit();
    expect(bar - meterAfterFirstHit(BAR / 2)).toBe(BAR / 2);
    expect(bar - meterAfterFirstHit(0)).toBe(BAR);
    // The same seeds, so the same number of matches; the meter changes how they go.
    const none = bench({ level: 'hard', seeds: 3, pairs: PAIR, firstHitMeter: 0 });
    expect(none.decidedFirstRounds).toBe(studio.decidedFirstRounds);
    expect(none.mechanics.boost + none.mechanics.tapeSkip + none.mechanics.cutAway).toBeLessThan(studio.mechanics.boost + studio.mechanics.tapeSkip + studio.mechanics.cutAway);
  });

  it('counts hazard and prop damage under LIVE BROADCAST rules, and none from hazards in studio', () => {
    expect(studio.source.hazards).toBe(0);
    const live = bench({ level: 'hard', seeds: 4, pairs: PAIR, studio: false });
    expect(live.studio).toBe(false);
    expect(live.source.hazards).toBeGreaterThan(0);
    // The hazards hit through the match's events, not as a fighter's move.
    const m = createMatch({ p1: 'rox', p2: 'gus', stage: 'weather', seed: 1 });
    expect(m.hazards).toEqual([]);
    expect(createMatch({ p1: 'rox', p2: 'gus', stage: 'weather', seed: 1, studio: true }).studio).toBe(true);
  });

  it('counts the rarer mechanics beside how often they were tried', () => {
    const easy = bench({ level: 'easy', seeds: 2, pairs: [['margaret', 'hollis']] });
    for (const b of [studio, easy]) {
      expect(b.mechanics.reversal).toBeLessThanOrEqual(b.tries.reversal);
      expect(b.mechanics.counter).toBeLessThanOrEqual(b.tries.counter);
      expect(b.mechanics.counterHit).toBeGreaterThan(0);
      expect(b.mechanics.counterHit).toBeLessThan(b.tries.strikes);
    }
    // Only Margaret has a counter move (Rox and Gus have none); Gus's Tenderise crushes a guard.
    expect(studio.tries.counter).toBe(0);
    expect(easy.tries.counter).toBeGreaterThan(0);
    expect(studio.tries.guardCrush).toBeGreaterThan(0);
  });
});
