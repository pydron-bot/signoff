import { describe, expect, it } from 'vitest';
import { fighterStats, rawStats } from '../src/game/fighterStats';
import { FIGHTERS } from '../src/sim';
import type { FighterData } from '../src/sim/types';

const roster = Object.values(FIGHTERS);

describe('the fighter select’s bars come from the data', () => {
  it('every bar is 1 to 5, and the roster spans the scale', () => {
    for (const k of ['health', 'speed', 'reach', 'difficulty'] as const) {
      const v = roster.map((d) => fighterStats(d.id)[k]);
      for (const x of v) expect(x).toBeGreaterThanOrEqual(1), expect(x).toBeLessThanOrEqual(5);
      expect(Math.min(...v)).toBe(1);
      expect(Math.max(...v)).toBe(5);
    }
  });

  it('the most health and the fastest walk get full bars', () => {
    const most = roster.reduce((a, b) => (b.health > a.health ? b : a));
    expect(fighterStats(most.id).health).toBe(5);
    const fastest = roster.reduce((a, b) => (rawStats(b).speed > rawStats(a).speed ? b : a));
    expect(fighterStats(fastest.id).speed).toBe(5);
  });

  it('follows a change to the data: no number is written down', () => {
    const d = roster[0];
    const changed: FighterData[] = roster.map((x) => (x === d ? { ...x, health: 1 } : x));
    expect(fighterStats(d.id, changed).health).toBe(1);
    const tougher: FighterData[] = roster.map((x) => (x === d ? { ...x, health: 99999 } : x));
    expect(fighterStats(d.id, tougher).health).toBe(5);
  });
});
