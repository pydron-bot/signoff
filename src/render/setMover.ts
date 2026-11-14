/**
 * Turns the set's `shake_*` and `swing_*` nodes (docs/BLENDER-TODO.md, step
 * 29: children of `set` or a segment, origins at their pivots) by the angles
 * src/render/setMotion.ts works out: about the axis toward the camera, so a
 * shelf rocks and a lamp swings across the picture. Found by name whenever
 * the stage's GLB is (re)attached; a stage without them simply has none.
 * Nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MovingNode } from './setMotion';
import type { SetMotion } from './setMotion';

const AXIS = new THREE.Vector3(0, 0, 1);

export class SetMover {
  private root: THREE.Object3D | null = null;
  private seen = -1;
  private readonly nodes: THREE.Object3D[] = [];
  private readonly base: THREE.Quaternion[] = [];
  private readonly turn = new THREE.Quaternion();
  private readonly at = new THREE.Vector3();
  /** The swinging lamps' x and angle now, for the beams (atmosphere.ts). */
  readonly lampX = new Float32Array(8);
  readonly lampAngle = new Float32Array(8);
  lamps = 0;

  /** Finds the nodes under the stage's root when it, or what's in it, has changed; the motion starts from rest. */
  bind(root: THREE.Object3D | null, motion: SetMotion): void {
    const count = root ? root.children.length : -1;
    if (root === this.root && count === this.seen) return;
    for (let i = 0; i < this.nodes.length; i++) this.nodes[i].quaternion.copy(this.base[i]);
    this.root = root;
    this.seen = count;
    this.nodes.length = 0;
    this.base.length = 0;
    const specs: MovingNode[] = [];
    root?.updateMatrixWorld(true);
    root?.traverse((o) => {
      const kind = o.name.startsWith('shake_') ? 'shake' : o.name.startsWith('swing_') ? 'swing' : null;
      if (!kind) return;
      this.nodes.push(o);
      this.base.push(o.quaternion.clone());
      specs.push({ kind, x: o.getWorldPosition(this.at).x });
    });
    motion.setNodes(specs);
  }

  /** Each drawn frame: the nodes at the motion's angles (only the ones moving, or just stopped, are touched). */
  update(motion: SetMotion): void {
    this.lamps = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = motion.angle[i] ?? 0;
      const n = this.nodes[i];
      if (a === 0) n.quaternion.copy(this.base[i]);
      else n.quaternion.copy(this.base[i]).premultiply(this.turn.setFromAxisAngle(AXIS, a));
      if (n.name.startsWith('swing_') && this.lamps < this.lampX.length && n.visible && n.parent?.visible !== false) {
        this.lampX[this.lamps] = n.getWorldPosition(this.at).x;
        this.lampAngle[this.lamps++] = a;
      }
    }
  }
}
