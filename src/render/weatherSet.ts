/**
 * Weather at Eleven, drawn: the set for the segment and its lights, the
 * dollies, the wind, the flood, and hazard warnings (a flashing floor marker
 * where it will strike) and strikes. It reads the match's stage state; a
 * fixed handful of meshes, made once. The stage's GLB (src/render/stageModel.ts)
 * replaces the plain stand-ins when it has loaded.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import { loadStageArt, type LightSpec, type StageArt } from './stageModel';
import { relight } from './look';
import { applyLights, type StageLights, type StageSet } from './stageView';

const STREAKS = 40;
const PAPERS = 14;
const MARKERS = 5;
/** Where the flood's live cables end (stage space, from the GLB). */
const CABLE_ENDS: readonly [number, number][] = [
  [-3.0, -0.6],
  [3.0, -0.6],
];
/** The dollies in the sim's prop order. */
const DOLLIES = ['prop_dolly_left', 'prop_dolly_right'];

export class WeatherSet implements StageSet {
  readonly root = new THREE.Group();
  private readonly placeholder: THREE.Group;
  private readonly wall = new THREE.MeshBasicMaterial({ color: 0x0d1a4a });
  private readonly dollies: THREE.Object3D[] = [];
  private readonly markers: THREE.Mesh[] = [];
  private readonly markerMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.6 });
  private bolt: THREE.Object3D;
  private water: THREE.Object3D;
  private readonly puddles: THREE.Object3D[] = [];
  private readonly puddleMat = new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.45 });
  private readonly streaks: THREE.InstancedMesh;
  private readonly streakX = new Float32Array(STREAKS);
  private readonly streakY = new Float32Array(STREAKS);
  private readonly tmp = new THREE.Object3D();
  private segment = -1;
  /** From the GLB, once loaded. */
  private art: StageArt | null = null;
  private storm: THREE.Object3D | null = null;
  private flood: THREE.Object3D | null = null;
  private readonly sparks: THREE.Object3D[] = [];
  private readonly scorches: THREE.Object3D[] = [];
  /** Spots the lightning has struck this round: they stay scorched. */
  private readonly scorched: boolean[] = [];
  private lastRoundFrame = 0;
  private papers: THREE.InstancedMesh | null = null;
  private readonly paperX = new Float32Array(PAPERS);
  private readonly paperY = new Float32Array(PAPERS);
  private readonly paperSpin = new Float32Array(PAPERS);
  private puddleGlow: THREE.MeshLambertMaterial | null = null;
  private ambientBase = 1.4;
  private flash: LightSpec | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly lights: StageLights,
  ) {
    scene.add(this.root);
    this.placeholder = this.buildSet();
    const dollyGeo = new THREE.BoxGeometry(0.9, 1.0, 0.7);
    // Origin on the floor, like the GLB's dollies.
    dollyGeo.translate(0, 0.5, 0);
    const dollyMat = new THREE.MeshLambertMaterial({ color: 0x8c8c70 });
    for (let k = 0; k < 2; k++) {
      const d = new THREE.Mesh(dollyGeo, dollyMat);
      d.visible = false;
      this.dollies.push(d);
      this.root.add(d);
    }
    const disc = new THREE.CircleGeometry(1, 24);
    for (let k = 0; k < MARKERS; k++) {
      const mk = new THREE.Mesh(disc, this.markerMat);
      mk.rotation.x = -Math.PI / 2;
      mk.visible = false;
      this.markers.push(mk);
      this.root.add(mk);
    }
    const boltGeo = new THREE.BoxGeometry(0.25, 8, 0.25);
    boltGeo.translate(0, 4, 0);
    this.bolt = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bolt.visible = false;
    this.root.add(this.bolt);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), new THREE.MeshBasicMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.35 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.22, 0);
    water.visible = false;
    this.water = water;
    this.root.add(water);
    for (let k = 0; k < 2; k++) {
      const p = new THREE.Mesh(disc, this.puddleMat);
      p.rotation.x = -Math.PI / 2;
      p.position.y = 0.24;
      p.visible = false;
      this.puddles.push(p);
      this.root.add(p);
    }
    this.streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xc8d8ff, transparent: true, opacity: 0.35 }), STREAKS);
    for (let k = 0; k < STREAKS; k++) {
      this.streakX[k] = Math.random() * 14 - 7;
      this.streakY[k] = 0.2 + Math.random() * 3.5;
    }
    this.streaks.visible = false;
    this.root.add(this.streaks);
  }

  /** Loads the stage's GLB; resolves (either way) once the set is in the scene. */
  load(): Promise<void> {
    return loadStageArt('weather').then(
      (art) => this.useArt(art),
      // No GLB (or offline before it was cached): the stand-ins stay.
      () => undefined,
    );
  }

  /** Swaps the stand-ins for the stage's own meshes. */
  private useArt(art: StageArt): void {
    const o = art.objects;
    const need = ['set', 'seg_storm', 'seg_flood', 'fx_lightning', 'fx_water', 'fx_puddle', 'fx_spark', 'fx_scorch', 'fx_paper', ...DOLLIES];
    if (this.art || need.some((n) => !o.has(n))) return;
    this.art = art;
    this.placeholder.visible = false;
    this.root.add(o.get('set')!);
    this.storm = o.get('seg_storm')!;
    this.flood = o.get('seg_flood')!;
    this.root.add(this.storm, this.flood);
    const swap = (old: THREE.Object3D, next: THREE.Object3D): THREE.Object3D => {
      this.root.remove(old);
      next.visible = false;
      this.root.add(next);
      return next;
    };
    DOLLIES.forEach((n, k) => (this.dollies[k] = swap(this.dollies[k], o.get(n)!)));
    this.bolt = swap(this.bolt, o.get('fx_lightning')!);
    this.water = swap(this.water, o.get('fx_water')!);
    // The puddles share a material of their own, so they can glow when live.
    const puddle = o.get('fx_puddle')! as THREE.Mesh;
    this.puddleGlow = (puddle.material as THREE.MeshLambertMaterial).clone();
    for (let k = 0; k < this.puddles.length; k++) {
      const p = puddle.clone();
      p.material = this.puddleGlow;
      this.puddles[k] = swap(this.puddles[k], p);
    }
    for (const [x, z] of CABLE_ENDS) {
      const s = o.get('fx_spark')!.clone();
      s.position.set(x, 0, z);
      s.visible = false;
      this.sparks.push(s);
      this.root.add(s);
    }
    for (let k = 0; k < MARKERS; k++) {
      const s = o.get('fx_scorch')!.clone();
      s.visible = false;
      this.scorches.push(s);
      this.root.add(s);
    }
    const paper = o.get('fx_paper')! as THREE.Mesh;
    this.papers = new THREE.InstancedMesh(paper.geometry, paper.material, PAPERS);
    for (let k = 0; k < PAPERS; k++) {
      this.paperX[k] = Math.random() * 16 - 8;
      this.paperY[k] = 0.3 + Math.random() * 3;
      this.paperSpin[k] = Math.random() * 6;
    }
    this.papers.visible = false;
    this.root.add(this.papers);
    // Relight for the segment on the next update.
    this.segment = -1;
  }

  update(m: MatchState, frame: number): void {
    const seg = segmentData(m.stage, m.segment);
    if (this.segment !== m.segment) {
      this.segment = m.segment;
      this.scorched.fill(false);
      this.lightFor(m.segment);
    }
    if (m.roundFrame < this.lastRoundFrame) this.scorched.fill(false);
    this.lastRoundFrame = m.roundFrame;
    for (let k = 0; k < this.dollies.length; k++) {
      const d = this.dollies[k];
      const p = m.props[k];
      d.visible = p !== undefined;
      if (!p) continue;
      d.position.set(toFloat(p.x), 0, -0.2);
      // Kicked: it spins as it rolls; at rest it faces the arena again.
      if (p.mode === 'rolling') d.rotation.y += 0.3;
      else d.rotation.y = 0;
    }
    // Hazards, read from the round clock: warnings flash on the spots they'll hit, then the strike.
    const hz = seg.hazards[0];
    const st = m.hazards[0];
    const t = hz && st && m.roundFrame >= hz.first ? (m.roundFrame - hz.first) % hz.period : -1;
    const warning = hz !== undefined && t >= 0 && t < hz.warn;
    const striking = hz !== undefined && t >= hz.warn && t < hz.warn + hz.active;
    const flash = warning && Math.floor(m.roundFrame / 6) % 2 === 0;
    for (let k = 0; k < MARKERS; k++) {
      const mk = this.markers[k];
      mk.visible = false;
      if (!(flash || striking) || !hz) continue;
      let at: number | null = null;
      if (hz.all) {
        if (k < hz.spots.length) at = toFloat(hz.spots[k]);
      } else if (k === 0 && st.spot >= 0) at = toFloat(hz.spots[st.spot]);
      if (at === null) continue;
      mk.visible = true;
      mk.scale.setScalar(toFloat(hz.halfW));
      mk.position.set(at, 0.25, 0);
    }
    this.markerMat.color.setHex(striking ? 0xffffff : 0xff3030);
    const lightning = striking && hz.id === 'lightning' && st.spot >= 0;
    this.bolt.visible = lightning && frame % 2 === 0;
    if (lightning) {
      this.bolt.position.set(toFloat(hz.spots[st.spot]), 0, 0);
      this.scorched[st.spot] = true;
    }
    for (let k = 0; k < this.scorches.length; k++) {
      const s = this.scorches[k];
      s.visible = hz?.id === 'lightning' && this.scorched[k] === true;
      if (s.visible) s.position.set(toFloat(hz.spots[k]), 0, 0);
    }
    // The storm's flash with each bolt.
    this.lights.ambient.intensity = this.ambientBase + (this.bolt.visible && this.flash ? this.flash.intensity : 0);
    // The flood and its live puddles.
    const flood = m.segment === 2;
    this.water.visible = flood;
    for (let k = 0; k < this.puddles.length; k++) {
      const p = this.puddles[k];
      const spot = flood ? hz?.spots[k] : undefined;
      p.visible = spot !== undefined;
      if (spot === undefined || !hz) continue;
      // The stand-in is a unit disc; the GLB's puddle is 1.6 m across.
      p.scale.setScalar(toFloat(hz.halfW) / (this.art ? 0.8 : 1));
      p.position.x = toFloat(spot);
    }
    if (this.puddleGlow) this.puddleGlow.emissive.setHex(striking && flood ? 0x60c0ff : flash && flood ? 0x103050 : 0);
    // The cables crackle now and then, and hard when the puddles go live.
    const crackle = flood && (striking || (warning && frame % 4 < 2) || frame % 97 < 3);
    for (const s of this.sparks) {
      s.visible = crackle;
      if (crackle) s.rotation.y = Math.random() * Math.PI * 2;
    }
    // Wind streaks drift with the wind, and the storm's papers with them.
    this.streaks.visible = m.wind !== 0;
    if (this.papers) this.papers.visible = m.wind !== 0;
    if (m.wind !== 0) {
      const v = toFloat(m.wind) * 25;
      this.tmp.rotation.set(0, 0, 0);
      for (let k = 0; k < STREAKS; k++) {
        let x = this.streakX[k] + v * (1 + (k % 3) * 0.4);
        if (x > 7) x -= 14;
        if (x < -7) x += 14;
        this.streakX[k] = x;
        this.tmp.position.set(x, this.streakY[k], -1.5 + (k % 5) * 0.6);
        this.tmp.updateMatrix();
        this.streaks.setMatrixAt(k, this.tmp.matrix);
      }
      this.streaks.instanceMatrix.needsUpdate = true;
      if (this.papers) {
        for (let k = 0; k < PAPERS; k++) {
          let x = this.paperX[k] + v * (0.7 + (k % 4) * 0.2);
          if (x > 9) x -= 18;
          if (x < -9) x += 18;
          this.paperX[k] = x;
          const spin = (this.paperSpin[k] += 0.05 + (k % 3) * 0.03);
          this.tmp.position.set(x, this.paperY[k] + Math.sin(spin * 0.7) * 0.25, -2.5 + (k % 6) * 0.5);
          this.tmp.rotation.set(spin, spin * 0.6, spin * 0.3);
          this.tmp.updateMatrix();
          this.papers.setMatrixAt(k, this.tmp.matrix);
        }
        this.papers.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** Shows or hides the whole set; shown, it relights for the segment on the next update. */
  show(on: boolean): void {
    this.root.visible = on;
    this.segment = -1;
  }

  /** The set and the lights for a segment: the GLB's rig, or the stand-in's wall colours. */
  private lightFor(segment: number): void {
    const spec = this.art?.lights[segment];
    if (!this.art || !spec) {
      // The set looks different each segment: calm blue, storm grey, flood teal.
      this.wall.color.setHex([0x0d1a4a, 0x1c2030, 0x0c2a33][segment] ?? 0x0d1a4a);
      applyLights(this.scene, this.lights, STAND_IN_LIGHTS);
      this.ambientBase = STAND_IN_LIGHTS.ambient.intensity;
      this.flash = null;
      return;
    }
    this.storm!.visible = segment >= 1;
    this.flood!.visible = segment === 2;
    applyLights(this.scene, this.lights, spec, this.art);
    this.ambientBase = spec.ambient.intensity;
    this.flash = spec.flash ?? null;
  }

  /** The stand-in until the GLB loads: studio floor, the weather map wall and a green screen. */
  private buildSet(): THREE.Group {
    const set = new THREE.Group();
    this.root.add(set);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), new THREE.MeshLambertMaterial({ color: 0x24242c }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 8;
    set.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), this.wall);
    wall.position.set(0, 4, -4);
    set.add(wall);
    // The map: a few coastline-ish slabs on the wall, one mesh per colour.
    const land = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x2f6b3a }));
    land.position.set(-2.5, 2.8, -3.95);
    set.add(land);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ color: 0x1fa64a }));
    screen.position.set(4.2, 2.3, -3.9);
    set.add(screen);
    // The arena walls at ±6: studio flats.
    const flatMat = new THREE.MeshLambertMaterial({ color: 0x3a3440 });
    for (const x of [-6.4, 6.4]) {
      const flat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 4), flatMat);
      flat.position.set(x, 2.5, -1);
      set.add(flat);
    }
    return set;
  }
}

/** The stand-in's lights: the arena's defaults. */
const STAND_IN_LIGHTS = relight('weather', [
  {
    segment: '',
    background: '#07070c',
    ambient: { color: '#ffffff', intensity: 1.4 },
    key: { color: '#ffffff', intensity: 2.2, position: [-3, 6, 8] as [number, number, number] },
    rim: { color: '#ffffff', intensity: 0 },
  },
])[0];
