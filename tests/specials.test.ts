// The specials pass (0.51.0): an air special on Down for everyone, a
// follow-up special for everyone (Special, then a button as it plays), and
// air strings that end in a spike, which land in full off a jump cancel.
import { describe, expect, it } from 'vitest';
import { FIGHTERS, Input, step, stringMoves, type FighterData, type MatchState, type SimEvent } from '../src/sim';
import { GRAVITY } from '../src/sim/constants';
import { count, place, ready, run } from './sim-helpers';

const { UP, RIGHT, LEFT, DOWN, FP, BP, FK, BK, SPECIAL } = Input;
const BUTTON: Readonly<Record<string, number>> = { FP, BP, FK, BK };
const DIR: Readonly<Record<string, number>> = { n: 0, f: RIGHT, b: LEFT, d: DOWN };
const roster = Object.values(FIGHTERS);
const foe = (id: string) => (id === 'dale' ? 'rox' : 'dale');

/** Every special a fighter has: ground, air and follow-ups (boosted versions not counted). */
function specials(f: FighterData): Set<string> {
  const out = new Set<string>([...Object.values(f.specials), ...Object.values(f.airSpecials)] as string[]);
  for (const id of [...out]) for (const next of Object.values(f.moves[id].chain)) out.add(next!);
  return out;
}

/** The ground specials with a follow-up, and the follow-up's button and move. */
function followUps(f: FighterData): { dir: string; special: string; button: string; next: string }[] {
  const out: { dir: string; special: string; button: string; next: string }[] = [];
  for (const [dir, id] of Object.entries(f.specials)) for (const [button, next] of Object.entries(f.moves[id!].chain)) out.push({ dir, special: id!, button, next: next! });
  return out;
}

/** Launcher point blank, a jump cancel as it hits, then each step of the air string as soon as the one before connects. */
function airString(fid: string, path: readonly string[]): string[] {
  const m: MatchState = ready(fid, 'rox');
  place(m, -0.4, 0.4);
  let k = 0;
  let last = '';
  const ev: SimEvent[] = run(m, 140, (mm, t) => {
    const f = mm.fighters[0];
    if (t === 0) return DOWN | BP;
    if (f.mode === 'move' && f.move === 'c.BP' && f.contact === 'hit') return UP;
    if (k === 0 && f.mode === 'air') {
      k = 1;
      return BUTTON[path[0].slice(2)];
    }
    if (k > 0 && k < path.length && f.mode === 'move' && f.move !== last && f.contact !== 'none' && f.hitstop === 0) {
      last = f.move;
      return BUTTON[path[k++]];
    }
    return 0;
  });
  return ev.flatMap((e) => (e.type === 'hit' && e.attacker === 0 ? [e.move] : []));
}

describe.each(roster.map((f) => [f.name, f] as const))('%s', (_name, f) => {
  it('has six specials or more, on the ground, in the air and as follow-ups', () => {
    expect(specials(f).size).toBeGreaterThanOrEqual(6);
    expect(Object.keys(f.airSpecials).length).toBeGreaterThanOrEqual(2);
    expect(followUps(f).length).toBeGreaterThanOrEqual(1);
  });

  it('Down + Special in the air starts the down air special; anything else the neutral one', () => {
    for (const [held, want] of [
      [DOWN, f.airSpecials.d],
      [0, f.airSpecials.n],
    ] as const) {
      const m = ready(f.id, foe(f.id));
      place(m, -2.5, 2.5);
      const a = m.fighters[0];
      run(m, 12, (_m, t) => (t === 0 ? UP : t === 10 ? held | SPECIAL : held));
      expect(a.move).toBe(want);
    }
  });

  it.each(followUps(f).map((x) => [`${x.special} › ${x.button}`, x] as const))('follow-up %s: comes out from the special, hit or not, and is called as a special', (_n, x) => {
    for (const near of [true, false]) {
      const m = ready(f.id, foe(f.id));
      place(m, near ? -0.5 : -3.5, near ? 0.5 : 3.5);
      const a = m.fighters[0];
      const mv = f.moves[x.special];
      let started = -1;
      const ev = run(m, 90, (mm, t) => {
        if (t === 0) return DIR[x.dir] | SPECIAL;
        const me = mm.fighters[0];
        if (started < 0 && me.mode === 'move' && me.move === x.special && me.moveFrame === mv.cancel![0] - 2 && me.hitstop === 0) {
          started = t;
          return BUTTON[x.button];
        }
        return 0;
      });
      expect(started, 'pressed').toBeGreaterThan(0);
      expect(ev.some((e) => e.type === 'special' && e.move === x.next)).toBe(true);
      expect(a.mode === 'move' ? a.move : '').not.toBe(x.special);
      if (near) expect(ev.some((e) => e.type === 'hit' && e.attacker === 0 && e.move === x.next), 'connects point blank').toBe(true);
    }
  });

  // The air strings that end in a spike: each lands in full off a jump cancel, into the bounce.
  const spiked = f.airStrings.filter((s) => f.moves[stringMoves(f, s)!.at(-1)!].hits[0]?.groundBounce);
  it('has an air string or two that end in a spike', () => expect(spiked.length).toBeGreaterThanOrEqual(2));
  it.each(spiked.map((s) => [s.name, s] as const))('air string %s lands in full off a jump cancel, into the bounce', (_n, s) => {
    const hits = airString(f.id, s.path);
    expect(hits.slice(0, 1 + s.path.length)).toEqual(['c.BP', ...stringMoves(f, s)!]);
  });
});

describe('the air float', () => {
  it('an air normal that hits a body in the air stops its attacker falling', () => {
    const m = ready('dale', 'rox');
    place(m, -0.4, 0.4);
    const a = m.fighters[0];
    let vy: number | null = null;
    const ev: SimEvent[] = [];
    for (let t = 0; t < 80 && vy === null; t++) {
      const f = m.fighters[0];
      let input = 0;
      if (t === 0) input = DOWN | BP;
      else if (f.mode === 'move' && f.move === 'c.BP' && f.contact === 'hit') input = UP;
      else if (f.mode === 'air' && !f.airAttackUsed) input = FP;
      // Jumping Hammer lands as they both come down.
      else if (f.mode === 'move' && f.move === 'j.FP' && f.contact === 'hit') input = BP;
      ev.length = 0;
      const falling = a.vy < 0;
      step(m, input, 0, ev);
      if (ev.some((e) => e.type === 'hit' && e.move === 'j.BP')) {
        expect(falling).toBe(true);
        vy = a.vy;
      }
    }
    expect(vy).toBe(0);
  });

  it('a chained air step stops the fall it started in', () => {
    const m = ready('dale', 'rox');
    place(m, -2.5, 2.5);
    const a = m.fighters[0];
    let vy = 1;
    run(m, 60, (mm, t) => {
      const f = mm.fighters[0];
      if (t === 0) return UP;
      if (f.mode === 'air' && f.vy < 0 && !f.airAttackUsed) return FP;
      if (f.mode === 'move' && f.move === 'j.FP' && f.moveFrame === 11) return BP;
      if (f.mode === 'move' && f.move === 'j.BP' && f.moveFrame === 1) vy = f.vy;
      return 0;
    });
    // Stopped as it started, then one step of gravity.
    expect(vy).toBe(-GRAVITY);
    expect(a.y).toBe(0);
  });
});

describe('Gideon', () => {
  it('Begone (back + Special) casts them out, and off the wall near one', () => {
    const m = ready('gideon', 'dale');
    place(m, 4.0, 4.8);
    const ev = run(m, 60, (_m, t) => (t === 0 ? LEFT | SPECIAL : 0));
    expect(ev.find((e) => e.type === 'special')).toMatchObject({ move: 'Begone' });
    expect(count(ev, 'relaunch')).toBe(1);
  });
});
