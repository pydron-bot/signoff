/**
 * Light that belongs to the fighters, not the set: a rim on their edges in
 * the segment's rim colour, so they stand out from busy backdrops, and a
 * soft contact shadow under each that shrinks and fades as they leave the
 * floor. The rim is a few lines added to the Lambert shader with shared
 * uniforms, so changing its colour never recompiles anything.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';

/** Shared by every fighter material. */
const RIM = {
  color: { value: new THREE.Color(0xbfd8ff) },
  strength: { value: 0.5 },
};
/** When the segment's rim light is off, a cool studio white. */
const DEFAULT_RIM = new THREE.Color(0xbfd8ff);
const WHITE = new THREE.Color(0xffffff);

/** Adds the rim to a fighter's material: brighter where the surface turns away from the camera. */
export function addRim(mat: THREE.MeshLambertMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = RIM.color;
    shader.uniforms.uRimStrength = RIM.strength;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;')
      .replace(
        '#include <opaque_fragment>',
        'float rimF = 1.0 - saturate(dot(normalize(normal), normalize(vViewPosition)));\noutgoingLight += uRimColor * (rimF * rimF * rimF * uRimStrength);\n#include <opaque_fragment>',
      );
  };
  mat.customProgramCacheKey = () => 'signoff-rim';
}

/** The rim follows the segment's rim light: its colour (softened toward white), stronger when it's brighter. */
export function setRim(rim: THREE.DirectionalLight): void {
  const on = rim.intensity > 0;
  RIM.color.value.copy(on ? rim.color : DEFAULT_RIM).lerp(WHITE, 0.35);
  RIM.strength.value = 0.4 + 0.3 * Math.min(1, rim.intensity);
}

/** A soft dark disc under each fighter. */
export class ContactShadows {
  private readonly discs: THREE.Mesh[] = [];
  private readonly mat: THREE.MeshBasicMaterial[] = [];

  constructor(scene: THREE.Scene) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const d = new THREE.Mesh(geo, mat);
      d.renderOrder = 1;
      this.discs.push(d);
      this.mat.push(mat);
      scene.add(d);
    }
  }

  /** Under fighter i, unless they're off screen (mid-teleport). */
  update(m: MatchState, i: number, shown: boolean): void {
    const f = m.fighters[i];
    const d = this.discs[i];
    d.visible = shown;
    if (!shown) return;
    const y = Math.max(0, toFloat(f.y));
    const s = Math.max(0.35, 1 - y / 2.5);
    const lying = f.mode === 'down' || f.mode === 'ko' || f.mode === 'getup';
    d.position.set(toFloat(f.x), 0.012, 0);
    d.scale.set((lying ? 2.0 : 1.1) * s, 1, 0.7 * s);
    this.mat[i].opacity = 0.65 * s;
  }
}
