// The combo rules, played out in the simulation: specials cancel only out
// of a hit, every launcher can be followed up with a normal, juggles wind
// down on their own, boosted specials relaunch, bounces happen once a combo,
// the first hit is worth a bar, and Rox's signature routes still connect.
// Also: Mumbles has a special that ends a combo, Hollis's string grab
// catches a stunned opponent (never one who blocked), and his Nightstick
// links into the jab.
import { describe, expect, it } from 'vitest';
import { BAR, FIGHTERS, Input, JUGGLE_POP, MAX_JUGGLE, METER_SCALE_MIN, METER_SCALE_STEP, REPEAT_KEEP, SCALE_STEP, step, type MatchState, type SimEvent } from '../src/sim';
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

  it('relaunches as often as there are bars: three in one combo', () => {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    m.fighters[0].meter = 3 * BAR;
    const ev = route(m, [
      ['now', DOWN | BP], ['c.BP@11', FP], ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL],
      ['free', BP], ['s.BP@12', BP], ['BP BP@14', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL],
      ['free', BP], ['s.BP@12', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL],
      ['free', BP], ['s.BP@12', BP],
    ]);
    expect(ev.filter((e) => e.type === 'relaunch' && e.how === 'special')).toHaveLength(3);
    const h = hits(ev);
    h.forEach((e, k) => expect(e.combo, `${e.move} is hit ${k + 1}`).toBe(k + 1));
    expect(h.length).toBeGreaterThanOrEqual(10);
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
  // Pressed on exact frames from the start (found by searching the simulation for her best routes).
  // Lariat (ground bounce), launcher, Step Touch string, Jazzercise, Count of Eight.
  const meterless: [number, number][] = [[0, LEFT | SPECIAL], [50, DOWN | BP], [68, RIGHT | FK], [84, BK], [105, BP], [123, BP], [140, DOWN | SPECIAL]];
  // Launcher, boosted Star Jump (relaunch), Step Touch string, Lariat, Count of Eight.
  const oneBar: [number, number][] = [[0, DOWN | BP], [16, SPECIAL], [19, SPECIAL], [48, RIGHT | FK], [65, BK], [87, LEFT | SPECIAL], [126, BP], [142, DOWN | SPECIAL]];

  function damage(script: [number, number][], meter: number): { hits: number; pct: number } {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    m.firstHit = true;
    m.fighters[0].meter = meter;
    const at = new Map(script);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 400; t++) step(m, at.get(t) ?? 0, 0, ev);
    const h = hits(ev);
    // One unbroken combo.
    h.forEach((e, k) => expect(e.combo, `${e.move} is hit ${k + 1}`).toBe(k + 1));
    const d = m.fighters[1];
    return { hits: h.length, pct: ((d.maxHealth - d.health) * 100) / d.maxHealth };
  }

  it('meterless: 10 or more hits, strings and specials (no launcher loop), about 30%', () => {
    const r = damage(meterless, 0);
    expect(r.hits).toBeGreaterThanOrEqual(10);
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

describe('combo scaling', () => {
  // Launcher, then the launcher again on the airborne body.
  const twice = [['now', DOWN | BP], ['c.BP@11', DOWN | BP]] as const;

  it('a launcher on a body already in the air is one more juggle hit, not a second launch', () => {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    const ev: SimEvent[] = [];
    let vy = 0;
    let k = 0;
    const script = twice;
    for (let t = 0; t < 120; t++) {
      const a = m.fighters[0];
      let bits = 0;
      if (k < script.length) {
        const [when, b] = script[k];
        if (when === 'now' || (a.mode === 'move' && `${a.move}@${a.moveFrame}` === when)) {
          bits = b;
          k++;
        }
      }
      const from = ev.length;
      step(m, bits, 0, ev);
      if (ev.slice(from).some((e) => e.type === 'hit' && e.combo === 2)) vy = m.fighters[1].vy;
    }
    expect(hits(ev).map((e) => `${e.move}#${e.combo}`)).toEqual(['c.BP#1', 'c.BP#2']);
    expect(vy).toBeGreaterThan(0);
    expect(vy).toBeLessThanOrEqual(JUGGLE_POP);
  });

  it('the same move again in a combo keeps only REPEAT_KEEP % on top of the usual scaling', () => {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    const h = hits(route(m, twice));
    const base = FIGHTERS.rox.moves['c.BP'].hits[0].damage;
    expect(h[0].damage).toBe(base);
    // Hit 2: 10% combo scaling, then the repeat.
    expect(h[1].damage).toBe(Math.floor((base * (100 - SCALE_STEP) * REPEAT_KEEP) / 10000));
  });

  it("later hits of a combo earn the attacker less meter; the defender's gain isn't scaled", () => {
    const m = ready('rox', 'rox');
    place(m, -0.4, 0.4);
    m.firstHit = true;
    const before: number[] = [];
    const gains: { a: number; d: number; dmg: number; combo: number }[] = [];
    const ev: SimEvent[] = [];
    let k = 0;
    for (let t = 0; t < 120; t++) {
      const a = m.fighters[0];
      let bits = 0;
      if (k < twice.length) {
        const [when, b] = twice[k];
        if (when === 'now' || (a.mode === 'move' && `${a.move}@${a.moveFrame}` === when)) {
          bits = b;
          k++;
        }
      }
      before[0] = m.fighters[0].meter;
      before[1] = m.fighters[1].meter;
      const from = ev.length;
      step(m, bits, 0, ev);
      for (const e of ev.slice(from)) if (e.type === 'hit') gains.push({ a: m.fighters[0].meter - before[0], d: m.fighters[1].meter - before[1], dmg: e.damage, combo: e.combo });
    }
    expect(gains).toHaveLength(2);
    for (const g of gains) {
      const pct = Math.max(METER_SCALE_MIN, 100 - METER_SCALE_STEP * (g.combo - 1));
      expect(g.a).toBe(Math.floor(((g.dmg + (g.dmg >> 1)) * pct) / 100));
      expect(g.d).toBe(g.dmg);
    }
    expect(gains[1].a).toBeLessThan(gains[1].dmg + (gains[1].dmg >> 1));
  });
});
