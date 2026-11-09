// Finishers: data that holds together, inputs that come out at the right
// range and only then, cancellations earned by the final K.O., and every
// script playing through to the end of the match for every pairing.
import { describe, expect, it } from 'vitest';
import { Cpu } from '../src/ai/cpu';
import { FIGHTERS, Input, STAY_TUNED_FRAMES, createMatch, saveMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { finisherData, rangeOf } from '../src/sim/finisher';
import { fx } from '../src/sim/fixed';
import { count, place, presses, ready, run } from './sim-helpers';

const { LEFT, RIGHT, UP, DOWN, BLOCK, SPECIAL, FK, ATTACK_BITS } = Input;
const roster = Object.values(FIGHTERS);

/** P1 (on the left) wins the deciding round with this input, from this spacing; runs to "Stay tuned" (or a cancellation). */
function winMatch(p1: string, p2: string, input = FK, gap = 0.8): MatchState {
  const m = ready(p1, p2);
  m.fighters[0].wins = 1;
  m.fighters[1].health = 1;
  place(m, -gap / 2, gap / 2);
  run(m, 300, (mm, t) => (mm.phase === 'fight' && t < 20 ? (t === 0 ? input : 0) : 0));
  return m;
}

const DIR = { f: RIGHT, b: LEFT, d: DOWN, u: UP } as const;

/** The inputs for a finisher, for a winner facing right: each tap held two steps, then the button. */
function finisherInputs(fighter: string, id: string): Record<number, number> {
  const f = finisherData(fighter, id);
  const at: Record<number, number> = {};
  let t = 0;
  for (const d of f.input) {
    at[t] = at[t + 1] = DIR[d];
    t += 4;
  }
  at[t] = f.button === 'block' ? BLOCK : ATTACK_BITS[f.button];
  return at;
}

const RANGE_GAP = { close: 1.0, mid: 1.8, far: 2.8, any: 1.8 } as const;

describe('finisher data', () => {
  for (const f of roster) {
    it(`${f.name}: two Sign-Offs, a Rerun and a Cancellation that hold together`, () => {
      const kinds = f.finishers.map((x) => x.kind).sort();
      expect(kinds).toEqual(['cancellation', 'rerun', 'signoff', 'signoff']);
      expect(f.show.length).toBeGreaterThan(0);
      for (const fin of f.finishers) {
        expect(fin.cut).toBeGreaterThan(0);
        expect(fin.card).toBeGreaterThan(fin.cut);
        expect(fin.total).toBeGreaterThan(fin.card);
        for (const b of fin.beats) {
          expect(b.at, `${fin.id} beat`).toBeGreaterThanOrEqual(1);
          expect(b.at).toBeLessThan(fin.card);
          if (b.move) expect(f.moves[b.move], `${fin.id}: ${b.move}`).toBeDefined();
        }
        if (fin.kind === 'cancellation') {
          expect(Object.values(f.specials)).toContain(fin.trigger);
          expect(fin.input).toEqual([]);
        } else {
          expect(fin.input.length).toBeGreaterThanOrEqual(2);
          // Taps are distinct, so their order can be read from when each was last pressed.
          expect(new Set(fin.input).size).toBe(fin.input.length);
        }
      }
      // Brutal: a Sign-Off is a beating, not a tap: at least eight blows, most of them on screen before the cut.
      for (const fin of f.finishers.filter((x) => x.kind === 'signoff')) {
        const blows = fin.beats.filter((b) => b.blow && b.blow.damage > 0);
        expect(blows.length, fin.id).toBeGreaterThanOrEqual(8);
        expect(blows.filter((b) => b.at < fin.cut).length, fin.id).toBeGreaterThanOrEqual(5);
      }
      // No two finishers share an input at overlapping ranges.
      const entered = f.finishers.filter((x) => x.input.length);
      for (const a of entered)
        for (const b of entered) {
          if (a === b) continue;
          const overlap = a.range === 'any' || b.range === 'any' || a.range === b.range;
          if (overlap) expect(`${a.input.join('')}${a.button}`).not.toBe(`${b.input.join('')}${b.button}`);
        }
    });
  }

  it('ranges: close, mid and far by centre distance', () => {
    expect(rangeOf(fx(1.0))).toBe('close');
    expect(rangeOf(fx(-1.8))).toBe('mid');
    expect(rangeOf(fx(2.8))).toBe('far');
  });
});

describe('Stay tuned', () => {
  it('the loser stands dazed, and only the winner can move', () => {
    const m = winMatch('dale', 'rox');
    expect(m.phase).toBe('stayTuned');
    run(m, 30);
    expect(m.fighters[1].mode).toBe('dazed');
    const x1 = m.fighters[1].x;
    const x0 = m.fighters[0].x;
    run(m, 20, RIGHT, LEFT | FK);
    expect(m.fighters[1].x).toBe(x1);
    expect(m.fighters[0].x).not.toBe(x0);
  });

  it('with no finisher, the match ends when the window closes', () => {
    const m = winMatch('dale', 'rox');
    const ev = run(m, STAY_TUNED_FRAMES + 5);
    expect(m.phase).toBe('over');
    expect(count(ev, 'matchOver')).toBe(1);
    expect(count(ev, 'finisher')).toBe(0);
  });

  it('a Sign-Off only comes out at its range', () => {
    const m = winMatch('dale', 'rox');
    run(m, 30);
    // Extended Forecast is close; from far away nothing happens.
    place(m, -1.5, 1.5);
    const ev = run(m, 20, presses(finisherInputs('dale', 'Extended Forecast')));
    expect(count(ev, 'finisher')).toBe(0);
    place(m, -0.5, 0.5);
    const ev2 = run(m, 20, presses(finisherInputs('dale', 'Extended Forecast')));
    expect(ev2.find((e) => e.type === 'finisher')).toMatchObject({ player: 0, id: 'Extended Forecast', kind: 'signoff' });
  });

  it('the taps must come in order', () => {
    const m = winMatch('dale', 'rox');
    run(m, 30);
    place(m, -0.5, 0.5);
    // Forward then back is the wrong way round for Extended Forecast (back, forward).
    const ev = run(m, 20, presses({ 0: RIGHT, 1: RIGHT, 4: LEFT, 5: LEFT, 8: ATTACK_BITS.BP }));
    expect(count(ev, 'finisher')).toBe(0);
  });
});

describe('cancellations', () => {
  it('ending the match with the trigger special cancels the loser straight away', () => {
    // Dale's Heat Lightning: neutral + Special, point blank.
    const m = ready('dale', 'rox');
    m.fighters[0].wins = 1;
    m.fighters[1].health = 1;
    place(m, -0.3, 0.3);
    const ev = run(m, 600, presses({ 0: SPECIAL }));
    expect(count(ev, 'stayTuned')).toBe(0);
    expect(ev.find((e) => e.type === 'finisher')).toMatchObject({ id: 'Struck by Lightning', kind: 'cancellation' });
    expect(count(ev, 'finisherCut')).toBe(1);
    expect(count(ev, 'finisherCard')).toBe(1);
    expect(m.phase).toBe('over');
  });

  it("the paid-for version of a trigger special counts too (Gideon's blessed Fire and Brimstone)", () => {
    const m = ready('gideon', 'rox');
    m.fighters[0].wins = 1;
    m.fighters[0].donations = 2;
    m.fighters[1].health = 1;
    place(m, -0.3, 0.3);
    const ev = run(m, 600, presses({ 0: SPECIAL }));
    expect(ev.find((e) => e.type === 'finisher')).toMatchObject({ id: 'Final Collection', kind: 'cancellation' });
  });

  it('any other finishing blow goes to Stay tuned', () => {
    const m = winMatch('dale', 'rox');
    expect(m.phase).toBe('stayTuned');
  });
});

describe('every finisher plays through', () => {
  for (const f of roster) {
    for (const o of roster) {
      it(`${f.name} finishes ${o.name}`, () => {
        for (const fin of f.finishers.filter((x) => x.kind !== 'cancellation')) {
          const m = winMatch(f.id, o.id);
          expect(m.phase, fin.id).toBe('stayTuned');
          run(m, 25);
          const g = RANGE_GAP[fin.range];
          place(m, -g / 2, g / 2);
          const ev: SimEvent[] = [];
          const inputs = presses(finisherInputs(f.id, fin.id));
          for (let t = 0; t < 20 && m.phase === 'stayTuned'; t++) step(m, inputs(m, t), 0, ev);
          expect(m.phase, `${fin.id} started`).toBe('finisher');
          // Saving mid-finisher and playing on gives the same ending.
          ev.push(...run(m, 30));
          const copy = saveMatch(m);
          const rest = run(m, fin.total + 10);
          const rest2 = run(copy, fin.total + 10);
          expect(rest2).toEqual(rest);
          expect(m.phase).toBe('over');
          const all = [...ev, ...rest];
          expect(count(all, 'finisherCut')).toBe(1);
          expect(count(all, 'finisherCard')).toBe(1);
          expect(count(all, 'matchOver')).toBe(1);
          if (fin.kind === 'signoff') expect(m.fighters[1].mode, `${fin.id}: ends on the floor`).toBe('ko');
        }
      });
    }
  }
});

describe('the CPU', () => {
  it('finishes the matches it wins, walking into range like a player', () => {
    const ids = Object.keys(FIGHTERS);
    let signOffs = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const m = createMatch({ p1: ids[seed % 4], p2: ids[(seed + 1) % 4], seed });
      const a = new Cpu(0, 'hard', seed);
      const b = new Cpu(1, 'easy', seed + 3);
      const ev: SimEvent[] = [];
      for (let t = 0; t < 40000 && m.phase !== 'over'; t++) step(m, a.next(m), b.next(m), ev);
      expect(m.phase).toBe('over');
      const started = ev.filter((e) => e.type === 'finisher');
      expect(count(ev, 'finisherCard')).toBe(started.length);
      signOffs += started.filter((e) => e.type === 'finisher' && e.kind === 'signoff').length;
    }
    expect(signOffs).toBeGreaterThanOrEqual(5);
  });
});
