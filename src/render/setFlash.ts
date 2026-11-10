/**
 * Light that the fight throws onto the set and the fighters: a flash where a
 * blow lands (bigger the heavier it is, amber on a counter), the cold blast
 * of a lightning strike, and the moving glow of projectiles and burning
 * specials (Flambé and Fire and Brimstone burn orange and flicker, Heat
 * Lightning crackles, the flashlight throws a cool beam, Cold Front and the
 * hail glow icy, Live Feed flickers like a screen). Four point lights at most,
 * the brightest of the moment, passed as shared uniforms to a few lines in
 * the set's and the fighters' Lambert shaders (look.ts, fighterLight.ts):
 * a fixed cost whatever is happening, and nothing ever recompiles. Sources
 * are gathered per simulation step from the match and its events; the
 * flicker runs on display time. Nothing is allocated per frame.
 */
import * as THREE from 'three';
import { moveData, type MatchState, type SimEvent } from '../sim';
import { toFloat } from '../sim/fixed';

/** All of it, against the set's baked light (which is bright: the lights are mostly lightmap). */
const GAIN = 4;

/** Lights in the shader. */
export const FLASH_SLOTS = 4;

/** Shared by every set and fighter material: view-space position and reach (w), and colour times strength. */
export const FLASH = {
  pos: { value: Array.from({ length: FLASH_SLOTS }, () => new THREE.Vector4(0, 0, 0, 1)) },
  col: { value: Array.from({ length: FLASH_SLOTS }, () => new THREE.Vector3()) },
};

/** GLSL: the flashes' diffuse light on a surface, from its normal and `vViewPosition` (view space). */
export const FLASH_GLSL = `
uniform vec4 uFlashPos[${FLASH_SLOTS}];
uniform vec3 uFlashCol[${FLASH_SLOTS}];
vec3 flashLight(vec3 n, vec3 viewPos) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${FLASH_SLOTS}; i++) {
    vec3 toL = uFlashPos[i].xyz + viewPos;
    float d = length(toL);
    float a = saturate(1.0 - d / uFlashPos[i].w);
    // Half-wrapped, so a light just round an edge still catches it.
    sum += uFlashCol[i] * (a * a) * saturate(dot(n, toL / max(d, 1e-3)) * 0.75 + 0.25);
  }
  return sum;
}
`;

/** Adds the flash uniforms to a shader being compiled. */
export function flashUniforms(uniforms: Record<string, THREE.IUniform>): void {
  uniforms.uFlashPos = FLASH.pos;
  uniforms.uFlashCol = FLASH.col;
}

/** How a source glows: colour, strength (past 1 is bright), reach (m), and how much it flickers (0 steady, 1 fire, 2 electric). */
export interface Glow {
  readonly color: number;
  readonly power: number;
  readonly reach: number;
  readonly flicker: 0 | 1 | 2;
}
const glow = (color: number, power: number, reach: number, flicker: 0 | 1 | 2 = 0): Glow => ({ color, power, reach, flicker });

const FIRE = glow(0xff7a28, 2.2, 5.0, 1);
const ICE = glow(0x8fd0ff, 1.2, 3.6);
const HAIL = glow(0xc8e6ff, 0.6, 2.4);

/** Projectiles that glow, by owner and move (a boosted version, `+`, glows the same). */
export const PROJECTILE_GLOW: Readonly<Record<string, Readonly<Record<string, Glow>>>> = {
  dale: { 'Cold Front': ICE, 'Pressure Drop': HAIL, '*': HAIL },
  gus: { 'Flambé': FIRE },
  gideon: { 'Collection Plate': glow(0xffcf6a, 0.7, 2.6) },
  margaret: { 'Live Feed': glow(0x9cc4ff, 1.4, 3.8, 2) },
};

/** Where a special's own glow sits: at the hand, at the far end of its first hitbox (a beam), or in front of the body. */
type At = 'fist' | 'beam' | 'front';
/** Specials that glow while they're out (from a few frames before the first hit to a few after the last). */
export const MOVE_GLOW: Readonly<Record<string, Readonly<Record<string, readonly [Glow, At]>>>> = {
  dale: { 'Heat Lightning': [glow(0xfff1a8, 2.4, 4.8, 2), 'fist'] },
  gideon: { 'Fire and Brimstone': [FIRE, 'front'], 'Fire and Brimstone (blessed)': [glow(0xffd070, 2.4, 5.2, 1), 'front'] },
  gus: { 'Flambé BP': [FIRE, 'front'] },
  hollis: { Flashlight: [glow(0xe6eeff, 2.0, 4.6), 'beam'], Searchlight: [glow(0xe6eeff, 2.0, 4.6), 'beam'] },
};
/** Steps a special glows before its first hit and after its last. */
const MOVE_LEAD = 4;
const MOVE_LINGER = 6;

/** A blow's flash, by hit weight (light, medium, heavy, ender): strength, reach (m) and steps. */
const HIT_POWER = [0.7, 1.0, 1.5, 2.2] as const;
const HIT_REACH = [2.4, 3.0, 3.8, 4.8] as const;
const HIT_LIFE = [8, 10, 14, 20] as const;
const WARM = 0xffd9a0;
const COUNTER = 0xffb838;
const BLOCK = 0xbfd8ff;
/** Stage hazards: colour, strength, reach and steps; a lightning strike lights the whole studio. */
const HAZARD: Readonly<Record<string, readonly [number, number, number, number]>> = {
  lightning: [0xcfe0ff, 3.2, 11, 18],
  lamps: [0xffd6a0, 2.2, 6, 14],
};
const HAZARD_OTHER = [0xffffff, 1.2, 4, 10] as const;

/** One light in the running: where (world), colour, strength now, reach, flicker. */
interface Source {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  power: number;
  reach: number;
  flicker: number;
  /** A different phase per source, so two fires don't flicker together. */
  seed: number;
}

/** A flash fading out: where, its glow, steps left and its life. */
interface Flash {
  x: number;
  y: number;
  color: number;
  power: number;
  reach: number;
  left: number;
  life: number;
}

/** Hit flashes kept at once (the newest replace the oldest). */
const FLASHES = 6;
/** Candidates per step at most: the flashes, plus projectiles and specials. */
const MAX_SOURCES = 16;

/** Base move id: a boosted version (`+`) glows as the plain one. */
function base(move: string): string {
  return move.endsWith('+') ? move.slice(0, -1) : move;
}

export class SetFlash {
  /** Holds the flicker still (it reads as the picture moving). */
  reduceMotion = false;
  private readonly flashes: Flash[] = Array.from({ length: FLASHES }, () => ({ x: 0, y: 0, color: 0, power: 0, reach: 1, left: 0, life: 1 }));
  private next = 0;
  private readonly sources: Source[] = Array.from({ length: MAX_SOURCES }, () => ({ x: 0, y: 0, z: 0, color: new THREE.Color(), power: 0, reach: 1, flicker: 0, seed: 0 }));
  private count = 0;
  /** The sources picked for the shader this step, brightest first. */
  private readonly picked: Source[] = [];
  private readonly v = new THREE.Vector3();

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'hit') this.flash(toFloat(e.x) - e.dir * 0.2, toFloat(e.y), e.counter ? COUNTER : WARM, HIT_POWER[e.weight] * (e.counter ? 1.2 : 1), HIT_REACH[e.weight], HIT_LIFE[e.weight]);
      else if (e.type === 'block') this.flash(toFloat(e.x), toFloat(e.y), BLOCK, 0.45, 2.0, 6);
      else if (e.type === 'hazardStrike') {
        const [c, p, r, l] = HAZARD[e.hazard] ?? HAZARD_OTHER;
        this.flash(toFloat(e.x), 3.2, c, p, r, l);
      } else if (e.type === 'superHit') this.flash((toFloat(m.fighters[0].x) + toFloat(m.fighters[1].x)) / 2, 1.2, 0xffffff, 2.6, 6, 22);
    }
  }

  private flash(x: number, y: number, color: number, power: number, reach: number, life: number): void {
    const f = this.flashes[this.next];
    this.next = (this.next + 1) % FLASHES;
    f.x = x;
    f.y = Math.max(0.3, y);
    f.color = color;
    f.power = power;
    f.reach = reach;
    f.left = f.life = life;
  }

  /** Once per simulation step: the flashes fade, and the glowing things in play are gathered. */
  step(m: MatchState): void {
    this.count = 0;
    for (const f of this.flashes) {
      if (f.left <= 0) continue;
      const t = 1 - f.left / f.life;
      // A hard flash that falls away quickly, then lingers.
      this.add(f.x, f.y, 0.6, f.color, f.power * (1 - t) * (1 - t), f.reach, 0, 0);
      f.left--;
    }
    for (let i = 0; i < m.projectiles.length; i++) {
      const p = m.projectiles[i];
      if (!p.active) continue;
      const owner = m.fighters[p.owner].fighter;
      const table = PROJECTILE_GLOW[owner];
      const g = table?.[base(p.move)] ?? table?.['*'];
      if (!g) continue;
      const data = moveData(owner, p.move)?.spawns?.[p.spawn]?.projectile;
      const h = data ? toFloat(data.box.h) : 1;
      this.add(toFloat(p.x), toFloat(p.y) + (data ? toFloat(data.box.y) : 0) + h / 2, 0.4, g.color, g.power, g.reach, g.flicker, i + 1);
    }
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      if (f.mode !== 'move') continue;
      const spec = MOVE_GLOW[f.fighter]?.[base(f.move)] ?? MOVE_GLOW[f.fighter]?.[f.move];
      const mv = spec ? moveData(f.fighter, f.move) : null;
      const first = mv?.hits[0];
      const last = mv?.hits[mv.hits.length - 1];
      if (!spec || !first || !last) continue;
      const k = f.moveFrame < first.frames[0] - MOVE_LEAD ? 0 : f.moveFrame <= last.frames[1] ? 1 : 1 - (f.moveFrame - last.frames[1]) / MOVE_LINGER;
      if (k <= 0) continue;
      const [g, at] = spec;
      const x = toFloat(f.x);
      const y = toFloat(f.y);
      const b = first.box;
      if (at === 'beam') this.add(x + f.facing * toFloat(b.x + b.w), y + toFloat(b.y) + toFloat(b.h) / 2, 0.5, g.color, g.power * k, g.reach, g.flicker, 10 + i);
      else if (at === 'fist') this.add(x + f.facing * 0.45, y + 1.5, 0.4, g.color, g.power * k, g.reach, g.flicker, 10 + i);
      else this.add(x + f.facing * 0.8, y + 1.0, 0.5, g.color, g.power * k, g.reach, g.flicker, 10 + i);
    }
    // The brightest few go to the shader.
    const picked = this.picked;
    picked.length = 0;
    for (let i = 0; i < this.count; i++) {
      const s = this.sources[i];
      if (picked.length < FLASH_SLOTS) picked.push(s);
      else {
        let weakest = 0;
        for (let j = 1; j < FLASH_SLOTS; j++) if (picked[j].power < picked[weakest].power) weakest = j;
        if (s.power > picked[weakest].power) picked[weakest] = s;
      }
    }
  }

  private add(x: number, y: number, z: number, color: number, power: number, reach: number, flicker: number, seed: number): void {
    if (power <= 0.01 || this.count >= MAX_SOURCES) return;
    const s = this.sources[this.count++];
    s.x = x;
    s.y = y;
    s.z = z;
    s.color.setHex(color);
    s.power = power;
    s.reach = reach;
    s.flicker = flicker;
    s.seed = seed;
  }

  /** The lights picked this step (for tests and the hitbox view). */
  get lit(): readonly { readonly x: number; readonly y: number; readonly power: number }[] {
    return this.picked;
  }

  /** Each drawn frame, after the camera is placed: the picked lights into the shared uniforms, flickering on display time. */
  update(camera: THREE.Camera, frame: number): void {
    const pos = FLASH.pos.value;
    const col = FLASH.col.value;
    for (let i = 0; i < FLASH_SLOTS; i++) {
      const s = this.picked[i];
      if (!s) {
        col[i].set(0, 0, 0);
        continue;
      }
      let k = 1;
      if (s.flicker && !this.reduceMotion) {
        const t = frame + s.seed * 17;
        k = s.flicker === 1 ? 0.78 + 0.14 * Math.sin(t * 0.9) + 0.08 * Math.sin(t * 2.3 + 1.7) : 0.6 + 0.4 * Math.abs(Math.sin(t * 1.7) * Math.sin(t * 0.43 + 2.1));
      }
      this.v.set(s.x, s.y, s.z).applyMatrix4(camera.matrixWorldInverse);
      pos[i].set(this.v.x, this.v.y, this.v.z, s.reach);
      col[i].set(s.color.r, s.color.g, s.color.b).multiplyScalar(GAIN * s.power * k);
    }
  }

  clear(): void {
    for (const f of this.flashes) f.left = 0;
    this.count = 0;
    this.picked.length = 0;
  }
}
