/**
 * The studio round the fight (docs/BLENDER-TODO.md, step 24), the same on
 * every stage: the studio kit between the camera and the fight (`fg_left`,
 * `fg_right`, `fg_top`), drawn as near-black shapes against the lit set,
 * and the bleachers in the dark past the walls (`audience`), with the seats
 * (`seat_1` … `seat_6`) where Arcade's beaten fighters sit. A stage
 * without them in its GLB simply has none.
 */
import * as THREE from 'three';
import type { StageArt } from './stageModel';

/** The foreground's colour: near black, so it reads as a shape; its tally lights keep their glow. */
const SILHOUETTE = 0x0b0b10;
/** How far in from each side the side pieces come at most (BLENDER-TODO, step 24 A), and how far toward the camera. */
export const FG_INNER = 4.7;
export const FG_Z = 3;
/** Room kept clear beside the outermost fighter, metres. */
const FG_CLEAR = 0.6;
/** Seats in the order they fill: the middle of each side first, then the ends. */
const SEAT_ORDER = [2, 5, 1, 4, 3, 6] as const;
export const SEATS = SEAT_ORDER.length;
/** The bleachers' fighters are in the dark too: their colour is scaled by this. */
export const AUDIENCE_SHADE = 0.12;

/**
 * Whether a side piece (side −1 left, +1 right) would stand in front of the
 * fight: seen from the camera at (camX, camZ), where its inner edge falls on
 * the fighters' plane (z = 0), against `edge`, the outer reach of the
 * outermost fighter on that side. Close in past a wall (the touch buttons'
 * framing: src/render/camera.ts), it would cover a fighter there.
 */
export function coversFight(side: -1 | 1, camX: number, camZ: number, edge: number): boolean {
  if (camZ <= FG_Z + 0.2) return true;
  const inner = side * FG_INNER;
  const onPlane = camX + ((inner - camX) * camZ) / (camZ - FG_Z);
  return side * onPlane < side * edge + FG_CLEAR;
}

/** The order the seats fill in: the n-th fighter in sits in `seat_${seatNumber(n)}`. */
export function seatNumber(n: number): number {
  return SEAT_ORDER[n];
}

export class StageDepth {
  readonly root = new THREE.Group();
  private left: THREE.Object3D | null = null;
  private right: THREE.Object3D | null = null;
  private readonly seats: THREE.Object3D[] = [];

  /** Takes the stage's depth pieces, if it has them. */
  useArt(art: StageArt): void {
    const o = art.objects;
    // The foreground: its own copy of the material, darkened (the set's pieces share theirs per object).
    for (const n of ['fg_left', 'fg_right', 'fg_top']) {
      const piece = o.get(n);
      if (!piece) continue;
      piece.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = (m.material as THREE.MeshLambertMaterial).clone();
        mat.color.setHex(SILHOUETTE);
        mat.map = null;
        m.material = mat;
      });
      this.root.add(piece);
    }
    this.left = o.get('fg_left') ?? null;
    this.right = o.get('fg_right') ?? null;
    const audience = o.get('audience');
    if (audience) this.root.add(audience);
    for (let k = 1; k <= SEATS; k++) {
      const s = o.get(`seat_${k}`);
      if (!s) {
        this.seats.length = 0;
        break;
      }
      this.root.add(s);
      this.seats.push(s);
    }
    this.root.updateMatrixWorld(true);
  }

  /** The n-th seat to fill (0-based), or null if the stage has none. */
  seat(n: number): THREE.Object3D | null {
    return this.seats[seatNumber(n) - 1] ?? null;
  }

  /** Hides a side piece while it would stand in front of the fight; `lo` and `hi` are the fighters' outer reaches. */
  update(camera: THREE.Camera, lo: number, hi: number): void {
    const { x, z } = camera.position;
    if (this.left) this.left.visible = !coversFight(-1, x, z, lo);
    if (this.right) this.right.visible = !coversFight(1, x, z, hi);
  }
}
