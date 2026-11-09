// Arcade: everyone else in turn, harder each fight, continues on a loss,
// and an ending for every fighter.
import { describe, expect, it } from 'vitest';
import { CONTINUES, ENDINGS, afterMatch, createLadder, levelFor, opponent, schedule, stageFor } from '../src/game/arcade';
import { FIGHTERS, STAGES } from '../src/sim';

describe('arcade', () => {
  it('runs through everyone else once, getting harder', () => {
    for (const id of Object.keys(FIGHTERS)) {
      let l = createLadder(id);
      expect(l.opponents.sort()).toEqual(Object.keys(FIGHTERS).filter((x) => x !== id).sort());
      l = createLadder(id);
      const levels = [];
      const seen = [];
      while (l.state === 'fight') {
        levels.push(levelFor(l));
        seen.push(opponent(l));
        l = afterMatch(l, true);
      }
      expect(l.state).toBe('won');
      expect(new Set(seen).size).toBe(Object.keys(FIGHTERS).length - 1);
      expect(levels[0]).toBe('easy');
      expect(levels[levels.length - 1]).toBe('hard');
    }
  });

  it('a loss spends a continue and replays the same fight; out of continues, it is over', () => {
    let l = createLadder('dale');
    const first = opponent(l);
    for (let k = 0; k < CONTINUES; k++) {
      l = afterMatch(l, false);
      expect(l.state).toBe('fight');
      expect(opponent(l)).toBe(first);
    }
    expect(l.continues).toBe(0);
    expect(afterMatch(l, false).state).toBe('over');
  });

  it('the listings mark the next show and strike off the ones done', () => {
    const l = afterMatch(createLadder('rox'), true);
    const s = schedule(l);
    expect(s[0].done).toBe(true);
    expect(s[1].next).toBe(true);
    expect(s.filter((x) => x.next).length).toBe(1);
  });

  it('each fight is on the opponent\'s own show where it has a stage', () => {
    const l = createLadder('dale');
    const stages = l.opponents.map((_, at) => stageFor({ ...l, at }));
    expect(stages[l.opponents.indexOf('rox')]).toBe('burn');
    for (const s of stages) expect(STAGES[s]).toBeDefined();
    expect(stageFor({ ...createLadder('rox'), at: 0 })).toBe('weather');
  });

  it('every fighter has an ending', () => {
    for (const id of Object.keys(FIGHTERS)) {
      expect(ENDINGS[id]?.title.length).toBeGreaterThan(0);
      expect(ENDINGS[id].lines.length).toBeGreaterThanOrEqual(3);
    }
  });
});
