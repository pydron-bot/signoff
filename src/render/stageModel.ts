/**
 * A stage's GLB (docs/BLENDER-TODO.md, step 6): the set, the pieces each
 * segment adds over it, the kickable props, effect meshes for the game to
 * place, and the light rig per segment (the `lights` node's extras).
 * Loaded once per stage.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { publicUrl } from '../core/paths';
import { lambert } from './fighterModel';
import { addSetLight, glowFallback, relight } from './look';
import type { Grade } from './post';

export interface LightSpec {
  color: string;
  intensity: number;
  position?: [number, number, number];
}

/** One segment's fixed lights: three.js space (y up, z toward the camera). */
export interface SegmentLights {
  segment: string;
  background: string;
  ambient: LightSpec;
  key: LightSpec;
  rim: LightSpec;
  /** A brief flash with the lightning (the storm). */
  flash?: LightSpec;
  /** The ambient's ground colour, the floor's bounce (game side: src/render/look.ts). */
  ground?: string;
  /** 0 to 1: how much the set darkens away from the fight (game side). */
  falloff?: number;
  /** The segment's colour grade (game side). */
  grade?: Grade;
  /** How strongly the floor reflects the fighters, and its height (game side). */
  gloss?: number;
  floorY?: number;
  /** How strongly Burn's mirrors reflect them (game side). */
  mirror?: number;
  /** Darkens the whole set, never the fighters (game side). */
  setDim?: number;
  /** Scales the fighters' rim, for a set they'd sink into (game side). */
  fighterRim?: number;
  /** How strongly the baked light map lights the set, 0 to 2 (docs/BLENDER-TODO.md, step 23). */
  lightMap?: number;
  /** The baked light map for this segment: a file beside the GLB in public/assets/stages/. */
  lightMapFile?: string;
}

export interface StageArt {
  /** Every object by name: `set`, `seg_*`, `prop_*`, `fx_*`, as placed in the file. */
  objects: Map<string, THREE.Object3D>;
  lights: SegmentLights[];
  /** The baked light maps named in the rigs, by file name; empty until the art has them. */
  lightMaps: Map<string, THREE.Texture>;
  /** The materials a light map goes on: those of `set` and the `seg_*` pieces. */
  setMaterials: THREE.MeshLambertMaterial[];
}

const loader = new GLTFLoader();
const textures = new THREE.TextureLoader();
const files = new Map<string, Promise<StageArt>>();

/** Loads (once) a stage's GLB. Rejects if there isn't one. */
export function loadStageArt(id: string): Promise<StageArt> {
  let p = files.get(id);
  if (!p) {
    p = loader.loadAsync(publicUrl(`assets/stages/${id}.glb`)).then((g) => {
      const objects = new Map<string, THREE.Object3D>();
      const setMaterials: THREE.MeshLambertMaterial[] = [];
      let lights: SegmentLights[] = [];
      for (const o of [...g.scene.children]) {
        g.scene.remove(o);
        if (o.name === 'lights') {
          lights = relight(id, JSON.parse(String(o.userData.segments ?? '[]')) as SegmentLights[]);
          continue;
        }
        // Shared materials are converted once, so the set's pieces keep sharing them.
        const swapped = new Map<THREE.Material, THREE.MeshLambertMaterial>();
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const src = m.material as THREE.MeshStandardMaterial;
          let mat = swapped.get(src);
          if (!mat) {
            mat = lambert(src);
            addSetLight(mat);
            glowFallback(o.name, mat);
            swapped.set(src, mat);
            if ((o.name === 'set' || o.name.startsWith('seg_')) && m.geometry.hasAttribute('uv1') && !setMaterials.includes(mat)) setMaterials.push(mat);
          }
          m.material = mat;
        });
        objects.set(o.name, o);
      }
      const names = [...new Set(lights.flatMap((l) => (l.lightMapFile ? [l.lightMapFile] : [])))];
      return Promise.all(names.map((n) => textures.loadAsync(publicUrl(`assets/stages/${n}`)))).then((maps) => {
        const lightMaps = new Map<string, THREE.Texture>();
        maps.forEach((t, i) => {
          // As glTF lays out its textures: not flipped, on the second UV set.
          t.flipY = false;
          t.channel = 1;
          t.colorSpace = THREE.SRGBColorSpace;
          lightMaps.set(names[i], t);
        });
        return { objects, lights, lightMaps, setMaterials };
      });
    });
    p.catch(() => files.delete(id));
    files.set(id, p);
  }
  return p;
}

/**
 * A segment's baked light map on the set: its own file, or the first one the
 * stage names (the lamps of segment 1). Once a stage has a light map every
 * segment keeps one (at 0 if need be), so a segment change never recompiles.
 * The maps are baked in key-light units (1.0 lights a surface about as the
 * key does: docs/BLENDER-TODO.md, step 23 B), so they're scaled by the key.
 */
export function applyLightMap(art: StageArt, spec: SegmentLights): void {
  const first = art.lightMaps.values().next().value;
  if (!first) return;
  const map = (spec.lightMapFile && art.lightMaps.get(spec.lightMapFile)) || first;
  for (const m of art.setMaterials) {
    m.lightMap = map;
    m.lightMapIntensity = (spec.lightMap ?? 1) * spec.key.intensity;
  }
}
