/**
 * The set answering the fight: the props by the walls shake (`shake_*`
 * nodes: the weather map, the mirrors, the speakers, the shelves) when a
 * heavy blow lands or a body hits the wall near them, and the hanging lamps
 * swing (`swing_*`: the News's fresnels, Kitchen's pans) on enders and wall
 * splats. Each node is a damped spring, an angle about its pivot, stepped
 * with the simulation, so the freeze holds it, slow motion slows it and a
 * replay plays it back the same. Nothing moves with Reduce Motion. Pure: no
 * three.js; src/render/setMover.ts turns the nodes.
 */
import type { SimEvent } from '../sim/events';
import { toFloat } from '../sim/fixed';
import type { MatchState } from '../sim/state';
import { segmentData } from '../sim/stages';

export type NodeKind = 'shake' | 'swing';

/** A node that can move: what it is, and where it stands (its pivot's x, metres). */
export interface MovingNode {
  kind: NodeKind;
  x: number;
}

/** Each kind's spring: stiffness, damping (a step), and the most it turns (radians). */
const SPRING: Readonly<Record<NodeKind, { k: number; damp: number; max: number }>> = {
  // Shaken: quick and tight, gone in about half a second.
  shake: { k: 0.55, damp: 0.22, max: 0.05 },
  // Swinging: a slow pendulum, a few seconds to settle.
  swing: { k: 0.035, damp: 0.025, max: 0.28 },
};
/** A blow within this of a wall shakes that wall's side (metres). */
export const NEAR_WALL = 1.6;
/** Nodes this far from the middle are on a side; nearer, they belong to both. */
const SIDE_AT = 2;

export class SetMotion {
  reduceMotion = false;
  private nodes: readonly MovingNode[] = [];
  /** Each node's angle (radians) and its speed (radians a step). */
  angle = new Float32Array(0);
  private vel = new Float32Array(0);

  /** The set's nodes (the stage, or its segment, changed): all at rest. */
  setNodes(nodes: readonly MovingNode[]): void {
    this.nodes = nodes;
    this.angle = new Float32Array(nodes.length);
    this.vel = new Float32Array(nodes.length);
  }

  get count(): number {
    return this.nodes.length;
  }

  clear(): void {
    this.angle.fill(0);
    this.vel.fill(0);
  }

  /** Once per step, after it, with that step's events. */
  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    if (this.reduceMotion || this.nodes.length === 0) return;
    const half = toFloat(segmentData(m.stage, m.segment).halfWidth);
    for (const e of ev) {
      if (e.type === 'hit' && e.weight >= 2) {
        const x = toFloat(m.fighters[e.defender].x);
        const wall = Math.abs(x) > half - NEAR_WALL ? Math.sign(x) : 0;
        // A heavy blow near a wall shakes that side; an ender anywhere sets the lamps going.
        if (wall !== 0) this.kick('shake', wall, e.dir, e.weight === 3 ? 1 : 0.6);
        if (e.weight === 3) this.kick('swing', 0, e.dir, 0.5);
      } else if (e.type === 'relaunch' && e.how === 'wall') {
        const side = Math.sign(toFloat(e.x)) || 1;
        this.kick('shake', side, -side, 1.4);
        this.kick('swing', 0, -side, 1);
      } else if (e.type === 'relaunch' && e.how === 'ground') this.kick('swing', 0, 1, 0.4);
      else if (e.type === 'hazardStrike' || e.type === 'stageCue') {
        this.kick('shake', 0, 1, 1);
        this.kick('swing', 0, 1, 1);
      }
    }
  }

  /** Pushes the nodes of a kind on `side` (−1 left, 1 right, 0 everywhere) the way `dir` goes, `power` of a full kick. */
  private kick(kind: NodeKind, side: number, dir: number, power: number): void {
    const s = SPRING[kind];
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.kind !== kind) continue;
      const on = Math.abs(n.x) < SIDE_AT ? 0 : Math.sign(n.x);
      // The other wall's props feel it much less.
      const k = side === 0 || on === 0 || on === side ? 1 : 0.2;
      // A swing starts with a speed; a shake with a jolt either way, alternating by node so a shelf of them rattles.
      const sign = kind === 'shake' ? (i % 2 ? -1 : 1) * (dir >= 0 ? 1 : -1) : dir >= 0 ? 1 : -1;
      this.vel[i] += sign * s.max * power * k * Math.sqrt(s.k);
    }
  }

  /** Once per step: the springs settle. */
  step(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const s = SPRING[this.nodes[i].kind];
      this.vel[i] = (this.vel[i] - s.k * this.angle[i]) * (1 - s.damp);
      this.angle[i] = Math.max(-s.max, Math.min(s.max, this.angle[i] + this.vel[i]));
    }
  }
}
