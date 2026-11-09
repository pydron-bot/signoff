/**
 * VHS ghosting: when a fighter moves fast (a dash, a lunge, Tape Skip, a
 * special), two afterimages trail them a few frames behind, one cyan and one
 * magenta, like a tape's chroma lagging the picture. Each is a stripped copy
 * of the model (src/render/fighterModel.ts, ghost mode) posed from the
 * fighter's recent poses; hidden, they cost nothing.
 */
import * as THREE from 'three';
import { moveData, type FighterState } from '../sim';
import { FighterModel, type FighterArt } from './fighterModel';
import type { Pose } from './pose';

/** How far behind each echo is, in rendered frames, and its colour (past white, for the glow). */
const LAGS = [3, 6] as const;
const TINTS = [new THREE.Color(0x00b4ff).multiplyScalar(1.3), new THREE.Color(0xff0090).multiplyScalar(1.3)] as const;
const HISTORY = 8;
/** Metres moved over the longer lag that count as fast. */
const FAST = 0.45;
const STRENGTH = 0.32;

interface Past {
  clip: string;
  frame: number;
  loop: boolean;
  x: number;
  y: number;
  facing: number;
}

export class Echoes {
  private readonly models: FighterModel[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];
  private readonly past: Past[] = [];
  private head = 0;
  private filled = 0;
  /** 0 to 1: fades in while fast, out after. */
  private amount = 0;

  constructor(art: FighterArt, scene: THREE.Scene) {
    for (let i = 0; i < LAGS.length; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: TINTS[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const model = new FighterModel(art, mat);
      model.root.visible = false;
      scene.add(model.root);
      this.models.push(model);
      this.mats.push(mat);
    }
    for (let i = 0; i < HISTORY; i++) this.past.push({ clip: '', frame: 0, loop: false, x: 0, y: 0, facing: 1 });
  }

  /** Each rendered frame, after the fighter is posed: remembers the pose and shows the echoes if they're moving fast. */
  update(f: FighterState, p: Pose, x: number, y: number, shown: boolean, enabled: boolean): void {
    const now = this.past[this.head];
    now.clip = p.clip;
    now.frame = p.frame;
    now.loop = p.loop;
    now.x = x;
    now.y = y;
    now.facing = f.facing;
    const mv = f.mode === 'move' ? moveData(f.fighter, f.move) : null;
    const far = this.at(LAGS[LAGS.length - 1]);
    const moved = far ? Math.hypot(x - far.x, y - far.y) : 0;
    const fast = enabled && shown && this.filled >= HISTORY && (moved > FAST || mv?.kind === 'special' || mv?.kind === 'super' || p.clip === 'tape_skip');
    this.amount = Math.max(0, Math.min(1, this.amount + (fast ? 0.34 : -0.12)));
    for (let i = 0; i < this.models.length; i++) {
      const m = this.models[i];
      const q = this.at(LAGS[i]);
      const on = this.amount > 0 && q !== null && q.clip !== '';
      m.root.visible = on;
      if (!on || !q) continue;
      m.root.position.set(q.x, q.y, -0.02 * (i + 1));
      m.root.scale.x = q.facing;
      m.pose(q.clip, q.frame, q.loop);
      this.mats[i].opacity = STRENGTH * this.amount * (1 - i * 0.3);
    }
    this.head = (this.head + 1) % HISTORY;
    this.filled = Math.min(HISTORY, this.filled + 1);
  }

  /** After a jump in time: nothing to trail. */
  reset(): void {
    this.filled = 0;
    this.amount = 0;
    for (const m of this.models) m.root.visible = false;
  }

  dispose(): void {
    for (const m of this.models) m.dispose();
    for (const m of this.mats) m.dispose();
  }

  /** The pose `lag` frames before the newest one. */
  private at(lag: number): Past | null {
    if (this.filled <= lag) return null;
    return this.past[(this.head - lag + HISTORY * 2) % HISTORY];
  }
}
