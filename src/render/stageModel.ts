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
}

export interface StageArt {
  /** Every object by name: `set`, `seg_*`, `prop_*`, `fx_*`, as placed in the file. */
  objects: Map<string, THREE.Object3D>;
  lights: SegmentLights[];
}

const loader = new GLTFLoader();
const files = new Map<string, Promise<StageArt>>();

/** Loads (once) a stage's GLB. Rejects if there isn't one. */
export function loadStageArt(id: string): Promise<StageArt> {
  let p = files.get(id);
  if (!p) {
    p = loader.loadAsync(publicUrl(`assets/stages/${id}.glb`)).then((g) => {
      const objects = new Map<string, THREE.Object3D>();
      let lights: SegmentLights[] = [];
      for (const o of [...g.scene.children]) {
        g.scene.remove(o);
        if (o.name === 'lights') {
          lights = JSON.parse(String(o.userData.segments ?? '[]')) as SegmentLights[];
          continue;
        }
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) m.material = lambert(m.material as THREE.MeshStandardMaterial);
        });
        objects.set(o.name, o);
      }
      return { objects, lights };
    });
    p.catch(() => files.delete(id));
    files.set(id, p);
  }
  return p;
}
