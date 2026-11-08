// The combo rules, played out in the simulation: specials cancel only out
// of a hit, every launcher can be followed up with a normal, Mumbles has a
// special that ends a combo, Hollis's string grab catches a stunned
// opponent (never one who blocked), and his Nightstick links into the jab.
import { describe, expect, it } from 'vitest';
import { FIGHTERS, Input, step, type MatchState, type SimEvent } from '../src/sim';
import { count, place, ready } from './sim-helpers';

const { DOWN, LEFT, RIGHT, BLOCK, SPECIAL, FP, BP, FK } = Input;

/** Runs a script of presses keyed by (move, move frame) for P1; P2 holds `p2`. Returns the events. */
function play(m: MatchState, first: number, at: Record<string, number>, p2 = 0, steps = 120): SimEvent[] {
  const ev: SimEvent[] = [];
  const done = new Set<string>();
  for (let t = 0; t < steps; t++) {
    const a = m.fighters[0];
    let in0 = t === 0 ? first : 0;
    const key = a.mode === 'move' ? `${a.move}@${a.moveFrame}` : '';
    if (key in at && !done.has(key)) {
      done.add(key);
      in0 = at[key];
    }
    step(m, in0, p2, ev);
  }
  return ev;
}

describe('combo rules', () => {
  it('specials cancel out of a hit, not out of a block', () => {
    const jab = FIGHTERS.dale.moves['s.FP'];
    const press = { [`s.FP@${jab.lastActive}`]: RIGHT | SPECIAL };
    const hit = ready('dale', 'rox');
    place(hit, -0.4, 0.4);
    expect(count(play(hit, FP, press), 'special')).toBe(1);
    const blocked = ready('dale', 'rox');
    place(blocked, -0.4, 0.4);
    expect(count(play(blocked, FP, press, BLOCK), 'special')).toBe(0);
  });

  for (const f of Object.values(FIGHTERS)) {
    it(`${f.name}: a normal follows a launch into the air`, () => {
      const cbp = f.moves['c.BP'];
      // Mumbles hits low: his own launcher again; the rest a standing punch.
      const follow = f.id === 'mumbles' ? DOWN | BP : FP;
      const m = ready(f.id, f.id === 'rox' ? 'dale' : 'rox');
      place(m, -0.4, 0.4);
      const ev = play(m, DOWN | BP, { [`c.BP@${cbp.lastActive}`]: follow });
      const hits = ev.filter((e) => e.type === 'hit');
      expect(hits.length, 'launcher and follow-up').toBeGreaterThanOrEqual(2);
      expect(hits[1].type === 'hit' && hits[1].y).toBeGreaterThan(0);
    });
  }

  it("Mumbles' Hand Puppet ends a combo from his jab", () => {
    const jab = FIGHTERS.mumbles.moves['s.FP'];
    const m = ready('mumbles', 'rox');
    place(m, -0.4, 0.4);
    const ev = play(m, FP, { [`s.FP@${jab.lastActive}`]: SPECIAL });
    expect(count(ev, 'hit')).toBe(2);
    expect(count(ev, 'knockdown')).toBe(1);
  });

  it("Hollis's Cuff 'Em grabs them out of the string, and whiffs if they blocked", () => {
    const pd = FIGHTERS.hollis.moves['FP FP'];
    const jab = FIGHTERS.hollis.moves['s.FP'];
    const script = { [`s.FP@${jab.lastActive}`]: FP, [`FP FP@${pd.lastActive}`]: FK };
    const hit = ready('hollis', 'rox');
    place(hit, -0.4, 0.4);
    const ev = play(hit, FP, script);
    expect(ev.find((e) => e.type === 'throw')).toMatchObject({ thrower: 0, move: 'FP FP FK' });
    const blocked = ready('hollis', 'rox');
    place(blocked, -0.4, 0.4);
    expect(count(play(blocked, FP, script, BLOCK), 'throw')).toBe(0);
  });

  it("Hollis's Nightstick staggers long enough to link into his jab", () => {
    const ns = FIGHTERS.hollis.moves['s.BP'];
    const m = ready('hollis', 'rox');
    place(m, -0.5, 0.5);
    // The jab pressed just as the Nightstick recovers (the buffer holds it).
    const ev = play(m, BP, { [`s.BP@${ns.total - 4}`]: FP });
    const hits = ev.filter((e) => e.type === 'hit');
    expect(hits.length).toBe(2);
    expect(hits[1].type === 'hit' && hits[1].combo).toBe(2);
  });

  it('Rox lunges forward with her forward Back Punch, Dale steps back with his back kick', () => {
    const r = ready('rox', 'dale');
    place(r, -2, 2);
    const x0 = r.fighters[0].x;
    play(r, RIGHT | BP, {}, 0, 15);
    expect(r.fighters[0].x - x0).toBeGreaterThan(0);
    const d = ready('dale', 'rox');
    place(d, -1, 1);
    const x1 = d.fighters[0].x;
    play(d, LEFT | FK, {}, 0, 15);
    expect(d.fighters[0].x - x1).toBeLessThan(0);
  });
});
