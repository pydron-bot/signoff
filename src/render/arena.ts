/**
 * The grey-box view: the Weather at Eleven set as flat panels, fighters as
 * boxes the size of their hurtboxes, attacks as limb boxes (lit red while
 * they can hit), projectiles as boxes. It reads the latest match step and
 * the step's events and never changes the match. About 16 draw calls.
 */
import * as THREE from 'three';
import { fighterData, moveData, type FighterState, type MatchState, type SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import type { Box } from '../sim/types';
import { Sparks } from './sparks';
import { StageView } from './stageView';

const COLORS: Readonly<Record<string, number>> = { dale: 0x6f8fb8, rox: 0xe0559a };
const LIMB = 0x9a9a9a;
const ACTIVE = 0xff3030;
const PROJECTILE = 0x9fe8ff;

interface FighterView {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  limb: THREE.Mesh;
  bodyMat: THREE.MeshLambertMaterial;
  limbMat: THREE.MeshLambertMaterial;
  flash: number;
}

export class Arena {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
  private readonly fighters: FighterView[];
  private readonly projectiles: THREE.Mesh[] = [];
  private readonly unit = new THREE.BoxGeometry(1, 1, 1);
  private shake = 0;
  private camX = 0;
  private camZ = 12;
  reduceMotion = false;
  showBoxes = false;
  private readonly hurtOverlays: THREE.LineSegments[] = [];
  private readonly wallMat = new THREE.MeshBasicMaterial({ color: 0x0d1a4a });
  private readonly stage: StageView;
  private readonly sparks: Sparks;
  private frame = 0;

  constructor() {
    this.scene.background = new THREE.Color(0x07070c);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 6, 8);
    this.scene.add(key);
    this.buildSet();
    this.stage = new StageView(this.scene, this.wallMat);
    this.sparks = new Sparks(this.scene);
    this.fighters = [0, 1].map(() => this.fighterView());
    const pm = new THREE.MeshBasicMaterial({ color: PROJECTILE, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(this.unit, pm);
      p.visible = false;
      this.projectiles.push(p);
      this.scene.add(p);
    }
    const edges = new THREE.EdgesGeometry(this.unit);
    const lm = new THREE.LineBasicMaterial({ color: 0x40ff80 });
    for (let i = 0; i < 2; i++) {
      const l = new THREE.LineSegments(edges, lm);
      l.visible = false;
      this.hurtOverlays.push(l);
      this.scene.add(l);
    }
  }

  /** Weather at Eleven: studio floor, the weather map wall and a green screen. */
  private buildSet(): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), new THREE.MeshLambertMaterial({ color: 0x24242c }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 8;
    this.scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), this.wallMat);
    wall.position.set(0, 4, -4);
    this.scene.add(wall);
    // The map: a few coastline-ish slabs on the wall, one mesh per colour.
    const land = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x2f6b3a }));
    land.position.set(-2.5, 2.8, -3.95);
    this.scene.add(land);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ color: 0x1fa64a }));
    screen.position.set(4.2, 2.3, -3.9);
    this.scene.add(screen);
    // The arena walls at ±6: studio flats.
    const flatMat = new THREE.MeshLambertMaterial({ color: 0x3a3440 });
    for (const x of [-6.4, 6.4]) {
      const flat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 4), flatMat);
      flat.position.set(x, 2.5, -1);
      this.scene.add(flat);
    }
  }

  private fighterView(): FighterView {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const limbMat = new THREE.MeshLambertMaterial({ color: LIMB });
    const body = new THREE.Mesh(this.unit, bodyMat);
    const head = new THREE.Mesh(this.unit, bodyMat);
    const limb = new THREE.Mesh(this.unit, limbMat);
    group.add(body, head, limb);
    this.scene.add(group);
    return { group, body, head, limb, bodyMat, limbMat, flash: 0 };
  }

  setFighters(m: MatchState): void {
    m.fighters.forEach((f, i) => this.fighters[i].bodyMat.color.setHex(COLORS[f.fighter] ?? 0xcccccc));
  }

  /** Once per simulation step, with that step's events: timed effects keep sim time, not display time. */
  step(ev: readonly SimEvent[]): void {
    this.sparks.update();
    for (const v of this.fighters) if (v.flash > 0) v.flash--;
    this.sparks.onEvents(ev);
    for (const e of ev) {
      if (e.type === 'hit') {
        this.fighters[e.defender].flash = 6;
        this.shake = Math.max(this.shake, e.damage >= 60 ? 0.12 : 0.05);
      } else if (e.type === 'block') this.fighters[e.defender].flash = 3;
      else if (e.type === 'superHit') this.shake = 0.25;
      else if (e.type === 'hazardStrike' && e.hazard === 'lightning') this.shake = Math.max(this.shake, 0.15);
    }
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(m: MatchState): void {
    const [a, b] = m.fighters;
    this.frame++;
    this.stage.update(m, this.frame);
    for (let i = 0; i < 2; i++) this.drawFighter(m.fighters[i], this.fighters[i], i);
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = m.projectiles[i];
      const mesh = this.projectiles[i];
      mesh.visible = p.active;
      if (!p.active) continue;
      const box = moveData(m.fighters[p.owner].fighter, p.move).spawns[p.spawn].projectile.box;
      placeBox(mesh, box, toFloat(p.x), toFloat(p.y), p.dir, 0.6);
    }
    // Follow the midpoint; pull back as the fighters part.
    const mid = (toFloat(a.x) + toFloat(b.x)) / 2;
    const gap = Math.abs(toFloat(a.x) - toFloat(b.x));
    const aspect = Math.max(this.camera.aspect, 1);
    const wantZ = Math.min(16, Math.max(10.5, ((gap + 4) * 2.2) / aspect + 6));
    this.camX += (Math.max(-3.5, Math.min(3.5, mid)) - this.camX) * 0.15;
    this.camZ += (wantZ - this.camZ) * 0.1;
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001 && !this.reduceMotion) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
    }
    this.shake *= 0.85;
    this.camera.position.set(this.camX + sx, 2.1 + sy, this.camZ);
    this.camera.lookAt(this.camX + sx * 0.5, 1.35, 0);
  }

  private drawFighter(f: FighterState, v: FighterView, i: number): void {
    const d = fighterData(f.fighter);
    const x = toFloat(f.x);
    const y = toFloat(f.y);
    v.group.position.set(0, 0, 0);
    const air = f.y > 0 || f.mode === 'air' || f.mode === 'launched';
    const lying = f.mode === 'down' || f.mode === 'ko' || f.mode === 'getup';
    const hurt = air ? d.hurt.air : f.crouching ? d.hurt.crouch : d.hurt.stand;
    if (lying) {
      // Flat on the floor; rising during getup.
      const h = f.mode === 'getup' ? 0.4 : 0.3;
      v.body.scale.set(1.6, h, 0.5);
      v.body.position.set(x, y + h / 2, 0);
      v.head.visible = false;
    } else {
      placeBox(v.body, hurt, x, y, f.facing, 0.5);
      v.head.visible = true;
      // A nose on the facing side, so you can tell which way they look.
      const top = toFloat(hurt.y + hurt.h);
      v.head.scale.set(0.16, 0.12, 0.3);
      v.head.position.set(x + f.facing * (toFloat(hurt.x + hurt.w) + 0.06), y + top - 0.25, 0);
    }
    v.body.rotation.z = f.mode === 'launched' ? f.facing * 0.5 : 0;
    // The limb: the current move's active hitbox, else its hurtbox reach.
    v.limb.visible = false;
    if (f.mode === 'move') {
      const mv = moveData(f.fighter, f.move);
      // Plain loops: this runs every frame, so no closures.
      let active: Box | null = null;
      let box: Box | null = null;
      for (const h of mv.hits) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) active = h.box;
      for (const h of mv.hurt) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) box = h.box;
      box = active ?? box;
      if (box) {
        v.limb.visible = true;
        placeBox(v.limb, box, x, y, f.facing, 0.35);
        v.limbMat.color.setHex(active ? ACTIVE : LIMB);
      }
    }
    // Flash white when hit; dim while invulnerable on the floor.
    const base = COLORS[f.fighter] ?? 0xcccccc;
    v.bodyMat.color.setHex(v.flash > 0 ? 0xffffff : base);
    v.bodyMat.emissive.setHex(f.mode === 'cinematic' ? 0x401010 : f.mode === 'guard' || f.mode === 'blockstun' ? 0x10203a : 0);
    const o = this.hurtOverlays[i];
    o.visible = this.showBoxes && !lying;
    if (o.visible) placeBox(o, hurt, x, y, f.facing, 0.55);
  }
}

/** Scales and places a unit box to a sim box at (x, y) facing dir. */
function placeBox(mesh: THREE.Object3D, b: Box, x: number, y: number, dir: number, depth: number): void {
  const bx = toFloat(b.x);
  const bw = toFloat(b.w);
  const by = toFloat(b.y);
  const bh = toFloat(b.h);
  mesh.scale.set(bw, bh, depth);
  mesh.position.set(x + dir * (bx + bw / 2), y + by + bh / 2, 0);
}
