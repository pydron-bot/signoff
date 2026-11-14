/**
 * The fighters' shadows: each fighter mesh gets a copy (src/render/meshCopies.ts,
 * like the floor reflection) whose vertex shader flattens it onto the floor
 * away from the segment's key light, drawn flat and dark. The first copy
 * drawn at a pixel keeps it (they lie at one depth and the test is
 * less-than), so limbs crossing don't darken twice. It fades with height
 * above the floor, so a jump's shadow goes soft and a raised fist's is
 * lighter than the feet's. One draw call a mesh: 3 to 7 a fighter. It
 * follows the floor's height (a flood) and is on the fight's layer, which
 * the cut-in's close-up doesn't draw.
 */
import * as THREE from 'three';
import { FIGHT_LAYER, copyMeshes } from './meshCopies';
import { FLOOR } from './reflection';

/** Shared by every shadow: how far it falls along the floor per metre of height (x, z), and how dark it is. */
const SHADOW = {
  cast: { value: new THREE.Vector2(0.3, -0.3) },
  strength: { value: 0.5 },
};
/** The longest a shadow falls per metre of height: a low key light would lay it across the set. */
const MAX_CAST = 0.6;
/** Metres above the floor over which a shadow fades out. */
const FADE = 2.2;

/** The segment's key light: the shadow falls away from it. */
export function setShadowKey(key: THREE.DirectionalLight): void {
  const p = key.position;
  const up = Math.max(1, p.y);
  SHADOW.cast.value.set(Math.max(-MAX_CAST, Math.min(MAX_CAST, -p.x / up)), Math.max(-MAX_CAST, Math.min(MAX_CAST, -p.z / up)));
}

function shadowMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    depthWrite: true,
    depthFunc: THREE.LessDepth,
    // Flattened, a face may wind either way.
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCast = SHADOW.cast;
    shader.uniforms.uShadow = SHADOW.strength;
    shader.uniforms.uFloor = FLOOR.plane;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uCast;\nuniform vec4 uFloor;\nvarying float vAbove;')
      .replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          'vec4 sw = modelMatrix * vec4(transformed, 1.0);',
          'vAbove = sw.y - uFloor.w;',
          // Along the light to the floor, a centimetre up so it sits on mats and tape lying there.
          'vec3 onFloor = vec3(sw.x + uCast.x * vAbove, uFloor.w + 0.01, sw.z + uCast.y * vAbove);',
          'gl_Position = projectionMatrix * viewMatrix * vec4(onFloor, 1.0);',
        ].join('\n'),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uShadow;\nvarying float vAbove;`)
      .replace(
        '#include <clipping_planes_fragment>',
        [
          '#include <clipping_planes_fragment>',
          // A foot through the floor casts nothing.
          'if (vAbove < -0.02) discard;',
          `diffuseColor.a = uShadow * (1.0 - smoothstep(0.0, ${FADE.toFixed(1)}, vAbove) * 0.85);`,
        ].join('\n'),
      );
  };
  m.customProgramCacheKey = () => 'signoff-shadow';
  return m;
}

/** A shadow copy of each mesh in a fighter, drawn after the set (before the reflections). One material for them all. */
export function addShadow(model: THREE.Object3D): THREE.Mesh[] {
  const mat = shadowMaterial();
  const copies = copyMeshes(model, () => mat, 1);
  for (const c of copies) c.layers.set(FIGHT_LAYER);
  return copies;
}
