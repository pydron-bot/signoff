/**
 * Changing channel: a burst of static that clears to the new picture, with
 * the set's on-screen display (green, top right: the channel and what's on)
 * staying a moment after. The display alone shows the action replay's
 * REW and REPLAY. A quad kept just in front of the fight camera, so
 * it shows full screen and on the living room's TV alike (that draws the
 * same scene through the same camera). One draw call while it shows; the
 * text is drawn once per change. Runs on display time (the new match is
 * still in its cold open, not stepping).
 */
import * as THREE from 'three';

/** Seconds of full static, of it clearing, and of the display in all. */
const STATIC = 0.32;
const CLEAR = 0.3;
const OSD = 1.8;
/** The display's width, of the picture's. */
const OSD_W = 0.3;
/** How far in front of the camera the card sits (m): inside the near clip of nothing. */
const DIST = 0.2;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform float uTime;
uniform float uStatic;
uniform float uOsd;
uniform sampler2D tOsd;
uniform vec2 uOsdSize;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // Snow: coarse grains, new each frame, with a darker band rolling through.
  float t = floor(uTime * 30.0);
  float n = hash(floor(vUv * vec2(220.0, 124.0)) + t * 1.37);
  float band = 0.75 + 0.25 * smoothstep(0.0, 0.15, abs(fract(vUv.y + uTime * 1.3) - 0.5));
  vec4 col = vec4(vec3(n * band), uStatic);
  // The display, top right.
  // Top right, under the HUD's bars.
  vec2 o = (vUv - vec2(0.96, 0.8) + uOsdSize) / uOsdSize;
  if (uOsd > 0.0 && o.x > 0.0 && o.x < 1.0 && o.y > 0.0 && o.y < 1.0) {
    vec4 text = texture2D(tOsd, o);
    col = mix(col, vec4(text.rgb, 1.0), text.a * uOsd);
  }
  gl_FragColor = col;
}`;

export class ChannelFlip {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;
  private readonly canvas = document.createElement('canvas');
  private readonly osd: THREE.CanvasTexture;
  private t = -1;
  /** This showing: whether it starts in static, and how long the display stays (s). */
  private snow = true;
  private hold = OSD;
  private readonly fwd = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.canvas.width = 512;
    this.canvas.height = 280;
    this.osd = new THREE.CanvasTexture(this.canvas);
    this.osd.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uStatic: { value: 0 }, uOsd: { value: 0 }, tOsd: { value: this.osd }, uOsdSize: { value: new THREE.Vector2(OSD_W, 0.2) } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.renderOrder = 20;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Changes channel: static (unless `snow` is false), then the picture, with `lines` on the display (the first big) for `seconds`. */
  start(lines: readonly string[], snow = true, seconds = OSD): void {
    this.snow = snow;
    this.hold = seconds;
    const g = this.canvas.getContext('2d');
    if (g) {
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      g.textAlign = 'right';
      g.textBaseline = 'top';
      g.lineJoin = 'round';
      let y = 0;
      lines.forEach((line, i) => {
        // As big as it's meant to be, or as fits.
        let size = i === 0 ? 120 : 40;
        g.font = `bold ${size}px ui-monospace, Menlo, monospace`;
        const fit = (this.canvas.width - 24) / Math.max(1, g.measureText(line).width);
        if (fit < 1) {
          size = Math.floor(size * fit);
          g.font = `bold ${size}px ui-monospace, Menlo, monospace`;
        }
        g.lineWidth = i === 0 ? 10 : 6;
        g.strokeStyle = 'rgba(0, 20, 0, 0.85)';
        g.strokeText(line, this.canvas.width - 12, y + 8);
        g.fillStyle = '#5dff6a';
        g.fillText(line, this.canvas.width - 12, y + 8);
        y += size * 1.15;
      });
      this.osd.needsUpdate = true;
    }
    this.t = 0;
  }

  /** Takes it down now. */
  stop(): void {
    this.t = -1;
    this.mesh.visible = false;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  /** Each drawn frame, after the camera is placed: `dt` seconds on. */
  update(camera: THREE.PerspectiveCamera, dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    if (this.t > this.hold) {
      this.t = -1;
      this.mesh.visible = false;
      return;
    }
    const u = this.mat.uniforms;
    u.uTime.value = this.t;
    u.uStatic.value = !this.snow ? 0 : this.t < STATIC ? 1 : Math.max(0, 1 - (this.t - STATIC) / CLEAR);
    u.uOsd.value = Math.min(1, (this.hold - this.t) / 0.25);
    // The display keeps the canvas's shape on any screen.
    (u.uOsdSize.value as THREE.Vector2).set(OSD_W, (OSD_W * camera.aspect * this.canvas.height) / this.canvas.width);
    // Filling the view, just in front of the lens.
    const h = 2 * DIST * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    this.mesh.scale.set(h * camera.aspect, h, 1);
    camera.getWorldDirection(this.fwd);
    this.mesh.position.copy(camera.position).addScaledVector(this.fwd, DIST);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.visible = true;
  }
}
