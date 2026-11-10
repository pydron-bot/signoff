// Every lesson can be cleared: the presses it ships with clear it, for
// every fighter it's offered to; and it isn't cleared by doing nothing.
import { describe, expect, it } from 'vitest';
import { LESSONS, LessonRun, hold, lesson, lessonLine, scriptInput, type Hold, type Lesson } from '../src/game/lessons';
import { Session } from '../src/game/session';
import { FIGHTERS, type SimEvent } from '../src/sim';

/** Plays one attempt of a lesson with these presses; its verdict. */
function attempt(l: Lesson, fighter: string, presses: readonly Hold[]) {
  const s = new Session({ mode: 'training', p1: fighter, p2: 'rox', level: 'normal', seed: 1, lesson: l.id });
  const ev: SimEvent[] = [];
  for (let t = 1; t <= l.time + 1 && s.lesson!.result === null; t++) s.tick(scriptInput(presses, t, s.match.fighters[0].facing), 0, ev);
  return { s, result: s.lesson!.result };
}

describe('lessons', () => {
  it('about twelve, with ids that are unique and captions to read', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(l.caption.length).toBeGreaterThan(10);
      expect(lesson(l.id)).toBe(l);
    }
  });

  for (const l of LESSONS) {
    const fighters = l.p1 ? [l.p1] : Object.keys(FIGHTERS);
    describe(l.name, () => {
      for (const f of fighters) {
        it(`${f}: its own presses clear it`, () => {
          expect(attempt(l, f, l.solution(f)).result).toBe('pass');
        });
      }
      it('doing nothing does not', () => {
        expect(attempt(l, fighters[0], []).result).not.toBe('pass');
      });
    });
  }

  it('flawless block: Block held from the start is only a block', () => {
    const r = attempt(lesson('flawless')!, 'dale', [hold(1, 'BL', 70)]).result;
    expect(r).not.toBe('pass');
    expect(r).toMatch(/early/);
  });

  it('after an attempt is decided, it starts again by itself', () => {
    const l = lesson('td')!;
    const { s } = attempt(l, 'gus', l.solution('gus'));
    expect(s.lesson!.passes).toBe(1);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 400 && s.lesson!.result !== null; t++) s.tick(0, 0, ev);
    expect(s.lesson!.result).toBeNull();
    expect(s.match.fighters[0].health).toBe(Math.floor(s.match.fighters[0].maxHealth / 4));
  });

  it('the Sign-Off plays out and comes back round with no results screen', () => {
    const l = lesson('signoff')!;
    const { s } = attempt(l, 'dale', l.solution('dale'));
    const ev: SimEvent[] = [];
    for (let t = 0; t < 1200 && s.lesson!.result !== null; t++) s.tick(0, 0, ev);
    expect(ev.some((e) => e.type === 'matchOver')).toBe(false);
    expect(s.match.phase).toBe('stayTuned');
  });

  it('holds still before each attempt when asked to', () => {
    const l = lesson('getup')!;
    const s = new Session({ mode: 'training', p1: 'dale', p2: 'rox', level: 'normal', seed: 1, lesson: l.id });
    s.lesson!.lead = 30;
    s.lesson!.restart();
    const ev: SimEvent[] = [];
    for (let t = 0; t < 30; t++) s.tick(0, 0, ev);
    expect(s.match.fighters[0].mode).toBe('down');
    expect(s.lesson!.attempt.t).toBe(0);
    for (let t = 1; t <= l.time + 1 && s.lesson!.result === null; t++) s.tick(scriptInput(l.solution('dale'), t, 1), 0, ev);
    expect(s.lesson!.result).toBe('pass');
  });

  it('the caption says how it went', () => {
    const run = new LessonRun(lesson('block')!);
    expect(lessonLine(run)).toContain('BLOCK HIGH, THEN LOW');
    run.result = 'pass';
    expect(lessonLine(run)).toContain('CLEARED');
  });
});
