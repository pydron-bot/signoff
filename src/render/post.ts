/**
 * The picture after the scene is drawn: the scene goes to a high-range
 * buffer (multisampled, so no jaggies), a glow is pulled out of whatever is
 * brighter than white and blurred down a short chain of smaller buffers, and
 * one last shader puts it on screen as a tape would: sharp brightness with
 * the colour smeared sideways, a tracking tear and a colour split on big
 * hits, the glow, a highlight roll-off, the segment's grade, a vignette, a little
 * grain and the flash of an impact frame. The scan lines stay in CSS so they
 * cover the HUD too. About 9 draw calls, all full-screen and most of them
 * small. Nothing here allocates per frame.
 */
import * as THREE from 'three';

/** A segment's colour grade, applied after tone mapping. */
export interface Grade {
  /** Added to the shadows (linear, about ±0.03). */
  lift: [number, number, number];
  /** Multiplies the highlights. */
  gain: [number, number, number];
  saturation: number;
  contrast: number;
  /** How hard the glow blooms. */
  bloom: number;
}

export const NEUTRAL_GRADE: Readonly<Grade> = { lift: [0, 0, 0], gain: [1, 1, 1], saturation: 1.05, contrast: 1.05, bloom: 0.55 };

/** The glow's chain: half, quarter, eighth and sixteenth size, then back up. */
const LEVELS = 4;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** Keeps what is brighter than the threshold (with a soft knee), four taps for a smooth half-size copy. */
const PREFILTER = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
vec3 keep(vec3 c) {
  float l = max(c.r, max(c.g, c.b));
  float knee = uThreshold * 0.25;
  float s = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
  s = s * s / (4.0 * knee + 1e-4);
  return c * max(s, l - uThreshold) / max(l, 1e-4);
}
void main() {
  vec3 c = keep(texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb);
  c += keep(texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb);
  c += keep(texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb);
  c += keep(texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb);
  // Keeps a lone bright pixel from flickering as it moves.
  gl_FragColor = vec4(min(c * 0.25, vec3(16.0)), 1.0);
}`;

/** Dual Kawase: down blurs as it halves... */
const DOWN = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;

/** ...and up blurs again as it doubles, adding the level it lands on. */
const UP = /* glsl */ `
uniform sampler2D tSrc;
uniform sampler2D tAdd;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-2.0, 0.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(2.0, 0.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(0.0, -2.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(0.0, 2.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb * 2.0;
  gl_FragColor = vec4(c / 12.0 + texture2D(tAdd, vUv).rgb, 1.0);
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2 uTexel;
uniform float uTime;
uniform float uVhs;
uniform float uTear;
uniform float uSplit;
uniform float uImpact;
uniform float uDim;
uniform float uBloom;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uContrast;
uniform float uGrain;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  // The tape's tracking: each line pulled sideways a little, more in a band that rolls down the picture.
  float line = floor(uv.y * 240.0);
  float frame = floor(uTime * 30.0);
  float jitter = (hash(line + frame * 7.0) - 0.5) * 0.0012 * uVhs;
  float band = fract(0.9 - uTime * 0.6);
  float inBand = 1.0 - smoothstep(0.0, 0.07, abs(uv.y - band));
  float tear = uTear * ((hash(line * 0.37 + frame) - 0.5) * 0.012 + inBand * 0.035 * (hash(frame) - 0.3));
  uv.x += jitter + tear;

  vec3 c0 = texture2D(tScene, uv).rgb;
  vec3 col = c0;
  if (uVhs > 0.0) {
    // Composite video: brightness keeps its detail, colour is carried on a narrow band and smears, lagging to the right.
    vec3 sum = c0;
    for (int i = 1; i <= 4; i++) sum += texture2D(tScene, uv - vec2(uTexel.x * float(i) * 2.5, 0.0)).rgb;
    sum *= 0.2;
    float y = dot(c0, vec3(0.299, 0.587, 0.114));
    float ci = dot(sum, vec3(0.596, -0.274, -0.322));
    float cq = dot(sum, vec3(0.211, -0.523, 0.312));
    vec3 bled = vec3(y + 0.956 * ci + 0.621 * cq, y - 0.272 * ci - 0.647 * cq, y - 1.106 * ci + 1.703 * cq);
    col = mix(c0, max(bled, 0.0), uVhs);
  }
  if (uSplit > 0.0) {
    // A big hit knocks the guns out of line: red one way, blue the other.
    col.r = mix(col.r, texture2D(tScene, uv + vec2(uSplit, 0.0)).r, 0.8);
    col.b = mix(col.b, texture2D(tScene, uv - vec2(uSplit, 0.0)).b, 0.8);
  }
  col += texture2D(tBloom, uv).rgb * uBloom;

  // Tone mapping that leaves the art alone up to 0.8 and rolls everything brighter smoothly into white,
  // keeping its hue (the stock curves darken the shadows, and these sets live in them).
  float peak = max(col.r, max(col.g, col.b));
  if (peak > 0.8) col *= (0.8 + 0.2 * (1.0 - exp(-(peak - 0.8) / 0.2))) / peak;

  // The grade: lift the shadows, scale the highlights, then contrast about the middle and saturation.
  col = col * uGain + uLift * (1.0 - col);
  col = (col - 0.18) * uContrast + 0.18;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(l), col, uSaturation), 0.0);

  // An impact frame: the picture blown out to a hard negative for a moment.
  if (uImpact > 0.0) {
    float k = smoothstep(0.12, 0.3, l);
    col = mix(col, vec3(1.0 - k) * vec3(1.0, 0.92, 0.95), uImpact);
  }

  vec2 d = vUv - 0.5;
  col *= 1.0 - dot(d, d) * (0.55 + 0.35 * uVhs);
  col += (hash2(vUv * 913.0 + frame) - 0.5) * uGrain;
  col *= uDim;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  #include <colorspace_fragment>
}`;

function pass(frag: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
}

function target(type: THREE.TextureDataType, samples = 0, depth = false): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(1, 1, { type, samples, depthBuffer: depth, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
}

export class Post {
  /** The VHS look, 0 off to 1 full (Settings: VHS LOOK). */
  vhs = 1;
  /** A tracking tear, 0 to 1: set from the glitch layer each frame. */
  tear = 0;
  /** A colour split, 0 to 1. */
  split = 0;
  /** An impact frame, 0 to 1. */
  impact = 0;
  /** How bright the picture is: the title screen dims the demo behind it. */
  dim = 1;
  /** Scales the grade's saturation (the title's demo is washed out). */
  saturation = 1;
  /** Grain flickers each frame; Reduce Motion keeps it still. */
  stillGrain = false;
  /** The segment's colour grade: the arena's, which the stage sets. */
  grade: Grade = NEUTRAL_GRADE;

  /** Whether the buffer keeps what's brighter than white (half floats); the performance overlay shows it. */
  readonly hdr: boolean;
  private readonly scene: THREE.WebGLRenderTarget;
  private readonly down: THREE.WebGLRenderTarget[] = [];
  private readonly up: THREE.WebGLRenderTarget[] = [];
  /** One triangle over the whole screen, drawn with each pass's material in turn. */
  private readonly quad = fullScreen();
  private readonly prefilter: THREE.ShaderMaterial;
  private readonly downMat: THREE.ShaderMaterial;
  private readonly upMats: THREE.ShaderMaterial[] = [];
  private readonly composite: THREE.ShaderMaterial;
  /** Below 1, the scene is drawn smaller than the screen: the tape's softness hides it, and the phone saves the fill. */
  private scale = 1;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    // Half floats keep what's brighter than white for the glow; without them, 8 bits and a lower threshold.
    const gl = renderer.getContext();
    this.hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    const type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.scene = target(type, 4, true);
    for (let i = 0; i < LEVELS; i++) this.down.push(target(type));
    for (let i = 0; i < LEVELS - 1; i++) this.up.push(target(type));
    this.prefilter = pass(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: this.hdr ? 1.0 : 0.8 } });
    this.downMat = pass(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    for (let i = 0; i < LEVELS - 1; i++) this.upMats.push(pass(UP, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } }));
    this.composite = new THREE.ShaderMaterial({
      toneMapped: false,
      vertexShader: VERT,
      fragmentShader: COMPOSITE,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.scene.texture },
        tBloom: { value: this.up[0].texture },
        uTexel: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uVhs: { value: 1 },
        uTear: { value: 0 },
        uSplit: { value: 0 },
        uImpact: { value: 0 },
        uDim: { value: 1 },
        uBloom: { value: 0.5 },
        uLift: { value: new THREE.Vector3() },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uSaturation: { value: 1 },
        uContrast: { value: 1 },
        uGrain: { value: 0.02 },
      },
    });
  }

  /** The drawing size in device pixels, and how much smaller the scene is drawn. */
  setSize(width: number, height: number, scale: number): void {
    this.scale = scale;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    this.scene.setSize(w, h);
    (this.composite.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    let lw = w;
    let lh = h;
    for (let i = 0; i < LEVELS; i++) {
      lw = Math.max(1, lw >> 1);
      lh = Math.max(1, lh >> 1);
      this.down[i].setSize(lw, lh);
      if (i < LEVELS - 1) this.up[i].setSize(lw, lh);
    }
  }

  get drawScale(): number {
    return this.scale;
  }

  /** Compiles a scene's shaders as they'll be drawn: into the buffer (no tone mapping, linear), not to the screen. */
  compileScene(scene: THREE.Object3D, camera: THREE.Camera): void {
    const r = this.renderer;
    const was = r.getRenderTarget();
    // Hidden things too (echoes, mirror copies, the next segment's pieces), so nothing compiles mid-fight.
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.visible) return;
      hidden.push(o);
      o.visible = true;
    });
    r.setRenderTarget(this.scene);
    r.compile(scene, camera);
    r.setRenderTarget(was);
    for (const o of hidden) o.visible = false;
  }

  /** Compiles every pass's shader now, not on the first frame of a fight. */
  compile(): void {
    for (const m of [this.prefilter, this.downMat, ...this.upMats, this.composite]) {
      this.quad.material = m;
      this.renderer.compile(this.quad, PASS_CAMERA);
    }
  }

  render(scene: THREE.Scene, camera: THREE.Camera, timeMs: number): void {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);

    // The glow: bright pass to half size, down to a sixteenth, back up to half.
    this.run(this.prefilter, this.scene.texture, this.scene, this.down[0]);
    for (let i = 1; i < LEVELS; i++) this.run(this.downMat, this.down[i - 1].texture, this.down[i - 1], this.down[i]);
    for (let i = LEVELS - 2; i >= 0; i--) {
      const m = this.upMats[i];
      const src = i === LEVELS - 2 ? this.down[LEVELS - 1] : this.up[i + 1];
      m.uniforms.tAdd.value = this.down[i].texture;
      this.run(m, src.texture, src, this.up[i]);
    }

    const u = this.composite.uniforms;
    const g = this.grade;
    u.uTime.value = this.stillGrain ? 0 : (timeMs / 1000) % 1000;
    u.uVhs.value = this.vhs;
    u.uTear.value = this.tear;
    u.uSplit.value = this.split * 0.006;
    u.uImpact.value = this.impact;
    u.uDim.value = this.dim;
    // The chain adds four levels together.
    u.uBloom.value = g.bloom / LEVELS;
    (u.uLift.value as THREE.Vector3).set(...g.lift);
    (u.uGain.value as THREE.Vector3).set(...g.gain);
    u.uSaturation.value = g.saturation * this.saturation;
    u.uContrast.value = g.contrast;
    u.uGrain.value = 0.008 + 0.01 * this.vhs;
    r.setRenderTarget(null);
    this.quad.material = this.composite;
    r.render(this.quad, PASS_CAMERA);
  }

  private run(m: THREE.ShaderMaterial, src: THREE.Texture, srcTarget: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget): void {
    m.uniforms.tSrc.value = src;
    // Taps sit half a source texel out, so each bilinear read averages four.
    (m.uniforms.uTexel.value as THREE.Vector2).set(0.5 / srcTarget.width, 0.5 / srcTarget.height);
    this.quad.material = m;
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.quad, PASS_CAMERA);
  }
}

const PASS_CAMERA = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function fullScreen(): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
  const m = new THREE.Mesh(g);
  m.frustumCulled = false;
  return m;
}
