// The cold open's lines: every fighter has some, every pairing gets an
// exchange, and the pick follows the seed.
import { describe, expect, it } from 'vitest';
import { banter, lineSeconds, linesOf } from '../src/game/banter';
import { FIGHTERS } from '../src/sim';

const ids = Object.keys(FIGHTERS);

describe('banter', () => {
  it('every fighter has openers and replies of their own', () => {
    for (const id of ids) expect(linesOf(id).length, id).toBeGreaterThanOrEqual(6);
  });

  it('every pairing, either way round and for any seed, gets two lines that fit on a caption', () => {
    for (const a of ids)
      for (const b of ids)
        for (let seed = 1; seed < 12; seed++) {
          const ex = banter(a, b, seed);
          expect([0, 1]).toContain(ex.first);
          for (const l of ex.lines) {
            expect(l.length, `${a}/${b}`).toBeGreaterThan(5);
            expect(l.length, l).toBeLessThanOrEqual(80);
            expect(lineSeconds(l)).toBeGreaterThanOrEqual(2);
          }
        }
  });

  it('a pairing with its own exchange uses it most nights, and the right one speaks first', () => {
    const own = [1, 2, 4, 5, 6].map((s) => banter('margaret', 'dale', s));
    expect(own.filter((e) => e.lines[0].startsWith('Dale.') || e.lines[0].startsWith('And now back')).length).toBeGreaterThanOrEqual(4);
    const dale = own.find((e) => e.lines[0].startsWith('And now back'));
    if (dale) expect(dale.first).toBe(1);
  });

  it('the same seed, the same lines; a mirror match has its own', () => {
    expect(banter('rox', 'hollis', 7)).toEqual(banter('rox', 'hollis', 7));
    expect(banter('gus', 'gus', 3).lines[0]).toMatch(/only room/);
  });
});
