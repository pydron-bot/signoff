import { describe, expect, it } from 'vitest';
import { Cpu } from '../src/ai/cpu';
import { FixedStep } from '../src/game/loop';
import { Session } from '../src/game/session';
import { DALE } from '../src/sim/fighters/dale';
import { Input, ROUND_FRAMES, createMatch, frameData, step, type SimEvent } from '../src/sim';
import { place } from './sim-helpers';

describe('CPU', () => {
  it('two CPUs play a whole match to the end, the same way every time from a seed', () => {
    const play = (seed: number) => {
      const m = createMatch({ p1: 'dale', p2: 'rox', seed });
      const a = new Cpu(0, 'hard', seed);
      const b = new Cpu(1, 'normal', seed + 1);
      const ev: SimEvent[] = [];
      for (let t = 0; t < 40000 && m.phase !== 'over'; t++) step(m, a.next(m), b.next(m), ev);
      return { m, ev };
    };
    const one = play(3);
    expect(one.m.phase).toBe('over');
    expect(one.ev.filter((e) => e.type === 'hit').length).toBeGreaterThan(10);
    expect(one.ev.filter((e) => e.type === 'block').length).toBeGreaterThan(0);
    expect(play(3).m).toEqual(one.m);
  });

  it('easy loses to hard more often than not', () => {
    let hardWins = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const m = createMatch({ p1: 'rox', p2: 'rox', seed });
      const hard = new Cpu(0, 'hard', seed);
      const easy = new Cpu(1, 'easy', seed * 31);
      const ev: SimEvent[] = [];
      for (let t = 0; t < 40000 && m.phase !== 'over'; t++) step(m, hard.next(m), easy.next(m), ev);
      if (m.matchWinner === 0) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(4);
  });
});

describe('training session', () => {
  it('starts in the fight with no clock, and shows frame advantage', () => {
    const s = new Session({ mode: 'training', p1: 'dale', p2: 'rox', level: 'normal', seed: 1 });
    expect(s.match.phase).toBe('fight');
    s.dummy = 'block';
    place(s.match, -0.3, 0.3);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 60; t++) s.tick(t === 0 ? Input.BK : 0, 0, ev);
    expect(s.match.timer).toBe(ROUND_FRAMES);
    expect(s.adv.last).toMatchObject({ kind: 'block', move: 's.BK', frames: frameData(DALE.moves['s.BK']).onBlock });
  });

  it('resets instead of ending the round, and refills health at rest', () => {
    const s = new Session({ mode: 'training', p1: 'dale', p2: 'rox', level: 'normal', seed: 1 });
    place(s.match, -0.3, 0.3);
    s.match.fighters[1].health = 1;
    const ev: SimEvent[] = [];
    for (let t = 0; t < 30; t++) s.tick(t === 0 ? Input.FP : 0, 0, ev);
    expect(s.match.phase).toBe('fight');
    s.match.fighters[1].health = 500;
    for (let t = 0; t < 60; t++) s.tick(0, 0, ev);
    expect(s.match.fighters[1].health).toBe(1000);
  });
});

describe('fixed step', () => {
  it('runs 60 steps a second at 120 Hz and drops time after a stall', () => {
    const f = new FixedStep();
    let n = 0;
    for (let i = 0; i <= 120; i++) n += f.advance(i * (1000 / 120));
    expect(n).toBeGreaterThanOrEqual(59);
    expect(n).toBeLessThanOrEqual(61);
    expect(f.advance(120 * (1000 / 120) + 5000)).toBe(4);
  });
});
