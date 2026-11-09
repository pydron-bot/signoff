// The air game: specials in the air (once a jump), air strings, and the jump
// cancel off a launcher that hit, which is how a juggle goes up after them.
import { describe, expect, it } from 'vitest';
import { FIGHTERS, Input } from '../src/sim';
import { count, place, presses, ready, run } from './sim-helpers';

const { UP, RIGHT, DOWN, FP, BP, FK, SPECIAL } = Input;

describe('air specials', () => {
  for (const f of Object.values(FIGHTERS)) {
    const id = Object.values(f.airSpecials)[0]!;
    it(`${f.name}: Special in the air starts ${id}, once a jump, and lands`, () => {
      const m = ready(f.id, f.id === 'dale' ? 'rox' : 'dale');
      place(m, -2.5, 2.5);
      const a = m.fighters[0];
      const ev = run(m, 12, presses({ 0: UP, 10: SPECIAL }));
      expect(a.mode).toBe('move');
      expect(a.move).toBe(id);
      expect(ev.find((e) => e.type === 'special')).toMatchObject({ player: 0, move: id });
      // A second Special before landing does nothing.
      const again = run(m, 120, (mm) => (mm.fighters[0].y > 0 ? SPECIAL : 0));
      expect(count(again, 'special')).toBe(0);
      expect(a.y).toBe(0);
      expect(['idle', 'landing']).toContain(a.mode);
    });
  }

  it('a hover holds the height it started at', () => {
    const m = ready('dale', 'rox');
    place(m, -2.5, 2.5);
    const a = m.fighters[0];
    run(m, 12, presses({ 0: UP, 10: SPECIAL }));
    const y = a.y;
    run(m, 8);
    expect(a.move).toBe('Downpour');
    expect(a.y).toBe(y);
  });

  it('a dive sets off down and forward, and its landing lag is its own', () => {
    const m = ready('rox', 'dale');
    place(m, -2.5, 2.5);
    const a = m.fighters[0];
    run(m, 12, presses({ 0: UP, 10: SPECIAL }));
    const x0 = a.x;
    const y0 = a.y;
    run(m, 8);
    expect(a.x).toBeGreaterThan(x0);
    expect(a.y).toBeLessThan(y0);
    while (a.mode === 'move') run(m, 1);
    expect(a.mode).toBe('landing');
    expect(a.timer).toBe(FIGHTERS.rox.moves['Aerobic Dive'].landing! - 1);
  });

  it('a jump-in that hits cancels into the air special, as a ground normal cancels into a special', () => {
    const m = ready('gideon', 'dale');
    place(m, -1.3, 0.2);
    const a = m.fighters[0];
    // Forward jump, Jumping Blessing on the way down, Special as it hits.
    const ev = run(m, 60, (mm, t) => {
      const f = mm.fighters[0];
      if (t === 0) return UP | RIGHT;
      if (f.mode === 'air' && f.vy < 0) return FP;
      return f.contact === 'hit' && f.move === 'j.FP' ? SPECIAL : 0;
    });
    expect(ev.find((e) => e.type === 'hit' && e.attacker === 0)).toMatchObject({ move: 'j.FP' });
    expect(ev.find((e) => e.type === 'special')).toMatchObject({ move: 'Rapture' });
    expect(a.airSpecialUsed).toBe(true);
  });

  it('Mumbles reappears behind them at the same height', () => {
    const m = ready('mumbles', 'dale');
    place(m, -1.5, 1.0);
    const a = m.fighters[0];
    run(m, 12, presses({ 0: UP, 10: SPECIAL }));
    run(m, 10);
    expect(a.x).toBeGreaterThan(m.fighters[1].x);
    expect(a.y).toBeGreaterThan(0);
    expect(a.facing).toBe(-1);
  });

  it('the boosted version spends a bar', () => {
    const m = ready('gus', 'dale');
    place(m, -2.5, 2.5);
    m.fighters[0].meter = 1000;
    const ev = run(m, 14, presses({ 0: UP, 10: SPECIAL, 12: SPECIAL }));
    expect(ev.find((e) => e.type === 'boost')).toMatchObject({ move: 'Cleaver Toss+' });
    expect(m.fighters[0].meter).toBe(0);
  });
});

describe('air strings', () => {
  it('a jumping normal chains into the next step of its air string', () => {
    const m = ready('rox', 'dale');
    place(m, -2.5, 2.5);
    const a = m.fighters[0];
    const seen: string[] = [];
    run(m, 50, (mm, t) => {
      const f = mm.fighters[0];
      if (f.mode === 'move' && seen[seen.length - 1] !== f.move) seen.push(f.move);
      return t === 0 ? UP : t === 5 ? FP : t === 17 ? FK : t === 28 ? BK_ : 0;
    });
    expect(seen.slice(0, 2)).toEqual(['j.FP', 'j.FK']);
    expect(a.airAttackUsed).toBe(true);
  });

  it('a jumping normal with nothing to chain into ends the attacks for that jump', () => {
    const m = ready('dale', 'rox');
    place(m, -2.5, 2.5);
    const seen: string[] = [];
    run(m, 50, (mm, t) => {
      const f = mm.fighters[0];
      if (f.mode === 'move' && seen[seen.length - 1] !== f.move) seen.push(f.move);
      return t === 0 ? UP : t === 5 ? BP : t === 19 ? FP : 0;
    });
    expect(seen).toEqual(['j.BP']);
  });
});

describe('jump cancel', () => {
  it('a launcher that hits can be cancelled into a jump, and the air string follows them up', () => {
    const m = ready('dale', 'rox');
    place(m, -0.5, 0.4);
    const a = m.fighters[0];
    const ev = run(m, 70, (mm, t) => {
      const f = mm.fighters[0];
      if (t === 0) return DOWN | BP;
      if (f.mode === 'move' && f.move === 'c.BP' && f.contact === 'hit') return UP | RIGHT;
      if (f.mode === 'air' && f.vy > 0 && !f.airAttackUsed) return FP;
      if (f.mode === 'move' && f.move === 'j.FP' && f.contact === 'hit') return BP;
      return 0;
    });
    expect(count(ev, 'jumpCancel')).toBe(1);
    const hits = ev.filter((e) => e.type === 'hit' && e.attacker === 0).map((e) => (e.type === 'hit' ? e.move : ''));
    expect(hits.slice(0, 3)).toEqual(['c.BP', 'j.FP', 'j.BP']);
    // A hop: lower than a jump.
    run(m, 60);
    expect(a.y).toBe(0);
  });

  it('once a combo, and it costs scaling', () => {
    const m = ready('dale', 'rox');
    place(m, -0.5, 0.4);
    const ev = run(m, 40, (mm, t) => {
      const f = mm.fighters[0];
      if (t === 0) return DOWN | BP;
      return f.mode === 'move' && f.move === 'c.BP' && f.contact === 'hit' ? UP | RIGHT : 0;
    });
    expect(count(ev, 'jumpCancel')).toBe(1);
    const d = m.fighters[1];
    expect(d.chased).toBe(true);
    // One hit landed, scaled as if three had.
    expect(d.combo).toBe(3);
  });

  it('only off a hit: a blocked launcher stays on the ground', () => {
    const m = ready('dale', 'rox');
    place(m, -0.5, 0.4);
    const ev = run(m, 40, (mm, t) => (t === 0 ? DOWN | BP : mm.fighters[0].move === 'c.BP' ? UP : 0), Input.BLOCK);
    expect(count(ev, 'jumpCancel')).toBe(0);
  });
});

const BK_ = Input.BK;
