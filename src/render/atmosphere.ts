/**
 * The air in the studio: a light haze in the segment's colour (scene fog),
 * faint beams from the set's own lamps, behind the fighters so they add
 * depth without covering anyone, and dust drifting in the light. Two draw
 * calls (the beams are one instanced mesh, the dust one set of points); the
 * dust drifts in its shader, so nothing is updated per frame but a clock.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';

/** A beam: from its lamp (x, y, z) down to the floor at (x2, z2), and its width there. */
type Beam = readonly [x: number, y: number, z: number, x2: number, z2: number, width: number];

interface Air {
  beams: readonly Beam[];
  /** The beams' colour and strength. */
  beam: number;
  beamStrength: number;
  /** The dust's colour and how much of it there is, 0 to 1. */
  dust: number;
  dustAmount: number;
  /** The haze: how thick (fog density), in the background's colour. */
  haze: number;
}

const NONE: Air = { beams: [], beam: 0, beamStrength: 0, dust: 0xffffff, dustAmount: 0.3, haze: 0.02 };

/** The news studio's grid: a fresnel over each of the falling lamps' spots, aimed down onto the back of the floor. */
const GRID: Beam[] = [-5, -3, -1, 1, 3, 5].map((x) => [x, 6.2, -2.4, x * 1.05, -1.2, 1.3] as const);
/** Dawn through Burn's windows, raking down and forward across the floor. */
const DAWN: Beam[] = [-6.5, -3.8, -1.1, 1.6, 4.3].map((x) => [x, 5.8, -3.9, x + 1.6, -0.8, 1.6] as const);

const AIRS: Readonly<Record<string, readonly Air[]>> = {
  weather: [
    { beams: [[-4.2, 6.5, -3, -3.6, -2.2, 1.6], [4.2, 6.5, -3, 3.6, -2.2, 1.6]], beam: 0xfff0dc, beamStrength: 0.07, dust: 0xfff4e0, dustAmount: 0.35, haze: 0.018 },
    { ...NONE, dust: 0xc8d4ff, dustAmount: 0.15, haze: 0.03 },
    { ...NONE, dust: 0x9cd8e0, dustAmount: 0.25, haze: 0.035 },
  ],
  burn: [
    { beams: DAWN, beam: 0xffc890, beamStrength: 0.09, dust: 0xffd8b0, dustAmount: 0.8, haze: 0.02 },
    { beams: DAWN, beam: 0xfff0d0, beamStrength: 0.1, dust: 0xfff0e0, dustAmount: 0.9, haze: 0.02 },
    { beams: [[0, 7.5, -1.5, 0, -0.2, 2.6]], beam: 0xc8b8ff, beamStrength: 0.1, dust: 0xc8b8ff, dustAmount: 0.5, haze: 0.04 },
  ],
  news: [
    { beams: GRID, beam: 0xe8f0ff, beamStrength: 0.08, dust: 0xe0e8ff, dustAmount: 0.22, haze: 0.022 },
    { beams: GRID, beam: 0xfff4e0, beamStrength: 0.08, dust: 0xffe8e0, dustAmount: 0.22, haze: 0.022 },
    { ...NONE, dust: 0x8090b0, dustAmount: 0.5, haze: 0.04 },
  ],
  kitchen: [
    { beams: [[-1.2, 2.7, -1.9, -1.2, -1.6, 1.0]], beam: 0xfff0d0, beamStrength: 0.08, dust: 0xfff0e0, dustAmount: 0.3, haze: 0.016 },
    { ...NONE, dust: 0xffa060, dustAmount: 1, haze: 0.045 },
    { ...NONE, dust: 0xff8040, dustAmount: 0.7, haze: 0.04 },
  ],
};

const MAX_BEAMS = 8;
const MOTES = 220;

const BEAM_VERT = /* glsl */ `
varying float vDown;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vDown = -position.y;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vDown;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  // Brightest at the lamp, gone by the floor; soft at the cone's edges, where the eye looks through less of it.
  float along = (1.0 - smoothstep(0.35, 1.0, vDown)) * smoothstep(0.0, 0.06, vDown);
  float edge = pow(abs(dot(normalize(vNormal), vView)), 1.6);
  gl_FragColor = vec4(uColor * uStrength * along * edge, 1.0);
}`;

const DUST_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
attribute float phase;
varying float vTwinkle;
void main() {
  vec3 p = position;
  // A slow drift and a lazy swirl, wrapped round inside the box so it never thins out.
  p.y = mod(p.y + uTime * (0.04 + 0.05 * fract(phase * 7.3)), 6.0);
  p.x += sin(uTime * 0.3 + phase * 6.28) * 0.35;
  p.z += cos(uTime * 0.23 + phase * 4.1) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.0 + fract(phase * 3.1)) + phase * 40.0);
  gl_PointSize = uSize * (0.6 + fract(phase * 11.0)) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAmount;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(c));
  gl_FragColor = vec4(uColor * a * vTwinkle * uAmount, 1.0);
}`;

export class Atmosphere {
  private readonly beams: THREE.InstancedMesh;
  private readonly beamMat: THREE.ShaderMaterial;
  private readonly dust: THREE.Points;
  private readonly dustMat: THREE.ShaderMaterial;
  private readonly fog = new THREE.FogExp2(0x000000, 0.02);
  private key = '';
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly dir = new THREE.Vector3();
  private readonly down = new THREE.Vector3(0, -1, 0);

  constructor(private readonly scene: THREE.Scene) {
    scene.fog = this.fog;
    // A cone with its tip cut off: the lamp's lens at the top, 1 m wide at the bottom, 1 m long.
    const cone = new THREE.CylinderGeometry(0.18, 0.5, 1, 16, 1, true).translate(0, -0.5, 0);
    this.beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uColor: { value: new THREE.Color() }, uStrength: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.beams = new THREE.InstancedMesh(cone, this.beamMat, MAX_BEAMS);
    this.beams.frustumCulled = false;
    this.beams.count = 0;
    this.beams.renderOrder = 3;
    scene.add(this.beams);

    // The motes, scattered once (a fixed pattern: this is the picture, not the match).
    const pos = new Float32Array(MOTES * 3);
    const phase = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      const h = (k: number) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
      pos[i * 3] = (h(1) - 0.5) * 16;
      pos[i * 3 + 1] = h(2) * 6;
      pos[i * 3 + 2] = -3.5 + h(3) * 5;
      phase[i] = h(4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: { uTime: { value: 0 }, uSize: { value: 60 }, uColor: { value: new THREE.Color() }, uAmount: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.dust = new THREE.Points(g, this.dustMat);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 3;
    scene.add(this.dust);
  }

  /** The drawing buffer's height: the motes keep their size in pixels across screens. */
  setHeight(px: number): void {
    this.dustMat.uniforms.uSize.value = 44 * (px / 720);
  }

  update(m: MatchState, seconds: number): void {
    const key = `${m.stage}:${m.segment}`;
    if (key !== this.key) {
      this.key = key;
      this.use(AIRS[m.stage]?.[m.segment] ?? NONE);
    }
    this.dustMat.uniforms.uTime.value = seconds % 10000;
    // The haze takes the segment's background colour, whatever the set has set it to.
    this.fog.color.copy(this.scene.background as THREE.Color);
  }

  private use(a: Air): void {
    this.fog.density = a.haze;
    (this.beamMat.uniforms.uColor.value as THREE.Color).setHex(a.beam);
    this.beamMat.uniforms.uStrength.value = a.beamStrength;
    (this.dustMat.uniforms.uColor.value as THREE.Color).setHex(a.dust);
    this.dustMat.uniforms.uAmount.value = a.dustAmount * 0.5;
    const n = Math.min(MAX_BEAMS, a.beams.length);
    for (let i = 0; i < n; i++) {
      const [x, y, z, x2, z2, w] = a.beams[i];
      this.dir.set(x2 - x, -y, z2 - z);
      const len = this.dir.length();
      this.q.setFromUnitVectors(this.down, this.dir.normalize());
      this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(w, len, w));
      this.beams.setMatrixAt(i, this.m);
    }
    this.beams.count = n;
    this.beams.instanceMatrix.needsUpdate = true;
    this.beams.visible = n > 0 && a.beamStrength > 0;
  }
}

function fract(v: number): number {
  return v - Math.floor(v);
}
