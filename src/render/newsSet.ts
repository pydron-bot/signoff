/**
 * The Eleven O'Clock News, drawn: the news studio for the segment and its
 * lights, the anchor desk (at rest, shoved, or on its riser in The Ticker),
 * and in Lights Out the falling lamps: a mark during the warning, the lamp
 * dropping on the strike, and the studio a step darker after each. Flat
 * stand-ins until the stage's GLB loads.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import { stageCueAge } from '../sim/finisher';
import { segmentData } from '../sim/stages';
import { loadStageArt, type SegmentLights, type StageArt } from './stageModel';
import { relight } from './look';
import { applyLights, type StageLights, type StageSet } from './stageView';

/** The objects the game needs from news.glb; without them all, the stand-ins stay. */
const NEED = ['set', 'seg_headlines', 'seg_ticker', 'seg_lightsout', 'prop_desk', 'fx_lamp', 'fx_wreck', 'fx_mark'];
const DESK_Z = -0.4;
/** How high the riser lifts the desk, and how fast. */
const RISER_TOP = 0.9;
const LAMP_TOP = 6;
const WRECK_FRAMES = 90;
/** Frames the Stage Sign-Off's lamp takes to land. */
const CUE_DROP = 6;
/** Each fallen lamp takes this share of the key light, down to the floor below. */
const DIM_STEP = 0.12;
const DIM_FLOOR = 0.35;

type V3 = [number, number, number];
const STAND_IN_LIGHTS: readonly SegmentLights[] = relight('news', [
  { segment: 'Headlines', background: '#06101e', ambient: { color: '#dfe8ff', intensity: 1.3 }, key: { color: '#ffffff', intensity: 2.2, position: [0, 6, 8] as V3 }, rim: { color: '#4a7aff', intensity: 0.8, position: [3, 4, -4] as V3 } },
  { segment: 'The Ticker', background: '#081428', ambient: { color: '#d8e4ff', intensity: 1.2 }, key: { color: '#fff4e0', intensity: 2.2, position: [-3, 6, 7] as V3 }, rim: { color: '#ff3a3a', intensity: 0.9, position: [-3, 4, -4] as V3 } },
  { segment: 'Lights Out', background: '#020308', ambient: { color: '#8090b0', intensity: 0.8 }, key: { color: '#fff0d0', intensity: 2.0, position: [0, 8, 6] as V3 }, rim: { color: '#3050a0', intensity: 0.5, position: [0, 3, -6] as V3 } },
]);

export class NewsSet implements StageSet {
  readonly root = new THREE.Group();
  private readonly standIn = new Map<string, THREE.Object3D>();
  private parts = this.standIn;
  private art: StageArt | null = null;
  private segment = -1;
  private keyBase = 0;
  private ambientBase = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly lights: StageLights,
  ) {
    scene.add(this.root);
    this.buildStandIn();
  }

  load(): Promise<void> {
    return loadStageArt('news').then(
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
    if (this.segment !== m.segment) {
      this.segment = m.segment;
      const spec = this.art?.lights[m.segment] ?? STAND_IN_LIGHTS[m.segment];
      applyLights(this.scene, this.lights, spec, this.art);
      this.keyBase = spec.key.intensity;
      this.ambientBase = spec.ambient.intensity;
      this.part('set').visible = true;
      this.part('seg_headlines').visible = m.segment < 2;
      this.part('seg_ticker').visible = m.segment === 1;
      this.part('seg_lightsout').visible = m.segment === 2;
    }

    const seg = segmentData(m.stage, m.segment);
    const hz = seg.hazards[0];
    const st = m.hazards[0];
    const live = hz !== undefined && st !== undefined && m.roundFrame >= hz.first;
    const t = live ? (m.roundFrame - hz.first) % hz.period : -1;
    const warn = hz?.warn ?? 0;
    const active = hz?.active ?? 1;

    // The desk: on the floor in Headlines (shoved or not); on its riser in The Ticker; gone in Lights Out.
    const desk = this.part('prop_desk');
    const p = m.props[0];
    desk.visible = m.segment < 2;
    if (p) {
      desk.position.set(toFloat(p.x), 0, p.mode === 'idle' ? DESK_Z : 0);
      desk.rotation.y = p.mode === 'spent' ? 0.25 * p.dir : 0;
    } else if (m.segment === 1) {
      // Rises with the strike, holds, settles before the next warning.
      let lift = 0;
      if (live && t >= warn) lift = Math.min(1, (t - warn + 1) / active, Math.max(0, (hz.period - 30 - t) / 30));
      desk.position.set(0, lift * RISER_TOP, DESK_Z);
      desk.rotation.y = 0;
    }

    // Lights Out: the lamps, and a darker studio for each one down.
    const lamps = m.segment === 2 && live && st.spot >= 0;
    const at = lamps ? toFloat(hz.spots[st.spot]) : 0;
    const mark = this.part('fx_mark');
    mark.visible = lamps && t < warn && Math.floor(m.roundFrame / 6) % 2 === 0;
    mark.position.set(at, 0.01, 0);
    const lamp = this.part('fx_lamp');
    lamp.visible = lamps && t >= warn && t < warn + active;
    if (lamp.visible) lamp.position.set(at, LAMP_TOP * (1 - (t - warn + 1) / active), 0);
    const wreck = this.part('fx_wreck');
    wreck.visible = lamps && t >= warn && t < warn + active + WRECK_FRAMES;
    if (wreck.visible) wreck.position.set(at, 0, 0);
    // Lights Down: a lamp comes off the grid onto the loser (the Stage Sign-Off).
    const cue = stageCueAge(m);
    if (cue >= 0) {
      const x = toFloat(m.fighters[1 - m.finish.player].x);
      lamp.visible = cue < CUE_DROP;
      if (lamp.visible) lamp.position.set(x, LAMP_TOP * (1 - (cue + 1) / CUE_DROP), 0);
      wreck.visible = cue >= CUE_DROP - 1;
      if (wreck.visible) wreck.position.set(x, 0, 0);
    }
    if (m.segment === 2) {
      const down = live ? Math.floor((m.roundFrame - hz.first - warn) / hz.period) + 1 : 0;
      const k = Math.max(DIM_FLOOR, 1 - DIM_STEP * Math.max(0, down));
      // A flicker while the next lamp is going.
      const flick = lamps && t < warn && m.roundFrame % 9 < 2 ? 0.6 : 1;
      this.lights.key.intensity = this.keyBase * k * flick;
      this.lights.ambient.intensity = this.ambientBase * (0.5 + 0.5 * k);
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

    // Always: the studio floor, the back wall, the lighting grid overhead.
    const set = named('set');
    add(set, new THREE.PlaneGeometry(60, 24), lambert(0x2a2e3a), 0, 0, 8).rotation.x = -Math.PI / 2;
    add(set, new THREE.PlaneGeometry(40, 9), basic(0x0c1a34), 0, 4.5, -4.1);
    const grid = lambert(0x3a3a42);
    add(set, new THREE.BoxGeometry(14, 0.1, 0.1), grid, 0, 6.2, -1);
    add(set, new THREE.BoxGeometry(14, 0.1, 0.1), grid, 0, 6.2, 1);

    // Headlines (and The Ticker): the globe backdrop, the station clock, the cameras at the sides.
    const head = named('seg_headlines');
    add(head, new THREE.CircleGeometry(1.8, 24), basic(0x1f4a9a), 0, 3.2, -4.0);
    add(head, new THREE.PlaneGeometry(5.2, 0.6), basic(0xd8d8e0), 0, 5.4, -3.95);
    add(head, new THREE.CircleGeometry(0.45, 16), basic(0xf0f0f0), 4.2, 4.2, -3.95);
    const cam = lambert(0x1a1a1e);
    for (const x of [-5.6, 5.6]) {
      add(head, new THREE.BoxGeometry(0.5, 0.5, 0.9), cam, x, 1.5, -2.6);
      add(head, new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), cam, x, 0.65, -2.6);
    }

    // The Ticker: a red band across the back wall, BREAKING on the backdrop.
    const ticker = named('seg_ticker');
    add(ticker, new THREE.PlaneGeometry(40, 0.7), basic(0xb01818), 0, 1.0, -3.9);
    add(ticker, new THREE.PlaneGeometry(3.6, 0.7), basic(0xff3030), 0, 5.4, -3.9);

    // Lights Out: the backdrop dead, a fallen lamp at each side.
    const out = named('seg_lightsout');
    add(out, new THREE.PlaneGeometry(40, 9), basic(0x03050a), 0, 4.5, -4.05);
    const dead = lambert(0x24242a);
    for (const x of [-4.3, 3.7]) add(out, new THREE.BoxGeometry(0.5, 0.4, 0.5), dead, x, 0.2, -2.8).rotation.y = x;

    // The anchor desk: origin at its bottom centre.
    const desk = named('prop_desk');
    add(desk, new THREE.BoxGeometry(1.2, 0.8, 0.7), lambert(0x6a4a2a), 0, 0.4, 0);
    add(desk, new THREE.BoxGeometry(1.0, 0.25, 0.02), basic(0x1f4a9a), 0, 0.5, 0.36);
    desk.position.z = DESK_Z;

    // A lamp (hung from its yoke, the origin at its bottom), the wreck, the tape mark.
    const lamp = named('fx_lamp');
    add(lamp, new THREE.CylinderGeometry(0.22, 0.3, 0.5, 8), lambert(0x18181c), 0, 0.25, 0);
    add(lamp, new THREE.CircleGeometry(0.22, 8), basic(0xfff4c0), 0, 0, 0).rotation.x = Math.PI / 2;
    const wreck = named('fx_wreck');
    add(wreck, new THREE.CylinderGeometry(0.22, 0.3, 0.5, 8), lambert(0x18181c), 0.1, 0.22, 0).rotation.z = 1.4;
    add(wreck, new THREE.CircleGeometry(0.55, 7), basic(0xa0a8b8), 0, 0.01, 0).rotation.x = -Math.PI / 2;
    const mark = named('fx_mark');
    const tape = basic(0xffd040);
    add(mark, new THREE.BoxGeometry(1.0, 0.01, 0.12), tape, 0, 0, 0).rotation.y = Math.PI / 4;
    add(mark, new THREE.BoxGeometry(1.0, 0.01, 0.12), tape, 0, 0, 0).rotation.y = -Math.PI / 4;
    for (const n of ['seg_ticker', 'seg_lightsout', 'fx_lamp', 'fx_wreck', 'fx_mark']) this.standIn.get(n)!.visible = false;
  }
}
