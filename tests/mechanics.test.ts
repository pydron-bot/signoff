// Mechanics the newer fighters brought: command grabs, armour breaking,
// unblockables, teleports and decoys.
import { describe, expect, it } from 'vitest';
import { fx } from '../src/sim/fixed';
import { FIGHTERS, Input, THROW_HOLD } from '../src/sim';
import { count, place, presses, ready, run } from './sim-helpers';

const { UP, LEFT, RIGHT, DOWN, FP, BLOCK, SPECIAL, THROW } = Input;
const HOLLIS = FIGHTERS.hollis;
const DALE = FIGHTERS.dale;

describe('command grab (Hollis: Clocking In)', () => {
  it('grabs through a block and Throw cannot break it', () => {
    const m = ready('hollis', 'dale');
    place(m, -0.5, 0.5);
    const ev = run(m, THROW_HOLD + 30, presses({ 0: RIGHT | SPECIAL }), (_m, t) => BLOCK | (t > 12 && t < 18 ? THROW : 0));
    expect(ev.find((e) => e.type === 'throw')).toMatchObject({ thrower: 0, move: 'Clocking In' });
    expect(count(ev, 'throwTech')).toBe(0);
    expect(m.fighters[1].health).toBe(DALE.health - HOLLIS.moves['Clocking In'].throwData!.damage);
  });

  it('misses someone in the air', () => {
    const m = ready('hollis', 'dale');
    place(m, -0.5, 0.5);
    const ev = run(m, 40, presses({ 2: RIGHT | SPECIAL }), presses({ 0: UP }));
    expect(count(ev, 'throw')).toBe(0);
  });
});

describe('armour break (Hollis: Flashlight)', () => {
  const into = (move: string) => {
    const m = ready('hollis', 'rox');
    place(m, -0.5, 0.5);
    const [h, r] = m.fighters;
    h.mode = r.mode = 'move';
    h.move = move;
    h.moveFrame = HOLLIS.moves[move].startup - 1;
    r.move = 'Leg Warmer Lariat+';
    r.moveFrame = 3;
    return run(m, 1);
  };

  it('goes through armour that soaks an ordinary hit', () => {
    const lit = into('Flashlight');
    expect(count(lit, 'armor')).toBe(0);
    expect(lit.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, move: 'Flashlight' });
    const stick = into('s.BP');
    expect(count(stick, 'armor')).toBe(1);
    expect(count(stick, 'hit')).toBe(0);
  });
});

describe('unblockable (Mumbles: Knock-Knock)', () => {
  const knock = (defender: (t: number) => number) => {
    const m = ready('mumbles', 'dale');
    place(m, -0.4, 0.4);
    return run(m, 50, presses({ 0: DOWN | SPECIAL }), (_m, t) => defender(t));
  };

  it('beats standing and crouching block', () => {
    expect(count(knock(() => BLOCK), 'hit')).toBe(1);
    expect(count(knock(() => BLOCK | DOWN), 'hit')).toBe(1);
    expect(count(knock(() => BLOCK), 'block')).toBe(0);
  });

  it('is avoided by jumping', () => {
    expect(count(knock((t) => (t === 18 ? UP : 0)), 'hit')).toBe(0);
  });
});

describe('teleports (Mumbles: Strings Attached, Exit Stage Left)', () => {
  it('reappears behind the opponent, facing them, untouchable while gone', () => {
    const m = ready('mumbles', 'dale');
    place(m, -1, 1);
    const ev = run(m, 40, presses({ 0: RIGHT | SPECIAL }), presses({ 8: FP }));
    expect(count(ev, 'teleport')).toBe(1);
    expect(count(ev, 'hit')).toBe(0);
    const [mm, d] = m.fighters;
    expect(mm.x).toBeGreaterThan(d.x);
    expect(mm.facing).toBe(-1);
  });

  it('reappears in front when the opponent has their back to the wall', () => {
    const m = ready('mumbles', 'dale');
    place(m, 4.5, 5.6);
    run(m, 40, presses({ 0: RIGHT | SPECIAL }));
    expect(m.fighters[0].x).toBeLessThan(m.fighters[1].x);
  });

  it('Exit Stage Left puts distance between them', () => {
    const m = ready('mumbles', 'dale');
    place(m, -0.5, 0.5);
    run(m, 40, presses({ 0: LEFT | SPECIAL }));
    expect(m.fighters[1].x - m.fighters[0].x).toBeGreaterThan(fx(3));
  });
});

describe('decoy (Mumbles: Hand Puppet)', () => {
  it('takes a hit meant for him, then is gone', () => {
    const m = ready('mumbles', 'dale');
    place(m, -1.6, 0.4);
    // The puppet appears 0.9 m in front of him, right in the way of Dale's kick.
    const ev = run(m, 60, presses({ 0: SPECIAL }), presses({ 14: FP, 40: FP }));
    expect(count(ev, 'decoyPop')).toBe(1);
    expect(m.fighters[0].health).toBe(m.fighters[0].maxHealth);
    expect(m.projectiles.some((p) => p.active)).toBe(false);
  });

  it('soaks a projectile', () => {
    const m = ready('mumbles', 'dale');
    place(m, -3, 2);
    const ev = run(m, 120, presses({ 0: SPECIAL }), presses({ 0: LEFT | SPECIAL }));
    expect(count(ev, 'projectileClash')).toBe(1);
    expect(count(ev, 'hit')).toBe(0);
  });
});

describe('counter (Margaret: Teleprompter)', () => {
  const MARGARET = FIGHTERS.margaret;

  it('reads a strike in its window: nothing lands, and her answer knocks them down', () => {
    const m = ready('margaret', 'dale');
    place(m, -0.6, 0.6);
    // Margaret starts Teleprompter; Dale jabs into its window.
    const ev = run(m, 60, presses({ 0: LEFT | SPECIAL }), presses({ 6: FP }));
    expect(ev.find((e) => e.type === 'counter')).toMatchObject({ player: 0, move: 's.FP' });
    expect(m.fighters[0].health).toBe(MARGARET.health);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, defender: 1, move: 'Teleprompter Read' });
    expect(['launched', 'down']).toContain(m.fighters[1].mode);
  });

  it('cannot read a throw', () => {
    const m = ready('margaret', 'dale');
    place(m, -0.5, 0.5);
    const ev = run(m, 40, presses({ 0: LEFT | SPECIAL }), presses({ 10: THROW }));
    expect(count(ev, 'counter')).toBe(0);
    expect(ev.find((e) => e.type === 'throw')).toMatchObject({ thrower: 1 });
  });

  it('a strike before the window opens lands as usual', () => {
    const m = ready('margaret', 'dale');
    place(m, -0.6, 0.6);
    const [a, d] = m.fighters;
    a.mode = 'move';
    a.move = 'Teleprompter';
    a.moveFrame = 1;
    d.mode = 'move';
    d.move = 's.FP';
    d.moveFrame = DALE.moves['s.FP'].startup - 1;
    const ev = run(m, 3);
    expect(count(ev, 'counter')).toBe(0);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ attacker: 1, defender: 0 });
  });
});

describe('delayed projectile (Margaret: Live Feed)', () => {
  it('waits where it appeared, unable to hit, then goes out', () => {
    const m = ready('margaret', 'dale');
    place(m, -1.5, -0.4);
    run(m, 14, presses({ 0: RIGHT | SPECIAL }));
    const p = m.projectiles.find((q) => q.active)!;
    expect(p).toBeDefined();
    const x0 = p.x;
    // Dale stands right on it while it's on standby: no hit.
    m.fighters[1].x = x0;
    const waiting = run(m, 25);
    expect(p.x).toBe(x0);
    expect(count(waiting, 'hit')).toBe(0);
    // Then it goes out, and hits him further along.
    m.fighters[1].x = x0 + fx(1.2);
    const out = run(m, 30);
    expect(out.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, move: 'Live Feed' });
  });
});
