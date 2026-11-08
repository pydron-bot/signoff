// blender/data/fighters.json gives the Blender scripts (blender/) the move
// data in metres and frames: sizes, speeds, and every move's frames and
// boxes, so the generated clips land their hits where the simulation checks
// them. This keeps it true: after changing moves, run `npm run docs:clips`.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIGHTERS, type MoveData } from '../src/sim';
import { toFloat } from '../src/sim/fixed';
import type { Box } from '../src/sim/types';

const FILE = new URL('../blender/data/fighters.json', import.meta.url);

const r = (v: number) => Math.round(toFloat(v) * 1000) / 1000;
const box = (b: Box) => [r(b.x), r(b.x + b.w), r(b.y), r(b.y + b.h)];

function move(m: MoveData) {
  return {
    kind: m.kind,
    stance: m.stance,
    total: m.total,
    startup: m.startup,
    lastActive: m.lastActive,
    hits: m.hits.map((h) => ({ frames: h.frames, box: box(h.box), height: h.height })),
    spawns: m.spawns.map((s) => ({ frame: s.frame, at: [r(s.projectile.x), r(s.projectile.y)] })),
    throw: m.throwData ? { frames: m.throwData.frames, range: r(m.throwData.range) } : undefined,
    interact: m.interactFrame,
    motion: m.motion.map((x) => ({ frames: x.frames, vx: r(x.vx) })),
    teleport: m.teleport,
    hidden: m.hidden,
    armor: m.armor,
    invuln: m.invuln,
    decoy: m.spawns.some((s) => s.projectile.decoy) || undefined,
  };
}

export function blenderData(): string {
  const out: Record<string, unknown> = {};
  for (const f of Object.values(FIGHTERS)) {
    out[f.id] = {
      name: f.name,
      style: f.style,
      hurt: { stand: box(f.hurt.stand), crouch: box(f.hurt.crouch), air: box(f.hurt.air) },
      // Metres per second, as the walk clips must match foot speed.
      walk: { fwd: Math.round(toFloat(f.walkFwd) * 60 * 100) / 100, back: Math.round(toFloat(f.walkBack) * 60 * 100) / 100 },
      dash: f.dash.frames,
      backdash: f.backdash.frames,
      moves: Object.fromEntries(Object.values(f.moves).map((m) => [m.id, move(m)])),
    };
  }
  return `${JSON.stringify(out, null, 1)}\n`;
}

describe('Blender data', () => {
  it('blender/data/fighters.json matches the move data', () => {
    const data = blenderData();
    if (process.env.UPDATE_DOCS) {
      writeFileSync(FILE, data);
      return;
    }
    let file = '';
    try {
      file = readFileSync(FILE, 'utf8');
    } catch {
      // missing: fails below
    }
    expect(file === data, 'blender/data/fighters.json is out of date: run `npm run docs:clips`').toBe(true);
  });
});
