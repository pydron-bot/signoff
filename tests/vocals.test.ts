// The fighters' voices: when they make a sound (src/audio/vocals.ts), and
// that every fighter has a voice (src/audio/voice.ts).
import { describe, expect, it } from 'vitest';
import { VOCAL_COOLDOWN, VocalDirector, type VocalCue } from '../src/audio/vocals';
import { VOICES } from '../src/audio/voice';
import { FIGHTERS, Input, step, type HitWeight, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { place, ready } from './sim-helpers';

function hit(weight: HitWeight, defender = 1): SimEvent {
  return { type: 'hit', attacker: 1 - defender, defender, move: 's.FP', damage: 40, height: 'mid', counter: false, combo: 1, weight, dir: 1, x: 0, y: fx(1) };
}

/** A director whose dice always come up `roll`. */
function director(roll: number) {
  const d = new VocalDirector(() => roll);
  const m = ready('rox', 'dale');
  const out: VocalCue[] = [];
  return { d, m, say: (ev: SimEvent[]) => [...d.step(m, ev, out).map((c) => ({ ...c }))] };
}

describe('when fighters cry out', () => {
  it('a heavy hit always gets a cry; a light one only sometimes', () => {
    expect(director(0.99).say([hit(2)])).toEqual([{ player: 1, kind: 'pain', size: 0.8 }]);
    expect(director(0.99).say([hit(0)])).toEqual([]);
    expect(director(0.1).say([hit(0)])).toHaveLength(1);
  });

  it('keeps a combo from becoming a wall of grunts, but heavy hits and KOs get through', () => {
    const { d, m, say } = director(0);
    expect(say([hit(1)])).toHaveLength(1);
    expect(say([hit(1)])).toEqual([]);
    expect(say([hit(3)])).toEqual([{ player: 1, kind: 'pain', size: 1 }]);
    for (let i = 0; i < VOCAL_COOLDOWN; i++) d.step(m, [], []);
    expect(say([hit(1)])).toHaveLength(1);
  });

  it('a KO screams, over the cry of the hit that caused it', () => {
    expect(director(0).say([hit(3), { type: 'ko', player: 1 }])).toEqual([{ player: 1, kind: 'scream', size: 1 }]);
  });

  it('every special shouts, and a throw', () => {
    expect(director(0.99).say([{ type: 'special', player: 0, move: 'Count of Eight' }])).toEqual([{ player: 0, kind: 'shout', size: 0.8 }]);
    expect(director(0.99).say([{ type: 'throw', thrower: 1, move: 'throw' }])[0]).toMatchObject({ player: 1, kind: 'shout' });
  });

  it('a heavy normal gets one effort as it starts, not one a step while it freezes in hitstop', () => {
    const d = new VocalDirector(() => 0);
    const m = ready('hollis', 'dale');
    place(m, -0.4, 0.4);
    const ev: SimEvent[] = [];
    const out: VocalCue[] = [];
    let efforts = 0;
    for (let t = 0; t < 40; t++) {
      ev.length = 0;
      step(m, t === 0 ? Input.BK : 0, 0, ev);
      efforts += d.step(m, ev, out).filter((c) => c.kind === 'effort' && c.player === 0).length;
    }
    expect(efforts).toBe(1);
  });
});

describe('voices', () => {
  it('every fighter has one', () => {
    for (const id of Object.keys(FIGHTERS)) expect(VOICES[id], id).toBeDefined();
  });
});
