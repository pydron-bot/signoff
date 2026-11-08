/**
 * Hit sparks: a burst where a hit lands, bigger and yellow on a counter
 * hit, small and blue on a block. A pool of quads, reused.
 */
import * as THREE from 'three';
import type { SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';

const POOL = 6;
const LIFE = 9;

export class Sparks {
  private readonly meshes: THREE.Mesh[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];
  private readonly left = new Int8Array(POOL);
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
      if (e.type === 'hit') this.spawn(toFloat(e.x), toFloat(e.y), e.counter ? 0xffe040 : 0xffffff, e.counter ? 0.9 : 0.35 + Math.min(e.damage, 90) / 200);
      else if (e.type === 'block') this.spawn(toFloat(e.x), toFloat(e.y), 0x60b0ff, 0.3);
      else if (e.type === 'projectileClash') this.spawn(toFloat(e.x), toFloat(e.y), 0x9fe8ff, 0.6);
    }
  }

  private spawn(x: number, y: number, color: number, size: number): void {
    const k = this.next;
    this.next = (k + 1) % POOL;
    const m = this.meshes[k];
    m.position.set(x, y, 0.6);
    m.rotation.z = Math.random() * Math.PI;
    this.mats[k].color.setHex(color);
    this.left[k] = LIFE;
    this.size[k] = size;
    m.visible = true;
  }

  update(): void {
    for (let k = 0; k < POOL; k++) {
      if (this.left[k] <= 0) continue;
      const t = 1 - this.left[k] / LIFE;
      const m = this.meshes[k];
      m.scale.setScalar(this.size[k] * (0.6 + t));
      this.mats[k].opacity = 1 - t;
      if (--this.left[k] === 0) m.visible = false;
    }
  }
}
