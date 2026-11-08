/**
 * The fight view: the Weather at Eleven set as flat panels and the fighters'
 * 3D models posed by sim frame (src/render/pose.ts), or grey boxes the size
 * of their hurtboxes with attacks as limb boxes (lit red while they can
 * hit). Projectiles and effect hits use the fighters' fx meshes where there
 * are some, else boxes. It reads the latest match step and the step's events
 * and never changes the match. About 16 draw calls, plus 3 to 7 a model.
 */
import * as THREE from 'three';
import { fighterData, moveData, type MatchState, type SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';
import type { Box } from '../sim/types';
import { FighterModel, loadFighterArt } from './fighterModel';
import { PoseTracker, type Pose } from './pose';
import { Sparks } from './sparks';
import { StageView } from './stageView';

const COLORS: Readonly<Record<string, number>> = { dale: 0x6f8fb8, rox: 0xe0559a, hollis: 0x4d5d3a, mumbles: 0xc9a06b };
const LIMB = 0x9a9a9a;
const ACTIVE = 0xff3030;
const PROJECTILE = 0x9fe8ff;
const FLASH = 0x9a9a9a;

/**
 * Effect meshes by fighter and move: a projectile's look, or (for moves
 * without one) shown over the move's first hit, stretched to its hitbox.
 */
const EFFECTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  dale: { 'Cold Front': 'fx_cold_front', 'Cold Front+': 'fx_cold_front', 'Pressure Drop': 'fx_hail', 'Pressure Drop+': 'fx_hail' },
  hollis: { Flashlight: 'fx_flashlight_beam', 'Flashlight+': 'fx_flashlight_beam' },
  mumbles: { 'Hand Puppet': 'fx_hand_puppet', 'Hand Puppet+': 'fx_hand_puppet' },
};
/** fx_flashlight_beam's size: 1.8 m long (glTF +z), 0.82 m across. */
const BEAM_LENGTH = 1.8;
const BEAM_WIDTH = 0.82;

interface FighterView {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  limb: THREE.Mesh;
  bodyMat: THREE.MeshLambertMaterial;
  limbMat: THREE.MeshLambertMaterial;
  flash: number;
  /** The 3D model once loaded, and which fighter it's for. */
  model: FighterModel | null;
  id: string;
  /** The effect hit (a beam) shown over a move's first hit. */
  effect: EffectSlot;
}

/** Holds copies of fx meshes, one per name, made on first use and kept. */
class EffectSlot {
  readonly holder = new THREE.Group();
  private readonly copies = new Map<string, THREE.Object3D>();
  private shown: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.holder.visible = false;
    scene.add(this.holder);
  }

  /** Shows a copy of `source` (or nothing), facing glTF +z along the holder's +x. */
  show(name: string, source: THREE.Object3D | undefined): boolean {
    let o = source ? this.copies.get(name) : undefined;
    if (source && !o) {
      o = source.clone();
      o.rotation.y = Math.PI / 2;
      this.copies.set(name, o);
      this.holder.add(o);
    }
    if (this.shown !== (o ?? null)) {
      if (this.shown) this.shown.visible = false;
      if (o) o.visible = true;
      this.shown = o ?? null;
    }
    this.holder.visible = o !== undefined;
    return this.holder.visible;
  }
}

export class Arena {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
  private readonly fighters: FighterView[];
  private readonly projectiles: THREE.Mesh[] = [];
  private readonly projectileFx: EffectSlot[] = [];
  private readonly poses = new PoseTracker();
  private readonly pose: Pose = { clip: '', frame: 1, loop: false };
  /** 3D models (when loaded) or grey boxes. */
  models = true;
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
  private projectileMat!: THREE.MeshBasicMaterial;
  /** The hand puppet decoy: a little wooden figure, not a blast of wind. */
  private readonly decoyMat = new THREE.MeshLambertMaterial({ color: 0xa8804e });
  /** Boxes drawn over a model or an fx mesh in the hitbox view: see-through. */
  private readonly overlayMat = new THREE.MeshBasicMaterial({ color: PROJECTILE, transparent: true, opacity: 0.3, depthWrite: false });

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
    this.projectileMat = pm;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(this.unit, pm);
      p.visible = false;
      this.projectiles.push(p);
      this.scene.add(p);
      this.projectileFx.push(new EffectSlot(this.scene));
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
    // See-through over a model (the hitbox view); solid on a grey box.
    const limbMat = new THREE.MeshLambertMaterial({ color: LIMB, transparent: true, depthWrite: false });
    const body = new THREE.Mesh(this.unit, bodyMat);
    const head = new THREE.Mesh(this.unit, bodyMat);
    const limb = new THREE.Mesh(this.unit, limbMat);
    group.add(body, head, limb);
    this.scene.add(group);
    return { group, body, head, limb, bodyMat, limbMat, flash: 0, model: null, id: '', effect: new EffectSlot(this.scene) };
  }

  /**
   * A new match: the fighters' colours, and their models (loaded in the
   * background; grey boxes until they arrive). Resolves when the models are
   * in the scene, so shaders can be compiled before the fight.
   */
  setFighters(m: MatchState): Promise<void> {
    this.poses.reset();
    const loads: Promise<void>[] = [];
    m.fighters.forEach((f, i) => {
      const v = this.fighters[i];
      v.bodyMat.color.setHex(COLORS[f.fighter] ?? 0xcccccc);
      if (v.id === f.fighter) return;
      v.model?.dispose();
      v.model = null;
      v.id = f.fighter;
      const id = f.fighter;
      loads.push(
        loadFighterArt(id).then(
          (art) => {
            // A newer match may have picked someone else meanwhile.
            if (v.id !== id) return;
            v.model = new FighterModel(art);
            this.scene.add(v.model.root);
          },
          // No GLB (or offline before it was cached): grey boxes.
          () => undefined,
        ),
      );
    });
    return Promise.all(loads).then(() => undefined);
  }

  /** After a jump in time (a replay seek): poses start afresh from the new step. */
  resync(): void {
    this.poses.reset();
  }

  /** Once per simulation step, with that step's events: timed effects keep sim time, not display time. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    this.poses.step(m, ev);
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
    for (let i = 0; i < 2; i++) this.drawFighter(m, i);
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = m.projectiles[i];
      const mesh = this.projectiles[i];
      const slot = this.projectileFx[i];
      if (!p?.active) {
        mesh.visible = false;
        slot.show('', undefined);
        continue;
      }
      const owner = m.fighters[p.owner].fighter;
      const pd = moveData(owner, p.move).spawns[p.spawn].projectile;
      // The fx mesh stands on the bottom centre of the projectile's box; the box stays as an overlay.
      const fx = this.showFx(slot, owner, p.move);
      mesh.visible = !fx || this.showBoxes;
      mesh.material = fx ? this.overlayMat : pd.decoy ? this.decoyMat : this.projectileMat;
      placeBox(mesh, pd.box, toFloat(p.x), toFloat(p.y), p.dir, pd.decoy ? 0.4 : 0.6);
      if (fx) {
        slot.holder.position.set(mesh.position.x, toFloat(p.y) + toFloat(pd.box.y), 0);
        slot.holder.scale.set(p.dir, 1, 1);
      }
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

  /** Shows the fx mesh for a fighter's move in `slot`, if it has one and the art is loaded. */
  private showFx(slot: EffectSlot, fighter: string, move: string): boolean {
    const name = this.models ? EFFECTS[fighter]?.[move] : undefined;
    const v = this.fighters[0].id === fighter ? this.fighters[0] : this.fighters[1];
    return slot.show(name ?? '', name ? v.model?.art.fx.get(name) : undefined);
  }

  private drawFighter(m: MatchState, i: number): void {
    const f = m.fighters[i];
    const v = this.fighters[i];
    const d = fighterData(f.fighter);
    const x = toFloat(f.x);
    const y = toFloat(f.y);
    const model = this.models ? v.model : null;
    v.group.position.set(0, 0, 0);
    // Off screen mid-teleport.
    const mv = f.mode === 'move' ? moveData(f.fighter, f.move) : null;
    const shown = !(mv?.hidden && f.moveFrame >= mv.hidden[0] && f.moveFrame <= mv.hidden[1]);
    v.group.visible = shown;
    v.body.visible = !model;
    if (v.model) v.model.root.visible = shown && model !== null;
    const air = f.y > 0 || f.mode === 'air' || f.mode === 'launched';
    const lying = f.mode === 'down' || f.mode === 'ko' || f.mode === 'getup';
    const hurt = air ? d.hurt.air : f.crouching ? d.hurt.crouch : d.hurt.stand;
    if (model) {
      v.head.visible = false;
      model.root.position.set(x, y, 0);
      model.root.scale.x = f.facing;
      const p = this.poses.pose(m, i, this.pose);
      model.pose(p.clip, p.frame, p.loop);
    } else if (lying) {
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
    // With a model it's only drawn as part of the hitbox view.
    v.limb.visible = false;
    let beam: Box | null = null;
    if (mv) {
      // Plain loops: this runs every frame, so no closures.
      let active: Box | null = null;
      let box: Box | null = null;
      for (const h of mv.hits) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) active = h.box;
      for (const h of mv.hurt) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) box = h.box;
      const h0 = mv.hits[0];
      if (h0 && f.moveFrame >= h0.frames[0] && f.moveFrame <= h0.frames[1]) beam = h0.box;
      box = active ?? box;
      if (box && (!model || this.showBoxes)) {
        v.limb.visible = true;
        placeBox(v.limb, box, x, y, f.facing, 0.35);
        v.limbMat.color.setHex(active ? ACTIVE : LIMB);
        v.limbMat.opacity = model ? 0.4 : 1;
      }
    }
    // An effect hit (the Flashlight's beam) stretched over the first hit's box.
    if (beam && shown && this.showFx(v.effect, f.fighter, f.move)) {
      const bx = toFloat(beam.x);
      const bw = toFloat(beam.w);
      const bh = toFloat(beam.h);
      v.effect.holder.position.set(x + f.facing * bx, y + toFloat(beam.y) + bh / 2, 0);
      v.effect.holder.scale.set(f.facing * (bw / BEAM_LENGTH), bh / BEAM_WIDTH, 1);
    } else v.effect.show('', undefined);
    // Flash when hit; dim while invulnerable on the floor.
    const base = COLORS[f.fighter] ?? 0xcccccc;
    v.bodyMat.color.setHex(v.flash > 0 ? 0xffffff : base);
    // Glows: armour orange, an unblockable winding up purple, guarding blue.
    let glow = 0;
    if (f.mode === 'cinematic') glow = 0x401010;
    else if (f.mode === 'guard' || f.mode === 'blockstun') glow = 0x10203a;
    else if (mv && mv.armor && !f.armorUsed && f.moveFrame >= mv.armor[0] && f.moveFrame <= mv.armor[1]) glow = 0x803000;
    else if (mv && f.moveFrame < mv.startup && mv.hits.length && mv.hits[0].height === 'unblockable') glow = 0x501070;
    v.bodyMat.emissive.setHex(glow);
    model?.setTint(v.flash > 0 ? FLASH : glow);
    const o = this.hurtOverlays[i];
    o.visible = this.showBoxes && !lying && shown;
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
