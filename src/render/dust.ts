/**
 * A body meeting the set: when a fighter is thrown down, slammed into a
 * ground bounce or splatted on a wall, a shock ring runs out across the
 * floor (or up the wall) and dust kicks up and drifts, caught in the studio
 * light. Two instanced meshes, so two draw calls however much is flying;
 * additive, faded by colour (instances have no opacity). Stepped with the
 * simulation; nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MatchState, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import { softSpot } from './impact';

const RINGS = 6;
const PUFFS = 48;
const RING_LIFE = 16;
const PUFF_LIFE = 26;
/** Warm grey: dust lit from above, kept dim so it reads as haze, not light. */
const DUST = new THREE.Color(0xb8a890);
const RING = new THREE.Color(0xfff0d8);

/** By what happened: the ring's reach (m), how many puffs, how hard they're thrown. */
interface Burst {
  reach: number;
  puffs: number;
  speed: number;
}
const KNOCKDOWN: Burst = { reach: 1.5, puffs: 9, speed: 0.03 };
const BOUNCE: Burst = { reach: 1.9, puffs: 12, speed: 0.04 };
const WALL: Burst = { reach: 1.6, puffs: 8, speed: 0.03 };

export class Dust {
  private readonly rings: THREE.InstancedMesh;
  private readonly puffs: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  private readonly upright = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  // Rings: centre, reach, on a wall or the floor, steps left.
  private readonly rx = new Float32Array(RINGS);
  private readonly ry = new Float32Array(RINGS);
  private readonly rReach = new Float32Array(RINGS);
  private readonly rWall = new Uint8Array(RINGS);
  private readonly rLeft = new Int16Array(RINGS);
  private nextRing = 0;
  // Puffs: position, velocity, size, steps left.
  private readonly px = new Float32Array(PUFFS);
  private readonly py = new Float32Array(PUFFS);
  private readonly pz = new Float32Array(PUFFS);
  private readonly vx = new Float32Array(PUFFS);
  private readonly vy = new Float32Array(PUFFS);
  private readonly size = new Float32Array(PUFFS);
  private readonly pLeft = new Int16Array(PUFFS);
  private nextPuff = 0;
  private live = false;

  constructor(scene: THREE.Scene) {
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    // A thin band whose inside fades in: brightest at the leading edge.
    const ring = new THREE.RingGeometry(0.82, 1, 40, 1);
    this.rings = new THREE.InstancedMesh(ring, ringMat, RINGS);
    const puffMat = new THREE.MeshBasicMaterial({ map: softSpot(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.puffs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), puffMat, PUFFS);
    for (const im of [this.rings, this.puffs]) {
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      im.renderOrder = 3;
      // Allocate the colour buffer now, so the shader compiles with it at load.
      for (let i = 0; i < im.count; i++) im.setColorAt(i, this.c.setRGB(0, 0, 0));
      im.count = 0;
      scene.add(im);
    }
  }

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'knockdown') {
        const f = m.fighters[e.player];
        this.burst(toFloat(f.x), 0, false, KNOCKDOWN);
      } else if (e.type === 'relaunch' && e.how === 'ground') this.burst(toFloat(e.x), 0, false, BOUNCE);
      else if (e.type === 'relaunch' && e.how === 'wall') this.burst(toFloat(e.x), toFloat(e.y) + 0.6, true, WALL);
    }
  }

  private burst(x: number, y: number, wall: boolean, b: Burst): void {
    const r = this.nextRing;
    this.nextRing = (r + 1) % RINGS;
    this.rx[r] = x;
    this.ry[r] = y;
    this.rReach[r] = b.reach;
    this.rWall[r] = wall ? 1 : 0;
    this.rLeft[r] = RING_LIFE;
    for (let k = 0; k < b.puffs; k++) {
      const i = this.nextPuff;
      this.nextPuff = (i + 1) % PUFFS;
      const side = k % 2 ? 1 : -1;
      const a = Math.random();
      if (wall) {
        // Plaster off the wall: out from it, falling.
        const out = x > 0 ? -1 : 1;
        this.px[i] = x;
        this.py[i] = y + (Math.random() - 0.5) * 1.2;
        this.vx[i] = out * b.speed * (0.4 + a);
        this.vy[i] = (Math.random() - 0.3) * 0.02;
      } else {
        // Thrown out low along the floor both ways, rising a little.
        this.px[i] = x + side * 0.2 * a;
        this.py[i] = 0.08;
        this.vx[i] = side * b.speed * (0.4 + a);
        this.vy[i] = 0.004 + Math.random() * 0.012;
      }
      this.pz[i] = (Math.random() - 0.5) * 0.9;
      this.size[i] = 0.35 + Math.random() * 0.35;
      this.pLeft[i] = PUFF_LIFE - (k % 5);
    }
    this.live = true;
  }

  step(): void {
    if (!this.live) return;
    let rings = 0;
    for (let r = 0; r < RINGS; r++) {
      if (this.rLeft[r] <= 0) continue;
      const t = 1 - this.rLeft[r] / RING_LIFE;
      const reach = this.rReach[r] * (1 - (1 - t) * (1 - t) * (1 - t));
      const k = (1 - t) * (1 - t) * 1.4;
      this.p.set(this.rx[r], this.rWall[r] ? this.ry[r] : 0.02, 0);
      this.s.set(reach, reach, 1);
      this.q.copy(this.rWall[r] ? this.upright : this.flat);
      this.m.compose(this.p, this.q, this.s);
      this.rings.setMatrixAt(rings, this.m);
      this.rings.setColorAt(rings, this.c.copy(RING).multiplyScalar(k));
      rings++;
      this.rLeft[r]--;
    }
    let puffs = 0;
    for (let i = 0; i < PUFFS; i++) {
      if (this.pLeft[i] <= 0) continue;
      const t = 1 - this.pLeft[i] / PUFF_LIFE;
      this.px[i] += this.vx[i];
      this.py[i] += this.vy[i];
      this.vx[i] *= 0.9;
      this.vy[i] *= 0.95;
      const k = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.35 * (1 - t);
      this.p.set(this.px[i], this.py[i], this.pz[i]);
      this.s.setScalar(this.size[i] * (0.6 + 1.4 * t));
      this.q.identity();
      this.m.compose(this.p, this.q, this.s);
      this.puffs.setMatrixAt(puffs, this.m);
      this.puffs.setColorAt(puffs, this.c.copy(DUST).multiplyScalar(k));
      puffs++;
      this.pLeft[i]--;
    }
    this.rings.count = rings;
    this.puffs.count = puffs;
    flag(this.rings);
    flag(this.puffs);
    this.live = rings > 0 || puffs > 0;
  }

  clear(): void {
    this.rLeft.fill(0);
    this.pLeft.fill(0);
    this.rings.count = this.puffs.count = 0;
    this.live = false;
  }
}

/** New matrices and colours to upload. */
function flag(im: THREE.InstancedMesh): void {
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
}
