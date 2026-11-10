/**
 * The knocked-about set dressing's motion (src/render/clutterData.ts): a
 * few rigid pieces under gravity on the floor, stepped with the
 * simulation. Feet and rolling props shove what they walk through, blasts
 * (hits, knockdowns, hazards) throw what's near, the storm's wind drags the
 * light pieces and the flood floats them. Plain arrays, nothing allocated
 * per step; no three.js, so it can be tested on its own. It's for looks
 * only, so it can use Math.random.
 */
import type { ClutterKind, ClutterPlace } from './clutterData';

/** Per step (1/60 s): gravity in m/step². */
const GRAVITY = 9.8 / 3600;
/** The strip the pieces stay in (z toward the camera). */
const Z_MIN = -1.3;
const Z_MAX = 0.9;
/** How far into the floor strip a foot reaches (|z|). */
const FOOT_Z = 0.45;
/** Floor friction per step by shape: rolling keeps going, flat things stop quickly. */
const FRICTION = { roll: 0.975, flat: 0.86, box: 0.82 } as const;
/** The angles a shape comes to rest at, about its x and z axes. */
const SNAP = { roll: Math.PI, flat: Math.PI, box: Math.PI / 2 } as const;
const BOUNCE = 0.3;
/** Below this speed on the floor a piece goes to sleep. */
const SLEEP = 0.0008;
/** Under this mass the storm's wind moves a piece. */
const LIGHT = 0.7;

/** Something on the floor that shoves pieces: a fighter's feet, a rolling prop, a low projectile. */
export interface Pusher {
  x: number;
  /** Its bottom above the floor. */
  y: number;
  /** How far it reaches each side of x. */
  half: number;
  /** How far it moved this step. */
  dx: number;
}

/** What the stage is doing this step. Reused by the caller; never kept. */
export interface ClutterEnv {
  /** The walls are at ±halfWidth. */
  halfWidth: number;
  /** The storm's push on the fighters, m/step (signed; 0 for none): light pieces drift with it. */
  wind: number;
  /** The flood's height, 0 for none. */
  water: number;
  pushers: Pusher[];
  pushCount: number;
}

export class ClutterWorld {
  readonly count: number;
  readonly kind: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** Euler angles, applied yaw (y) first, then x, then z (three.js 'YXZ'). */
  readonly rx: Float32Array;
  readonly ry: Float32Array;
  readonly rz: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly vz: Float32Array;
  private readonly wx: Float32Array;
  private readonly wy: Float32Array;
  private readonly wz: Float32Array;
  private readonly awake: Uint8Array;
  /** Half height at rest (its middle sits this far up), and its reach on the floor. */
  private readonly half: Float32Array;
  private readonly reach: Float32Array;
  private tick = 0;

  constructor(
    readonly kinds: readonly ClutterKind[],
    readonly places: readonly ClutterPlace[],
  ) {
    const n = places.length;
    this.count = n;
    this.kind = new Uint8Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.z = new Float32Array(n);
    this.rx = new Float32Array(n);
    this.ry = new Float32Array(n);
    this.rz = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.vz = new Float32Array(n);
    this.wx = new Float32Array(n);
    this.wy = new Float32Array(n);
    this.wz = new Float32Array(n);
    this.half = new Float32Array(n);
    this.reach = new Float32Array(n);
    this.awake = new Uint8Array(n);
    places.forEach((p, i) => {
      const k = kinds.findIndex((c) => c.id === p.kind);
      if (k < 0) throw new Error(`clutter: no kind ${p.kind}`);
      this.kind[i] = k;
      const s = kinds[k].size;
      this.half[i] = s[1] / 2;
      this.reach[i] = Math.max(s[0], s[2]) / 2;
    });
    this.reset();
  }

  /** Everything back where it was put (a new round: the crew tidied up in the break). */
  reset(): void {
    for (let i = 0; i < this.count; i++) {
      const p = this.places[i];
      this.x[i] = p.x;
      this.z[i] = p.z;
      this.y[i] = this.half[i];
      this.rx[i] = this.rz[i] = 0;
      this.ry[i] = p.yaw;
      this.vx[i] = this.vy[i] = this.vz[i] = 0;
      this.wx[i] = this.wy[i] = this.wz[i] = 0;
      this.awake[i] = 0;
    }
  }

  /** Whether anything is moving (the caller can skip updating matrices). */
  get moving(): boolean {
    for (let i = 0; i < this.count; i++) if (this.awake[i]) return true;
    return false;
  }

  /**
   * A shove out from (x, y), such as a hit landing or a body hitting the
   * floor: pieces within `radius` along the floor are thrown, the nearest
   * hardest and up. `power` is roughly the launch speed (m/step) at the
   * centre for a piece of mass 1; `dir` (−1, 0 or 1) leans it the way a blow travels.
   */
  blast(x: number, y: number, radius: number, power: number, dir = 0): void {
    // A blast high up reaches the floor weaker.
    const height = Math.max(0, Math.min(1, 1.4 - y * 0.5));
    if (height <= 0) return;
    for (let i = 0; i < this.count; i++) {
      const dx = this.x[i] - x;
      const d = Math.hypot(dx, this.z[i] * 0.8);
      if (d >= radius) continue;
      const near = 1 - d / radius;
      const f = (power * near * near * height) / Math.sqrt(this.kinds[this.kind[i]].mass);
      const away = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
      this.vx[i] += (away * 0.65 + dir * 0.35) * f;
      this.vy[i] += f * (0.9 + Math.random() * 0.5);
      this.vz[i] += (this.z[i] >= 0 ? 1 : -1) * f * 0.3 * Math.random();
      this.spin(i, f * 6);
      this.awake[i] = 1;
    }
  }

  step(env: ClutterEnv): void {
    this.tick++;
    for (let i = 0; i < this.count; i++) {
      this.push(i, env);
      if (!this.awake[i] && !this.afloat(i, env) && !(env.wind && this.kinds[this.kind[i]].mass < LIGHT)) continue;
      this.move(i, env);
    }
    this.collide();
  }

  private afloat(i: number, env: ClutterEnv): boolean {
    return env.water > 0 && this.kinds[this.kind[i]].floats === true;
  }

  /** Feet, props and projectiles walking through a piece kick it along. */
  private push(i: number, env: ClutterEnv): void {
    if (Math.abs(this.z[i]) > FOOT_Z) return;
    const k = this.kinds[this.kind[i]];
    for (let p = 0; p < env.pushCount; p++) {
      const b = env.pushers[p];
      // Over its top (a jump, a body in the air) misses it.
      if (b.y > this.y[i] + this.half[i]) continue;
      const dx = this.x[i] - b.x;
      const reach = b.half + this.reach[i];
      if (Math.abs(dx) >= reach) continue;
      const moving = Math.abs(b.dx) > 0.004;
      const s = moving ? Math.sign(b.dx) : dx === 0 ? 1 : Math.sign(dx);
      const m = Math.sqrt(k.mass);
      if (moving) {
        // Kicked: ahead of the foot, faster than it's going, and a little up.
        const want = (Math.abs(b.dx) * 1.5 + 0.012) / m;
        if (this.vx[i] * s >= want) continue;
        this.vx[i] = s * want;
        this.vy[i] = Math.max(this.vy[i], (0.006 + Math.random() * 0.014) / m);
        this.vz[i] += (this.z[i] >= 0 ? 1 : -1) * Math.random() * 0.008;
        this.spin(i, 0.06 / m);
      } else {
        // Stood on: nudged out from under.
        this.vx[i] += s * 0.004;
      }
      this.awake[i] = 1;
    }
  }

  private move(i: number, env: ClutterEnv): void {
    const k = this.kinds[this.kind[i]];
    const floats = this.afloat(i, env);
    const floor = floats ? env.water : 0;
    // Where its middle rests: floating pieces ride half sunk, bobbing.
    const rest = floats ? floor + this.half[i] * 0.2 + Math.sin(this.tick * 0.05 + i * 1.7) * 0.012 : this.half[i];
    const light = k.mass < LIGHT;
    if (env.wind && (light || floats)) {
      // Drifts toward the wind's speed, in gusts; a bit on the floor, more off it.
      const gust = 1 + 0.6 * Math.sin(this.tick * 0.03 + i * 2.3);
      this.vx[i] += ((env.wind * 2.2 * gust) / k.mass - this.vx[i]) * (this.y[i] > this.half[i] + 0.02 ? 0.05 : 0.025);
      this.awake[i] = 1;
    }
    this.vy[i] -= GRAVITY;
    this.x[i] += this.vx[i];
    this.y[i] += this.vy[i];
    this.z[i] += this.vz[i];
    let grounded = false;
    if (this.y[i] <= rest) {
      grounded = true;
      if (floats) {
        // Water catches it softly.
        this.y[i] += (rest - this.y[i]) * 0.3;
        this.vy[i] *= 0.5;
        this.vx[i] *= 0.95;
        this.vz[i] *= 0.95;
      } else {
        this.y[i] = rest;
        this.vy[i] = this.vy[i] < -0.01 ? -this.vy[i] * BOUNCE : 0;
        const fr = FRICTION[k.shape];
        this.vx[i] *= fr;
        this.vz[i] *= fr;
      }
    }
    // The walls and the strip.
    const wall = env.halfWidth - this.reach[i];
    if (Math.abs(this.x[i]) > wall) {
      this.x[i] = Math.sign(this.x[i]) * wall;
      this.vx[i] = -this.vx[i] * 0.4;
    }
    if (this.z[i] < Z_MIN || this.z[i] > Z_MAX) {
      this.z[i] = Math.max(Z_MIN, Math.min(Z_MAX, this.z[i]));
      this.vz[i] = -this.vz[i] * 0.4;
    }
    this.turn(i, k.shape, grounded, floats);
    const still = Math.abs(this.vx[i]) + Math.abs(this.vz[i]) + Math.abs(this.vy[i]) < SLEEP && Math.abs(this.wy[i]) < 0.002;
    if (grounded && still && !floats && !(env.wind && light)) {
      this.vx[i] = this.vy[i] = this.vz[i] = 0;
      this.wx[i] = this.wy[i] = this.wz[i] = 0;
      this.rx[i] = nearest(this.rx[i], SNAP[k.shape]);
      this.rz[i] = k.shape === 'roll' ? this.rz[i] : nearest(this.rz[i], SNAP[k.shape]);
      this.awake[i] = 0;
    }
  }

  /** Tumbles in the air; on the floor rolls with its speed, or settles onto a face. */
  private turn(i: number, shape: keyof typeof SNAP, grounded: boolean, floats: boolean): void {
    this.ry[i] += this.wy[i];
    if (!grounded) {
      this.rx[i] += this.wx[i];
      this.rz[i] += this.wz[i];
      return;
    }
    this.wy[i] *= floats ? 0.97 : 0.85;
    const snap = SNAP[shape];
    this.rx[i] += (nearest(this.rx[i], snap) - this.rx[i]) * 0.3;
    this.wx[i] = 0;
    if (shape === 'roll') {
      // Rolls about its own axis, which lies along z once it's down: keep it there.
      this.ry[i] += (nearest(this.ry[i], Math.PI) - this.ry[i]) * 0.3;
      this.wy[i] = 0;
      const dir = Math.cos(this.ry[i]) >= 0 ? 1 : -1;
      this.rz[i] -= (this.vx[i] / this.reachRoll(i)) * dir;
      this.wz[i] = 0;
    } else {
      this.rz[i] += (nearest(this.rz[i], snap) - this.rz[i]) * 0.3;
      this.wz[i] = 0;
    }
  }

  /** A rolling piece's radius: half its height as it lies. */
  private reachRoll(i: number): number {
    return Math.max(0.02, this.half[i]);
  }

  private spin(i: number, w: number): void {
    this.wx[i] += (Math.random() - 0.5) * w;
    this.wy[i] += (Math.random() - 0.5) * w;
    this.wz[i] += (Math.random() - 0.5) * w;
  }

  /** Pieces on the floor don't pass through each other. */
  private collide(): void {
    for (let i = 0; i < this.count; i++) {
      for (let j = i + 1; j < this.count; j++) {
        if (!this.awake[i] && !this.awake[j]) continue;
        if (Math.abs(this.y[i] - this.y[j]) > this.half[i] + this.half[j]) continue;
        const dx = this.x[j] - this.x[i];
        const dz = this.z[j] - this.z[i];
        const d = Math.hypot(dx, dz);
        const min = (this.reach[i] + this.reach[j]) * 0.8;
        if (d >= min || d === 0) continue;
        const nx = dx / d;
        const nz = dz / d;
        const over = (min - d) / 2;
        this.x[i] -= nx * over;
        this.z[i] -= nz * over;
        this.x[j] += nx * over;
        this.z[j] += nz * over;
        // Trade the speed along the contact, most of it (one knocks the other on).
        const rel = (this.vx[i] - this.vx[j]) * nx + (this.vz[i] - this.vz[j]) * nz;
        if (rel <= 0) continue;
        const mi = this.kinds[this.kind[i]].mass;
        const mj = this.kinds[this.kind[j]].mass;
        const ji = (rel * 0.85 * mj) / (mi + mj);
        const jj = (rel * 0.85 * mi) / (mi + mj);
        this.vx[i] -= nx * ji * 2;
        this.vz[i] -= nz * ji * 2;
        this.vx[j] += nx * jj * 2;
        this.vz[j] += nz * jj * 2;
        this.awake[i] = this.awake[j] = 1;
      }
    }
  }
}

/** The nearest multiple of `step` to a. */
function nearest(a: number, step: number): number {
  return Math.round(a / step) * step;
}
