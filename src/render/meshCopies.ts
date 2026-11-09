/**
 * Copies of a model's meshes that move with it: the same geometry and, for a
 * skinned mesh, the same skeleton, added beside each original so they pick
 * up its transform. The fighters' reflections and outlines are made this
 * way: no extra skeleton to pose, only the extra draw calls.
 */
import * as THREE from 'three';

/** A copy of each original mesh in `model` (never of another copy), with the material `material` makes for its source's. Hidden until shown. */
export function copyMeshes(model: THREE.Object3D, material: (src: THREE.Material) => THREE.Material, renderOrder: number): THREE.Mesh[] {
  const sources: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.copy) sources.push(m);
  });
  const made = new Map<THREE.Material, THREE.Material>();
  const copies: THREE.Mesh[] = [];
  for (const m of sources) {
    const src = m.material as THREE.Material;
    let mat = made.get(src);
    if (!mat) {
      mat = material(src);
      made.set(src, mat);
    }
    let r: THREE.Mesh;
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) {
      const s = m as THREE.SkinnedMesh;
      const sr = new THREE.SkinnedMesh(s.geometry, mat);
      sr.bindMode = s.bindMode;
      sr.bind(s.skeleton, s.bindMatrix);
      r = sr;
    } else r = new THREE.Mesh(m.geometry, mat);
    r.position.copy(m.position);
    r.quaternion.copy(m.quaternion);
    r.scale.copy(m.scale);
    r.frustumCulled = false;
    r.renderOrder = renderOrder;
    r.userData.copy = true;
    r.visible = false;
    m.parent!.add(r);
    copies.push(r);
  }
  return copies;
}
