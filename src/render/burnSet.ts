/**
 * Feel the Burn at Dawn, drawn: the aerobics studio for the segment and its
 * lights, the boombox (at rest, or thrown end over end), and in Burnout the
 * mirror shards: a mark on the spot during the warning, the shard dropping on
 * the strike, broken glass after. Flat stand-ins until the stage's GLB
 * (docs/BLENDER-TODO.md, step 14) loads.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import { stageCueAge } from '../sim/finisher';
import { segmentData } from '../sim/stages';
import { loadStageArt, type SegmentLights, type StageArt } from './stageModel';
import { relight } from './look';
import { applyLights, type StageLights, type StageSet } from './stageView';

/** The objects the game needs from burn.glb; without them all, the stand-ins stay. */
const NEED = ['set', 'seg_warmup', 'seg_double', 'seg_burnout', 'prop_boombox', 'fx_shard', 'fx_shatter', 'fx_mark'];
/** Height of the boombox's bottom when thrown (its box is 0.85 to 1.25 m), and where it rests. */
const THROWN_Y = 0.875;
const BOOMBOX_Z = -0.3;
/** Where a shard falls from, and how long the broken glass stays. */
const SHARD_TOP = 6;
const SHATTER_FRAMES = 60;
/** Frames the Stage Sign-Off's shard takes to land. */
const CUE_DROP = 5;
/** Double Time's beat in steps (132 bpm at the fast tape's 66 steps a second). */
const DOUBLE_BEAT = 30;

type V3 = [number, number, number];
/** The light rigs from the contract, used by the stand-ins (the GLB brings its own). */
const STAND_IN_LIGHTS: readonly SegmentLights[] = relight('burn', [
  { segment: 'Warm-Up', background: '#1a0c14', ambient: { color: '#ffe6d8', intensity: 1.3 }, key: { color: '#ffc890', intensity: 2.0, position: [-4, 5, 8] as V3 }, rim: { color: '#ff7ab0', intensity: 0.7, position: [3, 4, -4] as V3 } },
  { segment: 'Double Time', background: '#140a10', ambient: { color: '#fff0e0', intensity: 1.5 }, key: { color: '#ffffff', intensity: 2.4, position: [3, 7, 7] as V3 }, rim: { color: '#40e0ff', intensity: 0.9, position: [-3, 5, -4] as V3 } },
  { segment: 'Burnout', background: '#020206', ambient: { color: '#6a5a9a', intensity: 0.6 }, key: { color: '#c8b8ff', intensity: 1.4, position: [0, 8, 6] as V3 }, rim: { color: '#ff4a8a', intensity: 0.6, position: [0, 3, -6] as V3 } },
]);

export class BurnSet implements StageSet {
  readonly root = new THREE.Group();
  /** The stand-in's pieces, as the GLB names them. */
  private readonly standIn = new Map<string, THREE.Object3D>();
  private parts = this.standIn;
  private art: StageArt | null = null;
  private segment = -1;
  private rimBase = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly lights: StageLights,
  ) {
    scene.add(this.root);
    this.buildStandIn();
  }

  load(): Promise<void> {
    return loadStageArt('burn').then(
      (art) => this.useArt(art),
      // No GLB yet (or offline before it was cached): the stand-ins stay.
      () => undefined,
    );
  }

  show(on: boolean): void {
    this.root.visible = on;
    this.segment = -1;
  }

  private useArt(art: StageArt): void {
    if (this.art || NEED.some((n) => !art.objects.has(n))) return;
    this.art = art;
    for (const o of this.standIn.values()) o.visible = false;
    const parts = new Map<string, THREE.Object3D>();
    for (const n of NEED) {
      const o = art.objects.get(n)!;
      this.root.add(o);
      parts.set(n, o);
    }
    this.parts = parts;
    this.segment = -1;
  }

  private part(name: string): THREE.Object3D {
    return this.parts.get(name)!;
  }

  update(m: MatchState): void {
    if (this.segment !== m.segment) {
      this.segment = m.segment;
      const spec = this.art?.lights[m.segment] ?? STAND_IN_LIGHTS[m.segment];
      applyLights(this.scene, this.lights, spec, this.art);
      this.rimBase = spec.rim.intensity;
      this.part('set').visible = true;
      this.part('seg_warmup').visible = m.segment < 2;
      this.part('seg_double').visible = m.segment === 1;
      this.part('seg_burnout').visible = m.segment === 2;
    }
    // Double Time: the rim light kicks on the beat.
    this.lights.rim.intensity = this.rimBase * (m.segment === 1 && m.roundFrame % DOUBLE_BEAT < 4 ? 2.2 : 1);

    const boombox = this.part('prop_boombox');
    const p = m.props[0];
    boombox.visible = p !== undefined;
    if (p) {
      const flying = p.mode === 'rolling';
      boombox.position.set(toFloat(p.x), flying ? THROWN_Y : 0, BOOMBOX_Z * (flying ? 0 : 1));
      if (flying) boombox.rotation.z -= 0.35 * p.dir;
      else boombox.rotation.z = p.mode === 'spent' ? 0.3 : 0;
    }

    // The shards: read from the round clock, like the sim.
    const seg = segmentData(m.stage, m.segment);
    const hz = seg.hazards[0];
    const st = m.hazards[0];
    const live = hz !== undefined && st !== undefined && st.spot >= 0 && m.roundFrame >= hz.first;
    const t = live ? (m.roundFrame - hz.first) % hz.period : -1;
    const warn = hz?.warn ?? 0;
    const active = hz?.active ?? 1;
    const at = live ? toFloat(hz.spots[st.spot]) : 0;
    const mark = this.part('fx_mark');
    mark.visible = live && t < warn && Math.floor(m.roundFrame / 6) % 2 === 0;
    mark.position.set(at, 0.01, 0);
    const shard = this.part('fx_shard');
    shard.visible = live && t >= warn && t < warn + active;
    if (shard.visible) shard.position.set(at, SHARD_TOP * (1 - (t - warn + 1) / active), 0);
    const shatter = this.part('fx_shatter');
    shatter.visible = live && t >= warn && t < warn + active + SHATTER_FRAMES;
    if (shatter.visible) {
      shatter.position.set(at, 0.01, 0);
      shatter.rotation.y = st.spot * 1.3;
    }
    // Mirror, Mirror: thrown into the mirrors, and the glass comes down on them (the Stage Sign-Off).
    const cue = stageCueAge(m);
    if (cue >= 0) {
      const x = toFloat(m.fighters[1 - m.finish.player].x);
      shard.visible = cue < CUE_DROP;
      if (shard.visible) shard.position.set(x, SHARD_TOP * (1 - (cue + 1) / CUE_DROP), 0);
      shatter.visible = cue >= CUE_DROP - 1;
      if (shatter.visible) shatter.position.set(x, 0.01, 0);
      this.lights.rim.intensity = this.rimBase * (cue < 10 ? 2.5 : 1);
    }
  }

  /** Flat panels in the set's colours, named as in the GLB. */
  private buildStandIn(): void {
    const lambert = (color: number) => new THREE.MeshLambertMaterial({ color });
    const basic = (color: number) => new THREE.MeshBasicMaterial({ color });
    const add = (group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const named = (name: string): THREE.Group => {
      const g = new THREE.Group();
      g.name = name;
      this.standIn.set(name, g);
      this.root.add(g);
      return g;
    };

    // Always: the sprung floor, the mats, the windows above the mirrors.
    const set = named('set');
    add(set, new THREE.PlaneGeometry(60, 24), lambert(0x7a5434), 0, 0, 8).rotation.x = -Math.PI / 2;
    const mat = new THREE.BoxGeometry(1.6, 0.04, 0.9);
    const matMat = lambert(0x2f5fa8);
    for (const x of [-6, -4, -2, 0, 2, 4, 6]) add(set, mat, matMat, x, 0.02, -2.2);
    add(set, new THREE.PlaneGeometry(40, 7), basic(0x2a1830), 0, 6.5, -4.05);

    // Warm-Up (and Double Time): the mirrors and barre, the dawn, the walls with speakers, the sign.
    const warm = named('seg_warmup');
    add(warm, new THREE.PlaneGeometry(16, 3), basic(0x9fb0c0), 0, 1.5, -3.9);
    add(warm, new THREE.BoxGeometry(16, 0.06, 0.06), lambert(0xc8b090), 0, 1.0, -3.6);
    add(warm, new THREE.PlaneGeometry(16, 2.6), basic(0xff9a6a), 0, 4.6, -4.0);
    add(warm, new THREE.BoxGeometry(4.2, 0.6, 0.1), basic(0xff4fa0), 0, 3.4, -3.85);
    const wallMat = lambert(0x5a3a52);
    const speakerMat = lambert(0x1a1a1e);
    for (const x of [-6.4, 6.4]) {
      add(warm, new THREE.BoxGeometry(0.8, 5, 4), wallMat, x, 2.5, -1);
      add(warm, new THREE.BoxGeometry(0.7, 1.6, 0.7), speakerMat, x - Math.sign(x) * 0.8, 0.8, -2.8);
    }

    // Double Time: chase lights along the mirrors, the sign switched over.
    const double = named('seg_double');
    // One mesh for the whole row: 27 bulbs as one draw call.
    const bulbs: THREE.BufferGeometry[] = [];
    for (let x = -7.8; x <= 7.8; x += 0.6) bulbs.push(new THREE.BoxGeometry(0.12, 0.12, 0.12).translate(x, 0, 0));
    add(double, mergeGeometries(bulbs), basic(0xfff27a), 0, 3.1, -3.8);
    add(double, new THREE.BoxGeometry(4.4, 0.7, 0.1), basic(0x40e0ff), 0, 3.4, -3.75);
    add(double, new THREE.PlaneGeometry(16, 2.6), basic(0xffd890), 0, 4.6, -3.98);

    // Burnout: the mirrors gone dark, black windows, drapes at the far walls.
    const burnout = named('seg_burnout');
    add(burnout, new THREE.PlaneGeometry(16, 3), basic(0x141822), 0, 1.5, -3.9);
    add(burnout, new THREE.PlaneGeometry(16, 2.6), basic(0x050508), 0, 4.6, -4.0);
    const drape = lambert(0x0c0a10);
    for (const x of [-8.4, 8.4]) add(burnout, new THREE.BoxGeometry(0.3, 3, 5), drape, x, 1.5, -1.5);
    const glass = basic(0x6a7890);
    for (const x of [-5.2, -1.4, 2.6, 6.1]) add(burnout, new THREE.PlaneGeometry(0.5, 0.3), glass, x, 0.01, -3.2).rotation.x = -Math.PI / 2;

    // The boombox: origin at its bottom centre.
    const boombox = named('prop_boombox');
    add(boombox, new THREE.BoxGeometry(0.6, 0.35, 0.2), lambert(0x30303a), 0, 0.175, 0);
    boombox.position.z = BOOMBOX_Z;

    // A shard, point down at the origin; broken glass; the tape mark.
    const shard = named('fx_shard');
    const cone = new THREE.ConeGeometry(0.2, 1.2, 3);
    cone.rotateX(Math.PI);
    add(shard, cone, basic(0xc8e0ff), 0, 0.6, 0);
    const shatter = named('fx_shatter');
    add(shatter, new THREE.CircleGeometry(0.6, 7), basic(0x8aa0c0), 0, 0, 0).rotation.x = -Math.PI / 2;
    const mark = named('fx_mark');
    const tape = basic(0xffffff);
    add(mark, new THREE.BoxGeometry(1.0, 0.01, 0.12), tape, 0, 0, 0).rotation.y = Math.PI / 4;
    add(mark, new THREE.BoxGeometry(1.0, 0.01, 0.12), tape, 0, 0, 0).rotation.y = -Math.PI / 4;
    for (const n of ['seg_double', 'seg_burnout', 'fx_shard', 'fx_shatter', 'fx_mark']) this.standIn.get(n)!.visible = false;
  }
}
