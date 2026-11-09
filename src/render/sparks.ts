/**
 * Hit sparks: a flash of light at the contact, sized and timed by the hit's
 * weight (a jab's is small and quick, an ender's big and slow to fade),
 * yellow on a counter hit, small and blue on a block. A pool of quads,
 * reused.
 */
import * as THREE from 'three';
import type { SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';

const POOL = 8;
/** By hit weight (light, medium, heavy, ender): size, steps shown, colour. */
const SIZE = [0.4, 0.55, 0.75, 0.95] as const;
const LIFE = [7, 8, 10, 13] as const;
const COLOR = [0xffffff, 0xffffff, 0xfff2c8, 0xffe080] as const;
const COUNTER = 0xffe040;

export class Sparks {
  private readonly meshes: THREE.Mesh[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];
  private readonly left = new Int8Array(POOL);
  private readonly life = new Int8Array(POOL);
  private readonly size = new Float32Array(POOL);
  private next = 0;

  constructor(scene: THREE.Scene) {
    // A four-pointed star.
    const shape = new THREE.Shape();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? 0.18 : 1;
      const a = (k / 8) * Math.PI * 2;
      if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ShapeGeometry(shape);
    for (let k = 0; k < POOL; k++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 10;
      this.meshes.push(m);
      this.mats.push(mat);
      scene.add(m);
    }
  }

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      // At the contact, a little in front of the body, not its middle.
      if (e.type === 'hit') this.spawn(toFloat(e.x) - e.dir * 0.25, toFloat(e.y), e.counter ? COUNTER : COLOR[e.weight], SIZE[e.weight] * (e.counter ? 1.25 : 1), LIFE[e.weight]);
      else if (e.type === 'block') this.spawn(toFloat(e.x), toFloat(e.y), 0x60b0ff, 0.3, 7);
      else if (e.type === 'projectileClash') this.spawn(toFloat(e.x), toFloat(e.y), 0x9fe8ff, 0.6, 9);
    }
  }

  private spawn(x: number, y: number, color: number, size: number, life: number): void {
    const k = this.next;
    this.next = (k + 1) % POOL;
    const m = this.meshes[k];
    m.position.set(x, y, 0.6);
    m.rotation.z = Math.random() * Math.PI;
    // Past white, so the glow picks them up.
    this.mats[k].color.setHex(color).multiplyScalar(2.5);
    this.left[k] = this.life[k] = life;
    this.size[k] = size;
    m.visible = true;
  }

  update(): void {
    for (let k = 0; k < POOL; k++) {
      if (this.left[k] <= 0) continue;
      const t = 1 - this.left[k] / this.life[k];
      const m = this.meshes[k];
      m.scale.setScalar(this.size[k] * (0.6 + t));
      this.mats[k].opacity = 1 - t;
      if (--this.left[k] === 0) m.visible = false;
    }
  }
}
