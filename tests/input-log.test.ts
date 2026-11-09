// The input display's history: held inputs fold into one row with a frame
// count, newest first; neutral only separates; arrows follow facing.
import { describe, expect, it } from 'vitest';
import { InputLog, arrow } from '../src/game/inputLog';
import { Input } from '../src/sim';

const { DOWN, LEFT, RIGHT, FP, SPECIAL } = Input;

describe('input log', () => {
  it('folds a held input into one row and counts its frames', () => {
    const log = new InputLog();
    for (let t = 0; t < 5; t++) log.push(RIGHT, 1);
    expect(log.rows).toEqual([{ dir: '→', buttons: [], frames: 5 }]);
  });

  it('starts a new row when the input changes, newest first, with neutral between not counted', () => {
    const log = new InputLog();
    log.push(DOWN, 1);
    log.push(DOWN | RIGHT, 1);
    log.push(DOWN | RIGHT | SPECIAL, 1);
    log.push(0, 1);
    log.push(0, 1);
    log.push(FP, 1);
    expect(log.rows.map((r) => `${r.dir}${r.buttons.join('+')}:${r.frames}`)).toEqual(['FP:1', '↘SP:1', '↘:1', '↓:1']);
  });

  it('writes directions relative to facing', () => {
    expect(arrow(RIGHT, 1)).toBe('→');
    expect(arrow(RIGHT, -1)).toBe('←');
    expect(arrow(LEFT | DOWN, -1)).toBe('↘');
  });

  it('keeps only the newest rows', () => {
    const log = new InputLog(3);
    for (let k = 0; k < 6; k++) {
      log.push(k % 2 ? FP : DOWN, 1);
      log.push(0, 1);
    }
    expect(log.rows).toHaveLength(3);
    expect(log.rows[0].buttons).toEqual(['FP']);
  });
});
