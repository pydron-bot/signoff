/**
 * The signal spray: where another fighting game sprays blood, a hit here
 * tears the picture. Thin bars of broken video (white, cyan, magenta and a
 * censor-red) burst from the contact the way the blow travels, flicker like
 * a dropout, fall a little and fade. Heavier hits throw more, further, and
 * an ender adds tracking tears across the body. One instanced mesh, so one
 * draw call however many are flying; nothing is allocated per frame.
 * Stepped with the simulation, so slow motion slows it too.
 */
import * as THREE from 'three';
import type { HitWeight, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';

const MAX = 128;
/** Bars per hit by weight (light, medium, heavy, ender), how fast they fly, and how long they last (steps). */
const COUNT = [5, 9, 15, 24] as const;
const SPEED = [0.035, 0.05, 0.07, 0.09] as const;
const LIFE = [10, 13, 16, 20] as const;
/** Tracking tears (long, thin, straight across) on the heaviest hits. */
const TEARS = [0, 0, 1, 3] as const;
const GRAVITY = 0.0035;
/** Weighted so the spray reads hot: red and magenta most, then white and cyan. */
const PALETTE = [0xff2a3a, 0xff2a3a, 0xff3ad0, 0xff3ad0, 0xffffff, 0x40e8ff] as const;
const BLOCK_COLOR = 0x60b0ff;

export class SignalBurst {
  private readonly mesh: THREE.InstancedMesh;
  private readonly px = new Float32Array(MAX);
  private readonly py = new Float32Array(MAX);
  private readonly vx = new Float32Array(MAX);
  private readonly vy = new Float32Array(MAX);
  private readonly w = new Float32Array(MAX);
  private readonly h = new Float32Array(MAX);
  private readonly left = new Int16Array(MAX);
  private readonly life = new Int16Array(MAX);
  /** A tear stays put and jitters sideways instead of flying. */
  private readonly tear = new Uint8Array(MAX);
  private readonly base: THREE.Color[] = [];
  private next = 0;
  private live = 0;
  private readonly m = new THREE.Matrix4();
  private readonly c = new THREE.Color();
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, MAX);
    this.mesh.renderOrder = 11;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.mesh.setMatrixAt(i, this.hidden);
      this.mesh.setColorAt(i, this.c.setHex(0));
      this.base.push(new THREE.Color());
    }
    this.mesh.count = MAX;
    scene.add(this.mesh);
  }

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'hit') this.burst(toFloat(e.x) - e.dir * 0.25, toFloat(e.y), e.dir, e.counter ? (Math.min(3, e.weight + 1) as HitWeight) : e.weight, false);
      else if (e.type === 'block') this.burst(toFloat(e.x), toFloat(e.y), 0, 0, true);
    }
  }

  private burst(x: number, y: number, dir: number, weight: HitWeight, blocked: boolean): void {
    const n = blocked ? 3 : COUNT[weight];
    const speed = blocked ? 0.02 : SPEED[weight];
    for (let k = 0; k < n; k++) {
      const i = this.take();
      // Mostly the way the blow travels, fanned out; a block just fizzes.
      const along = blocked ? (Math.random() - 0.5) * 0.6 : dir * (0.4 + Math.random() * 0.8);
      this.px[i] = x + (Math.random() - 0.5) * 0.15;
      this.py[i] = y + (Math.random() - 0.5) * 0.25;
      this.vx[i] = along * speed;
      this.vy[i] = (Math.random() * 0.9 - 0.2) * speed;
      this.w[i] = 0.05 + Math.random() * (0.1 + 0.08 * weight);
      this.h[i] = 0.012 + Math.random() * 0.022;
      this.life[i] = this.left[i] = (blocked ? 8 : LIFE[weight]) - Math.floor(Math.random() * 4);
      this.tear[i] = 0;
      this.base[i].setHex(blocked ? BLOCK_COLOR : PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    }
    if (blocked) return;
    for (let k = 0; k < TEARS[weight]; k++) {
      const i = this.take();
      this.px[i] = x - dir * 0.3;
      this.py[i] = y + (Math.random() - 0.5) * 0.9;
      this.vx[i] = this.vy[i] = 0;
      this.w[i] = 1.0 + Math.random() * 0.9;
      this.h[i] = 0.02 + Math.random() * 0.03;
      this.life[i] = this.left[i] = 6 + Math.floor(Math.random() * 6);
      this.tear[i] = 1;
      this.base[i].setHex(k % 2 ? 0x40e8ff : 0xff3ad0);
    }
  }

  /** The next slot; the oldest bar gives way when all are flying. */
  private take(): number {
    const i = this.next;
    this.next = (i + 1) % MAX;
    if (this.left[i] <= 0) this.live++;
    return i;
  }

  /** Once per simulation step. */
  update(): void {
    if (this.live === 0) return;
    for (let i = 0; i < MAX; i++) {
      if (this.left[i] <= 0) continue;
      if (--this.left[i] === 0) {
        this.live--;
        this.mesh.setMatrixAt(i, this.hidden);
        continue;
      }
      const t = this.left[i] / this.life[i];
      let x = this.px[i];
      if (this.tear[i]) x += (Math.random() - 0.5) * 0.12;
      else {
        this.px[i] += this.vx[i];
        this.py[i] += this.vy[i];
        this.vy[i] -= GRAVITY;
        // Drag: the spray bursts out and hangs.
        this.vx[i] *= 0.9;
      }
      // A dropout flickers: now and then a bar blinks out for a step.
      const on = Math.random() < 0.82;
      this.m.makeScale(on ? this.w[i] * (0.6 + 0.4 * t) : 0, this.h[i], 1);
      this.m.setPosition(x, this.py[i], 0.7);
      this.mesh.setMatrixAt(i, this.m);
      // Additive: fading the colour to black fades the bar.
      // Past white (×1.8), so the glow picks the bars up.
      this.mesh.setColorAt(i, this.c.copy(this.base[i]).multiplyScalar(t * 1.8));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Nothing flying (a replay seek, a new match). */
  clear(): void {
    for (let i = 0; i < MAX; i++) {
      this.left[i] = 0;
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.live = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
