// The touch buttons fade over a fighter (src/input/touch.ts): the overlap test, without a DOM.
import { describe, expect, it } from 'vitest';
import { overBody } from '../src/input/touch';

describe('touch buttons over the fighters', () => {
  // One button at 600..660 × 300..360, and a second at 0..60 × 0..60.
  const boxes = [600, 300, 660, 360, 0, 0, 60, 60];
  const empty = [0, 0, 0, 0];

  it('a button with a fighter behind it fades; one beside it stays', () => {
    expect(overBody(boxes, 0, [...empty, 620, 100, 700, 380], 0)).toBe(true);
    expect(overBody(boxes, 0, [500, 100, 590, 380, ...empty], 0)).toBe(false);
  });

  it('an empty rect (a fighter off screen) meets nothing, even the corner button grown by a margin', () => {
    expect(overBody(boxes, 4, [...empty, ...empty], 12)).toBe(false);
  });

  it('a faded button waits for the fighter to clear it by the margin', () => {
    const justOff = [500, 100, 595, 380, ...empty];
    expect(overBody(boxes, 0, justOff, 0)).toBe(false);
    expect(overBody(boxes, 0, justOff, 12)).toBe(true);
  });
});
