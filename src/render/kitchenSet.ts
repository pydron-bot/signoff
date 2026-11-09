/**
 * Kitchen Live, drawn: the studio kitchen for the segment and its lights,
 * the stockpot and the knife block (on the counter, thrown, or knocked
 * over), the fire walls that close in during Grease Fire with a flare at the
 * announced end, and the oven's heat in The Oven. Flat stand-ins until the
 * stage's GLB loads.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import { loadStageArt, type SegmentLights, type StageArt } from './stageModel';
import { relight } from './look';
import { applyLights, type StageLights, type StageSet } from './stageView';

/** The objects the game needs from kitchen.glb; without them all, the stand-ins stay. */
const NEED = ['set', 'seg_prep', 'seg_grease', 'seg_oven', 'prop_pot', 'prop_knives', 'fx_flare', 'fx_mark'];
/** The props sit on the counter top, behind the fighters, until thrown. */
const COUNTER_Y = 0.95;
const COUNTER_Z = -1.6;
/** Bottom of each prop's box when thrown (its sim box). */
const THROWN_Y: Readonly<Record<string, number>> = { prop_pot: 0.85, prop_knives: 0.15 };
const PROPS = ['prop_pot', 'prop_knives'];
/** The flare's flames, and the oven's heat pulse (steps). */
const FLARE_TOP = 2.2;
const HEAT_PERIOD = 120;

type V3 = [number, number, number];
const STAND_IN_LIGHTS: readonly SegmentLights[] = relight('kitchen', [
  { segment: 'Prep', background: '#1a1208', ambient: { color: '#fff4e0', intensity: 1.4 }, key: { color: '#fff0d8', intensity: 2.2, position: [-3, 6, 8] as V3 }, rim: { color: '#80c0ff', intensity: 0.6, position: [3, 4, -4] as V3 } },
  { segment: 'Grease Fire', background: '#1c0800', ambient: { color: '#ffc890', intensity: 1.2 }, key: { color: '#ffb060', intensity: 2.0, position: [0, 6, 7] as V3 }, rim: { color: '#ff5010', intensity: 1.2, position: [0, 3, -4] as V3 } },
  { segment: 'The Oven', background: '#200400', ambient: { color: '#ff9a60', intensity: 1.1 }, key: { color: '#ff8040', intensity: 2.0, position: [0, 5, 7] as V3 }, rim: { color: '#ff3000', intensity: 1.0, position: [0, 2, -5] as V3 } },
]);

export class KitchenSet implements StageSet {
  readonly root = new THREE.Group();
  private readonly standIn = new Map<string, THREE.Object3D>();
  private parts = this.standIn;
  private art: StageArt | null = null;
  private segment = -1;
  private ambientBase = 0;
  private rimBase = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly lights: StageLights,
  ) {
    scene.add(this.root);
    this.buildStandIn();
  }

  load(): Promise<void> {
    return loadStageArt('kitchen').then(
      (art) => this.useArt(art),
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
    const seg = segmentData(m.stage, m.segment);
    if (this.segment !== m.segment) {
      this.segment = m.segment;
      const spec = this.art?.lights[m.segment] ?? STAND_IN_LIGHTS[m.segment];
      applyLights(this.scene, this.lights, spec, this.art);
      this.ambientBase = spec.ambient.intensity;
      this.rimBase = spec.rim.intensity;
      this.part('set').visible = true;
      this.part('seg_prep').visible = m.segment === 0;
      const grease = this.part('seg_grease');
      grease.visible = m.segment === 1;
      // The fire walls stand at the segment's walls.
      grease.scale.x = toFloat(seg.halfWidth) / 4.5;
      this.part('seg_oven').visible = m.segment === 2;
    }

    // The props: on the counter, flying at their throw height, then on the floor where they stopped.
    for (let k = 0; k < PROPS.length; k++) {
      const o = this.part(PROPS[k]);
      const p = m.props[k];
      o.visible = p !== undefined;
      if (!p) continue;
      const flying = p.mode === 'rolling';
      const y = p.mode === 'idle' ? COUNTER_Y : flying ? THROWN_Y[PROPS[k]] : 0;
      o.position.set(toFloat(p.x), y, p.mode === 'idle' ? COUNTER_Z : 0);
      if (flying) o.rotation.z -= 0.3 * p.dir;
      else o.rotation.z = p.mode === 'spent' ? 1.2 : 0;
    }

    // Grease Fire: the mark at the end that's about to flare, then the flames.
    const hz = seg.hazards[0];
    const st = m.hazards[0];
    const live = m.segment === 1 && hz !== undefined && st !== undefined && st.spot >= 0 && m.roundFrame >= hz.first;
    const t = live ? (m.roundFrame - hz.first) % hz.period : -1;
    const at = live ? toFloat(hz.spots[st.spot]) : 0;
    const mark = this.part('fx_mark');
    mark.visible = live && t < hz.warn && Math.floor(m.roundFrame / 6) % 2 === 0;
    mark.position.set(at, 0.01, 0);
    const flare = this.part('fx_flare');
    flare.visible = live && t >= hz.warn && t < hz.warn + hz.active + 10;
    if (flare.visible) {
      flare.position.set(at, 0, 0);
      flare.scale.y = Math.min(1, (t - hz.warn + 1) / 4) * (1 + 0.15 * Math.sin(m.roundFrame * 0.9)) * (FLARE_TOP / 2.2);
    }
    // The fire's light flickers; the oven's heat swells and fades.
    if (m.segment === 1) this.lights.rim.intensity = this.rimBase * (0.8 + 0.3 * Math.sin(m.roundFrame * 0.5) * Math.sin(m.roundFrame * 0.13));
    if (m.segment === 2) this.lights.ambient.intensity = this.ambientBase * (0.9 + 0.15 * Math.sin((m.roundFrame / HEAT_PERIOD) * Math.PI * 2));
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

    // Always: the chequered floor, the tiled back wall, the long counter, the extractor hood.
    const set = named('set');
    add(set, new THREE.PlaneGeometry(60, 24), lambert(0x6a6a70), 0, 0, 8).rotation.x = -Math.PI / 2;
    add(set, new THREE.PlaneGeometry(40, 9), basic(0xd8d0b8), 0, 4.5, -4.1);
    add(set, new THREE.BoxGeometry(13, COUNTER_Y, 0.8), lambert(0x8a8a90), 0, COUNTER_Y / 2, COUNTER_Z);
    add(set, new THREE.BoxGeometry(4, 0.8, 1.2), lambert(0x707078), 0, 4.2, -3.2);

    // Prep: the shelves of jars and the show's sign.
    const prep = named('seg_prep');
    add(prep, new THREE.BoxGeometry(5, 0.08, 0.4), lambert(0x7a5a3a), -4, 2.4, -3.8);
    add(prep, new THREE.BoxGeometry(5, 0.08, 0.4), lambert(0x7a5a3a), 4, 2.4, -3.8);
    add(prep, new THREE.PlaneGeometry(3.8, 0.7), basic(0xd84030), 0, 5.6, -4.0);

    // Grease Fire: walls of flame at each end (scaled to the segment's walls), smoke above.
    const grease = named('seg_grease');
    const flame = basic(0xff6a10);
    for (const x of [-4.8, 4.8]) add(grease, new THREE.BoxGeometry(0.6, 3.2, 4), flame, x, 1.6, -1);
    add(grease, new THREE.PlaneGeometry(40, 3), basic(0x2a2220), 0, 7, -4.0);

    // The Oven: the oven door open at the back, glowing.
    const oven = named('seg_oven');
    add(oven, new THREE.PlaneGeometry(4, 2.4), basic(0xff4a10), 0, 2.0, -3.95);
    add(oven, new THREE.BoxGeometry(4.2, 0.1, 1.4), lambert(0x30302e), 0, 0.8, -3.3);

    // The stockpot and the knife block: origins at their bottom centres.
    const pot = named('prop_pot');
    add(pot, new THREE.CylinderGeometry(0.28, 0.25, 0.42, 10), lambert(0xb8b8c0), 0, 0.21, 0);
    const knives = named('prop_knives');
    add(knives, new THREE.BoxGeometry(0.3, 0.35, 0.2), lambert(0x5a3a22), 0, 0.175, 0);
    add(knives, new THREE.BoxGeometry(0.2, 0.18, 0.04), lambert(0x18181c), 0, 0.44, 0);

    // A flare (flames from the floor, origin at the bottom) and the mark.
    const fl = named('fx_flare');
    add(fl, new THREE.ConeGeometry(0.7, 2.2, 7), basic(0xff8a20), 0, 1.1, 0);
    const mark = named('fx_mark');
    const tape = basic(0xffd040);
    add(mark, new THREE.BoxGeometry(1.2, 0.01, 0.12), tape, 0, 0, 0).rotation.y = Math.PI / 4;
    add(mark, new THREE.BoxGeometry(1.2, 0.01, 0.12), tape, 0, 0, 0).rotation.y = -Math.PI / 4;
    for (const n of ['seg_grease', 'seg_oven', 'fx_flare', 'fx_mark']) this.standIn.get(n)!.visible = false;
  }
}
