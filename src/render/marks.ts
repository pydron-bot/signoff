/**
 * What a body leaves on the set: a crack (`fx_crack`, in Dale's GLB, step
 * 29) where it meets the wall in a splat or bounces off the floor, and a
 * dark scuff where it lands. They stay through the round, fading in its
 * last stretch, and go at the next round's start. One pooled instanced mesh
 * each, so two draw calls while any show and none at rest; on the fight's
 * layer (the cut-in's close-up leaves them out). Stepped with the
 * simulation; nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MatchState, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import { softSpot } from './impact';
import { FIGHT_LAYER } from './meshCopies';

const CRACKS = 6;
const SCUFFS = 10;
/** Steps a mark shows at full strength, then over how many it fades. */
const HOLD = 900;
const FADE = 600;
const CRACK_SIZE = 0.9;

/** A per-instance fade (0 to 1) on a basic material: instances have no opacity of their own. */
function fading(mat: THREE.MeshBasicMaterial, key: string): THREE.MeshBasicMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float fade;\nvarying float vFade;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = fade;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;').replace('#include <opaque_fragment>', 'diffuseColor.a *= vFade;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

class Pool {
  readonly mesh: THREE.InstancedMesh;
  readonly fade: THREE.InstancedBufferAttribute;
  readonly age: Int32Array;
  private next = 0;

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, readonly size: number, scene: THREE.Scene) {
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(size), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('fade', this.fade);
    this.mesh = new THREE.InstancedMesh(geo, mat, size);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.layers.set(FIGHT_LAYER);
    this.mesh.count = 0;
    this.age = new Int32Array(size).fill(-1);
    scene.add(this.mesh);
  }

  /** Takes the next slot (the oldest goes): its index. */
  take(): number {
    const i = this.next;
    this.next = (i + 1) % this.size;
    this.age[i] = 0;
    this.mesh.count = Math.max(this.mesh.count, i + 1);
    return i;
  }

  step(): void {
    let live = 0;
    for (let i = 0; i < this.mesh.count; i++) {
      if (this.age[i] < 0) {
        this.fade.setX(i, 0);
        continue;
      }
      const a = ++this.age[i];
      const f = a < HOLD ? 1 : Math.max(0, 1 - (a - HOLD) / FADE);
      this.fade.setX(i, f);
      if (f <= 0) this.age[i] = -1;
      else live = i + 1;
    }
    this.mesh.count = live;
    this.fade.needsUpdate = true;
  }

  clear(): void {
    this.age.fill(-1);
    this.mesh.count = 0;
  }
}

export class Marks {
  private cracks: Pool | null = null;
  private readonly scuffs: Pool;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly z = new THREE.Vector3(0, 0, 1);
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(private readonly scene: THREE.Scene) {
    const scuff = fading(new THREE.MeshBasicMaterial({ map: softSpot(), color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, opacity: 0.55 }), 'signoff-scuff');
    this.scuffs = new Pool(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), scuff, SCUFFS, scene);
  }

  /** The crack's mesh from the art (Dale's GLB), once it has loaded: until then, scuffs only. */
  useCrack(fx: THREE.Object3D | undefined): void {
    if (this.cracks || !fx) return;
    let src: THREE.Mesh | null = null;
    fx.traverse((o) => {
      if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
    });
    if (!src) return;
    const mesh = src as THREE.Mesh;
    const from = mesh.material as THREE.MeshLambertMaterial;
    // Painted dark in the art: drawn as it is, unlit, over the floor or the wall.
    const mat = fading(new THREE.MeshBasicMaterial({ map: from.map, vertexColors: from.vertexColors, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }), 'signoff-crack');
    this.cracks = new Pool(mesh.geometry.clone(), mat, CRACKS, this.scene);
  }

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'roundStart') this.clear();
      else if (e.type === 'relaunch' && e.how === 'wall') this.crack(toFloat(e.x), Math.max(0.4, toFloat(e.y) + 0.6), true);
      else if (e.type === 'relaunch' && e.how === 'ground') {
        this.crack(toFloat(e.x), 0, false);
        this.scuff(toFloat(e.x), 1.6);
      } else if (e.type === 'knockdown') this.scuff(toFloat(m.fighters[e.player].x), 1.3);
    }
  }

  private crack(x: number, y: number, wall: boolean): void {
    const c = this.cracks;
    if (!c) return;
    const i = c.take();
    if (wall) {
      // On the wall, facing back into the studio; turned a little so no two look alike.
      this.q.setFromUnitVectors(this.up, this.p.set(x > 0 ? -1 : 1, 0, 0));
      this.p.set(x + (x > 0 ? -0.02 : 0.02), y, 0);
    } else {
      this.q.setFromAxisAngle(this.up, (i * 1.7) % (Math.PI * 2));
      this.p.set(x, 0.008, 0);
    }
    this.m.compose(this.p, this.q, this.s.setScalar(CRACK_SIZE));
    c.mesh.setMatrixAt(i, this.m);
    c.mesh.instanceMatrix.needsUpdate = true;
  }

  private scuff(x: number, w: number): void {
    const i = this.scuffs.take();
    this.q.setFromAxisAngle(this.z, 0);
    this.m.compose(this.p.set(x, 0.006, 0.05), this.q, this.s.set(w, 1, 0.55));
    this.scuffs.mesh.setMatrixAt(i, this.m);
    this.scuffs.mesh.instanceMatrix.needsUpdate = true;
  }

  step(): void {
    this.cracks?.step();
    this.scuffs.step();
  }

  clear(): void {
    this.cracks?.clear();
    this.scuffs.clear();
  }
}
