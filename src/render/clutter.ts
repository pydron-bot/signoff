/**
 * The knocked-about set dressing, drawn (src/render/clutterData.ts,
 * clutterPhysics.ts): one instanced mesh per kind of piece, so a stage adds
 * three draw calls however many pieces it has. The match drives it through
 * the fighters' feet, the rolling props, low projectiles and the step's
 * events; nothing flows back. Grey boxes of each piece's size until the
 * stage's GLB brings `clutter_<id>`.
 */
import * as THREE from 'three';
import { stageData, type MatchState, type SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import { CLUTTER } from './clutterData';
import { ClutterWorld, type ClutterEnv, type Pusher } from './clutterPhysics';
import { loadStageArt } from './stageModel';

/** A fighter's feet reach this far each side of them; a rolling prop, its own half-width. */
const FEET = 0.3;
const PROP = 0.45;
const SHOT = 0.25;
const STAND_IN = new THREE.MeshLambertMaterial({ color: 0x8a8a8a });
/** Blasts: how far (m) and how hard (m/step at the centre) by hit weight (light … ender). */
const HIT_REACH = [1.0, 1.3, 1.7, 2.2] as const;
const HIT_POWER = [0.025, 0.035, 0.05, 0.07] as const;

export class Clutter {
  private world: ClutterWorld | null = null;
  private meshes: THREE.InstancedMesh[] = [];
  private stage = '';
  private shown = true;
  private readonly prevX = new Float32Array(2);
  private readonly prevY = new Float32Array(2);
  private readonly prevProp: number[] = [];
  private readonly env: ClutterEnv = { halfWidth: 6, wind: 0, water: 0, pushers: [], pushCount: 0 };
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly p = new THREE.Vector3();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private dirty = true;
  /** Instances placed so far per kind, while placing. */
  private readonly used = new Uint8Array(8);

  constructor(private readonly scene: THREE.Scene) {
    for (let i = 0; i < 8; i++) this.env.pushers.push({ x: 0, y: 0, half: 0, dx: 0 });
  }

  /** The match's stage: its pieces as grey boxes now, its art once loaded. Resolves either way. */
  setStage(id: string): Promise<void> {
    if (id === this.stage) {
      this.world?.reset();
      this.dirty = true;
      return Promise.resolve();
    }
    this.clearMeshes();
    this.stage = id;
    const spec = CLUTTER[id];
    if (!spec) {
      this.world = null;
      return Promise.resolve();
    }
    const world = new ClutterWorld(spec.kinds, spec.places);
    this.world = world;
    this.meshes = spec.kinds.map((k, ki) => {
      const n = spec.places.filter((p) => p.kind === k.id).length;
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(...k.size), STAND_IN, n);
      im.name = `clutter_${k.id}`;
      im.userData.kind = ki;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // They move about the stage; their bounds are the stage's.
      im.frustumCulled = false;
      im.visible = this.shown;
      this.scene.add(im);
      return im;
    });
    this.dirty = true;
    this.place();
    return loadStageArt(id).then(
      (art) => {
        if (this.world !== world) return;
        for (const im of this.meshes) {
          let mesh: THREE.Mesh | null = null;
          art.objects.get(im.name)?.traverse((c) => {
            if (!mesh && (c as THREE.Mesh).isMesh) mesh = c as THREE.Mesh;
          });
          if (!mesh) continue;
          const found = mesh as THREE.Mesh;
          im.geometry.dispose();
          im.geometry = found.geometry;
          im.material = found.material;
        }
      },
      () => undefined,
    );
  }

  show(on: boolean): void {
    this.shown = on;
    for (const im of this.meshes) im.visible = on;
  }

  /** After a jump in time (a replay seek): everything back in place. */
  clear(): void {
    this.world?.reset();
    this.prevX.fill(NaN);
    this.dirty = true;
  }

  /** Once per simulation step, with the step's events. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    const w = this.world;
    if (!w || m.stage !== this.stage) return;
    for (const e of ev) {
      switch (e.type) {
        case 'roundStart':
          w.reset();
          this.prevX.fill(NaN);
          this.prevProp.length = 0;
          break;
        case 'hit':
          w.blast(toFloat(e.x), toFloat(e.y), HIT_REACH[e.weight], HIT_POWER[e.weight] * (e.counter ? 1.25 : 1), e.dir);
          break;
        case 'block':
        case 'guardCrush':
          w.blast(toFloat(e.x), toFloat(e.y), 0.9, e.type === 'block' ? 0.015 : 0.04);
          break;
        case 'knockdown':
          w.blast(toFloat(m.fighters[e.player].x), 0, 1.8, 0.06);
          break;
        case 'relaunch':
          if (e.how !== 'special') w.blast(toFloat(e.x), e.how === 'ground' ? 0 : toFloat(e.y), 2.0, 0.07);
          break;
        case 'hazardStrike':
          this.hazard(w, m, e.hazard, toFloat(e.x), e.all);
          break;
        case 'propStop':
          w.blast(toFloat(e.x), 0, 1.4, 0.05);
          break;
        case 'decoyPop':
        case 'projectileClash':
          w.blast(toFloat(e.x), toFloat(e.y), 1.2, 0.03);
          break;
        case 'stageCue':
          w.blast(toFloat(e.x), 0, 3.0, 0.09);
          break;
      }
    }
    this.fill(m);
    w.step(this.env);
    if (w.moving) this.dirty = true;
  }

  /** Places the instances, if anything moved (once a frame, after the steps). */
  update(): void {
    if (this.dirty) this.place();
  }

  /** A hazard landing: lightning, a shard, a falling light, a flare. Floor hazards that only shock (the puddles) leave things be. */
  private hazard(w: ClutterWorld, m: MatchState, id: string, x: number, all: boolean): void {
    const seg = stageData(m.stage).segments[m.segment];
    const h = seg?.hazards.find((d) => d.id === id);
    if (!h || h.groundOnly) return;
    if (all) for (const s of h.spots) w.blast(toFloat(s), 0, 1.6, 0.06);
    else w.blast(x, 0, 2.0, 0.08);
  }

  private fill(m: MatchState): void {
    const env = this.env;
    const seg = stageData(m.stage).segments[m.segment];
    env.halfWidth = seg ? toFloat(seg.halfWidth) + 0.2 : 6;
    env.wind = m.phase === 'fight' ? toFloat(m.wind) : 0;
    const flood = CLUTTER[m.stage]?.flood;
    env.water = flood && flood.segment === m.segment ? flood.level : 0;
    let n = 0;
    m.fighters.forEach((f, i) => {
      const x = toFloat(f.x);
      const y = toFloat(f.y);
      const was = this.prevX[i];
      // Coming down off a jump stamps the floor a little.
      if (this.prevY[i] > 0.05 && y === 0 && !Number.isNaN(was)) this.world!.blast(x, 0, 0.9, 0.02);
      this.prevY[i] = y;
      this.prevX[i] = x;
      const b: Pusher = env.pushers[n++];
      b.x = x;
      b.y = y;
      b.half = FEET;
      // A big jump (a teleport, a reset) isn't a step.
      b.dx = Number.isNaN(was) || Math.abs(x - was) > 0.5 ? 0 : x - was;
    });
    m.props.forEach((p, k) => {
      const x = toFloat(p.x);
      const was = this.prevProp[k];
      this.prevProp[k] = x;
      if (p.mode !== 'rolling' || n >= env.pushers.length) return;
      const b = env.pushers[n++];
      b.x = x;
      b.y = 0;
      b.half = PROP;
      b.dx = was === undefined || Math.abs(x - was) > 0.5 ? 0 : x - was;
    });
    for (const s of m.projectiles) {
      if (!s.active || n >= env.pushers.length) continue;
      const y = toFloat(s.y);
      if (y > 0.7) continue;
      const b = env.pushers[n++];
      b.x = toFloat(s.x);
      b.y = Math.max(0, y - 0.3);
      b.half = SHOT;
      b.dx = s.dir * 0.08;
    }
    env.pushCount = n;
  }

  private place(): void {
    const w = this.world;
    this.dirty = false;
    if (!w) return;
    const used = this.used.fill(0);
    for (let i = 0; i < w.count; i++) {
      const im = this.meshes[w.kind[i]];
      this.e.set(w.rx[i], w.ry[i], w.rz[i]);
      this.q.setFromEuler(this.e);
      this.p.set(w.x[i], w.y[i], w.z[i]);
      this.m.compose(this.p, this.q, this.one);
      im.setMatrixAt(used[w.kind[i]]++, this.m);
    }
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  }

  private clearMeshes(): void {
    for (const im of this.meshes) {
      this.scene.remove(im);
      // The stand-in box is ours; the art's geometry belongs to the cached GLB.
      if (im.geometry instanceof THREE.BoxGeometry) im.geometry.dispose();
      im.dispose();
    }
    this.meshes = [];
  }
}
