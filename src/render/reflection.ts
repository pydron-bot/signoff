/**
 * The fighters reflected in a glossy floor and in Burn's mirrors, without
 * drawing the scene twice or rendering to a texture: each fighter mesh gets
 * a copy that shares its geometry and skeleton, and a vertex shader that
 * mirrors it across the plane. Its depth is that of the plane where the view
 * ray meets it, so anything standing in front of the floor or the mirror
 * (a desk, a mirror frame, the other fighter) still hides it, and it never
 * shows through the floor. One copy per mesh per plane: 3 to 6 draw calls a
 * fighter for the floor, as many again for the mirror.
 */
import * as THREE from 'three';

/** A plane's reflection, shared by every fighter's copies of it. */
interface Plane {
  /** The plane: normal (xyz) and its distance from the origin along it (w). */
  plane: { value: THREE.Vector4 };
  /** How strong the reflection is: 0 hides it. */
  strength: { value: number };
  /** The reflection fades out over this distance from the plane, metres (0: no fade). */
  fade: { value: number };
  /** Only within this rectangle on the plane: x min, x max, y min, y max. */
  bounds: { value: THREE.Vector4 };
}

function plane(normal: [number, number, number], d: number, fade: number, bounds: [number, number, number, number]): Plane {
  return {
    plane: { value: new THREE.Vector4(...normal, d) },
    strength: { value: 0 },
    fade: { value: fade },
    bounds: { value: new THREE.Vector4(...bounds) },
  };
}

/** The floor (y = 0), and Burn's mirror wall (z = −3.9, x ±8, up to 3 m: docs/BLENDER-TODO.md, step 23 D). */
export const FLOOR = plane([0, 1, 0], 0, 1.8, [-99, 99, -99, 99]);
export const MIRROR = plane([0, 0, 1], -3.9, 0, [-8, 8, 0.02, 3.0]);
export type ReflectPlane = typeof FLOOR;

/** A segment's reflections: the floor's gloss (and height, for a flood), and the mirror's strength. */
export function setReflections(gloss: number, floorY: number, mirror: number): void {
  FLOOR.strength.value = gloss;
  FLOOR.plane.value.w = floorY;
  MIRROR.strength.value = mirror;
}

/** A material for a fighter's reflection: its own colours, unlit by the rim, faded with distance from the plane. */
export function reflectionMaterial(src: THREE.MeshLambertMaterial, p: ReflectPlane): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({
    color: src.color,
    map: src.map,
    vertexColors: src.vertexColors,
    transparent: true,
    depthWrite: true,
    // Mirrored, the faces wind the other way round.
    side: THREE.BackSide,
    // Wins against the plane it lies on; the first copy drawn at a pixel keeps it, so limbs don't double up.
    depthFunc: THREE.LessDepth,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uPlane = p.plane;
    shader.uniforms.uStrength = p.strength;
    shader.uniforms.uFade = p.fade;
    shader.uniforms.uBounds = p.bounds;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uPlane;\nvarying float vAbove;\nvarying vec3 vOnPlane;')
      // Drawn back-face, three.js flips the normals; a reflection is lit as the surface it shows.
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n#ifdef FLIP_SIDED\ntransformedNormal = -transformedNormal;\n#endif')
      .replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          'vec4 rw = modelMatrix * vec4(transformed, 1.0);',
          'vAbove = dot(rw.xyz, uPlane.xyz) - uPlane.w;',
          'vec3 mirrored = rw.xyz - 2.0 * vAbove * uPlane.xyz;',
          // Where the eye's ray to the mirrored point crosses the plane: what the floor shows there.
          'vec3 ray = mirrored - cameraPosition;',
          'float t = (uPlane.w - dot(cameraPosition, uPlane.xyz)) / dot(ray, uPlane.xyz);',
          'vOnPlane = cameraPosition + ray * t;',
          'vec4 clipM = projectionMatrix * viewMatrix * vec4(mirrored, 1.0);',
          // Depth a few cm off the plane, so it shows over mats, tape and decals lying on it.
          'vec4 clipP = projectionMatrix * viewMatrix * vec4(vOnPlane + uPlane.xyz * 0.05, 1.0);',
          'gl_Position = vec4(clipM.xy, clipP.z / clipP.w * clipM.w, clipM.w);',
        ].join('\n'),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uPlane;\nuniform float uStrength;\nuniform float uFade;\nuniform vec4 uBounds;\nvarying float vAbove;\nvarying vec3 vOnPlane;')
      .replace(
        '#include <clipping_planes_fragment>',
        [
          '#include <clipping_planes_fragment>',
          // What's behind the plane (a foot through the floor) has nothing to reflect; nor has the plane outside its bounds.
          'float onX = abs(uPlane.x) > 0.5 ? vOnPlane.z : vOnPlane.x;',
          'float onY = abs(uPlane.y) > 0.5 ? vOnPlane.z : vOnPlane.y;',
          'if (vAbove < -0.01 || onX < uBounds.x || onX > uBounds.y || onY < uBounds.z || onY > uBounds.w) discard;',
          'diffuseColor.a = uStrength * (uFade > 0.0 ? 1.0 - smoothstep(0.0, uFade, vAbove) : 1.0);',
        ].join('\n'),
      );
  };
  m.customProgramCacheKey = () => 'signoff-reflect';
  return m;
}

/**
 * Copies of each mesh in a fighter for one plane, sharing geometry and
 * skeleton: added beside the originals, so they move with them.
 */
export function addReflection(model: THREE.Object3D, p: ReflectPlane, materials: Map<THREE.Material, THREE.MeshLambertMaterial>): THREE.Mesh[] {
  const sources: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.reflection) sources.push(m);
  });
  const copies: THREE.Mesh[] = [];
  for (const m of sources) {
    const src = m.material as THREE.MeshLambertMaterial;
    let mat = materials.get(src);
    if (!mat) {
      mat = reflectionMaterial(src, p);
      materials.set(src, mat);
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
    // After the set and the contact shadows.
    r.renderOrder = 2;
    r.userData.reflection = true;
    // Until the arena shows them (the art viewer never does).
    r.visible = false;
    m.parent!.add(r);
    copies.push(r);
  }
  return copies;
}
