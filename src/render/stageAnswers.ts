/**
 * Each stage answering the fight in its own way (docs/VISUALS.md, section
 * 7): rain streaking across the lens in the Weather's storm, Burn's mirrors
 * flashing white on an ender, sparks off the Kitchen's burners when a body
 * bounces off the floor near one. (The News's ticker glitching on enders is
 * the HUD's: src/ui/hud.ts.) Stepped with the simulation; the rain is one
 * draw call while it falls (on the fight's layer: the cut-in's close-up has
 * its own lens), and goes with Reduce Motion. Nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MatchState, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import { FIGHT_LAYER } from './meshCopies';
import { MIRROR } from './reflection';
import type { Sparks } from './sparks';

/** The mirror flash: steps it lasts, and how white at its height. */
const FLASH_STEPS = 9;
/** A ground bounce this near a burner throws sparks off it (metres). */
const BURNER_NEAR = 1.4;
/** The rain's quad: this far in front of the lens (m). */
const RAIN_AT = 0.3;

const RAIN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Streaks blown across the glass, in columns that each fall at their own speed; a few drops beaded on it. */
const RAIN_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uAmount;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // Slanted by the wind.
  p.x += p.y * 0.18;
  float col = floor(p.x * 90.0);
  float speed = 1.6 + hash(col) * 1.4;
  float y = fract(p.y * 0.9 + uTime * speed + hash(col * 3.1));
  float on = step(0.72, hash(col * 7.7));
  float streak = on * smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.05, 0.22, y));
  float thin = 1.0 - smoothstep(0.0, 0.35, abs(fract(p.x * 90.0) - 0.5));
  float a = streak * thin * 0.5;
  gl_FragColor = vec4(vec3(0.75, 0.82, 0.95) * a * uAmount, 1.0);
}`;

export class StageAnswers {
  reduceMotion = false;
  private flash = 0;
  private readonly rain: THREE.Mesh;
  private readonly rainMat: THREE.ShaderMaterial;
  private raining = false;
  private steps = 0;
  private readonly forward = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    private readonly sparks: Sparks,
  ) {
    this.rainMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      uniforms: { uTime: { value: 0 }, uAspect: { value: 16 / 9 }, uAmount: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.rain = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 20;
    this.rain.visible = false;
    this.rain.layers.set(FIGHT_LAYER);
    scene.add(this.rain);
  }

  clear(): void {
    this.flash = 0;
    MIRROR.flash.value = 0;
  }

  /** Once per step, after it, with that step's events. */
  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    this.steps++;
    if (this.flash > 0) this.flash--;
    for (const e of ev) {
      if (e.type === 'hit' && e.weight === 3 && m.stage === 'burn') this.flash = FLASH_STEPS;
      else if (e.type === 'relaunch' && e.how === 'ground' && m.stage === 'kitchen') {
        const x = toFloat(e.x);
        for (const s of segmentData(m.stage, m.segment).hazards[0]?.spots ?? []) {
          const at = toFloat(s);
          if (Math.abs(at - x) > BURNER_NEAR) continue;
          // A shower off the burner: three bursts at the ring, orange past white.
          for (let k = 0; k < 3; k++) this.sparks.burst(at + (k - 1) * 0.25, 0.15 + k * 0.12, 0xff9a3c, 0.45 - k * 0.08, 10 + k * 3);
        }
      }
    }
    // White at once, fading out: a flash is light, not motion, so it stays with Reduce Motion.
    MIRROR.flash.value = this.flash > 0 ? (this.flash / FLASH_STEPS) ** 2 : 0;
    this.raining = m.stage === 'weather' && m.segment === 1 && !this.reduceMotion;
  }

  /** Each drawn frame, after the camera is placed: the rain on the lens. */
  update(camera: THREE.PerspectiveCamera): void {
    this.rain.visible = this.raining;
    if (!this.raining) return;
    // Across the whole view, just in front of the lens.
    const h = 2 * RAIN_AT * Math.tan((camera.fov * Math.PI) / 360);
    this.rain.scale.set(h * camera.aspect, h, 1);
    camera.getWorldDirection(this.forward);
    this.rain.position.copy(camera.position).addScaledVector(this.forward, RAIN_AT);
    this.rain.quaternion.copy(camera.quaternion);
    this.rainMat.uniforms.uTime.value = (this.steps / 60) % 1000;
    this.rainMat.uniforms.uAspect.value = camera.aspect;
  }
}
