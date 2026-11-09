// The defender's options: a flawless block (Block pressed just before the
// hit), a delayed getup (hold Down as a knockdown ends), a reversal (a move
// straight off the floor), and the punish (a hit on a move's recovery).
import { describe, expect, it } from 'vitest';
import { DELAYED_GETUP, DOWN_FRAMES, FIGHTERS, FLAWLESS_BLOCKSTUN_CUT, GETUP_FRAMES, Input, PUNISH_DAMAGE_PCT, step, type SimEvent } from '../src/sim';
import { toFloat } from '../src/sim/fixed';
import { count, place, presses, ready, run } from './sim-helpers';

const { DOWN, BLOCK, SPECIAL, FP, BK, RIGHT } = Input;
const ROX = FIGHTERS.rox;

describe('flawless block', () => {
  /** Rox jabs Dale; Dale presses Block `before` frames ahead of the jab's first active frame (or holds it all along). */
  function jabBlocked(before: number | 'held') {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const hitAt = ROX.moves['s.FP'].startup - 1;
    const hold = (t: number) => (before === 'held' || t >= hitAt - before ? BLOCK : 0);
    const ev: SimEvent[] = [];
    let stun = 0;
    for (let t = 0; t < 30; t++) {
      const from = ev.length;
      step(m, t === 0 ? FP : 0, hold(t), ev);
      if (ev.slice(from).some((e) => e.type === 'block')) stun = m.fighters[1].timer;
    }
    return { ev, stun };
  }

  it('Block pressed just before the hit is flawless, and leaves the blocker free sooner', () => {
    const flawless = jabBlocked(2);
    const held = jabBlocked('held');
    expect(count(flawless.ev, 'flawless')).toBe(1);
    expect(count(held.ev, 'flawless')).toBe(0);
    expect(count(held.ev, 'block')).toBe(1);
    expect(held.stun - flawless.stun).toBe(FLAWLESS_BLOCKSTUN_CUT);
  });

  it('a flawless block takes no chip from a special', () => {
    const chip = (before: number | 'held') => {
      const m = ready('rox', 'dale');
      place(m, -0.6, 0.6);
      const first = ROX.moves['Count of Eight'].startup - 1;
      const ev = run(m, 60, presses({ 0: DOWN | SPECIAL }), (_m, t) => (before === 'held' || t >= first - before ? BLOCK : 0));
      return { health: m.fighters[1].health, flawless: count(ev, 'flawless') };
    };
    const f = chip(1);
    expect(f.flawless).toBeGreaterThanOrEqual(1);
    expect(f.health).toBeGreaterThan(chip('held').health);
  });
});

describe('getting up', () => {
  /** Rox sweeps Dale, then walks up to stand over him; Dale does `def` from then on. Returns the frames until Dale is free, and the events. */
  function sweep(def: (t: number) => number) {
    const m = ready('rox', 'dale');
    place(m, -0.5, 0.5);
    const ev: SimEvent[] = [];
    let downAt = -1;
    let freeAt = -1;
    for (let t = 0; t < 200; t++) {
      const [a, d] = m.fighters;
      const walk = downAt >= 0 && a.mode !== 'move' && toFloat(d.x - a.x) > 0.7 ? RIGHT : 0;
      step(m, t === 0 ? DOWN | BK : walk, downAt >= 0 ? def(t - downAt) : 0, ev);
      if (downAt < 0 && d.mode === 'down') downAt = t;
      if (downAt >= 0 && freeAt < 0 && (d.mode === 'idle' || d.mode === 'crouch' || d.mode === 'move')) freeAt = t;
    }
    return { ev, frames: freeAt - downAt };
  }

  it('holding Down as the knockdown ends stays down a little longer, once', () => {
    const normal = sweep(() => 0);
    const delayed = sweep(() => DOWN);
    expect(count(delayed.ev, 'delayedGetup')).toBe(1);
    expect(delayed.frames - normal.frames).toBe(DELAYED_GETUP);
    expect(normal.frames).toBeGreaterThanOrEqual(DOWN_FRAMES + GETUP_FRAMES - 2);
  });

  it('a move pressed while getting up comes out straight away, and is a reversal when it hits', () => {
    // Dale mashes his jab from the moment he's down; Rox stands over him.
    const r = sweep((t) => (t % 4 === 0 ? FP : 0));
    expect(count(r.ev, 'reversal')).toBe(1);
  });
});

describe('punish', () => {
  it("a hit on a move's recovery is a punish: more damage and meter", () => {
    // Rox whiffs her sweep from range (it slides in, but not far enough); Dale's long kick catches her in its recovery.
    const m = ready('dale', 'rox');
    place(m, -1.0, 1.0);
    const sweep = ROX.moves['c.BK'];
    const kick = FIGHTERS.dale.moves['s.BK'];
    let kicked = false;
    const ev = run(
      m,
      70,
      (mm) => {
        const d = mm.fighters[1];
        if (kicked || d.mode !== 'move' || d.moveFrame <= sweep.lastActive) return 0;
        kicked = true;
        return BK;
      },
      presses({ 0: DOWN | BK }),
    );
    const hit = ev.find((e) => e.type === 'hit' && e.attacker === 0);
    expect(count(ev.filter((e) => e.type === 'hit' && e.attacker === 1), 'hit')).toBe(0);
    expect(count(ev, 'punish')).toBe(1);
    expect(hit && hit.type === 'hit' && hit.damage).toBe(Math.floor((kick.hits[0].damage * PUNISH_DAMAGE_PCT) / 100));
  });

  it('a hit on someone standing still is not', () => {
    const m = ready('rox', 'dale');
    place(m, -0.4, 0.4);
    const ev = run(m, 30, presses({ 0: FP }));
    expect(count(ev, 'hit')).toBe(1);
    expect(count(ev, 'punish')).toBe(0);
  });
});
