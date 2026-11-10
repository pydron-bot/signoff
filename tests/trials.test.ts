// Trials: every combo guide is one, and its own presses clear it in a
// training session (as the showcase plays them). A drop says which step and
// whether the press was early or late.
import { beforeEach, describe, expect, it } from 'vitest';
import { guideInput, guides, type ComboGuide } from '../src/game/comboGuides';
import { Cleared } from '../src/game/cleared';
import { Session } from '../src/game/session';
import { TRIALS_KEY, TrialTracker, trial, trialCount, trialId, trialLine } from '../src/game/trials';
import { FIGHTERS, Input, type SimEvent } from '../src/sim';

/** Plays presses into a trial session for P1; the session after `extra` more quiet steps. */
function play(fighter: string, k: number, presses: ComboGuide['presses'], steps: number): Session {
  const s = new Session({ mode: 'training', p1: fighter, p2: 'rox', level: 'normal', seed: 1, guide: k, trial: true });
  const g: ComboGuide = { name: '', bars: 0, presses };
  const ev: SimEvent[] = [];
  for (let t = 0; t < steps && s.tracker!.state !== 'cleared' && s.tracker!.state !== 'dropped'; t++) {
    s.tick(guideInput(g, t, s.match.fighters[0].facing), 0, ev);
    ev.length = 0;
  }
  return s;
}

const last = (g: ComboGuide) => g.presses[g.presses.length - 1][0];

describe('trials', () => {
  for (const f of Object.keys(FIGHTERS)) {
    guides(f).forEach((g, k) => {
      it(`${f} · ${g.name}: the guide's own presses clear it`, () => {
        const tr = trial(f, k)!;
        expect(tr.conns.length).toBeGreaterThanOrEqual(2);
        // Every connection is a later step than the one before.
        for (let i = 1; i < tr.conns.length; i++) expect(tr.conns[i].step).toBeGreaterThan(tr.conns[i - 1].step);
        const s = play(f, k, g.presses, last(g) + 200);
        expect(s.tracker!.state, trialLine(s.tracker!)).toBe('cleared');
      });
    });
  }

  it('leaving out a press drops it at that step', () => {
    const g = guides('dale')[0];
    const tr = trial('dale', 0)!;
    const k = tr.conns[1].step;
    const s = play('dale', 0, g.presses.filter((_, i) => i !== k), last(g) + 200);
    expect(s.tracker!.state).toBe('dropped');
    expect(s.tracker!.dropStep).toBe(k);
    expect(s.tracker!.miss).toBe('late');
  });

  it('a press well after the window is late, one well before it is early', () => {
    const g = guides('rox')[0];
    const tr = trial('rox', 0)!;
    const k = tr.conns[2].step;
    const at = g.presses[k][0];
    const moved = (d: number) => g.presses.map(([t, p], i) => [i === k ? t + d : t, p] as const);
    const late = play('rox', 0, moved(40), last(g) + 200).tracker!;
    expect(late.state).toBe('dropped');
    expect(late.dropStep).toBe(k);
    expect(late.miss).toBe('late');
    // Straight after the press before it: long before the cancel window, so it runs out of the buffer.
    const early = play('rox', 0, moved(g.presses[k - 1][0] + 1 - at), last(g) + 200).tracker!;
    expect(early.state).toBe('dropped');
    expect(early.miss).toBe('early');
  });

  it('the wrong move landing drops it', () => {
    const tr = new TrialTracker(trial('dale', 0)!);
    const s = new Session({ mode: 'training', p1: 'dale', p2: 'rox', level: 'normal', seed: 1, guide: 0, trial: true });
    const hit = (move: string, combo: number) => ({ type: 'hit', attacker: 0, defender: 1, move, damage: 10, height: 'mid', counter: false, combo, weight: 0, dir: 1, x: 0, y: 0, crouched: false }) as const;
    s.match.fighters[1].combo = 1;
    tr.update(s.match, [hit(tr.trial.conns[0].id, 1)], 0, Input.FP);
    expect(tr.state).toBe('going');
    tr.update(s.match, [hit('c.BK', 2)], 0, 0);
    expect(tr.state).toBe('dropped');
    expect(tr.miss).toBe('wrong');
    expect(trialLine(tr)).toMatch(/wrong move/);
  });

  describe('cleared trials', () => {
    beforeEach(() => {
      const store = new Map<string, string>();
      globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage;
    });

    it('are kept under signoff.trials and counted per fighter', () => {
      const c = new Cleared(TRIALS_KEY);
      expect(trialCount(c, 'dale')).toEqual([0, guides('dale').length]);
      expect(c.mark(trialId('dale', guides('dale')[0].name))).toBe(true);
      expect(c.mark(trialId('dale', guides('dale')[0].name))).toBe(false);
      expect(trialCount(new Cleared(TRIALS_KEY), 'dale')[0]).toBe(1);
      expect(trialCount(c, 'rox')[0]).toBe(0);
    });
  });
});
