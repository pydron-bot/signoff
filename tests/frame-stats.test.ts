// The performance overlay's numbers (src/game/frameStats.ts).
import { describe, expect, it } from 'vitest';
import { FrameStats, type FrameSummary } from '../src/game/frameStats';

const sum = (): FrameSummary => ({ fps: 0, avgMs: 0, worstMs: 0, steps: 0, calls: 0, triangles: 0 });

describe('frame stats', () => {
  it('a steady 60 Hz reads 60 fps and 60 steps a second', () => {
    const f = new FrameStats();
    for (let i = 0; i <= 120; i++) f.push(i * (1000 / 60), 1, 30, 9000);
    const s = f.summary(sum());
    expect(s.fps).toBeCloseTo(60, 0);
    expect(s.avgMs).toBeCloseTo(16.7, 1);
    expect(s.steps).toBeCloseTo(60, 0);
    expect(s.calls).toBe(30);
    expect(s.triangles).toBe(9000);
  });

  it('120 Hz runs a step every other frame; a hitch shows as the worst frame', () => {
    const f = new FrameStats();
    let t = 0;
    for (let i = 0; i < 120; i++) f.push((t += i === 60 ? 50 : 1000 / 120), i % 2, 20, 0);
    const s = f.summary(sum());
    expect(s.fps).toBeGreaterThan(100);
    expect(s.worstMs).toBeCloseTo(50, 5);
    expect(s.steps).toBeGreaterThan(50);
    expect(s.steps).toBeLessThan(62);
  });

  it('only the last second counts, and a reset forgets', () => {
    const f = new FrameStats();
    for (let i = 0; i <= 60; i++) f.push(i * 100, 6, 200, 0);
    for (let i = 1; i <= 60; i++) f.push(6000 + i * (1000 / 60), 1, 40, 0);
    expect(f.summary(sum()).calls).toBe(40);
    f.reset();
    expect(f.summary(sum()).fps).toBe(0);
  });
});
