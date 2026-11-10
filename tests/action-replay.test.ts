import { describe, expect, it } from 'vitest';
import { ActionReplay, REPLAY_AFTER, REPLAY_BEFORE, ReplayTape } from '../src/game/actionReplay';
import { Session } from '../src/game/session';
import { saveMatch, type MatchState, type SimEvent } from '../src/sim';

/** A watched match, recorded on a tape; `capture` saves the live state after that step. */
function watch(seed: number, capture = -1): { tape: ReplayTape; steps: number; koAt: number; captured: MatchState | null } {
  const s = new Session({ mode: 'watch', p1: 'gus', p2: 'hollis', level: 'hard', level1: 'normal', seed });
  const tape = new ReplayTape();
  const ev: SimEvent[] = [];
  let steps = 0;
  let koAt = -1;
  let captured: MatchState | null = null;
  while (s.match.phase !== 'over' && steps < 40000) {
    const finisher = s.match.phase === 'finisher';
    tape.before(s.match);
    s.tick(0, 0, ev);
    tape.after(s.inputs[0], s.inputs[1], ev);
    if (!finisher && ev.some((e) => e.type === 'ko')) koAt = steps;
    if (steps === capture) captured = saveMatch(s.match);
    ev.length = 0;
    steps++;
  }
  return { tape, steps, koAt, captured };
}

describe('the action replay', () => {
  it('plays the deciding blow back exactly as it happened', () => {
    const first = watch(5);
    expect(first.koAt).toBeGreaterThan(REPLAY_BEFORE);
    const to = Math.min(first.steps, first.koAt + REPLAY_AFTER + 1);
    // The live match's state at the end of the clip.
    const live = watch(5, to - 1).captured!;
    const clip = first.tape.clip()!;
    expect(clip).not.toBeNull();
    const r = new ActionReplay(clip);
    const ev: SimEvent[] = [];
    let shown = 0;
    let kos = 0;
    while (r.tick(ev)) {
      kos += ev.filter((e) => e.type === 'ko').length;
      ev.length = 0;
      shown++;
    }
    expect(shown).toBe(to - (first.koAt - REPLAY_BEFORE));
    expect(kos).toBeGreaterThanOrEqual(1);
    expect(r.match).toEqual(live);
  });

  it('has no clip without a KO', () => {
    const tape = new ReplayTape();
    const s = new Session({ mode: 'watch', p1: 'gus', p2: 'hollis', level: 'easy', seed: 1 });
    const ev: SimEvent[] = [];
    for (let i = 0; i < 300; i++) {
      tape.before(s.match);
      s.tick(0, 0, ev);
      tape.after(s.inputs[0], s.inputs[1], ev);
      ev.length = 0;
    }
    expect(tape.clip()).toBeNull();
  });
});
