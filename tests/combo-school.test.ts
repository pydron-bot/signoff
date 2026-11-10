// Combo School: every guide taught a part at a time, each part a trial of
// its own that the guide's own presses clear, with how each step is done.
import { describe, expect, it } from 'vitest';
import { REPS, coaching, courses, framesText, partEnds, partGuide, partTrial } from '../src/game/comboSchool';
import { GUIDE_DUMMY, guideInput, guides, runGuide } from '../src/game/comboGuides';
import { Session } from '../src/game/session';
import { FIGHTERS, type SimEvent } from '../src/sim';

describe('parts', () => {
  it('three moves, then three more, to the whole combo; never a last part of one move', () => {
    expect(partEnds(1)).toEqual([1]);
    expect(partEnds(3)).toEqual([3]);
    expect(partEnds(4)).toEqual([4]);
    expect(partEnds(5)).toEqual([3, 5]);
    expect(partEnds(8)).toEqual([3, 6, 8]);
    expect(partEnds(10)).toEqual([3, 6, 10]);
  });
});

describe.each(Object.values(FIGHTERS).map((f) => [f.name, f.id] as const))('%s', (_n, id) => {
  const cs = courses(id);

  it('a course for every guide, easiest first, each part landing exactly its moves', () => {
    expect(cs.map((c) => c.guide).sort((a, b) => a - b)).toEqual(guides(id).map((_, k) => k));
    for (const c of cs) {
      c.parts.forEach((moves, p) => {
        const t = partTrial(c, p);
        expect(t.conns.length, `${c.name} part ${p + 1}`).toBe(moves);
        // The part replays as one unbroken combo.
        expect(runGuide(id, partGuide(id, c.guide, moves)).unbroken).toBe(true);
      });
      // The last part is the whole guide.
      expect(partGuide(id, c.guide, c.parts[c.parts.length - 1])).toBe(guides(id)[c.guide]);
    }
  });

  it('every step has a way it is done and a tip; jumps out of a launcher are jump cancels', () => {
    for (const c of cs) {
      const t = partTrial(c, c.parts.length - 1);
      const co = coaching(t);
      expect(co).toHaveLength(t.steps.length);
      expect(co[0].how === 'opener' || co[0].how === 'jump').toBe(true);
      t.steps.forEach((s, k) => {
        expect(co[k].tip.length, `${c.name} step ${k}`).toBeGreaterThan(0);
        if (s.move === 'Jump Cancel') expect(co[k].how).toBe('jumpCancel');
        // After an air string's spike, the next hit catches the bounce.
        const prev = t.steps.slice(0, k).reverse().find((x) => x.id);
        if (k > 0 && s.id && prev && FIGHTERS[id].moves[prev.id].stance === 'air' && FIGHTERS[id].moves[prev.id].hits.some((h) => h.groundBounce) && FIGHTERS[id].moves[s.id].stance !== 'air') expect(co[k].how).toBe('bounce');
      });
    }
  });

  it(`the guide's own presses clear each part, ${REPS} times over, in a session`, () => {
    const c = cs[0];
    const g = partGuide(id, c.guide, c.parts[0]);
    const s = new Session({ mode: 'training', p1: id, p2: GUIDE_DUMMY, level: 'normal', seed: 1, studio: true, guide: c.guide, guideData: g, trial: true });
    const ev: SimEvent[] = [];
    let t = 0;
    let resets = s.resets;
    for (let n = 0; n < 2000 && s.tracker!.clears < REPS; n++) {
      // Each attempt starts from the reset: the guide's presses from its first step.
      if (s.resets !== resets) {
        resets = s.resets;
        t = 0;
      }
      ev.length = 0;
      s.tick(guideInput(g, t, s.match.fighters[0].facing), 0, ev);
      t++;
    }
    expect(s.tracker!.clears).toBe(REPS);
  });
});

it('frames read early or late', () => {
  expect(framesText(3)).toBe('3 frames late');
  expect(framesText(-1)).toBe('1 frame early');
});
