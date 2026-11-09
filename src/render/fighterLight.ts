/**
 * Light that belongs to the fighters, not the set: a rim on their edges in
 * the segment's rim colour, so they stand out from busy backdrops, and a
 * soft contact shadow under each that shrinks and fades as they leave the
 * floor. The rim is a few lines added to the Lambert shader with shared
 * uniforms, so changing its colour never recompiles anything; the same
 * shader bands the key light into lit, half-lit and shade, which suits the
 * faceted models and reads at play size.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';

/** Shared by every fighter material. */
const RIM = {
  color: { value: new THREE.Color(0xbfd8ff) },
  strength: { value: 0.5 },
  /** 0 smooth Lambert, 1 hard bands: in between keeps a little of the gradient. */
  band: { value: 0.7 },
};

/** The key light's falloff over the surface, banded: shade, a half-lit step, lit. */
const BANDED_LAMBERT = THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  [
    'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
    'float bands = 0.55 * smoothstep(0.08, 0.14, dotNL) + 0.45 * smoothstep(0.5, 0.56, dotNL);',
    'dotNL = mix(dotNL, bands, uBand);',
  ].join('\n'),
);
/** Shared by every fighter material: the clock the signal damage flickers by, and how much tape there is (VHS LOOK). */
const SIGNAL = {
  time: { value: 0 },
  tape: { value: 1 },
};

/**
 * Signal damage (src/render/wear.ts): bands of the body drop out to snow
 * as the tape would, the colour comes apart at their edges, specks of snow,
 * and the picture under it goes dull and dark, like a bruise. The share of
 * bands that drop out grows with the wear. With the tape off only the
 * dulling is left.
 */
const SIGNAL_DAMAGE = [
  'if (uWear > 0.001) {',
  '  float bandY = vViewPosition.y * 13.0 + uSigTime * 2.5;',
  '  float band = floor(bandY);',
  '  float h = fract(sin(band * 12.9898 + floor(uSigTime * 7.0) * 4.1) * 43758.5453);',
  '  float drop = step(1.0 - uWear * 0.4, h) * uSigTape;',
  '  float n = fract(sin(dot(gl_FragCoord.xy + floor(uSigTime * 30.0) * 17.0, vec2(12.9898, 78.233))) * 43758.5453);',
  '  float grey = dot(outgoingLight, vec3(0.299, 0.587, 0.114));',
  '  outgoingLight = mix(outgoingLight, vec3(grey) * 0.8, uWear * 0.4);',
  '  outgoingLight = mix(outgoingLight, vec3(0.15 + 0.75 * n) * (0.4 + grey), drop * 0.7);',
  '  float edge = fract(bandY);',
  '  outgoingLight += vec3(-0.1, 0.05, 0.16) * (uWear * uSigTape * step(0.82, edge) * step(0.5, h));',
  '  outgoingLight += vec3(step(1.0 - uWear * 0.025, n) * 0.7 * uSigTape);',
  '}',
].join('\n');

/** The signal damage's clock (seconds; hold it still for Reduce Motion) and the tape amount (0 to 1). */
export function setSignal(time: number, tape: number): void {
  SIGNAL.time.value = time;
  SIGNAL.tape.value = tape;
}

/** When the segment's rim light is off, a cool studio white. */
const DEFAULT_RIM = new THREE.Color(0xbfd8ff);
const WHITE = new THREE.Color(0xffffff);

/** Adds the rim to a fighter's material: brighter where the surface turns away from the camera. */
export function addRim(mat: THREE.MeshLambertMaterial, wear: { value: number } = { value: 0 }): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = RIM.color;
    shader.uniforms.uRimStrength = RIM.strength;
    shader.uniforms.uBand = RIM.band;
    // The fighter's own signal damage; the clock and tape amount are everyone's.
    shader.uniforms.uWear = wear;
    shader.uniforms.uSigTime = SIGNAL.time;
    shader.uniforms.uSigTape = SIGNAL.tape;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uBand;\nuniform float uWear;\nuniform float uSigTime;\nuniform float uSigTape;')
      .replace('#include <lights_lambert_pars_fragment>', BANDED_LAMBERT)
      .replace(
        '#include <opaque_fragment>',
        `float rimF = 1.0 - saturate(dot(normalize(normal), normalize(vViewPosition)));\noutgoingLight += uRimColor * (rimF * rimF * rimF * uRimStrength);\n${SIGNAL_DAMAGE}\n#include <opaque_fragment>`,
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

/** A soft dark disc under each fighter, drawn out away from the key light. */
export class ContactShadows {
  private readonly discs: THREE.Mesh[] = [];
  private readonly mat: THREE.MeshBasicMaterial[] = [];
  /** How far the shadow falls along the floor per metre of height, from the key light (x, z). */
  private castX = 0;
  private castZ = 0;

  /** The segment's key light: a low light throws a longer shadow. */
  setKey(key: THREE.DirectionalLight): void {
    const p = key.position;
    const up = Math.max(1, p.y);
    this.castX = Math.max(-0.6, Math.min(0.6, -p.x / up));
    this.castZ = Math.max(-0.6, Math.min(0.6, -p.z / up));
  }

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
    // Pulled along the floor away from the key, about a third of the way to where the fighter's middle would land.
    const reach = lying ? 0.1 : 0.35;
    d.position.set(toFloat(f.x) + this.castX * reach, 0.012, this.castZ * reach * 0.5);
    d.scale.set((lying ? 2.0 : 1.1 + Math.abs(this.castX) * 0.8) * s, 1, (0.7 + Math.abs(this.castZ) * 0.3) * s);
    this.mat[i].opacity = 0.65 * s;
  }
}
