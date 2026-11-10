// The frame meter (src/game/frameMeter.ts): a jab's startup, active and
// recovery frames as the data has them, the stun it leaves, the hit's freeze
// left out, and a strip that holds still in quiet spells.
import { describe, expect, it } from 'vitest';
import { Cell, FrameMeter, METER_STEPS, cellOf } from '../src/game/frameMeter';
import { DALE } from '../src/sim/fighters/dale';
import { Input, frameData, step, type SimEvent } from '../src/sim';
import { place, ready } from './sim-helpers';

describe('frame meter', () => {
  it("a jab that hits: Dale's startup, active and recovery, and Rox's hitstun outlasting it by the advantage", () => {
    const m = ready('dale', 'rox');
    place(m, -0.4, 0.4);
    const fm = new FrameMeter();
    const ev: SimEvent[] = [];
    for (let t = 0; t < 60; t++) {
      step(m, t === 0 ? Input.FP : 0, 0, ev);
      fm.push(m);
    }
    const fd = frameData(DALE.moves['s.FP']);
    expect(fm.run(0, Cell.STARTUP)).toBe(fd.startup - 1);
    expect(fm.run(0, Cell.ACTIVE)).toBe(fd.active);
    expect(fm.run(0, Cell.RECOVERY)).toBe(fd.recovery);
    // The stun runs from the hit to the step Rox is free; Dale's frames from the hit to his: the difference is the advantage.
    const c = fm.cells;
    const hit = c[1].indexOf(Cell.HITSTUN);
    const dFree = c[1].indexOf(Cell.FREE, hit);
    const aFree = c[0].indexOf(Cell.FREE, hit);
    expect(dFree - aFree).toBe(fd.onHit);
  });

  it('holds still once both are free, and starts afresh when something happens', () => {
    const m = ready('dale', 'rox');
    place(m, -0.4, 0.4);
    const fm = new FrameMeter();
    const cells = fm.cells[0];
    const ev: SimEvent[] = [];
    for (let t = 0; t < 120; t++) {
      step(m, t === 0 ? Input.FP : 0, 0, ev);
      fm.push(m);
    }
    const len = fm.length;
    const v = fm.version;
    for (let t = 0; t < 30; t++) {
      step(m, 0, 0, ev);
      fm.push(m);
    }
    expect(fm.length).toBe(len);
    expect(fm.version).toBe(v);
    step(m, Input.FK, 0, ev);
    fm.push(m);
    expect(fm.length).toBe(1);
    expect(fm.cells[0][0]).toBe(Cell.STARTUP);
    // The same arrays throughout: nothing allocated per step.
    expect(fm.cells[0]).toBe(cells);
  });

  it('keeps the last 80 steps', () => {
    const m = ready('dale', 'rox');
    place(m, -2, 2);
    const fm = new FrameMeter();
    const ev: SimEvent[] = [];
    for (let t = 0; t < 200; t++) {
      step(m, t % 2 === 0 ? Input.BK : 0, 0, ev);
      fm.push(m);
    }
    expect(fm.length).toBe(METER_STEPS);
  });

  it('reads blockstun, and movement as its own colour', () => {
    const m = ready('dale', 'rox');
    const f = m.fighters[1];
    f.mode = 'blockstun';
    expect(cellOf(f)).toBe(Cell.BLOCKSTUN);
    f.mode = 'air';
    expect(cellOf(f)).toBe(Cell.MOVING);
    f.mode = 'down';
    expect(cellOf(f)).toBe(Cell.DOWN);
  });
});
