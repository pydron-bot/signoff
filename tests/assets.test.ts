// Checks every fighter GLB in public/assets/fighters against the contracts
// in docs/BLENDER-TODO.md: the shared skeleton, the budget, the size, and
// each clip's exact length (move clips from the move data). Fighters without
// a GLB yet are skipped. The stage GLB (public/assets/stages/weather.glb) is
// checked for the objects, materials and lights the game reads.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIGHTERS, STAGES } from '../src/sim';
import { toFloat } from '../src/sim/fixed';

/**
 * The shared skeleton's deform bones (blender/lib/rig.py DEFORM), with step
 * 16's hands that open, point and grab, the jaw, and step 21's finger joints
 * (each finger group split at the knuckles, so a fist curls at three joints).
 */
export const RIG_BONES = [
  'root', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw',
  ...['L', 'R'].flatMap((s) => [
    `shoulder.${s}`, `upper_arm.${s}`, `forearm.${s}`, `hand.${s}`,
    `thumb.${s}`, `thumb_2.${s}`, `index.${s}`, `index_2.${s}`, `index_3.${s}`, `fingers.${s}`, `fingers_2.${s}`, `fingers_3.${s}`,
  ]),
  'thigh.L', 'shin.L', 'foot.L', 'toe.L', 'thigh.R', 'shin.R', 'foot.R', 'toe.R',
];
/** Bones past that are the fighter's own, for secondary motion (hair, a tie, a coat tail), named x_*. */
const MAX_BONES = 48;
/** Each fighter's GLB, so a full roster still loads quickly on a phone. */
const MAX_GLB_BYTES = 2_000_000;

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
  tape_skip: { frames: 10 },
  hit_high: { frames: 12 },
  hit_low: { frames: 12 },
  launched: {},
  down: { frames: 30 },
  getup: { frames: 20 },
  thrown: { frames: 24 },
  ko: { frames: 90 },
  dazed: { frames: 60, loop: true },
  win: { frames: 120 },
  intro: { frames: 90 },
  win_2: { frames: 120 },
  intro_2: { frames: 90 },
  td_cinematic: { frames: 150 },
  // Asked for in docs/BLENDER-TODO.md (step 14); the game stands in `interact` until it exists.
  interact_throw: { frames: 22 },
  // Juggle reactions (step 16).
  juggle_hit: { frames: 12 },
  relaunch: { frames: 20 },
  slam: { frames: 8 },
  floor_bounce: { frames: 16 },
  wall_splat: { frames: 20 },
};
const MAX_TRIANGLES = 20000;
/** One atlas per material, at most this size (docs/BLENDER-TODO.md, step 8). */
const MAX_TEXTURE: Record<string, number> = { body: 1024, props: 512 };
const FPS = 60;

interface Gltf {
  nodes: { name: string; mesh?: number; skin?: number; translation?: number[]; extras?: Record<string, unknown> }[];
  skins?: { joints: number[] }[];
  materials?: { name: string; alphaMode?: string; pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }[];
  textures?: { source: number }[];
  images?: { bufferView: number; mimeType: string }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  meshes: { primitives: { attributes: Record<string, number>; indices?: number }[] }[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  animations?: { name: string; samplers: { input: number }[] }[];
}

function readGlb(path: string): Gltf & { bin: Buffer } {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const len = b.readUInt32LE(12);
  const bin = b.subarray(28 + len, 28 + len + b.readUInt32LE(20 + len));
  return { ...(JSON.parse(b.toString('utf8', 20, 20 + len)) as Gltf), bin };
}

/** A PNG's width and height, from its header. */
function pngSize(png: Buffer): [number, number] {
  expect(png.toString('latin1', 1, 4)).toBe('PNG');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

for (const f of Object.values(FIGHTERS)) {
  const path = `public/assets/fighters/${f.id}.glb`;
  describe.skipIf(!existsSync(path))(`${f.id}.glb`, () => {
    const g = existsSync(path) ? readGlb(path) : ({} as ReturnType<typeof readGlb>);

    it('uses the shared skeleton', () => {
      expect(g.skins?.length).toBe(1);
      const bones = g.skins![0].joints.map((j) => g.nodes[j].name);
      for (const b of RIG_BONES) expect(bones, b).toContain(b);
      for (const b of bones) if (!RIG_BONES.includes(b)) expect(b, 'its own bones are x_*').toMatch(/^x_/);
      expect(bones.length).toBeLessThanOrEqual(MAX_BONES);
    });

    it(`stays under ${MAX_GLB_BYTES / 1e6} MB`, () => {
      expect(statSync(path).size).toBeLessThanOrEqual(MAX_GLB_BYTES);
    });

    it('keeps to the budget: body and at most props for materials, and at most 20k triangles', () => {
      const mats = (g.materials ?? []).map((m) => m.name);
      expect(mats).toContain('body');
      for (const m of mats) expect(['body', 'props']).toContain(m);
      let tris = 0;
      for (const m of g.meshes) for (const p of m.primitives) tris += g.accessors[p.indices ?? p.attributes.POSITION].count / 3;
      expect(tris).toBeLessThanOrEqual(MAX_TRIANGLES);
    });

    it('paints each material from one PNG atlas within its size', () => {
      for (const m of g.materials ?? []) {
        const tex = m.pbrMetallicRoughness?.baseColorTexture;
        expect(tex, `${m.name} has an atlas`).toBeTruthy();
        const img = g.images![g.textures![tex!.index].source];
        expect(img.mimeType).toBe('image/png');
        const view = g.bufferViews[img.bufferView];
        const [w, h] = pngSize(g.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
        expect(Math.max(w, h), `${m.name} atlas size`).toBeLessThanOrEqual(MAX_TEXTURE[m.name]);
      }
    });

    it('has its body skinned, and effect meshes (fx_*) as plain props', () => {
      const meshes = g.nodes.filter((n) => n.mesh !== undefined);
      const skinned = meshes.filter((n) => n.skin !== undefined).map((n) => n.name);
      expect(skinned).toContain(`${f.id}_body`);
      // Extra skinned parts that aren't the body (Mumbles' strings) are named <id>_<part>.
      for (const name of skinned) expect(name.startsWith(`${f.id}_`)).toBe(true);
      for (const n of meshes.filter((m) => m.skin === undefined)) expect(n.name).toMatch(/^fx_/);
    });

    // The build scales each rig so the fighting stance (idle) stands as tall
    // as the hurtbox, and checks every frame of idle, the walks and blocks;
    // the straight-legged rest pose is up to 8% taller.
    it('stands about as tall as its hurtbox, feet on the floor, at rest', () => {
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
      expect(hi).toBeLessThan(tall * 1.08);
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

/** What the game reads from a stage GLB (src/render/stageView.ts). */
const STAGE_OBJECTS = ['set', 'seg_storm', 'seg_flood', 'prop_dolly_left', 'prop_dolly_right', 'fx_lightning', 'fx_scorch', 'fx_paper', 'fx_water', 'fx_puddle', 'fx_spark'];
const STAGE_TEXTURE: Record<string, number> = { set: 2048, props: 512 };

const stagePath = 'public/assets/stages/weather.glb';
describe.skipIf(!existsSync(stagePath))('weather.glb', () => {
  const g = existsSync(stagePath) ? readGlb(stagePath) : ({} as ReturnType<typeof readGlb>);
  const node = (name: string) => g.nodes.find((n) => n.name === name);
  /** A mesh node's bounds, in its own space: [min, max] of x, y, z. */
  const bounds = (name: string): [number[], number[]] => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of g.meshes[node(name)!.mesh!].primitives) {
      const a = g.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], a.min![k]);
        hi[k] = Math.max(hi[k], a.max![k]);
      }
    }
    return [lo, hi];
  };

  it('has every object the game shows, as plain meshes', () => {
    for (const name of STAGE_OBJECTS) expect(node(name)?.mesh, name).toBeDefined();
    expect(g.skins ?? []).toEqual([]);
  });

  it('keeps to set, props and water: atlases within size, water a translucent flat colour', () => {
    let tris = 0;
    for (const m of g.meshes) for (const p of m.primitives) tris += g.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    expect(tris).toBeLessThanOrEqual(20000);
    for (const m of g.materials ?? []) {
      expect(['set', 'props', 'water']).toContain(m.name);
      const tex = m.pbrMetallicRoughness?.baseColorTexture;
      if (m.name === 'water') {
        expect(m.alphaMode).toBe('BLEND');
        continue;
      }
      const img = g.images![g.textures![tex!.index].source];
      const view = g.bufferViews[img.bufferView];
      const [w, h] = pngSize(g.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
      expect(Math.max(w, h), `${m.name} atlas size`).toBeLessThanOrEqual(STAGE_TEXTURE[m.name]);
    }
  });

  it('has a light rig for each segment', () => {
    const lights = JSON.parse(String(node('lights')?.extras?.segments)) as { segment: string }[];
    expect(lights.map((l) => l.segment)).toEqual(STAGES.weather.segments.map((s) => s.name));
  });

  it('puts the dollies where the sim does, at the size of their box', () => {
    const props = STAGES.weather.segments[0].props;
    for (const [k, name] of ['prop_dolly_left', 'prop_dolly_right'].entries()) {
      expect(node(name)!.translation![0]).toBeCloseTo(toFloat(props[k].x), 3);
      const [lo, hi] = bounds(name);
      expect(lo[1]).toBeCloseTo(0, 2);
      expect(hi[0] - lo[0]).toBeLessThanOrEqual(0.9 + 1e-3);
      expect(hi[1] - lo[1]).toBeLessThanOrEqual(1.0 + 1e-3);
      expect(hi[2] - lo[2]).toBeLessThanOrEqual(0.7 + 1e-3);
    }
  });

  it('sizes the hazards to their data: an 8 m bolt, a 1.6 m puddle, water at 0.22 m', () => {
    expect(bounds('fx_lightning')[1][1]).toBeCloseTo(8, 1);
    expect(bounds('fx_lightning')[0][1]).toBeCloseTo(0, 1);
    const [plo, phi] = bounds('fx_puddle');
    expect(phi[0] - plo[0]).toBeCloseTo(1.6, 1);
    expect(bounds('fx_water')[0][1]).toBeCloseTo(0.22, 2);
  });
});

/** What the game reads from Feel the Burn at Dawn's GLB (src/render/burnSet.ts; docs/BLENDER-TODO.md, step 14). */
const BURN_OBJECTS = ['set', 'seg_warmup', 'seg_double', 'seg_burnout', 'prop_boombox', 'fx_shard', 'fx_shatter', 'fx_mark'];
const burnPath = 'public/assets/stages/burn.glb';
describe.skipIf(!existsSync(burnPath))('burn.glb', () => {
  const g = existsSync(burnPath) ? readGlb(burnPath) : ({} as ReturnType<typeof readGlb>);
  const node = (name: string) => g.nodes.find((n) => n.name === name);
  const bounds = (name: string): [number[], number[]] => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of g.meshes[node(name)!.mesh!].primitives) {
      const a = g.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], a.min![k]);
        hi[k] = Math.max(hi[k], a.max![k]);
      }
    }
    return [lo, hi];
  };

  it('has every object the game shows, as plain meshes', () => {
    for (const name of BURN_OBJECTS) expect(node(name)?.mesh, name).toBeDefined();
    expect(g.skins ?? []).toEqual([]);
  });

  it('keeps to set and props, atlases within size, under 20k triangles', () => {
    let tris = 0;
    for (const m of g.meshes) for (const p of m.primitives) tris += g.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    expect(tris).toBeLessThanOrEqual(20000);
    for (const m of g.materials ?? []) {
      expect(['set', 'props']).toContain(m.name);
      const tex = m.pbrMetallicRoughness?.baseColorTexture;
      const img = g.images![g.textures![tex!.index].source];
      const view = g.bufferViews[img.bufferView];
      const [w, h] = pngSize(g.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
      expect(Math.max(w, h), `${m.name} atlas size`).toBeLessThanOrEqual(STAGE_TEXTURE[m.name]);
    }
  });

  it('has a light rig for each segment', () => {
    const lights = JSON.parse(String(node('lights')?.extras?.segments)) as { segment: string }[];
    expect(lights.map((l) => l.segment)).toEqual(STAGES.burn.segments.map((s) => s.name));
  });

  it('puts the boombox where the sim does, at its size, standing on the floor', () => {
    const prop = STAGES.burn.segments[0].props[0];
    expect(node('prop_boombox')!.translation?.[0] ?? 0).toBeCloseTo(toFloat(prop.x), 3);
    const [lo, hi] = bounds('prop_boombox');
    expect(lo[1]).toBeCloseTo(0, 2);
    expect(hi[0] - lo[0]).toBeLessThanOrEqual(0.6 + 0.02);
    expect(hi[1] - lo[1]).toBeLessThanOrEqual(0.4 + 0.02);
  });

  it('sizes the shard: about 1.2 m long, its point at the origin', () => {
    const [lo, hi] = bounds('fx_shard');
    expect(lo[1]).toBeCloseTo(0, 1);
    expect(hi[1]).toBeGreaterThan(0.9);
    expect(hi[1]).toBeLessThan(1.5);
  });
});

/**
 * The stages built since: the objects the game reads, materials and atlas
 * sizes, the triangle cap, a light rig per segment, and each prop at its
 * size where the sim puts it (docs/BLENDER-TODO.md, steps 19 and 20).
 */
function stageChecks(id: string, objects: string[], props: Record<string, { at: number; size: [number, number] }>): void {
  const path = `public/assets/stages/${id}.glb`;
  describe.skipIf(!existsSync(path))(`${id}.glb`, () => {
    const g = existsSync(path) ? readGlb(path) : ({} as ReturnType<typeof readGlb>);
    const node = (name: string) => g.nodes.find((n) => n.name === name);
    const bounds = (name: string): [number[], number[]] => {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const p of g.meshes[node(name)!.mesh!].primitives) {
        const a = g.accessors[p.attributes.POSITION];
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], a.min![k]);
          hi[k] = Math.max(hi[k], a.max![k]);
        }
      }
      return [lo, hi];
    };

    it('has every object the game shows, as plain meshes', () => {
      for (const name of objects) expect(node(name)?.mesh, name).toBeDefined();
      expect(g.skins ?? []).toEqual([]);
    });

    it('keeps to set and props, atlases within size, under 20k triangles', () => {
      let tris = 0;
      for (const m of g.meshes) for (const p of m.primitives) tris += g.accessors[p.indices ?? p.attributes.POSITION].count / 3;
      expect(tris).toBeLessThanOrEqual(20000);
      for (const m of g.materials ?? []) {
        expect(['set', 'props']).toContain(m.name);
        const tex = m.pbrMetallicRoughness?.baseColorTexture;
        const img = g.images![g.textures![tex!.index].source];
        const view = g.bufferViews[img.bufferView];
        const [w, h] = pngSize(g.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
        expect(Math.max(w, h), `${m.name} atlas size`).toBeLessThanOrEqual(STAGE_TEXTURE[m.name]);
      }
    });

    it('has a light rig for each segment', () => {
      const lights = JSON.parse(String(node('lights')?.extras?.segments)) as { segment: string }[];
      expect(lights.map((l) => l.segment)).toEqual(STAGES[id].segments.map((s) => s.name));
    });

    for (const [name, p] of Object.entries(props)) {
      it(`puts ${name} where the sim does, at its size, standing on its origin`, () => {
        expect(node(name)!.translation?.[0] ?? 0).toBeCloseTo(p.at, 3);
        const [lo, hi] = bounds(name);
        expect(lo[1]).toBeCloseTo(0, 2);
        expect(hi[0] - lo[0], `${name} width`).toBeLessThanOrEqual(p.size[0] + 0.05);
        expect(hi[1] - lo[1], `${name} height`).toBeLessThanOrEqual(p.size[1] + 0.05);
      });
    }
  });
}

const propX = (stage: string, id: string) => toFloat(STAGES[stage].segments[0].props.find((p) => p.id === id)!.x);
stageChecks('news', ['set', 'seg_headlines', 'seg_ticker', 'seg_lightsout', 'prop_desk', 'fx_lamp', 'fx_wreck', 'fx_mark'], {
  prop_desk: { at: propX('news', 'desk'), size: [1.2, 0.8] },
});
stageChecks('kitchen', ['set', 'seg_prep', 'seg_grease', 'seg_oven', 'prop_pot', 'prop_knives', 'fx_flare', 'fx_mark'], {
  prop_pot: { at: propX('kitchen', 'pot'), size: [0.6, 0.45] },
  prop_knives: { at: propX('kitchen', 'knives'), size: [0.3, 0.5] },
});
