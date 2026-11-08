// The combo rules, played out in the simulation: specials cancel only out
// of a hit, every launcher can be followed up with a normal, juggles wind
// down on their own, boosted specials relaunch, bounces happen once a combo,
// the first hit is worth a bar, and Rox's signature routes still connect.
// Also: Mumbles has a special that ends a combo, Hollis's string grab
// catches a stunned opponent (never one who blocked), and his Nightstick
// links into the jab.
import { describe, expect, it } from 'vitest';
import { BAR, FIGHTERS, Input, MAX_JUGGLE, step, type MatchState, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { count, place, ready } from './sim-helpers';

const { DOWN, LEFT, RIGHT, BLOCK, SPECIAL, FP, BP, FK, BK } = Input;

/**
 * Plays P1's script in order: each step presses its buttons once its
 * condition holds, 'now', 'free' (P1 is back in control) or 'move@frame'.
 */
function route(m: MatchState, script: readonly (readonly [string, number])[], steps = 400): SimEvent[] {
  const ev: SimEvent[] = [];
  let k = 0;
  for (let t = 0; t < steps; t++) {
    const a = m.fighters[0];
    let in0 = 0;
    if (k < script.length) {
      const [when, bits] = script[k];
      const free = a.mode === 'idle' || a.mode === 'walk' || a.mode === 'crouch';
      if (when === 'now' || (when === 'free' && free) || (a.mode === 'move' && `${a.move}@${a.moveFrame}` === when)) {
        in0 = bits;
        k++;
      }
    }
    step(m, in0, 0, ev);
  }
  return ev;
}

function hits(ev: SimEvent[]) {
  return ev.flatMap((e) => (e.type === 'hit' ? [e] : []));
}

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

describe('MK-style juggles', () => {
  // Rox's pieces: Star Jump Uppercut launches, the Lariat ground-bounces, Feel the Burn wall-bounces near the wall.
  const launcher = [['now', DOWN | BP], ['c.BP@11', FP]] as const;

  it('juggles wind down on their own: a jab after every landing still ends well short of the cap', () => {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    // Launch, then jab every time she's free: the pops get lower and the falls faster until one misses.
    const ev = route(m, [['now', DOWN | BP], ...Array.from({ length: 20 }, () => ['free', FP] as const)], 600);
    const juggled = hits(ev).length - 1;
    expect(juggled).toBeGreaterThanOrEqual(1);
    expect(juggled).toBeLessThan(MAX_JUGGLE);
    expect(count(ev, 'knockdown')).toBeGreaterThanOrEqual(1);
  });

  it('the first hit of the round is worth a bar, once', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const ev = route(m, [['now', FP], ['s.FP@8', FP]]);
    expect(ev.filter((e) => e.type === 'firstHit')).toEqual([{ type: 'firstHit', player: 0 }]);
    expect(m.fighters[0].meter).toBeGreaterThanOrEqual(BAR);
    expect(m.firstHit).toBe(true);
  });

  it('a boosted special relaunches a juggled body (1 bar), ends the special and puts them in reach', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    m.fighters[0].meter = BAR;
    const ev = route(m, [...launcher, ['s.FP@8', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL], ['free', BP], ['s.BP@12', BP]]);
    const re = ev.filter((e) => e.type === 'relaunch');
    expect(re).toHaveLength(1);
    expect(re[0]).toMatchObject({ how: 'special', player: 1 });
    // Only its first kick landed: the rest of the special was cut short to follow up with a string.
    expect(hits(ev).filter((e) => e.move === 'Count of Eight+')).toHaveLength(1);
    expect(hits(ev).map((e) => `${e.move}#${e.combo}`)).toEqual(['c.BP#1', 's.FP#2', 'Count of Eight+#3', 'BP BP#4']);
  });

  it('an unboosted special on a juggled body is just another juggle hit', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const ev = route(m, [...launcher, ['s.FP@8', DOWN | SPECIAL]]);
    expect(count(ev, 'relaunch')).toBe(0);
  });

  it('specials never cancel into specials', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const ev = route(m, [...launcher, ['s.FP@8', LEFT | SPECIAL], ['Leg Warmer Lariat@26', DOWN | SPECIAL]]);
    expect(ev.filter((e) => e.type === 'special').map((e) => e.type === 'special' && e.move)).toEqual(['Leg Warmer Lariat']);
  });

  it('the Lariat bounces them off the floor once a combo; the second time they stay down', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const ev = route(m, [...launcher, ['s.FP@8', LEFT | SPECIAL], ['Leg Warmer Lariat@28', DOWN | BP], ['c.BP@11', LEFT | SPECIAL]]);
    expect(ev.filter((e) => e.type === 'relaunch' && e.how === 'ground')).toHaveLength(1);
    expect(hits(ev).some((e) => e.move === 'c.BP' && e.combo > 1)).toBe(true);
  });

  it('Feel the Burn bounces them off the wall only near it', () => {
    const script = [...launcher, ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', BK]] as const;
    const mid = ready('rox', 'dale');
    place(mid, -0.4, 0.4);
    expect(count(route(mid, script), 'relaunch')).toBe(0);
    const corner = ready('rox', 'dale');
    place(corner, 3.8, 4.6);
    const ev = route(corner, script);
    expect(ev.filter((e) => e.type === 'relaunch' && e.how === 'wall')).toHaveLength(1);
    // Off the wall, back towards her.
    expect(corner.fighters[1].x).toBeLessThan(fx(5.7));
  });
});

describe("Rox's signature routes", () => {
  // Launcher, jab, Lariat (ground bounce), launcher, jab string.
  const meterless = [
    ['now', DOWN | BP], ['c.BP@11', FP], ['s.FP@8', LEFT | SPECIAL],
    ['Leg Warmer Lariat@28', DOWN | BP], ['c.BP@11', FP], ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', BK],
  ] as const;
  // The same with a jab string and a boosted Count of Eight (relaunch) in the middle.
  const oneBar = [
    ['now', DOWN | BP], ['c.BP@11', FP], ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL],
    ['free', BP], ['s.BP@12', BP], ['BP BP@14', LEFT | SPECIAL],
    ['Leg Warmer Lariat@28', DOWN | BP], ['c.BP@11', FP], ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', BK],
  ] as const;

  function damage(script: readonly (readonly [string, number])[], meter: number): { hits: number; pct: number } {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    m.fighters[0].meter = meter;
    const ev = route(m, script);
    const h = hits(ev);
    // One unbroken combo.
    h.forEach((e, k) => expect(e.combo, `${e.move} is hit ${k + 1}`).toBe(k + 1));
    const d = m.fighters[1];
    return { hits: h.length, pct: ((d.maxHealth - d.health) * 100) / d.maxHealth };
  }

  it('meterless: 9 or more hits, about 30%', () => {
    const r = damage(meterless, 0);
    expect(r.hits).toBeGreaterThanOrEqual(9);
    expect(r.pct).toBeGreaterThan(25);
    expect(r.pct).toBeLessThan(36);
  });

  it('one bar: longer, and worth more than the meterless route', () => {
    const r = damage(oneBar, BAR);
    expect(r.hits).toBeGreaterThanOrEqual(11);
    expect(r.pct).toBeGreaterThan(damage(meterless, 0).pct + 4);
    expect(r.pct).toBeLessThan(45);
  });
});
