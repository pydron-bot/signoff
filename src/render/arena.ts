/**
 * The fight view: the match's stage (its GLB, src/render/stageView.ts, or
 * flat stand-in panels until it loads) and the fighters'
 * 3D models posed by sim frame (src/render/pose.ts), or grey boxes the size
 * of their hurtboxes with attacks as limb boxes (lit red while they can
 * hit). Projectiles and effect hits use the fighters' fx meshes where there
 * are some, else boxes. It reads the latest match step and the step's events
 * and never changes the match. About 19 draw calls (the signal spray is
 * one, the contact shadows two), plus 3 to 7 a model; the impact layer
 * (src/render/impact.ts, dust.ts, swoosh.ts) adds up to six while it shows;
 * the knocked-about set dressing (clutter.ts) three.
 */
import * as THREE from 'three';
import { FIGHTER_COLORS } from '../core/fighterLook';
import { moveData, type FighterState, type MatchState, type MoveData, type SimEvent } from '../sim';
import { hittable, hurtBox } from '../sim/combat';
import { toFloat } from '../sim/fixed';
import type { Box } from '../sim/types';
import { Atmosphere } from './atmosphere';
import { Echoes } from './echo';
import { CameraRig, FOV } from './camera';
import { AUDIENCE_SHADE, SEATS } from './depth';
import { ContactShadows, setRim, setSignal } from './fighterLight';
import { WearTracker } from './wear';
import { FighterModel, loadFighterArt } from './fighterModel';
import { PoseTracker, type Pose } from './pose';
import { FLOOR, MIRROR } from './reflection';
import { NEUTRAL_GRADE, type Grade } from './post';
import { SignalBurst } from './signalBurst';
import { Sparks } from './sparks';
import { Clutter } from './clutter';
import { Dust } from './dust';
import { ImpactLight, ImpactScreen, type ImpactTarget } from './impact';
import { SetFlash } from './setFlash';
import { Swoosh } from './swoosh';
import { StageView } from './stageView';

/** A step with nothing happening, for the camera during the cold open. */
const NO_EVENTS: readonly SimEvent[] = [];
const COLORS = FIGHTER_COLORS;
const LIMB = 0x9a9a9a;
const ACTIVE = 0xff3030;
const PROJECTILE = 0x9fe8ff;
/** The hit flash by weight (light, medium, heavy, ender): steps, and how bright. */
const FLASH_STEPS = [3, 4, 6, 8] as const;
const FLASH = [0x303030, 0x404040, 0x585858, 0x808080] as const;
/** A counter hit flashes warm. */
const COUNTER_FLASH = 0x705020;
/** The body jolting in the freeze of a hit, by weight (m either way), and of a block. */
const JOLT = [0.012, 0.02, 0.032, 0.05] as const;
const BLOCK_JOLT = 0.01;
/** Room around a hurtbox for arms, legs and hair, metres: what the touch buttons fade over (screenRects). */
const LIMB_ROOM = 0.2;

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
  gideon: {
    'Collection Plate': fx('fx_plate', 'projectile'),
    'Collection Plate+': fx('fx_plate', 'projectile'),
    'Fire and Brimstone': fx('fx_brimstone', 'fighter'),
    'Fire and Brimstone (blessed)': fx('fx_brimstone', 'fighter'),
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
/** Each seat's sway starts this many frames on from the last, so the audience doesn't sway as one. */
const SWAY_OFFSET = 23;
/** A seated fighter's bounds for culling: centre above the seat, and radius, metres. */
const SEATED_Y = 0.5;
const SEATED_R = 1.1;
/** Half a body's width plus its limbs, for what the foreground must keep clear of. */
const BODY_REACH = 0.6;

interface FighterView {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  limb: THREE.Mesh;
  bodyMat: THREE.MeshLambertMaterial;
  limbMat: THREE.MeshLambertMaterial;
  flash: number;
  flashColor: number;
  /** How hard the body jolts while frozen in a hit's freeze. */
  jolt: number;
  /** A heavy blow's swing. */
  swoosh: Swoosh;
  /** The 3D model once loaded, and which fighter it's for. */
  model: FighterModel | null;
  /** Its VHS echoes, trailing fast moves. */
  echoes: Echoes | null;
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
  /** The segment's colour grade, for the post pass. */
  readonly grade: Grade = { ...NEUTRAL_GRADE };
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 80);
  /** Where the camera goes, step by step (src/render/camera.ts). */
  private readonly rig = new CameraRig();
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
  /** Arcade's beaten fighters, in the bleachers in the order they were beaten; their models once loaded. */
  private audienceIds: readonly string[] = [];
  private readonly audience: (FighterModel | null)[] = [];
  private readonly frustum = new THREE.Frustum();
  private readonly viewProj = new THREE.Matrix4();
  private readonly seated = new THREE.Sphere();
  private readonly turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
  private readonly unit = new THREE.BoxGeometry(1, 1, 1);
  get reduceMotion(): boolean {
    return this.rig.reduceMotion;
  }
  set reduceMotion(on: boolean) {
    this.rig.reduceMotion = on;
    this.impactScreen.reduceMotion = on;
    this.setFlash.reduceMotion = on;
  }
  /** The touch buttons' share of the screen's width (+ right, − left, 0 none): the camera frames the fight beside them. */
  set buttons(share: number) {
    this.rig.buttons = share;
  }
  private readonly corner = new THREE.Vector3();
  showBoxes = false;
  /** VHS LOOK: how much tape the signal damage shows, 0 to 1. */
  tape = 1;
  private readonly wear = new WearTracker();
  /** The cold open: the match isn't running yet, so the fighters idle on display time, and the camera frames them close. */
  get idling(): boolean {
    return this.rig.opening;
  }

  set idling(on: boolean) {
    this.rig.opening = on;
  }
  private readonly hurtOverlays: THREE.LineSegments[] = [];
  private readonly hurtMat = new THREE.LineBasicMaterial({ color: 0x40ff80 });
  /** The hurtbox of a body nothing can hit right now. */
  private readonly hurtOffMat = new THREE.LineBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.35 });
  private readonly stage: StageView;
  private readonly sparks: Sparks;
  private readonly burst: SignalBurst;
  private readonly dust: Dust;
  private readonly clutter: Clutter;
  private readonly light: ImpactLight;
  /** The fight's light on the set and the fighters: blows, lightning, projectiles, burning specials. */
  private readonly setFlash = new SetFlash();
  /** The big-hit layer for the post pass: the shockwave, an ender's zoom and the meter spotlight. */
  private readonly impactScreen = new ImpactScreen();
  private readonly shadows: ContactShadows;
  private readonly rim: THREE.DirectionalLight;
  private readonly key: THREE.DirectionalLight;
  private readonly ambient: THREE.HemisphereLight;
  private readonly air: Atmosphere;
  private frame = 0;
  private projectileMat!: THREE.MeshBasicMaterial;
  /** The hand puppet decoy: a little wooden figure, not a blast of wind. */
  private readonly decoyMat = new THREE.MeshLambertMaterial({ color: 0xa8804e });
  /** Boxes drawn over a model or an fx mesh in the hitbox view: see-through. */
  private readonly overlayMat = new THREE.MeshBasicMaterial({ color: PROJECTILE, transparent: true, opacity: 0.3, depthWrite: false });

  constructor() {
    this.scene.background = new THREE.Color(0x07070c);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x404048, 1.1);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 6, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0);
    this.scene.add(rim);
    this.rim = rim;
    this.key = key;
    this.ambient = ambient;
    this.shadows = new ContactShadows(this.scene);
    this.stage = new StageView(this.scene, { ambient, key, rim, grade: this.grade });
    this.sparks = new Sparks(this.scene);
    this.air = new Atmosphere(this.scene);
    this.burst = new SignalBurst(this.scene);
    this.dust = new Dust(this.scene);
    this.clutter = new Clutter(this.scene);
    this.light = new ImpactLight(this.scene);
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
    return { group, body, head, limb, bodyMat, limbMat, flash: 0, flashColor: FLASH[2], jolt: 0, swoosh: new Swoosh(this.scene, 0xffffff), model: null, echoes: null, id: '', effect: new EffectSlot(this.scene) };
  }

  /**
   * A new match: the fighters' colours, and their models and the stage's
   * (loaded in the background; grey boxes and flat panels until they
   * arrive). Resolves when they are in the scene, so shaders can be
   * compiled before the fight.
   */
  setFighters(m: MatchState): Promise<void> {
    this.poses.reset();
    this.rig.reset();
    const loads: Promise<void>[] = [this.stage.setStage(m.stage), this.clutter.setStage(m.stage)];
    m.fighters.forEach((f, i) => {
      const v = this.fighters[i];
      v.bodyMat.color.setHex(COLORS[f.fighter] ?? 0xcccccc);
      v.swoosh.setColor(COLORS[f.fighter] ?? 0xcccccc);
      if (v.id === f.fighter) return;
      v.model?.dispose();
      v.model = null;
      v.echoes?.dispose();
      v.echoes = null;
      v.id = f.fighter;
      const id = f.fighter;
      loads.push(
        loadFighterArt(id).then(
          (art) => {
            // A newer match may have picked someone else meanwhile.
            if (v.id !== id) return;
            v.model = new FighterModel(art);
            this.scene.add(v.model.root);
            v.echoes = new Echoes(art, this.scene);
          },
          // No GLB (or offline before it was cached): grey boxes.
          () => undefined,
        ),
      );
    });
    return Promise.all(loads).then(() => undefined);
  }

  /**
   * Who sits in the bleachers (Arcade's beaten fighters, first beaten
   * first), at most six. Resolves when their models are in the scene.
   */
  setAudience(ids: readonly string[]): Promise<void> {
    const next = ids.slice(0, SEATS);
    const loads: Promise<void>[] = [];
    for (let k = 0; k < SEATS; k++) {
      const id = next[k];
      if (this.audienceIds[k] === id && (this.audience[k] || !id)) continue;
      this.audience[k]?.dispose();
      this.audience[k] = null;
      if (!id) continue;
      loads.push(
        loadFighterArt(id).then(
          (art) => {
            if (this.audienceIds[k] !== id || this.audience[k]) return;
            const model = new FighterModel(art, undefined, AUDIENCE_SHADE);
            model.root.visible = false;
            this.scene.add(model.root);
            this.audience[k] = model;
          },
          () => undefined,
        ),
      );
    }
    this.audienceIds = next;
    return Promise.all(loads).then(() => undefined);
  }

  /** After a jump in time (a replay seek): poses start afresh from the new step. */
  resync(): void {
    this.poses.reset();
    this.rig.reset();
    this.burst.clear();
    this.dust.clear();
    this.clutter.clear();
    this.light.clear();
    this.setFlash.clear();
    this.impactScreen.clear();
    this.wear.reset();
    for (const v of this.fighters) v.echoes?.reset();
  }

  /** Once per simulation step, with that step's events: timed effects keep sim time, not display time. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    this.poses.step(m, ev);
    this.sparks.update();
    this.burst.update();
    for (const v of this.fighters) if (v.flash > 0) v.flash--;
    this.dust.step();
    this.light.step();
    this.impactScreen.step();
    this.sparks.onEvents(ev);
    this.burst.onEvents(ev);
    this.dust.onEvents(m, ev);
    this.clutter.step(m, ev);
    this.light.onEvents(ev);
    this.impactScreen.onEvents(ev);
    this.setFlash.onEvents(m, ev);
    this.setFlash.step(m);
    for (const e of ev) {
      if (e.type === 'hit') {
        const v = this.fighters[e.defender];
        v.flash = FLASH_STEPS[e.weight] + (e.counter ? 2 : 0);
        v.flashColor = e.counter ? COUNTER_FLASH : FLASH[e.weight];
        v.jolt = JOLT[e.weight] * (e.counter ? 1.3 : 1);
      } else if (e.type === 'block') {
        const v = this.fighters[e.defender];
        v.flash = 3;
        v.flashColor = FLASH[0];
        v.jolt = BLOCK_JOLT;
      }
    }
    this.rig.step(m, ev);
    this.wear.step(m, ev);
  }

  /** The impact layer's numbers for the post pass, after render() has placed the camera. */
  impact(m: MatchState): ImpactTarget {
    return this.impactScreen.project(m, this.camera);
  }

  /** Roughly the picture's colour, for the light it throws (the title's TV): the segment's key and ambient, mixed. */
  tone(out: THREE.Color): THREE.Color {
    return out.copy(this.key.color).lerp(this.ambient.color, 0.5);
  }

  /** The scene's drawing height in device pixels: effects sized in pixels follow it. */
  setPixelHeight(px: number): void {
    this.air.setHeight(px);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.rig.aspect = w / h;
  }

  render(m: MatchState): void {
    this.frame++;
    // The cold open: nothing steps, so the camera frames the match from here (else it keeps the last match's shot).
    if (this.idling) this.rig.step(m, NO_EVENTS);
    this.stage.update(m, this.frame);
    this.clutter.update();
    // After the set has lit the segment (its rim may pulse on the beat).
    setRim(this.rim);
    // The signal damage flickers on display time; held still for Reduce Motion.
    setSignal(this.reduceMotion ? 0 : this.frame / 60, this.tape);
    this.shadows.setKey(this.key);
    this.air.update(m, this.frame / 60);
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
    const c = this.rig.shot;
    const fov = this.rig.fov;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(c.x, c.y, c.z);
    this.camera.lookAt(c.tx, c.ty, 0);
    if (c.roll !== 0) this.camera.rotateZ(c.roll);
    this.drawDepth(m);
    // drawDepth has brought the camera's matrices up to date.
    this.setFlash.update(this.camera, this.frame);
  }

  /** The foreground kept off the fight, and the audience in their seats (drawn only when in view). */
  private drawDepth(m: MatchState): void {
    const depth = this.stage.depth;
    const ax = toFloat(m.fighters[0].x);
    const bx = toFloat(m.fighters[1].x);
    depth?.update(this.camera, Math.min(ax, bx) - BODY_REACH, Math.max(ax, bx) + BODY_REACH);
    this.camera.updateMatrixWorld();
    this.viewProj.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProj);
    for (let k = 0; k < SEATS; k++) {
      const model = this.audience[k];
      if (!model) continue;
      const seat = this.models ? depth?.seat(k) : null;
      if (!seat) {
        model.root.visible = false;
        continue;
      }
      seat.getWorldPosition(model.root.position);
      this.seated.center.copy(model.root.position).y += SEATED_Y;
      this.seated.radius = SEATED_R;
      model.root.visible = this.frustum.intersectsSphere(this.seated);
      if (!model.root.visible) continue;
      // The seat's +z faces the fight; the model is turned a quarter to face +x, so turn it back.
      seat.getWorldQuaternion(model.root.quaternion).multiply(this.turn);
      model.pose('sit_audience', this.frame + k * SWAY_OFFSET, true);
    }
  }

  /**
   * Where each fighter's body is on screen, after render(): left, top, right,
   * bottom in CSS pixels of a w × h view, for each fighter, into `out` (8
   * numbers). The hurtbox with some room for limbs; one off screen is empty.
   */
  screenRects(m: MatchState, w: number, h: number, out: Float32Array): void {
    this.camera.updateMatrixWorld();
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const o = i * 4;
      if (!this.fighters[i].group.visible) {
        out.fill(0, o, o + 4);
        continue;
      }
      const b = hurtBox(f);
      const bx = toFloat(b.x);
      const bw = toFloat(b.w);
      const x0 = toFloat(f.x) + (f.facing > 0 ? bx : -bx - bw) - LIMB_ROOM;
      const x1 = x0 + bw + 2 * LIMB_ROOM;
      const y0 = toFloat(f.y) + toFloat(b.y);
      const y1 = y0 + toFloat(b.h) + LIMB_ROOM;
      out[o] = out[o + 1] = Infinity;
      out[o + 2] = out[o + 3] = -Infinity;
      for (let k = 0; k < 4; k++) {
        const c = this.corner.set(k & 1 ? x1 : x0, k & 2 ? y1 : y0, 0).project(this.camera);
        const sx = ((c.x + 1) / 2) * w;
        const sy = ((1 - c.y) / 2) * h;
        out[o] = Math.min(out[o], sx);
        out[o + 1] = Math.min(out[o + 1], sy);
        out[o + 2] = Math.max(out[o + 2], sx);
        out[o + 3] = Math.max(out[o + 3], sy);
      }
    }
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
    // Frozen in a hit's freeze, the body jolts side to side, step by step, dying away (not with Reduce Motion).
    if (f.hitstop > 0 && v.jolt > 0 && !this.reduceMotion) v.group.position.x = (f.hitstop & 1 ? 1 : -1) * v.jolt * Math.min(1, f.hitstop / 6);
    else if (f.hitstop === 0) v.jolt = 0;
    const jx = v.group.position.x;
    // Grey boxes have no echoes; a model's start afresh when it's back.
    if (!model) v.echoes?.reset();
    if (model) {
      v.head.visible = false;
      model.root.position.set(x + jx, y, 0);
      model.root.scale.x = f.facing;
      const p = this.poses.pose(m, i, this.pose);
      if (this.idling) {
        p.clip = 'idle';
        p.frame = this.frame + 1;
        p.loop = true;
      }
      model.pose(p.clip, p.frame, p.loop);
      model.setWear(this.wear.wear[i]);
      model.showReflections(FLOOR.strength.value > 0, MIRROR.strength.value > 0);
      v.echoes?.update(f, p, x, y, shown, !this.reduceMotion);
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
    this.shadows.update(m, i, shown);
    if (shown) this.drawEffect(f, v, mv, x, y, model ? this.pose.clip : '');
    else v.effect.show('', undefined);
    if (shown) v.swoosh.update(f, mv, x, y);
    else v.swoosh.hide();
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
    model?.setTint(v.flash > 0 ? v.flashColor : glow);
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
