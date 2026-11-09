// Hit weight: every strike lands light, medium, heavy or as an ender, and
// heavier ones freeze longer (both fighters, so frame advantage is unchanged).
import { describe, expect, it } from 'vitest';
import { AdvantageTracker } from '../src/game/advantage';
import { FIGHTERS, HITSTOP, HITSTOP_BY_WEIGHT, Input, WEIGHT_HEAVY, WEIGHT_MEDIUM, frameData, step, type SimEvent } from '../src/sim';
import { timbre } from '../src/audio/timbre';
import { hitWeight } from '../src/sim/combat';
import { place, ready } from './sim-helpers';

const { DOWN, RIGHT, SPECIAL, FP, BP, FK } = Input;

/** Rox does `input` on step 0 against a standing Dale; the first hit event, and the freeze on both just after it. */
function firstHit(input: number, gap = 0.8) {
  const m = ready('rox', 'dale');
  place(m, -gap / 2, gap / 2);
  const ev: SimEvent[] = [];
  for (let t = 0; t < 60; t++) {
    const from = ev.length;
    step(m, t === 0 ? input : 0, 0, ev);
    const hit = ev.slice(from).find((e) => e.type === 'hit');
    if (hit && hit.type === 'hit') return { hit, stop: [m.fighters[0].hitstop, m.fighters[1].hitstop] };
  }
  throw new Error('no hit');
}

describe('hit weight', () => {
  it('goes by damage before scaling, and anything that ends the exchange is an ender', () => {
    expect(hitWeight(WEIGHT_MEDIUM - 1, false)).toBe(0);
    expect(hitWeight(WEIGHT_MEDIUM, false)).toBe(1);
    expect(hitWeight(WEIGHT_HEAVY, false)).toBe(2);
    expect(hitWeight(10, true)).toBe(3);
  });

  it('a jab is light, a high kick medium, a launcher an ender, each with its own freeze on both fighters', () => {
    const jab = firstHit(FP);
    expect(FIGHTERS.rox.moves['s.FP'].hits[0].damage).toBeLessThan(WEIGHT_MEDIUM);
    expect(jab.hit.weight).toBe(0);
    expect(jab.stop).toEqual([HITSTOP_BY_WEIGHT[0], HITSTOP_BY_WEIGHT[0]]);
    const power = firstHit(FK);
    expect(power.hit.weight).toBe(1);
    expect(power.stop[1]).toBe(HITSTOP_BY_WEIGHT[1]);
    const launcher = firstHit(DOWN | BP);
    expect(launcher.hit.weight).toBe(3);
    expect(launcher.stop).toEqual([HITSTOP_BY_WEIGHT[3], HITSTOP_BY_WEIGHT[3]]);
  });

  it('the hit says which way the blow travels', () => {
    expect(firstHit(FP).hit.dir).toBe(1);
  });

  it('a projectile keeps the plain freeze, as its thrower does not freeze with it', () => {
    const m = ready('dale', 'rox');
    place(m, -2, 1);
    const ev: SimEvent[] = [];
    let stop = -1;
    for (let t = 0; t < 120 && stop < 0; t++) {
      const from = ev.length;
      step(m, t === 0 ? RIGHT | SPECIAL : 0, 0, ev);
      if (ev.slice(from).some((e) => e.type === 'hit')) stop = m.fighters[1].hitstop;
    }
    expect(stop).toBe(HITSTOP);
    expect(m.fighters[0].hitstop).toBe(0);
  });

  it('a heavier freeze leaves frame advantage on hit as the move data says: both stop for the same time', () => {
    // Light, medium and heavy normals of Hollis's (40 to 95 damage), each landing on its first active frame.
    for (const [id, input] of [['s.FP', FP], ['s.BP', BP], ['s.BK', Input.BK]] as const) {
      const mv = FIGHTERS.hollis.moves[id];
      const m = ready('hollis', 'dale');
      // Close enough that the first active frame reaches.
      place(m, -0.35, 0.35);
      const adv = new AdvantageTracker();
      const ev: SimEvent[] = [];
      for (let t = 0; t < 90; t++) {
        ev.length = 0;
        step(m, t === 0 ? input : 0, 0, ev);
        adv.update(m, ev);
      }
      expect(adv.last?.kind, id).toBe('hit');
      expect(adv.last?.frames, id).toBe(frameData(mv).onHit);
    }
  });
});

describe('hit sounds', () => {
  it('know a fist from a foot, a special, and the props', () => {
    const t = (f: string, id: string) => timbre(id, FIGHTERS[f].moves[id]);
    expect(t('rox', 's.FP')).toBe('punch');
    expect(t('rox', 'FP FP FK')).toBe('kick');
    expect(t('rox', 'Count of Eight')).toBe('special');
    expect(t('gus', 's.BP')).toBe('metal');
    expect(t('gus', 's.BK')).toBe('blade');
    expect(t('hollis', 's.BP')).toBe('wood');
    expect(timbre('td', undefined)).toBe('special');
  });
});
