/**
 * The fight view: the match's stage (its GLB, src/render/stageView.ts, or
 * flat stand-in panels until it loads) and the fighters'
 * 3D models posed by sim frame (src/render/pose.ts), or grey boxes the size
 * of their hurtboxes with attacks as limb boxes (lit red while they can
 * hit). Projectiles and effect hits use the fighters' fx meshes where there
 * are some, else boxes. It reads the latest match step and the step's events
 * and never changes the match. About 16 draw calls, plus 3 to 7 a model.
 */
import * as THREE from 'three';
import { moveData, type FighterState, type MatchState, type MoveData, type SimEvent } from '../sim';
import { hittable, hurtBox } from '../sim/combat';
import { toFloat } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import type { Box } from '../sim/types';
import { FighterModel, loadFighterArt } from './fighterModel';
import { PoseTracker, type Pose } from './pose';
import { Sparks } from './sparks';
import { StageView } from './stageView';

const COLORS: Readonly<Record<string, number>> = { dale: 0x6f8fb8, rox: 0xe0559a, hollis: 0x4d5d3a, mumbles: 0xc9a06b, margaret: 0x8a3a4a, gus: 0xe8e4d8 };
const LIMB = 0x9a9a9a;
const ACTIVE = 0xff3030;
const PROJECTILE = 0x9fe8ff;
const FLASH = 0x9a9a9a;

/**
 * How an effect mesh is placed: on a projectile (its look), stretched over
 * the move's first hitbox, on the fighter as modelled (in fighter space,
 * mirrored with them), or on the raised fist. All but projectiles show from
 * the move's first hit to its last, plus a few frames to read.
 */
type Place = 'projectile' | 'stretch' | 'fighter' | 'fist';
interface Effect {
  readonly fx: string;
  readonly place: Place;
}
const fx = (name: string, place: Place): Effect => ({ fx: name, place });
const EFFECTS: Readonly<Record<string, Readonly<Record<string, Effect>>>> = {
  dale: {
    'Cold Front': fx('fx_cold_front', 'projectile'),
    'Cold Front+': fx('fx_cold_front', 'projectile'),
    'Pressure Drop': fx('fx_hail', 'projectile'),
    'Pressure Drop+': fx('fx_hail', 'projectile'),
    'Isobar Lasso': fx('fx_isobar_lasso', 'fighter'),
    'Isobar Lasso+': fx('fx_isobar_lasso', 'fighter'),
    'Heat Lightning': fx('fx_heat_lightning', 'fist'),
  },
  rox: {
    'Leg Warmer Lariat': fx('fx_lariat_trail', 'fighter'),
    'Leg Warmer Lariat+': fx('fx_lariat_trail', 'fighter'),
  },
  hollis: {
    Flashlight: fx('fx_flashlight_beam', 'stretch'),
    'Flashlight+': fx('fx_flashlight_beam', 'stretch'),
    'Key Ring': fx('fx_key_ring', 'fighter'),
    'Key Ring+': fx('fx_key_ring', 'fighter'),
  },
  mumbles: {
    'Hand Puppet': fx('fx_hand_puppet', 'projectile'),
    'Hand Puppet+': fx('fx_hand_puppet', 'projectile'),
  },
  margaret: {
    'Live Feed': fx('fx_live_feed', 'projectile'),
    'Live Feed+': fx('fx_live_feed', 'projectile'),
  },
  gus: {
    'Flambé': fx('fx_flambe', 'projectile'),
    'Flambé+': fx('fx_flambe', 'projectile'),
    'Mise en Place': fx('fx_pan', 'projectile'),
    'Mise en Place+': fx('fx_pan', 'projectile'),
  },
};
/** Tape Skip's smear, shared by every fighter; it lives in Dale's GLB. */
const TAPE_SKIP_FX = 'fx_tape_skip';
const TAPE_SKIP_ART = 'dale';
/** Frames an effect lingers after the move's last hit. */
const EFFECT_LINGER = 4;
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
  /** Effects shared by every fighter (Tape Skip's smear), once loaded. */
  private shared: Map<string, THREE.Object3D> | null = null;
  private readonly fist = new THREE.Vector3();
  private readonly unit = new THREE.BoxGeometry(1, 1, 1);
  private shake = 0;
  private camX = 0;
  private camZ = 12;
  private camY = 2.1;
  reduceMotion = false;
  showBoxes = false;
  private readonly hurtOverlays: THREE.LineSegments[] = [];
  private readonly hurtMat = new THREE.LineBasicMaterial({ color: 0x40ff80 });
  /** The hurtbox of a body nothing can hit right now. */
  private readonly hurtOffMat = new THREE.LineBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.35 });
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
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 6, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0);
    this.scene.add(rim);
    this.stage = new StageView(this.scene, { ambient, key, rim });
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
    loadFighterArt(TAPE_SKIP_ART).then(
      (art) => (this.shared = art.fx),
      () => undefined,
    );
    const edges = new THREE.EdgesGeometry(this.unit);
    for (let i = 0; i < 2; i++) {
      const l = new THREE.LineSegments(edges, this.hurtMat);
      l.visible = false;
      this.hurtOverlays.push(l);
      this.scene.add(l);
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
   * A new match: the fighters' colours, and their models and the stage's
   * (loaded in the background; grey boxes and flat panels until they
   * arrive). Resolves when they are in the scene, so shaders can be
   * compiled before the fight.
   */
  setFighters(m: MatchState): Promise<void> {
    this.poses.reset();
    const loads: Promise<void>[] = [this.stage.setStage(m.stage)];
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
      else if (e.type === 'hazardStrike' && e.hazard === 'shards') this.shake = Math.max(this.shake, 0.08);
      else if (e.type === 'hazardStrike' && e.hazard === 'lamps') this.shake = Math.max(this.shake, 0.12);
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
      // On standby (a delayed projectile) it blinks, like a camera's tally light.
      const standby = pd.delay !== undefined && pd.life - p.life < pd.delay && this.frame % 8 < 3;
      mesh.visible = (!fx || this.showBoxes) && !standby;
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
    // A finisher comes in close and low, rising and pulling back to keep anyone thrown up in shot.
    const close = m.phase === 'finisher';
    const high = close ? Math.max(toFloat(a.y), toFloat(b.y)) : 0;
    const wantZ = close ? Math.max(7, ((gap + 2.5) * 2.2) / aspect + 3.5 + high * 2) : Math.min(16, Math.max(10.5, ((gap + 4) * 2.2) / aspect + 6));
    this.camY += ((close ? 1.6 + high * 0.6 : 2.1) - this.camY) * 0.08;
    // The camera keeps the walls about in shot: it follows the fighters to 2.5 m short of them.
    const reach = toFloat(segmentData(m.stage, m.segment).halfWidth) - 2.5;
    this.camX += (Math.max(-reach, Math.min(reach, mid)) - this.camX) * 0.15;
    this.camZ += (wantZ - this.camZ) * 0.1;
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001 && !this.reduceMotion) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
    }
    this.shake *= 0.85;
    this.camera.position.set(this.camX + sx, this.camY + sy, this.camZ);
    this.camera.lookAt(this.camX + sx * 0.5, this.camY - 0.75, 0);
  }

  /** Shows the fx mesh for a fighter's move in `slot`, if it has one and the art is loaded. */
  private showFx(slot: EffectSlot, fighter: string, move: string): boolean {
    const e = this.models ? EFFECTS[fighter]?.[move] : undefined;
    const v = this.fighters[0].id === fighter ? this.fighters[0] : this.fighters[1];
    return slot.show(e?.fx ?? '', e ? v.model?.art.fx.get(e.fx) : undefined);
  }

  /** A fighter's effect for this frame (not projectiles): the move's, or Tape Skip's smear. */
  private drawEffect(f: FighterState, v: FighterView, mv: MoveData | null, x: number, y: number, clip: string): void {
    const slot = v.effect;
    const model = this.models ? v.model : null;
    if (model && clip === 'tape_skip' && slot.show(TAPE_SKIP_FX, this.shared?.get(TAPE_SKIP_FX))) {
      slot.holder.position.set(x, y, 0);
      slot.holder.scale.set(f.facing, 1, 1);
      return;
    }
    const e = mv && model ? EFFECTS[f.fighter]?.[f.move] : undefined;
    const first = mv?.hits[0];
    const last = mv?.hits[mv.hits.length - 1];
    if (!e || e.place === 'projectile' || !first || !last || f.moveFrame < first.frames[0] || f.moveFrame > last.frames[1] + EFFECT_LINGER) {
      slot.show('', undefined);
      return;
    }
    if (!slot.show(e.fx, model!.art.fx.get(e.fx))) return;
    const h = slot.holder;
    if (e.place === 'stretch') {
      const b = first.box;
      const bh = toFloat(b.h);
      h.position.set(x + f.facing * toFloat(b.x), y + toFloat(b.y) + bh / 2, 0);
      h.scale.set(f.facing * (toFloat(b.w) / BEAM_LENGTH), bh / BEAM_WIDTH, 1);
    } else if (e.place === 'fist') {
      h.position.copy(model!.raisedHand(this.fist));
      h.scale.set(f.facing, 1, 1);
    } else {
      h.position.set(x, y, 0);
      h.scale.set(f.facing, 1, 1);
    }
  }

  private drawFighter(m: MatchState, i: number): void {
    const f = m.fighters[i];
    const v = this.fighters[i];
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
    const lying = f.mode === 'down' || f.mode === 'ko' || f.mode === 'getup';
    const hurt = hurtBox(f);
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
    // The limb: the current move's active hitbox, else its hurtbox reach.
    // With a model it's only drawn as part of the hitbox view.
    v.limb.visible = false;
    if (mv) {
      // Plain loops: this runs every frame, so no closures.
      let active: Box | null = null;
      let box: Box | null = null;
      for (const h of mv.hits) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) active = h.box;
      for (const h of mv.hurt) if (f.moveFrame >= h.frames[0] && f.moveFrame <= h.frames[1]) box = h.box;
      box = active ?? box;
      if (box && (!model || this.showBoxes)) {
        v.limb.visible = true;
        placeBox(v.limb, box, x, y, f.facing, 0.35);
        v.limbMat.color.setHex(active ? ACTIVE : LIMB);
        v.limbMat.opacity = model ? 0.4 : 1;
      }
    }
    if (shown) this.drawEffect(f, v, mv, x, y, model ? this.pose.clip : '');
    else v.effect.show('', undefined);
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
    // The body's box always shows with the hit boxes; faded when nothing can hit it (on the floor, a knockdown, the juggle limit).
    const o = this.hurtOverlays[i];
    o.visible = this.showBoxes && shown;
    if (o.visible) {
      o.material = hittable(f) ? this.hurtMat : this.hurtOffMat;
      placeBox(o, hurt, x, y, f.facing, 0.55);
    }
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
