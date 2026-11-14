/**
 * VHS ghosting: when a fighter moves fast (a dash, a lunge, Tape Skip, the
 * first frames of a special), two afterimages trail them a few steps
 * behind, one cyan and one magenta, like a tape's chroma lagging the
 * picture. The trail (EchoTrail, pure) is kept in simulation steps, so it is
 * the same at 60, 120 or 144 Hz and when frames drop; each echo is a
 * stripped copy of the model (src/render/fighterModel.ts, ghost mode) posed
 * from it as each frame is drawn. Hidden, they cost nothing. They are on
 * the fight's layer (FIGHT_LAYER), which the cut-in's close-up doesn't draw.
 */
import * as THREE from 'three';
import { moveData, type FighterState } from '../sim';
import { FighterModel, type FighterArt } from './fighterModel';
import { FIGHT_LAYER } from './meshCopies';
import type { Pose } from './pose';

/** How far behind each echo is, in simulation steps, and its colour (past white, for the glow). */
export const LAGS = [3, 6] as const;
const TINTS = [new THREE.Color(0x00b4ff).multiplyScalar(1.3), new THREE.Color(0xff0090).multiplyScalar(1.3)] as const;
const HISTORY = 8;
/** Metres moved over the longer lag that count as fast. */
const FAST = 0.45;
/** A special trails for its first steps only: the lunge, not the whole move. */
export const SPECIAL_STEPS = 10;
const STRENGTH = 0.32;

export interface Past {
  clip: string;
  frame: number;
  loop: boolean;
  x: number;
  y: number;
  facing: number;
}

/** A fighter's recent poses and how strongly they trail, stepped with the simulation. Pure: no three.js. */
export class EchoTrail {
  private readonly past: Past[] = [];
  private head = 0;
  private filled = 0;
  /** 0 to 1: fades in while fast, out after. */
  amount = 0;

  constructor() {
    for (let i = 0; i < HISTORY; i++) this.past.push({ clip: '', frame: 0, loop: false, x: 0, y: 0, facing: 1 });
  }

  /** Each simulation step, after it: remembers the pose and whether they're moving fast. */
  step(f: FighterState, p: Pose, x: number, y: number, shown: boolean, enabled: boolean): void {
    const now = this.past[this.head];
    now.clip = p.clip;
    now.frame = p.frame;
    now.loop = p.loop;
    now.x = x;
    now.y = y;
    now.facing = f.facing;
    this.head = (this.head + 1) % HISTORY;
    this.filled = Math.min(HISTORY, this.filled + 1);
    const mv = f.mode === 'move' ? moveData(f.fighter, f.move) : null;
    const far = this.at(LAGS[LAGS.length - 1]);
    const moved = far ? Math.hypot(x - far.x, y - far.y) : 0;
    const special = (mv?.kind === 'special' || mv?.kind === 'super') && f.moveFrame <= SPECIAL_STEPS;
    const fast = enabled && shown && this.filled > LAGS[LAGS.length - 1] && (moved > FAST || special || p.clip === 'tape_skip');
    this.amount = Math.max(0, Math.min(1, this.amount + (fast ? 0.34 : -0.12)));
  }

  /** The pose `lag` steps before the newest one, or null if there isn't one yet. */
  at(lag: number): Past | null {
    if (this.filled <= lag) return null;
    return this.past[(this.head - 1 - lag + HISTORY * 2) % HISTORY];
  }

  reset(): void {
    this.filled = 0;
    this.amount = 0;
  }
}

export class Echoes {
  readonly trail = new EchoTrail();
  private readonly models: FighterModel[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];

  constructor(art: FighterArt, scene: THREE.Scene) {
    for (let i = 0; i < LAGS.length; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: TINTS[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const model = new FighterModel(art, mat);
      model.root.visible = false;
      model.root.traverse((o) => o.layers.set(FIGHT_LAYER));
      scene.add(model.root);
      this.models.push(model);
      this.mats.push(mat);
    }
  }

  /** Each drawn frame: poses the echoes from the trail, scaled by `scale` (src/render/legible.ts). */
  draw(scale: number): void {
    const t = this.trail;
    for (let i = 0; i < this.models.length; i++) {
      const m = this.models[i];
      const q = t.at(LAGS[i]);
      const on = t.amount * scale > 0 && q !== null && q.clip !== '';
      m.root.visible = on;
      if (!on || !q) continue;
      m.root.position.set(q.x, q.y, -0.02 * (i + 1));
      m.root.scale.x = q.facing;
      m.pose(q.clip, q.frame, q.loop);
      this.mats[i].opacity = STRENGTH * t.amount * scale * (1 - i * 0.3);
    }
  }

  /** After a jump in time: nothing to trail. */
  reset(): void {
    this.trail.reset();
    for (const m of this.models) m.root.visible = false;
  }

  dispose(): void {
    for (const m of this.models) m.dispose();
    for (const m of this.mats) m.dispose();
  }
}
