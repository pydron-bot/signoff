/**
 * The big-hit layer, read from the sim's events and drawn without touching
 * it: a shockwave that ripples the picture out from the contact of heavy
 * hits and enders (with a short zoom blur on an ender), a spotlight that
 * dims the set round a fighter as they spend meter (a boost, Cut Away,
 * Technical Difficulties), and the light a blow throws: a glow at the
 * contact and a pool of it on the floor beneath. The ripple, the blur and
 * the spotlight are done by the post pass (src/render/post.ts) from a few
 * numbers set here; the light is two additive quads. Stepped with the
 * simulation, so hitstop holds the ripple mid-air and slow motion slows it.
 * Nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MatchState, SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';

/** By hit weight (light, medium, heavy, ender): ripple steps, how far it travels (of the screen's height), and how hard it bends. */
const SHOCK_LIFE = [0, 0, 11, 16] as const;
const SHOCK_REACH = [0, 0, 0.17, 0.32] as const;
const SHOCK_STRENGTH = [0, 0, 0.55, 1] as const;
/** An ender's zoom blur toward the contact, in steps. */
const ZOOM_STEPS = 7;
/** The spotlight: steps it lasts by what started it, how fast it comes on and goes, and its radius (of the screen's height). */
const FOCUS_BOOST = 18;
const FOCUS_SUPER = 34;
const FOCUS_IN = 3;
const FOCUS_OUT = 8;
const FOCUS_RADIUS = 0.2;
/** An ender's colour drain: steps (about its freeze, longer on a counter), the last few fading, and the clear radius round the blow. */
const DRAIN_STEPS = 14;
const DRAIN_COUNTER = 4;
const DRAIN_FADE = 4;
const DRAIN_RADIUS = 0.12;
/** Speed lines: steps and strength for a wall splat, Tape Skip, a teleport and a jump cancel. */
const SPEED_WALL = [16, 1] as const;
const SPEED_SKIP = [12, 0.7] as const;
const SPEED_TELEPORT = [8, 0.6] as const;
const SPEED_JUMP = [8, 0.45] as const;

/** What the post pass needs from this, in its own terms (uv 0..1, radius and strength). */
export interface ImpactTarget {
  shockX: number;
  shockY: number;
  shockR: number;
  shock: number;
  zoom: number;
  focusX: number;
  focusY: number;
  focusR: number;
  focus: number;
  drainX: number;
  drainY: number;
  drainR: number;
  drain: number;
  speedX: number;
  speedY: number;
  speed: number;
}

export class ImpactScreen {
  /** Drops the ripple, the blur and the speed lines (they move the picture); the spotlight and the drain stay. */
  reduceMotion = false;
  private readonly shockAt = new THREE.Vector3();
  private shockLeft = 0;
  private shockLife = 1;
  private shockReach = 0;
  private shockStrength = 0;
  private zoomLeft = 0;
  private focusPlayer = 0;
  private focusLeft = 0;
  private focusLife = 1;
  private readonly drainAt = new THREE.Vector3();
  private drainLeft = 0;
  /** Speed lines: from a point, or from a fighter (-1: the point), steps left, life and strength. */
  private readonly speedAt = new THREE.Vector3();
  private speedPlayer = -1;
  private speedLeft = 0;
  private speedLife = 1;
  private speedPower = 0;
  private readonly at = new THREE.Vector3();
  private readonly out: ImpactTarget = {
    shockX: 0.5,
    shockY: 0.5,
    shockR: 0,
    shock: 0,
    zoom: 0,
    focusX: 0.5,
    focusY: 0.5,
    focusR: FOCUS_RADIUS,
    focus: 0,
    drainX: 0.5,
    drainY: 0.5,
    drainR: DRAIN_RADIUS,
    drain: 0,
    speedX: 0.5,
    speedY: 0.5,
    speed: 0,
  };

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'hit' && e.weight >= 2) {
        this.shock(toFloat(e.x) - e.dir * 0.2, toFloat(e.y), e.weight === 3 || e.counter ? 3 : 2);
        if (e.weight === 3) {
          this.drainAt.set(toFloat(e.x) - e.dir * 0.2, toFloat(e.y), 0);
          this.drainLeft = DRAIN_STEPS + (e.counter ? DRAIN_COUNTER : 0);
        }
      } else if (e.type === 'relaunch' && e.how !== 'special') {
        this.shock(toFloat(e.x), Math.max(0.2, toFloat(e.y)), 2);
        if (e.how === 'wall') this.speedFrom(-1, toFloat(e.x), Math.max(0.6, toFloat(e.y)), SPEED_WALL);
      } else if (e.type === 'tapeSkip') this.speedFrom(e.player, 0, 0, SPEED_SKIP);
      else if (e.type === 'teleport') this.speedFrom(e.player, 0, 0, SPEED_TELEPORT);
      else if (e.type === 'jumpCancel') this.speedFrom(e.player, 0, 0, SPEED_JUMP);
      else if (e.type === 'stageCue') this.shock(toFloat(e.x), 0.4, 3);
      else if (e.type === 'boost' || e.type === 'cutAway') this.focusOn(e.player, FOCUS_BOOST);
      else if (e.type === 'superStart') this.focusOn(e.player, FOCUS_SUPER);
    }
  }

  private shock(x: number, y: number, weight: 2 | 3): void {
    // A smaller hit doesn't cut a bigger ripple short.
    if (this.shockLeft > 0 && this.shockStrength > SHOCK_STRENGTH[weight] && this.shockLeft > this.shockLife / 2) return;
    this.shockAt.set(x, y, 0);
    this.shockLife = this.shockLeft = SHOCK_LIFE[weight];
    this.shockReach = SHOCK_REACH[weight];
    this.shockStrength = SHOCK_STRENGTH[weight];
    if (weight === 3) this.zoomLeft = ZOOM_STEPS;
  }

  private speedFrom(player: number, x: number, y: number, [steps, power]: readonly [number, number]): void {
    // A weaker burst doesn't cut a stronger one short.
    if (this.speedLeft > 0 && this.speedPower * (this.speedLeft / this.speedLife) > power) return;
    this.speedPlayer = player;
    this.speedAt.set(x, y, 0);
    this.speedLife = this.speedLeft = steps;
    this.speedPower = power;
  }

  private focusOn(player: number, steps: number): void {
    this.focusPlayer = player;
    this.focusLife = this.focusLeft = Math.max(steps, this.focusLeft);
  }

  step(): void {
    if (this.shockLeft > 0) this.shockLeft--;
    if (this.zoomLeft > 0) this.zoomLeft--;
    if (this.focusLeft > 0) this.focusLeft--;
    if (this.drainLeft > 0) this.drainLeft--;
    if (this.speedLeft > 0) this.speedLeft--;
  }

  clear(): void {
    this.shockLeft = this.zoomLeft = this.focusLeft = this.drainLeft = this.speedLeft = 0;
  }

  /** After the camera is placed: where on screen it all is, for the post pass. */
  project(m: MatchState, camera: THREE.Camera): ImpactTarget {
    const o = this.out;
    o.shock = o.zoom = o.focus = o.drain = o.speed = 0;
    if (this.drainLeft > 0) {
      this.at.copy(this.drainAt).project(camera);
      o.drainX = (this.at.x + 1) / 2;
      o.drainY = (this.at.y + 1) / 2;
      o.drain = Math.min(1, this.drainLeft / DRAIN_FADE);
    }
    if (this.speedLeft > 0 && !this.reduceMotion) {
      if (this.speedPlayer >= 0) {
        const f = m.fighters[this.speedPlayer];
        this.at.set(toFloat(f.x), toFloat(f.y) + 1.0, 0);
      } else this.at.copy(this.speedAt);
      this.at.project(camera);
      o.speedX = (this.at.x + 1) / 2;
      o.speedY = (this.at.y + 1) / 2;
      o.speed = this.speedPower * Math.min(1, this.speedLeft / 5);
    }
    if (this.shockLeft > 0 && !this.reduceMotion) {
      this.at.copy(this.shockAt).project(camera);
      o.shockX = (this.at.x + 1) / 2;
      o.shockY = (this.at.y + 1) / 2;
      const p = 1 - this.shockLeft / this.shockLife;
      // Out fast, slowing; it fades as it goes.
      o.shockR = this.shockReach * (1 - (1 - p) * (1 - p));
      o.shock = this.shockStrength * (1 - p) * (1 - p);
      o.zoom = this.zoomLeft / ZOOM_STEPS;
    }
    if (this.focusLeft > 0) {
      const f = m.fighters[this.focusPlayer];
      this.at.set(toFloat(f.x), toFloat(f.y) + 1.0, 0).project(camera);
      o.focusX = (this.at.x + 1) / 2;
      o.focusY = (this.at.y + 1) / 2;
      const t = this.focusLife - this.focusLeft;
      o.focus = Math.min(1, t / FOCUS_IN, this.focusLeft / FOCUS_OUT);
    }
    return o;
  }
}

/** A soft round spot, white to clear, made once and shared (the glow, the floor's pool, dust). */
let spot: THREE.DataTexture | null = null;
export function softSpot(): THREE.DataTexture {
  if (spot) return spot;
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = (1 - r) * (1 - r);
      const i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  spot = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  spot.magFilter = THREE.LinearFilter;
  spot.minFilter = THREE.LinearFilter;
  spot.needsUpdate = true;
  return spot;
}

/** By hit weight: the glow's size (m), the floor pool's radius (m), steps, and brightness (past white feeds the bloom). */
const GLOW_SIZE = [0.6, 0.85, 1.2, 1.6] as const;
const POOL_SIZE = [0.9, 1.3, 1.8, 2.4] as const;
const LIGHT_LIFE = [6, 8, 11, 15] as const;
const LIGHT_POWER = [0.5, 0.8, 1.2, 1.6] as const;
const WARM = 0xffd9a0;
const COUNTER_LIGHT = 0xffc040;
/** The pool fades as the contact rises: gone by this height (m). */
const POOL_HEIGHT = 2.6;

/** The light a blow throws: one glow at the contact and one pool on the floor (the latest hit's), additive, two draw calls while lit. */
export class ImpactLight {
  private readonly glow: THREE.Mesh;
  private readonly pool: THREE.Mesh;
  private readonly glowMat: THREE.MeshBasicMaterial;
  private readonly poolMat: THREE.MeshBasicMaterial;
  private readonly color = new THREE.Color();
  private left = 0;
  private life = 1;
  private size = 1;
  private poolSize = 1;
  private power = 1;
  private height = 0;

  constructor(scene: THREE.Scene) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const common = { map: softSpot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
    this.glowMat = new THREE.MeshBasicMaterial({ ...common, depthTest: false });
    this.poolMat = new THREE.MeshBasicMaterial({ ...common });
    this.glow = new THREE.Mesh(quad, this.glowMat);
    this.glow.renderOrder = 9;
    this.pool = new THREE.Mesh(quad, this.poolMat);
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.renderOrder = 2;
    this.glow.visible = this.pool.visible = false;
    scene.add(this.glow, this.pool);
  }

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type !== 'hit') continue;
      // A light hit doesn't put out a bigger one still burning.
      if (this.left > 0 && LIGHT_POWER[e.weight] < this.power * (this.left / this.life)) continue;
      const x = toFloat(e.x) - e.dir * 0.2;
      this.height = toFloat(e.y);
      this.glow.position.set(x, this.height, 0.55);
      this.pool.position.set(x, 0.012, 0.1);
      this.color.setHex(e.counter ? COUNTER_LIGHT : WARM);
      this.life = this.left = LIGHT_LIFE[e.weight];
      this.size = GLOW_SIZE[e.weight] * (e.counter ? 1.2 : 1);
      this.poolSize = POOL_SIZE[e.weight];
      this.power = LIGHT_POWER[e.weight] * (e.counter ? 1.25 : 1);
    }
  }

  step(): void {
    if (this.left <= 0) {
      this.glow.visible = this.pool.visible = false;
      return;
    }
    const t = 1 - this.left / this.life;
    // A hard flash that falls away quickly, then lingers.
    const k = this.power * (1 - t) * (1 - t);
    this.glow.visible = true;
    this.glow.scale.setScalar(this.size * (0.75 + 0.5 * t));
    this.glowMat.color.copy(this.color).multiplyScalar(k * 0.7);
    const floor = Math.max(0, 1 - this.height / POOL_HEIGHT);
    this.pool.visible = floor > 0;
    this.pool.scale.setScalar(this.poolSize * 2 * (0.85 + 0.3 * t));
    this.poolMat.color.copy(this.color).multiplyScalar(k * floor * 0.7);
    this.left--;
  }

  clear(): void {
    this.left = 0;
    this.step();
  }
}
