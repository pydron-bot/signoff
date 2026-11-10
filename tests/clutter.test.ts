import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/sim';
import { toFloat } from '../src/sim/fixed';
import { CLUTTER, type ClutterKind } from '../src/render/clutterData';
import { ClutterWorld, type ClutterEnv } from '../src/render/clutterPhysics';

const MUG: ClutterKind = { id: 'mug', shape: 'box', size: [0.15, 0.14, 0.11], mass: 0.8 };
const TAPE: ClutterKind = { id: 'tape', shape: 'roll', size: [0.2, 0.2, 0.07], mass: 0.5, floats: true };
const PAPER: ClutterKind = { id: 'paper', shape: 'flat', size: [0.3, 0.03, 0.4], mass: 0.4 };

function env(over: Partial<ClutterEnv> = {}): ClutterEnv {
  return { halfWidth: 6, wind: 0, water: 0, pushers: [{ x: -9, y: 0, half: 0.3, dx: 0 }], pushCount: 0, ...over };
}

function run(w: ClutterWorld, e: ClutterEnv, steps: number): void {
  for (let i = 0; i < steps; i++) w.step(e);
}

describe('clutter physics', () => {
  it('stays put when nothing happens', () => {
    const w = new ClutterWorld([MUG], [{ kind: 'mug', x: 1, z: 0.2, yaw: 0.5 }]);
    run(w, env(), 120);
    expect(w.x[0]).toBe(1);
    expect(w.y[0]).toBeCloseTo(0.07);
    expect(w.moving).toBe(false);
  });

  it('is kicked along by a walking foot, and comes to rest on the floor', () => {
    const w = new ClutterWorld([MUG], [{ kind: 'mug', x: 1, z: 0.2, yaw: 0 }]);
    const e = env({ pushCount: 1 });
    const foot = e.pushers[0];
    foot.x = 0.6;
    foot.dx = 0.05;
    for (let i = 0; i < 6; i++) {
      w.step(e);
      foot.x += foot.dx;
    }
    foot.x = -9;
    expect(w.x[0]).toBeGreaterThan(1.1);
    run(w, e, 400);
    expect(w.moving).toBe(false);
    expect(w.y[0]).toBeCloseTo(0.07, 2);
    // At rest on a face.
    expect(Math.abs(Math.sin(w.rx[0] * 2))).toBeLessThan(1e-3);
    expect(Math.abs(Math.sin(w.rz[0] * 2))).toBeLessThan(1e-3);
  });

  it("isn't kicked by feet in the air above it", () => {
    const w = new ClutterWorld([MUG], [{ kind: 'mug', x: 1, z: 0, yaw: 0 }]);
    const e = env({ pushCount: 1 });
    Object.assign(e.pushers[0], { x: 1, y: 0.8, dx: 0.05 });
    run(w, e, 10);
    expect(w.x[0]).toBe(1);
  });

  it('is thrown by a blast nearby, and not by one far off', () => {
    const w = new ClutterWorld([MUG, PAPER], [
      { kind: 'mug', x: 0.5, z: 0, yaw: 0 },
      { kind: 'paper', x: 4, z: 0, yaw: 0 },
    ]);
    w.blast(0, 0, 1.5, 0.06, 1);
    w.step(env());
    expect(w.y[0]).toBeGreaterThan(0.07);
    expect(w.x[0]).toBeGreaterThan(0.5);
    expect(w.x[1]).toBe(4);
  });

  it('never leaves the floor strip or passes the walls', () => {
    const w = new ClutterWorld([TAPE], [{ kind: 'tape', x: 5.5, z: 0, yaw: 0 }]);
    const e = env({ halfWidth: 6 });
    for (let k = 0; k < 20; k++) {
      w.blast(5, 0, 2, 0.12, 1);
      for (let i = 0; i < 30; i++) {
        w.step(e);
        expect(Math.abs(w.x[0])).toBeLessThanOrEqual(6);
        expect(w.y[0]).toBeGreaterThan(0);
        expect(w.z[0]).toBeGreaterThanOrEqual(-1.3);
        expect(w.z[0]).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it('drifts with the storm if light, and floats on the flood', () => {
    const w = new ClutterWorld([PAPER, MUG, TAPE], [
      { kind: 'paper', x: 0, z: -0.8, yaw: 0 },
      { kind: 'mug', x: 2, z: -0.8, yaw: 0 },
      { kind: 'tape', x: -2, z: -0.8, yaw: 0 },
    ]);
    run(w, env({ wind: 0.006 }), 120);
    expect(w.x[0]).toBeGreaterThan(0.3);
    expect(w.x[1]).toBe(2);
    w.reset();
    run(w, env({ water: 0.22 }), 120);
    expect(w.y[2]).toBeGreaterThan(0.18);
    expect(w.y[1]).toBeCloseTo(0.07, 2);
  });

  it('goes back where it was on reset', () => {
    const w = new ClutterWorld([MUG], [{ kind: 'mug', x: 1, z: 0.2, yaw: 0.5 }]);
    w.blast(1, 0, 1, 0.1);
    run(w, env(), 30);
    w.reset();
    expect([w.x[0], w.z[0], w.ry[0]]).toEqual([1, Math.fround(0.2), Math.fround(0.5)]);
  });
});

describe('clutter placement', () => {
  for (const [id, c] of Object.entries(CLUTTER)) {
    it(`${id}: every piece has a kind, sits inside the walls and clear of the start marks and props`, () => {
      expect(STAGES[id]).toBeDefined();
      expect(c.kinds.length).toBeLessThanOrEqual(3);
      const narrow = Math.min(...STAGES[id].segments.map((s) => toFloat(s.halfWidth)));
      const props = STAGES[id].segments.flatMap((s) => s.props.map((p) => toFloat(p.x)));
      for (const p of c.places) {
        const k = c.kinds.find((k) => k.id === p.kind);
        expect(k, p.kind).toBeDefined();
        expect(Math.abs(p.x), `${p.kind} at ${p.x}`).toBeLessThan(narrow - 0.3);
        for (const start of [-1.5, 1.5]) expect(Math.abs(p.x - start), `${p.kind} at ${p.x}`).toBeGreaterThan(0.4);
        for (const x of props) expect(Math.abs(p.x - x), `${p.kind} at ${p.x} by a prop`).toBeGreaterThan(0.6);
      }
    });
  }
});
