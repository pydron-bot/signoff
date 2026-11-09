/**
 * How each segment looks, on top of the light rig its stage gives it: every
 * rig passes through relight() once, which trades some of the flat ambient
 * for key light (shape on the fighters, contrast on the set), gives the
 * ambient a ground colour (a sky-and-ground light, so undersides pick up the
 * floor's bounce), and adds the segment's colour grade (src/render/post.ts)
 * and how far the set falls off into the dark away from the fight. The
 * falloff is a few lines added to the set's Lambert shader with shared
 * uniforms, like the fighters' rim (src/render/fighterLight.ts), so a new
 * segment never recompiles anything.
 */
import * as THREE from 'three';
import type { Grade } from './post';
import { INTRO_FRAMES } from '../sim/constants';
import type { MatchState } from '../sim';
import type { SegmentLights } from './stageModel';

/** Ambient traded for key: the rigs were tuned for a flat ambient with no ground colour. */
const AMBIENT = 0.8;
const KEY = 1.15;

interface Look {
  /** The ambient's ground colour: the floor's bounce. */
  ground: string;
  /** 0 to 1: how much the set darkens away from the fight (behind it, out at the sides, up high). */
  falloff: number;
  grade: Grade;
  /** How strongly the floor reflects the fighters (src/render/reflection.ts), and at what height (a flood). */
  gloss: number;
  floorY?: number;
  /** Burn's mirrors, while they're whole. */
  mirror?: number;
  /** Darkens the whole set (never the fighters), 0 to 1: a bright set that the fighters get lost in. */
  setDim?: number;
}

function g(lift: [number, number, number], gain: [number, number, number], saturation: number, contrast: number, bloom: number): Grade {
  return { lift, gain, saturation, contrast, bloom };
}

/** By stage, one per segment. */
const LOOKS: Readonly<Record<string, readonly Look[]>> = {
  weather: [
    { ground: '#4a4250', falloff: 0.55, grade: g([0, 0.004, 0.012], [1.02, 1, 1], 1.1, 1.08, 0.55), gloss: 0.22 },
    { ground: '#2a3040', falloff: 0.7, grade: g([0, 0.006, 0.02], [0.94, 0.98, 1.06], 0.88, 1.12, 0.7), gloss: 0.32 },
    { ground: '#1e5060', falloff: 0.7, grade: g([0, 0.01, 0.014], [0.92, 1.02, 1.04], 0.95, 1.1, 0.7), gloss: 0.5, floorY: 0.22 },
  ],
  burn: [
    { ground: '#8a5030', falloff: 0.45, grade: g([0.01, 0.002, 0.006], [1.06, 1, 0.94], 1.15, 1.06, 0.6), gloss: 0.16, mirror: 0.5 },
    { ground: '#9a5a34', falloff: 0.4, grade: g([0.008, 0, 0.008], [1.06, 1, 0.98], 1.22, 1.08, 0.8), gloss: 0.18, mirror: 0.55 },
    { ground: '#180c24', falloff: 0.85, grade: g([0.012, 0, 0.02], [1, 0.96, 1.04], 1.05, 1.15, 0.8), gloss: 0.14 },
  ],
  news: [
    { ground: '#262c38', falloff: 0.55, grade: g([0, 0.004, 0.016], [0.98, 1, 1.04], 1.05, 1.1, 0.6), gloss: 0.4 },
    { ground: '#2e1a20', falloff: 0.55, grade: g([0.008, 0, 0.01], [1.03, 0.99, 1], 1.08, 1.1, 0.65), gloss: 0.4 },
    { ground: '#0a0a10', falloff: 0.9, grade: g([0, 0.002, 0.014], [1, 0.98, 1.02], 0.95, 1.18, 0.8), gloss: 0.22 },
  ],
  kitchen: [
    { ground: '#6a5a4c', falloff: 0.8, grade: g([0.006, 0.003, 0], [1.03, 1, 0.94], 1.05, 1.12, 0.5), gloss: 0.2, setDim: 0.22 },
    { ground: '#6a2a0c', falloff: 0.6, grade: g([0.014, 0.004, 0], [1.08, 0.96, 0.84], 1.12, 1.12, 0.85), gloss: 0.24 },
    { ground: '#5a1806', falloff: 0.7, grade: g([0.014, 0.002, 0], [1.08, 0.92, 0.8], 1.1, 1.15, 0.85), gloss: 0.2 },
  ],
};

const FALLBACK: Look = { ground: '#303038', falloff: 0.5, grade: g([0, 0, 0], [1, 1, 1], 1.05, 1.05, 0.55), gloss: 0.2 };

/** A stage's rigs, as the game lights them: new objects, the stage's own left as they are. */
export function relight(stage: string, rigs: readonly SegmentLights[]): SegmentLights[] {
  return rigs.map((r, i) => {
    const look = LOOKS[stage]?.[i] ?? FALLBACK;
    return {
      ...r,
      ambient: { ...r.ambient, intensity: r.ambient.intensity * AMBIENT },
      key: { ...r.key, intensity: r.key.intensity * KEY },
      ground: r.ground ?? look.ground,
      falloff: r.falloff ?? look.falloff,
      grade: r.grade ?? look.grade,
      gloss: r.gloss ?? look.gloss,
      floorY: r.floorY ?? look.floorY ?? 0,
      mirror: r.mirror ?? look.mirror ?? 0,
      setDim: r.setDim ?? look.setDim ?? 0,
    };
  });
}

/**
 * Effects that are light, glowing until the art gives them their own
 * emission (docs/BLENDER-TODO.md, step 23 C): their painted colour, past white.
 */
const GLOW: Readonly<Record<string, number>> = { fx_lightning: 3, fx_spark: 2.5, fx_flare: 2.2 };

export function glowFallback(object: string, mat: THREE.MeshLambertMaterial): void {
  const k = GLOW[object];
  if (!k || mat.emissive.getHex() !== 0 || mat.emissiveMap) return;
  mat.emissive.copy(mat.color).multiplyScalar(k);
  mat.emissiveMap = mat.map;
}

/** Shared by every set material. */
const SET = {
  falloff: { value: 0.5 },
  dim: { value: 0 },
};

export function setFalloff(f: number, dim: number): void {
  SET.falloff.value = f;
  SET.dim.value = dim;
}

/**
 * Adds the falloff to a set's material: the studio's light is on the fight,
 * so the set darkens behind the fighters (from 0.5 m back), out past the
 * walls and up towards the grid. Only the light it reflects: what it gives
 * off (emission) stays as bright.
 */
export function addSetLight(mat: THREE.Material): void {
  if (!(mat instanceof THREE.MeshLambertMaterial)) return;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSetFalloff = SET.falloff;
    shader.uniforms.uSetDim = SET.dim;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSetWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n#ifdef USE_INSTANCING\nvSetWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvSetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSetWorld;\nuniform float uSetFalloff;\nuniform float uSetDim;')
      .replace(
        '#include <aomap_fragment>',
        [
          '#include <aomap_fragment>',
          'float setBack = smoothstep(0.3, 3.5, -vSetWorld.z) * 0.45;',
          'float setSide = smoothstep(5.0, 9.0, abs(vSetWorld.x)) * 0.5;',
          'float setUp = smoothstep(3.0, 7.0, vSetWorld.y) * 0.4;',
          'float setLit = (1.0 - uSetDim) * (1.0 - uSetFalloff * (1.0 - (1.0 - setBack) * (1.0 - setSide) * (1.0 - setUp)));',
          'reflectedLight.directDiffuse *= setLit;',
          'reflectedLight.indirectDiffuse *= setLit;',
        ].join('\n'),
      );
  };
  mat.customProgramCacheKey = () => 'signoff-set';
}

/**
 * The studio's lights banging on bank by bank as a round goes on air: how
 * bright the picture is, 0 to 1. Three steps over the first 24 steps of the
 * intro, full otherwise.
 */
export function powerOn(m: MatchState): number {
  if (m.phase !== 'intro') return 1;
  const t = INTRO_FRAMES - m.phaseTimer;
  return t < 8 ? 0.12 : t < 16 ? 0.4 : t < 24 ? 0.72 : 1;
}
