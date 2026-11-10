// The fight's rules, played out step by step.
import { describe, expect, it } from 'vitest';
import { fx } from '../src/sim/fixed';
import { createRng, nextInt } from '../src/sim/rng';
import { BAR, BUFFER, FIGHTERS, Input, ROUND_FRAMES, TD_RECHARGE_FRAMES, THROW_HOLD, createMatch, frameData, saveMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { count, place, presses, ready, run } from './sim-helpers';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, METER } = Input;
const DALE = FIGHTERS.dale;
const ROX = FIGHTERS.rox;

/** Mashes random inputs, changing every few frames, from a seeded generator. */
function masher(seed: number) {
  const r = createRng(seed);
  let cur = 0;
  return () => {
    if (nextInt(r, 4) === 0) cur = nextInt(r, 1 << 13);
    return cur;
  };
}

describe('determinism and save/restore', () => {
  it('the same inputs give the same fight, and a restored save carries on identically', () => {
    const play = (m: MatchState, n: number, a: () => number, b: () => number) => run(m, n, () => a(), () => b());
    const m1 = ready();
    const m2 = ready();
    const [a1, b1, a2, b2] = [masher(1), masher(2), masher(1), masher(2)];
    play(m1, 1500, a1, b1);
    play(m2, 1500, a2, b2);
    expect(m2).toEqual(m1);

    const saved = saveMatch(m1);
    // Same continuation from the live match and from the restored copy.
    const seq = Array.from({ length: 1500 }, () => [a1(), b1()] as const);
    const ev1: SimEvent[] = [];
    const ev2: SimEvent[] = [];
    for (const [x, y] of seq) step(m1, x, y, ev1);
    for (const [x, y] of seq) step(saved, x, y, ev2);
    expect(saved).toEqual(m1);
    expect(ev2).toEqual(ev1);
  });

  it('random play always stays in bounds and the match always ends', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const m = createMatch({ p1: seed % 2 ? 'dale' : 'rox', p2: seed % 3 ? 'rox' : 'dale', seed });
      const a = masher(seed * 7);
      const b = masher(seed * 13);
      const ev: SimEvent[] = [];
      for (let t = 0; t < 30000 && m.phase !== 'over'; t++) {
        step(m, a(), b(), ev);
        for (const f of m.fighters) {
          expect(f.health).toBeGreaterThanOrEqual(0);
          expect(f.health).toBeLessThanOrEqual(f.maxHealth);
          expect(f.meter).toBeGreaterThanOrEqual(0);
          expect(f.meter).toBeLessThanOrEqual(3 * BAR);
          expect(Math.abs(f.x)).toBeLessThanOrEqual(fx(6));
          expect(f.y).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(f.x) && Number.isInteger(f.y)).toBe(true);
        }
      }
      expect(m.phase, `seed ${seed}`).toBe('over');
      expect(count(ev, 'matchOver')).toBe(1);
    }
    // Six whole matches checked every step: a few seconds here, longer on CI's runners.
  }, 30000);
});

describe('movement', () => {
  it('walks at the fighter speed, forward and back', () => {
    const m = ready();
    const x0 = m.fighters[0].x;
    run(m, 30, RIGHT);
    expect(m.fighters[0].x - x0).toBe(30 * DALE.walkFwd);
    const x1 = m.fighters[0].x;
    run(m, 30, LEFT);
    expect(x1 - m.fighters[0].x).toBe(30 * DALE.walkBack);
  });

  it('jumps and lands back on the ground', () => {
    const m = ready();
    run(m, 5, UP | RIGHT);
    expect(m.fighters[0].y).toBeGreaterThan(0);
    run(m, 60);
    expect(m.fighters[0].y).toBe(0);
    expect(m.fighters[0].mode).toBe('idle');
  });

  it('double-tapping forward dashes', () => {
    const m = ready();
    run(m, 6, presses({ 0: RIGHT, 3: RIGHT }));
    expect(m.fighters[0].mode).toBe('dash');
  });

  it('pushboxes keep the fighters apart', () => {
    const m = ready();
    run(m, 120, RIGHT, LEFT);
    const [a, b] = m.fighters;
    expect(b.x - a.x).toBeGreaterThanOrEqual(DALE.pushW + ROX.pushW);
  });
});

describe('blocking', () => {
  const blockTest = (attack: number, attacker: 'dale' | 'rox', hold: number) => {
    const m = attacker === 'dale' ? ready('dale', 'rox') : ready('rox', 'dale');
    place(m, -0.3, 0.3);
    return run(m, 40, presses({ 0: attack }), BLOCK | hold);
  };

  it('a low beats a standing block; crouching blocks it', () => {
    expect(count(blockTest(DOWN | FK, 'rox', 0), 'hit')).toBe(1);
    expect(count(blockTest(DOWN | FK, 'rox', DOWN), 'block')).toBe(1);
  });

  it('an overhead beats a crouching block; standing blocks it', () => {
    expect(count(blockTest(RIGHT | BP, 'dale', DOWN), 'hit')).toBe(1);
    expect(count(blockTest(RIGHT | BP, 'dale', 0), 'block')).toBe(1);
  });

  it('blocked specials chip, normals do not, and chip never takes the last point', () => {
    const m = ready();
    place(m, -2, 0);
    const ev = run(m, 80, presses({ 0: RIGHT | SPECIAL }), BLOCK);
    expect(count(ev, 'block')).toBe(1);
    expect(m.fighters[1].health).toBe(ROX.health - DALE.moves['Cold Front'].spawns[0].projectile.effect.chip!);

    const n = ready();
    place(n, -0.3, 0.3);
    run(n, 30, presses({ 0: FP }), BLOCK);
    expect(n.fighters[1].health).toBe(ROX.health);

    const c = ready();
    place(c, -2, 0);
    c.fighters[1].health = 3;
    run(c, 80, presses({ 0: RIGHT | SPECIAL }), BLOCK);
    expect(c.fighters[1].health).toBe(1);
  });
});

describe('inputs', () => {
  it('buffers a press for 8 frames, no longer', () => {
    // s.FP lasts 18 frames; FK doesn't chain from it, so it waits for the recovery to end.
    const total = DALE.moves['s.FP'].total;
    const early = (ago: number) => {
      const m = ready();
      place(m, -3, 3);
      const t = total - ago;
      run(m, total + 4, (_mm, s) => (s === 0 ? FP : s === t ? FK : 0));
      return { move: m.fighters[0].move };
    };
    expect(early(BUFFER).move).toBe('s.FK');
    expect(early(BUFFER + 3).move).toBe('');
  });

  it('direction + Special and the classic motions give the same specials', () => {
    const special = (seq: number[]) => {
      const m = ready();
      const ev = run(m, seq.length + 2, (_m, t) => seq[t] ?? 0);
      return ev.find((e) => e.type === 'special')?.move;
    };
    expect(special([RIGHT | SPECIAL])).toBe('Cold Front');
    expect(special([DOWN, DOWN | RIGHT, RIGHT, SPECIAL])).toBe('Cold Front');
    expect(special([SPECIAL])).toBe('Heat Lightning');
    expect(special([DOWN | SPECIAL])).toBe('Pressure Drop');
    expect(special([LEFT | SPECIAL])).toBe('Isobar Lasso');
    expect(special([DOWN, DOWN | LEFT, LEFT, SPECIAL])).toBe('Isobar Lasso');
  });

  it('holding a button does not repeat the attack', () => {
    const m = ready();
    place(m, -3, 3);
    run(m, 120, FP);
    expect(m.fighters[0].mode).toBe('idle');
  });
});

describe('throws', () => {
  it('a throw at close range lands after the hold; pressing Throw in time breaks it', () => {
    const m = ready();
    place(m, -0.3, 0.3);
    const ev = run(m, THROW_HOLD + 20, presses({ 0: THROW }));
    expect(count(ev, 'throw')).toBe(1);
    expect(m.fighters[1].health).toBe(ROX.health - DALE.moves.throw.throwData!.damage);

    const t = ready();
    place(t, -0.3, 0.3);
    const tev = run(t, THROW_HOLD + 20, presses({ 0: THROW }), presses({ 8: THROW }));
    expect(count(tev, 'throwTech')).toBe(1);
    expect(t.fighters[1].health).toBe(ROX.health);
  });

  it('a throw whiffs from range', () => {
    const m = ready();
    place(m, -1.5, 1.5);
    expect(count(run(m, 40, presses({ 0: THROW })), 'throw')).toBe(0);
  });
});

describe('specials', () => {
  it('Isobar Lasso pulls the opponent in on hit', () => {
    const m = ready();
    place(m, -1, 1);
    const ev = run(m, 30, presses({ 0: LEFT | SPECIAL }));
    expect(count(ev, 'hit')).toBe(1);
    expect(m.fighters[1].x - m.fighters[0].x).toBeLessThan(fx(1));
  });

  it('Grapevine crosses to the other side', () => {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    run(m, 40, presses({ 0: RIGHT | SPECIAL }));
    expect(m.fighters[0].x).toBeGreaterThan(m.fighters[1].x);
  });

  it('opposing projectiles cancel out', () => {
    const m = ready('dale', 'dale');
    const ev = run(m, 60, presses({ 0: RIGHT | SPECIAL }), presses({ 0: LEFT | SPECIAL }));
    expect(count(ev, 'projectileClash')).toBe(1);
    expect(count(ev, 'hit')).toBe(0);
  });
});

describe('signal meter', () => {
  it('Special again as a special starts boosts it for a bar', () => {
    const m = ready();
    m.fighters[0].meter = BAR;
    const ev = run(m, 6, presses({ 0: RIGHT | SPECIAL, 3: SPECIAL }));
    expect(count(ev, 'boost')).toBe(1);
    expect(m.fighters[0].move).toBe('Cold Front+');
    expect(m.fighters[0].meter).toBe(0);

    const poor = ready();
    run(poor, 6, presses({ 0: RIGHT | SPECIAL, 3: SPECIAL }));
    expect(poor.fighters[0].move).toBe('Cold Front');
  });

  // Rox's jab cancelled into Count of Eight (↓ Special) on hit: the special waits for the hit, so both
  // presses of a quick double tap come before it starts.
  const jabThenSpecial = (extra: Record<number, number>) => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    m.firstHit = true;
    m.fighters[0].meter = BAR;
    const ev = run(m, 40, presses({ 0: FP, 6: DOWN | SPECIAL, ...extra }));
    return { m, ev };
  };

  it('a quick double tap boosts a special cancelled out of a hit, though both taps come before it starts', () => {
    const { m, ev } = jabThenSpecial({ 8: SPECIAL });
    expect(count(ev, 'boost')).toBe(1);
    expect(m.fighters[0].move).toBe('Count of Eight+');
    expect(m.fighters[0].meter).toBeLessThan(BAR);
  });

  it('METER with the special boosts it (the touch meter), instead of Tape Skipping the normal', () => {
    const { ev } = jabThenSpecial({ 8: METER });
    expect(count(ev, 'boost')).toBe(1);
    expect(count(ev, 'tapeSkip')).toBe(0);
  });

  it('METER early in a special from neutral boosts it', () => {
    const m = ready();
    m.fighters[0].meter = BAR;
    const ev = run(m, 6, presses({ 0: RIGHT | SPECIAL, 2: METER }));
    expect(count(ev, 'boost')).toBe(1);
    expect(m.fighters[0].move).toBe('Cold Front+');
  });

  it('one press of Special never boosts, bar or no bar', () => {
    const { ev } = jabThenSpecial({});
    expect(count(ev, 'special')).toBe(1);
    expect(count(ev, 'boost')).toBe(0);
  });

  it('Tape Skip turns an unsafe blocked move into a dash, for a bar', () => {
    const m = ready();
    place(m, -0.3, 0.3);
    m.fighters[0].meter = BAR;
    const bk = DALE.moves['s.BK'];
    const ev = run(m, bk.startup + 12, presses({ 0: BK, [bk.startup + 8]: METER }), BLOCK);
    expect(count(ev, 'block')).toBe(1);
    expect(count(ev, 'tapeSkip')).toBe(1);
    // The bar is spent; what's left is the meter the block itself earned.
    expect(m.fighters[0].meter).toBe(Math.floor(bk.hits[0].damage / 4));
    expect(frameData(bk).onBlock!).toBeLessThan(-5);
    // Still in blockstun while the attacker is already dashing: no longer punishable.
    expect(m.fighters[0].mode).toBe('dash');
  });

  it('Cut Away breaks a combo for a full meter (all of it), once a round', () => {
    const breaker = (mm: MatchState) => (mm.fighters[1].mode === 'hitstun' ? METER : 0);
    const m = ready();
    place(m, -0.3, 0.3);
    const rox = m.fighters[1];
    // Two bars aren't enough.
    rox.meter = 2 * BAR;
    expect(count(run(m, 30, presses({ 0: FP }), breaker), 'cutAway')).toBe(0);
    run(m, 60);
    place(m, -0.3, 0.3);
    rox.meter = 3 * BAR;
    const hp = rox.health;
    const ev = run(m, 30, presses({ 0: FP }), breaker);
    expect(count(ev, 'cutAway')).toBe(1);
    expect(rox.meter).toBe(0);
    expect(rox.cutAwayUsed).toBe(true);
    // No health cost: just the jab.
    expect(rox.health).toBe(hp - 30);
    expect(['launched', 'down']).toContain(m.fighters[0].mode);
    // Once a round.
    run(m, 80);
    place(m, -0.3, 0.3);
    rox.meter = 3 * BAR;
    const again = run(m, 30, presses({ 0: FP }), breaker);
    expect(count(again, 'cutAway')).toBe(0);
  });
});

describe('Technical Difficulties', () => {
  it('below 30% health, Block + Special starts it; on a hit the cinematic deals 30%, once a match', () => {
    const m = ready('rox', 'dale');
    place(m, -0.3, 0.3);
    m.fighters[0].health = m.fighters[0].maxHealth >> 2;
    const ev = run(m, 200, presses({ 0: SPECIAL }, BLOCK));
    expect(count(ev, 'superStart')).toBe(1);
    expect(count(ev, 'superHit')).toBe(1);
    expect(m.fighters[1].health).toBe(DALE.health - Math.floor((DALE.health * 30) / 100));
    expect(m.fighters[0].tdUsed).toBe(true);

    run(m, 120);
    expect(count(run(m, 30, presses({ 0: SPECIAL }, BLOCK)), 'superStart')).toBe(0);
  });

  it('missed, it is not spent: it comes back after the recharge, and the HUD hears when', () => {
    const m = ready('rox', 'dale');
    place(m, -2.5, 2.5);
    const a = m.fighters[0];
    a.health = a.maxHealth >> 2;
    const ev = run(m, 60, presses({ 0: SPECIAL }, BLOCK));
    expect(count(ev, 'superStart')).toBe(1);
    expect(count(ev, 'superHit')).toBe(0);
    expect(a.tdUsed).toBe(false);
    expect(a.tdCooldown).toBeGreaterThan(0);
    // Still recharging: nothing.
    expect(count(run(m, 30, presses({ 0: SPECIAL }, BLOCK)), 'superStart')).toBe(0);
    const later = run(m, TD_RECHARGE_FRAMES);
    expect(later.find((e) => e.type === 'superReady')).toMatchObject({ player: 0 });
    expect(a.tdCooldown).toBe(0);
    expect(count(run(m, 10, presses({ 0: SPECIAL }, BLOCK)), 'superStart')).toBe(1);
  });

  it('blocked, it chips and recharges too', () => {
    const m = ready('rox', 'dale');
    place(m, -0.3, 0.3);
    m.fighters[0].health = m.fighters[0].maxHealth >> 2;
    const ev = run(m, 60, presses({ 0: SPECIAL }, BLOCK), BLOCK);
    expect(count(ev, 'block')).toBe(1);
    expect(m.fighters[0].tdUsed).toBe(false);
    expect(m.fighters[0].tdCooldown).toBeGreaterThan(0);
  });

  it('is not available above 30% health', () => {
    const m = ready();
    m.fighters[0].health = 400;
    expect(count(run(m, 10, presses({ 0: SPECIAL }, BLOCK)), 'superStart')).toBe(0);
  });

  it('the round clock stops during the cinematic', () => {
    const m = ready('rox', 'dale');
    place(m, -0.3, 0.3);
    m.fighters[0].health = m.fighters[0].maxHealth >> 2;
    run(m, 20, presses({ 0: SPECIAL }, BLOCK));
    expect(m.fighters[0].mode).toBe('cinematic');
    const t = m.timer;
    run(m, 30);
    expect(m.timer).toBe(t);
  });
});

describe('combos', () => {
  it('each further hit in a combo is scaled down', () => {
    const m = ready();
    place(m, -0.3, 0.3);
    // FP, FP (Five-Day Outlook) on hit: 30, then 35 at 90%.
    const ev = run(m, 40, presses({ 0: FP, 4: FP }));
    const dmg = ev.flatMap((e) => (e.type === 'hit' ? [e.damage] : []));
    expect(dmg).toEqual([30, 31]);
  });
});

describe('rounds', () => {
  const ko = (m: MatchState, loser: number) => {
    m.fighters[loser].health = 1;
    place(m, -0.3, 0.3);
    const attacker = loser === 1 ? presses({ 0: FP }) : 0;
    const victim = loser === 0 ? presses({ 0: FP }) : 0;
    return run(m, 20, attacker, victim);
  };
  const toNextFight = (m: MatchState) => {
    const ev: SimEvent[] = [];
    while (m.phase !== 'fight' && m.phase !== 'over' && m.phase !== 'stayTuned') step(m, 0, 0, ev);
    return ev;
  };

  it('a KO wins the round; the break changes the segment and resets the fighters', () => {
    const m = ready();
    const ev = ko(m, 1);
    expect(count(ev, 'ko')).toBe(1);
    expect(ev.find((e) => e.type === 'roundOver')).toMatchObject({ winner: 0, reason: 'ko' });
    m.fighters[0].meter = 1234;
    const next = toNextFight(m);
    expect(next.map((e) => e.type).filter((t) => t !== 'knockdown')).toEqual(['commercialBreak', 'segmentChange', 'roundStart', 'fight']);
    expect(m.round).toBe(2);
    expect(m.segment).toBe(1);
    expect(m.fighters[1].health).toBe(ROX.health);
    expect(m.fighters[0].wins).toBe(1);
    expect(m.fighters[0].meter).toBe(1234);
    expect(m.timer).toBe(ROUND_FRAMES);
  });

  it('two round wins take the match: Stay tuned, then match over', () => {
    const m = ready();
    ko(m, 1);
    toNextFight(m);
    ko(m, 1);
    const ev = toNextFight(m);
    expect(ev.find((e) => e.type === 'stayTuned')).toMatchObject({ winner: 0 });
    const end = run(m, 300);
    expect(end.find((e) => e.type === 'matchOver')).toMatchObject({ winner: 0 });
    expect(m.phase).toBe('over');
  });

  it('time out goes to the higher health', () => {
    const m = ready();
    m.fighters[0].health = 500;
    m.timer = 2;
    const ev = run(m, 3);
    expect(ev.find((e) => e.type === 'roundOver')).toMatchObject({ winner: 1, reason: 'time' });
  });

  it('a drawn round 3 goes to a round 4 on segment 3; studio rules stay on segment 1', () => {
    const m = ready();
    m.round = 3;
    m.segment = 2;
    m.fighters[0].wins = 1;
    m.fighters[1].wins = 1;
    // The same share of health each: a draw on time.
    m.fighters[0].health = DALE.health / 2;
    m.fighters[1].health = ROX.health / 2;
    m.timer = 1;
    run(m, 2);
    expect(m.roundWinner).toBe(-1);
    toNextFight(m);
    expect(m.round).toBe(4);
    expect(m.segment).toBe(2);

    const s = ready('dale', 'rox', { studio: true });
    ko(s, 1);
    toNextFight(s);
    expect(s.segment).toBe(0);
  });
});

describe('inputs are the only way in', () => {
  it('nothing moves during the intro whatever is pressed', () => {
    const m = createMatch({ p1: 'dale', p2: 'rox' });
    const before = saveMatch(m);
    run(m, 10, RIGHT | FP, LEFT | FK);
    expect(m.fighters[0].x).toBe(before.fighters[0].x);
    expect(m.fighters[0].mode).toBe('idle');
  });
});
