/**
 * A dark outline round each fighter, so they read against busy sets: a copy
 * of each mesh (src/render/meshCopies.ts) pushed out along its normals by a
 * fixed width in pixels and drawn back faces only, so only the rim past the
 * body shows. The models are faceted (their normals split at every edge),
 * which would crack the shell open at the edges, so the shell is pushed
 * along normals averaged over each position, worked out once per geometry.
 */
import * as THREE from 'three';
import { copyMeshes } from './meshCopies';

/** Shared by every outline. */
const OUTLINE = {
  /** Width in pixels of the drawing buffer, and its height (pixels are a fraction of the clip space's 2 units). */
  width: { value: 1.5 },
  height: { value: 720 },
  color: { value: new THREE.Color(0x07060c) },
};

/** About 1.4 pixels at 720 lines, scaled with the picture so it reads the same on every screen. */
export function setOutlineSize(heightPx: number): void {
  OUTLINE.height.value = heightPx;
  OUTLINE.width.value = Math.max(1, 1.4 * (heightPx / 720));
}

/** Normals averaged over every vertex at the same place: a closed shell to push out. */
function smoothNormals(g: THREE.BufferGeometry): void {
  if (g.hasAttribute('outlineNormal')) return;
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const sums = new Map<string, THREE.Vector3>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let s = sums.get(k);
    if (!s) sums.set(k, (s = new THREE.Vector3()));
    s.add(n.fromBufferAttribute(nor, i));
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(key(i))!;
    n.copy(s).normalize();
    out[i * 3] = n.x;
    out[i * 3 + 1] = n.y;
    out[i * 3 + 2] = n.z;
  }
  g.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
}

function outlineMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = OUTLINE.width;
    shader.uniforms.uOutlineHeight = OUTLINE.height;
    shader.uniforms.diffuse = OUTLINE.color;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 outlineNormal;\nuniform float uOutlineWidth;\nuniform float uOutlineHeight;')
      .replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          'vec3 on = outlineNormal;',
          '#ifdef USE_SKINNING',
          'mat4 outlineSkin = bindMatrixInverse * (skinWeight.x * boneMatX + skinWeight.y * boneMatY + skinWeight.z * boneMatZ + skinWeight.w * boneMatW) * bindMatrix;',
          'on = (outlineSkin * vec4(on, 0.0)).xyz;',
          '#endif',
          'vec4 onClip = projectionMatrix * vec4(normalize(normalMatrix * on), 0.0);',
          // Out along the normal on screen, the same number of pixels near or far.
          'gl_Position.xy += normalize(onClip.xy + 1e-6) * uOutlineWidth * 2.0 / uOutlineHeight * gl_Position.w * vec2(projectionMatrix[0][0] / projectionMatrix[1][1], 1.0);',
        ].join('\n'),
      );
  };
  m.customProgramCacheKey = () => 'signoff-outline';
  return m;
}

/** Outlines a fighter model: one shell per mesh, one material for them all. */
export function addOutline(model: THREE.Object3D): THREE.Mesh[] {
  const mat = outlineMaterial();
  const copies = copyMeshes(model, () => mat, 0);
  for (const c of copies) smoothNormals(c.geometry);
  return copies;
}
