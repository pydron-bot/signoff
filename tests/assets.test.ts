// Checks every fighter GLB in public/assets/fighters against the contracts
// in docs/BLENDER-TODO.md: the shared skeleton, the budget, the size, and
// each clip's exact length (move clips from the move data). Fighters without
// a GLB yet are skipped.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIGHTERS } from '../src/sim';
import { toFloat } from '../src/sim/fixed';

/** The shared skeleton's deform bones (blender/lib/rig.py DEFORM). */
export const RIG_BONES = [
  'root', 'hips', 'spine', 'chest', 'neck', 'head',
  'shoulder.L', 'upper_arm.L', 'forearm.L', 'hand.L', 'shoulder.R', 'upper_arm.R', 'forearm.R', 'hand.R',
  'thigh.L', 'shin.L', 'foot.L', 'toe.L', 'thigh.R', 'shin.R', 'foot.R', 'toe.R',
];

/** State clips: exact frame counts where the table gives them; loops last exactly their frames. */
const STATE_CLIPS: Record<string, { frames?: number; loop?: boolean }> = {
  idle: { frames: 60, loop: true },
  // Walk loops are as long as the stride needs at the walk speed (12 to 40 frames).
  walk_fwd: { loop: true },
  walk_back: { loop: true },
  crouch: { frames: 6 },
  crouch_idle: { frames: 40, loop: true },
  block_stand: {},
  block_crouch: {},
  prejump: { frames: 3 },
  jump_up: {},
  jump_fall: {},
  land: { frames: 2 },
  land_attack: { frames: 4 },
  dash: {},
  backdash: {},
  hit_high: { frames: 12 },
  hit_low: { frames: 12 },
  launched: {},
  down: { frames: 30 },
  getup: { frames: 20 },
  thrown: { frames: 24 },
  ko: { frames: 90 },
  win: { frames: 120 },
  intro: { frames: 90 },
  td_cinematic: { frames: 150 },
};
const MAX_TRIANGLES = 20000;
const FPS = 60;

interface Gltf {
  nodes: { name: string; mesh?: number; skin?: number }[];
  skins?: { joints: number[] }[];
  materials?: { name: string }[];
  meshes: { primitives: { attributes: Record<string, number>; indices?: number }[] }[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  animations?: { name: string; samplers: { input: number }[] }[];
}

function readGlb(path: string): Gltf {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const len = b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8', 20, 20 + len)) as Gltf;
}

for (const f of Object.values(FIGHTERS)) {
  const path = `public/assets/fighters/${f.id}.glb`;
  describe.skipIf(!existsSync(path))(`${f.id}.glb`, () => {
    const g = existsSync(path) ? readGlb(path) : ({} as Gltf);

    it('uses the shared skeleton', () => {
      expect(g.skins?.length).toBe(1);
      expect(g.skins![0].joints.map((j) => g.nodes[j].name).sort()).toEqual([...RIG_BONES].sort());
    });

    it('keeps to the budget: body and at most props for materials, and at most 20k triangles', () => {
      const mats = (g.materials ?? []).map((m) => m.name);
      expect(mats).toContain('body');
      for (const m of mats) expect(['body', 'props']).toContain(m);
      let tris = 0;
      for (const m of g.meshes) for (const p of m.primitives) tris += g.accessors[p.indices ?? p.attributes.POSITION].count / 3;
      expect(tris).toBeLessThanOrEqual(MAX_TRIANGLES);
    });

    it('has its body skinned, and effect meshes (fx_*) as plain props', () => {
      const meshes = g.nodes.filter((n) => n.mesh !== undefined);
      const skinned = meshes.filter((n) => n.skin !== undefined).map((n) => n.name);
      expect(skinned).toContain(`${f.id}_body`);
      // Extra skinned parts that aren't the body (Mumbles' strings) are named <id>_<part>.
      for (const name of skinned) expect(name.startsWith(`${f.id}_`)).toBe(true);
      for (const n of meshes.filter((m) => m.skin === undefined)) expect(n.name).toMatch(/^fx_/);
    });

    it('stands as tall as its hurtbox, feet on the floor, at rest', () => {
      const hurt = f.hurt.stand;
      const tall = toFloat(hurt.y + hurt.h);
      let lo = Infinity;
      let hi = -Infinity;
      for (const n of g.nodes.filter((m) => m.name === `${f.id}_body`)) {
        for (const p of g.meshes[n.mesh!].primitives) {
          const a = g.accessors[p.attributes.POSITION];
          lo = Math.min(lo, a.min![1]);
          hi = Math.max(hi, a.max![1]);
        }
      }
      expect(lo).toBeCloseTo(0, 2);
      expect(hi).toBeGreaterThan(tall - 0.03);
      expect(hi).toBeLessThan(tall + 0.01);
    });

    it('has an idle, and every clip is a known name with its exact length', () => {
      const anims = g.animations ?? [];
      expect(anims.map((a) => a.name)).toContain('idle');
      for (const a of anims) {
        const seconds = Math.max(...a.samplers.map((s) => g.accessors[s.input].max![0]));
        const move = f.moves[a.name];
        const state = STATE_CLIPS[a.name];
        expect(move || state, `unknown clip ${a.name}`).toBeTruthy();
        // Move frame n is sampled at (n - 1) / 60: a clip of N frames spans N - 1 steps; a loop of N spans N.
        const frames = move ? move.total : state.frames;
        if (state?.loop && frames === undefined) expect(Math.round(seconds * FPS), `${a.name} length`).toBeGreaterThanOrEqual(12);
        if (frames !== undefined) {
          const span = move || !state.loop ? frames - 1 : frames;
          expect(seconds * FPS, `${a.name} length`).toBeCloseTo(span, 3);
        }
      }
    });
  });
}
