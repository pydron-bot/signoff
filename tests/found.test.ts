// Found cancellations: what's kept, and whose landing counts.
import { describe, expect, it } from 'vitest';
import { humanSide, parseFound } from '../src/game/found';

describe('found cancellations', () => {
  it('keeps only ids from what was stored', () => {
    expect([...parseFound(['dale:Cold Snap', 3, null, 'rox:Hit the Wall'])]).toEqual(['dale:Cold Snap', 'rox:Hit the Wall']);
    expect(parseFound(null).size).toBe(0);
    expect(parseFound({ a: 1 }).size).toBe(0);
  });

  it('only a player finds one: not the CPU, a replay or the attract mode', () => {
    expect(humanSide('cpu', 0)).toBe(true);
    expect(humanSide('cpu', 1)).toBe(false);
    expect(humanSide('training', 0)).toBe(true);
    expect(humanSide('versus', 1)).toBe(true);
    expect(humanSide('replay', 0)).toBe(false);
    expect(humanSide('demo', 0)).toBe(false);
    expect(humanSide('watch', 0)).toBe(false);
    expect(humanSide('showcase', 0)).toBe(false);
  });
});
