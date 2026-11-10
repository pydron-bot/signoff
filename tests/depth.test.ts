/** The studio round the fight (src/render/depth.ts) and who sits in it (src/game/arcade.ts). */
import { describe, expect, it } from 'vitest';
import { afterMatch, beaten, createLadder } from '../src/game/arcade';
import { NEAR, FAR } from '../src/render/camera';
import { SEATS, coversFight, seatNumber } from '../src/render/depth';

describe('the foreground', () => {
  it('stays clear of a fight in the middle, near or far', () => {
    for (const z of [NEAR, 10, FAR]) {
      expect(coversFight(-1, 0, z, -2)).toBe(false);
      expect(coversFight(1, 0, z, 2)).toBe(false);
    }
  });

  it('hides the side piece the camera looks past, close in at a wall (the touch buttons framing)', () => {
    // Close up at x 4.8 with a fighter at the right wall: the right piece would stand in front of them.
    expect(coversFight(1, 4.8, NEAR, 6)).toBe(true);
    // The far side's piece is well out of the way.
    expect(coversFight(-1, 4.8, NEAR, 3)).toBe(false);
  });

  it('hides both when the camera comes in past them (a KO swinging round)', () => {
    expect(coversFight(-1, 0, 3, -1)).toBe(true);
    expect(coversFight(1, 0, 3, 1)).toBe(true);
  });
});

describe('the audience', () => {
  it('fills every seat once, alternating sides, the middle seats first', () => {
    const order = Array.from({ length: SEATS }, (_, n) => seatNumber(n));
    expect([...order].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(order.slice(0, 2)).toEqual([2, 5]);
    for (let n = 1; n < SEATS; n++) expect(order[n] <= 3).not.toBe(order[n - 1] <= 3);
  });

  it('is the fighters beaten so far tonight, in order; a loss changes nobody', () => {
    let l = createLadder('dale');
    expect(beaten(l)).toEqual([]);
    l = afterMatch(l, true);
    expect(beaten(l)).toEqual([l.opponents[0]]);
    l = afterMatch(l, false);
    expect(beaten(l)).toEqual([l.opponents[0]]);
    l = afterMatch(l, true);
    expect(beaten(l)).toEqual(l.opponents.slice(0, 2));
    expect(beaten(l)).not.toContain('dale');
  });
});
