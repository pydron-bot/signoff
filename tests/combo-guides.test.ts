// The move list's combo guides still work: each one is a single unbroken
// combo where every press brings out a move, within the damage ceilings, and
// forgiving enough for a person (every press after the first still works a
// couple of frames early or late). Rerun `npm run combos:guides` when this
// fails after a change to the moves. Also the showcase session that plays them.
import { describe, expect, it } from 'vitest';
import { DAMAGE_CEILING, GUIDE_DUMMY, GUIDE_REST, guides, runGuide, type ComboGuide } from '../src/game/comboGuides';
import { Session } from '../src/game/session';
import { FIGHTERS, type SimEvent } from '../src/sim';

/** Moves a press and everything after it by `shift` frames: a player times each press off what they see. */
function shifted(g: ComboGuide, k: number, shift: number): ComboGuide {
  return { ...g, presses: g.presses.map(([t, p], i) => [i >= k ? t + shift : t, p] as const) };
}

describe('combo guides', () => {
  for (const f of Object.values(FIGHTERS)) {
    describe(f.name, () => {
      it('has a meterless guide first', () => {
        expect(guides(f.id).length).toBeGreaterThanOrEqual(1);
        expect(guides(f.id)[0].bars).toBe(0);
      });
      for (const g of guides(f.id)) {
        it(`${g.name}: one combo, every press used, under the ceiling`, () => {
          const r = runGuide(f.id, g);
          expect(r.unbroken).toBe(true);
          expect(r.hits).toBeGreaterThanOrEqual(2);
          for (const s of r.steps) expect(s.move, `${s.input} at ${s.at} starts a move`).not.toBe('');
          expect(r.pct).toBeLessThanOrEqual(DAMAGE_CEILING[g.bars]);
        });
        it(`${g.name}: every press after the first works 2 frames early or late`, () => {
          const want = runGuide(f.id, g).hits;
          g.presses.forEach(([, p], k) => {
            // The opener sets the timing, and a boost's second Special moves with its first.
            if (k === 0 || (p === 'SP' && g.presses[k][0] - g.presses[k - 1][0] <= 3)) return;
            for (const d of [-2, 2]) expect(runGuide(f.id, shifted(g, k, d)).hits, `press ${k + 1} (${p}) moved ${d}`).toBe(want);
          });
        });
      }
    });
  }
});

describe('showcase session', () => {
  it('plays the guide against the standing dummy, then plays it again', () => {
    const g = guides('rox')[0];
    const run = runGuide('rox', g);
    const s = new Session({ mode: 'showcase', p1: 'rox', p2: GUIDE_DUMMY, level: 'normal', seed: 1, studio: true, guide: 0 });
    const ev: SimEvent[] = [];
    const loop = run.end + GUIDE_REST + 2;
    for (let t = 0; t < 2 * loop; t++) s.tick(0, 0, ev);
    const hits = ev.filter((e) => e.type === 'hit' && e.attacker === 0);
    // The combo twice over, and the step the caption shows moves with it.
    expect(hits.length).toBeGreaterThanOrEqual(2 * run.hits);
    expect(s.guideStep).toBeGreaterThanOrEqual(-1);
    expect(s.match.phase).toBe('fight');
  });
});
