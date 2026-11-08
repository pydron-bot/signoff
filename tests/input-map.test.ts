import { describe, expect, it } from 'vitest';
import { Chord, cleanDirections, keyBits, padBits, type PadLike } from '../src/input/map';
import { Input } from '../src/sim';

const { UP, DOWN, LEFT, RIGHT, FP, FK, BP, BK, BLOCK, SPECIAL, THROW, METER } = Input;

function pad(buttons: number[], axes: number[] = [0, 0]): PadLike {
  return { buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })), axes };
}

describe('keyboard', () => {
  it('maps the design layout', () => {
    expect(keyBits(new Set(['KeyW', 'KeyD', 'KeyU']))).toBe(UP | RIGHT | FP);
    expect(keyBits(new Set(['KeyL', 'KeyO']))).toBe(BLOCK | SPECIAL);
    expect(keyBits(new Set(['Space', 'KeyK', 'KeyI', 'KeyJ']))).toBe(METER | BK | BP | FK);
    expect(keyBits(new Set(['KeyZ']))).toBe(0);
  });
});

describe('chords', () => {
  it('two buttons together become the chord, even a frame apart', () => {
    const c = new Chord(FP, FK, THROW);
    expect(c.apply(FP)).toBe(0);
    expect(c.apply(FP | FK)).toBe(THROW);
    // Releasing one doesn't leak the other.
    expect(c.apply(FK)).toBe(0);
    expect(c.apply(0)).toBe(0);
  });

  it('a single button comes through after the grace frames', () => {
    const c = new Chord(BP, BK, METER);
    expect([c.apply(BP), c.apply(BP), c.apply(BP)]).toEqual([0, 0, BP]);
    expect(c.apply(UP | BP)).toBe(UP | BP);
  });

  it('a tap shorter than the grace still comes through, one frame late', () => {
    const c = new Chord(FP, FK, THROW);
    expect([c.apply(FP), c.apply(0), c.apply(0)]).toEqual([0, FP, 0]);
  });
});

describe('gamepad', () => {
  it('maps Xbox buttons, the D-pad and the stick', () => {
    expect(padBits(pad([2, 3, 0, 1]))).toBe(FP | BP | FK | BK);
    expect(padBits(pad([5, 7]))).toBe(BLOCK | SPECIAL);
    expect(padBits(pad([4]))).toBe(THROW);
    expect(padBits(pad([12, 15]))).toBe(UP | RIGHT);
    expect(padBits(pad([], [-0.9, 0.8]))).toBe(LEFT | DOWN);
    expect(padBits(pad([], [0.2, -0.2]))).toBe(0);
  });

  it('opposite directions cancel out', () => {
    expect(cleanDirections(LEFT | RIGHT | UP | FP)).toBe(UP | FP);
    expect(cleanDirections(UP | DOWN)).toBe(0);
  });
});
