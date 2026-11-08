/**
 * The living stage, drawn: the dollies, the wind, the flood, and hazard
 * warnings (a flashing floor marker where it will strike) and strikes. It
 * reads the match's stage state; a fixed handful of meshes, made once.
 */
import * as THREE from 'three';
import { stageData, type MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';

const STREAKS = 40;
const MARKERS = 5;

export class StageView {
  private readonly dollies: THREE.Mesh[] = [];
  private readonly markers: THREE.Mesh[] = [];
  private readonly markerMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.6 });
  private readonly bolt: THREE.Mesh;
  private readonly water: THREE.Mesh;
  private readonly puddles: THREE.Mesh[] = [];
  private readonly puddleMat = new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.45 });
  private readonly streaks: THREE.InstancedMesh;
  private readonly streakX = new Float32Array(STREAKS);
  private readonly streakY = new Float32Array(STREAKS);
  private readonly tmp = new THREE.Object3D();
  private readonly wall: THREE.MeshBasicMaterial;
  private segment = -1;

  constructor(scene: THREE.Scene, wall: THREE.MeshBasicMaterial) {
    this.wall = wall;
    const dollyGeo = new THREE.BoxGeometry(0.9, 1.0, 0.7);
    const dollyMat = new THREE.MeshLambertMaterial({ color: 0x8c8c70 });
    for (let k = 0; k < 2; k++) {
      const d = new THREE.Mesh(dollyGeo, dollyMat);
      d.visible = false;
      this.dollies.push(d);
      scene.add(d);
    }
    const disc = new THREE.CircleGeometry(1, 24);
    for (let k = 0; k < MARKERS; k++) {
      const mk = new THREE.Mesh(disc, this.markerMat);
      mk.rotation.x = -Math.PI / 2;
      mk.visible = false;
      this.markers.push(mk);
      scene.add(mk);
    }
    this.bolt = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.25), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bolt.visible = false;
    scene.add(this.bolt);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), new THREE.MeshBasicMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.35 }));
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, 0.22, 0);
    this.water.visible = false;
    scene.add(this.water);
    for (let k = 0; k < 2; k++) {
      const p = new THREE.Mesh(disc, this.puddleMat);
      p.rotation.x = -Math.PI / 2;
      p.visible = false;
      this.puddles.push(p);
      scene.add(p);
    }
    this.streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xc8d8ff, transparent: true, opacity: 0.35 }), STREAKS);
    for (let k = 0; k < STREAKS; k++) {
      this.streakX[k] = Math.random() * 14 - 7;
      this.streakY[k] = 0.2 + Math.random() * 3.5;
    }
    this.streaks.visible = false;
    scene.add(this.streaks);
  }

  update(m: MatchState, frame: number): void {
    const seg = segmentData(m.stage, m.segment);
    if (this.segment !== m.segment) {
      this.segment = m.segment;
      // The set looks different each segment: calm blue, storm grey, flood teal.
      this.wall.color.setHex([0x0d1a4a, 0x1c2030, 0x0c2a33][m.segment] ?? 0x0d1a4a);
    }
    for (let k = 0; k < this.dollies.length; k++) {
      const d = this.dollies[k];
      const p = m.props[k];
      d.visible = p !== undefined;
      if (!p) continue;
      d.position.set(toFloat(p.x), 0.5, -0.2);
      if (p.mode === 'rolling') d.rotation.y += 0.3;
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
    this.bolt.visible = striking && hz.id === 'lightning' && frame % 2 === 0;
    if (this.bolt.visible) this.bolt.position.set(toFloat(hz.spots[st.spot]), 4, 0);
    // The flood and its live puddles.
    const flood = m.segment === 2 && stageData(m.stage).id === 'weather';
    this.water.visible = flood;
    for (let k = 0; k < this.puddles.length; k++) {
      const p = this.puddles[k];
      const spot = flood ? hz?.spots[k] : undefined;
      p.visible = spot !== undefined;
      if (spot === undefined || !hz) continue;
      p.scale.setScalar(toFloat(hz.halfW));
      p.position.set(toFloat(spot), 0.24, 0);
    }
    // Wind streaks drift with the wind.
    this.streaks.visible = m.wind !== 0;
    if (m.wind !== 0) {
      const v = toFloat(m.wind) * 25;
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
    }
  }
}
