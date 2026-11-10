/**
 * The swing of a heavy blow: a bright crescent drawn over the move's
 * hitbox from the frame before it goes active to a few frames after, so
 * a big attack reads as a blur of motion before it lands, the way a smear
 * frame would. It's placed from the move data (the box the sim checks), so
 * it is always where the hit is, and tinted the fighter's colour toward
 * white. One mesh per fighter (a draw call only while it shows), additive,
 * faded by colour; the art's own smear frames can replace it (docs/BLENDER-TODO.md, step 29).
 */
import * as THREE from 'three';
import type { FighterState, MoveData } from '../sim';
import { toFloat } from '../sim/fixed';

/** A hit this heavy (before scaling), or one that launches, knocks down or bounces, gets a swoosh. */
const HEAVY = 55;
/** Frames shown before the first active frame and after the last. */
const LEAD = 2;
const TRAIL = 5;
const SEGMENTS = 18;
/** The arc's sweep either side of forward, radians. */
const SWEEP = 1.15;
const WHITE = new THREE.Color(0xffffff);

export class Swoosh {
  private readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly tint = new THREE.Color();

  constructor(scene: THREE.Scene, color: number) {
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.Mesh(crescent(), this.mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 8;
    this.setColor(color);
    scene.add(this.mesh);
  }

  /** The fighter's colour, toward white: the swing's light. */
  setColor(color: number): void {
    this.tint.setHex(color).lerp(WHITE, 0.55);
  }

  hide(): void {
    this.mesh.visible = false;
  }

  /** Shows the swing for this frame of `mv`, if it's a heavy strike near its active frames. */
  update(f: FighterState, mv: MoveData | null, x: number, y: number): void {
    const h = mv && mv.kind !== 'throw' && mv.kind !== 'super' ? heavyHit(mv) : -1;
    if (!mv || h < 0) {
      this.mesh.visible = false;
      return;
    }
    const hit = mv.hits[h];
    const from = hit.frames[0] - LEAD;
    const to = hit.frames[1] + TRAIL;
    const fr = f.moveFrame;
    if (fr < from || fr > to) {
      this.mesh.visible = false;
      return;
    }
    const b = hit.box;
    const bx = toFloat(b.x);
    const bw = toFloat(b.w);
    const by = toFloat(b.y);
    const bh = toFloat(b.h);
    // Brightest on the first active frame; coming in over the lead, gone over the trail.
    const k = fr < hit.frames[0] ? (fr - from + 1) / (LEAD + 1) : fr <= hit.frames[1] ? 1 : 1 - (fr - hit.frames[1]) / (TRAIL + 1);
    // It opens out as it goes: a sweep, not a stamp.
    const open = fr <= hit.frames[0] ? 0.7 : Math.min(1.15, 0.85 + (fr - hit.frames[0]) * 0.06);
    const m = this.mesh;
    m.visible = true;
    // The crescent bulges forward from about the hitbox's near third, across its height.
    m.position.set(x + f.facing * (bx + bw * 0.25), y + by + bh / 2, 0.35);
    m.scale.set(f.facing * Math.max(0.35, bw * 0.75) * open, Math.max(0.45, bh * 0.75) * open, 1);
    // Rising hits (taller than wide: uppercuts, launchers) tilt up; low sweeps lie flat.
    m.rotation.z = f.facing * (bh > bw * 1.3 ? 0.5 : bh < bw * 0.45 ? -0.15 : 0);
    this.mat.color.copy(this.tint).multiplyScalar(1.5 * k);
  }
}

/** The index of the move's first heavy hit, or -1. */
function heavyHit(mv: MoveData): number {
  for (let i = 0; i < mv.hits.length; i++) {
    const h = mv.hits[i];
    if (h.damage >= HEAVY || h.launch !== undefined || h.knockdown || h.groundBounce || h.wallBounce) return i;
  }
  return -1;
}

/** A crescent bulging toward +x, thick in the middle and tapering to points, bright at its leading edge. */
function crescent(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const a = (t * 2 - 1) * SWEEP;
    const taper = Math.sin(t * Math.PI);
    const outer = 1;
    const inner = 1 - 0.38 * taper;
    // Centred so the arc's middle sits at x = 0.5 (the scale's forward reach).
    pos.push(Math.cos(a) * outer - 0.5, Math.sin(a) * outer, 0, Math.cos(a) * inner - 0.5, Math.sin(a) * inner, 0);
    const edge = 0.25 + 0.75 * taper;
    col.push(edge, edge, edge, 0, 0, 0);
    if (i < SEGMENTS) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
