/**
 * The props of the later segments (0.66.0), drawn: the wind sock, the
 * flight case, the mirror shard, the teleprompter, the fallen lamp and the
 * extinguisher with its cloud. Each is its `prop_*` object when the stage's
 * GLB has it (docs/BLENDER-TODO.md, step 34); until then one of the stage's
 * loose `clutter_*` pieces stretched to the prop's box, or a plain box
 * before the GLB loads. Everything is read from the match's state, so it
 * replays exactly; nothing flows back. One draw call a prop on screen (two
 * with the cloud), and only the segment's own prop shows.
 */
import * as THREE from 'three';
import { stageData, type MatchState } from '../sim';
import { toFloat } from '../sim/fixed';
import type { PropData } from '../sim/stages';
import { FIGHT_LAYER } from './meshCopies';
import { loadStageArt, type StageArt } from './stageModel';

interface Look {
  /** The object in the stage's GLB, and the loose piece that stands in for it. */
  object: string;
  standIn: string;
  /** Width (along the fight), height, depth: the simulation's box (step 34). */
  size: readonly [number, number, number];
  color: number;
}

const LOOKS: Readonly<Record<string, Look>> = {
  windsock: { object: 'prop_windsock', standIn: 'clutter_tape', size: [0.6, 1.9, 0.6], color: 0xe07020 },
  crate: { object: 'prop_crate', standIn: 'clutter_clipboard', size: [0.8, 0.5, 0.5], color: 0x40464e },
  shard: { object: 'prop_shard', standIn: 'clutter_towel', size: [0.5, 0.06, 0.2], color: 0xd8f0ff },
  prompter: { object: 'prop_prompter', standIn: 'clutter_bin', size: [0.6, 1.4, 0.6], color: 0x2a3a2a },
  lamp: { object: 'prop_lamp', standIn: 'clutter_mug', size: [0.4, 0.4, 0.5], color: 0xfff0b0 },
  extinguisher: { object: 'prop_extinguisher', standIn: 'clutter_spoon', size: [0.2, 0.55, 0.2], color: 0xd02018 },
};
/** Waiting to be used, a prop stands just behind the fighters; in use it is on their line. */
const IDLE_Z = -0.75;
/** The extinguisher's cloud: how long it swells (steps), and how long it hangs after. */
const FOAM_SWELL = 10;
const FOAM_HANG = 16;
const FOAM_SIZE: readonly [number, number, number] = [1.2, 0.8, 1.0];

interface Drawn {
  segment: number;
  index: number;
  data: PropData;
  /** Origin at the prop's bottom centre; what it holds is the art or a stand-in. */
  holder: THREE.Group;
}

export class LaterProps {
  private stage = '';
  private drawn: Drawn[] = [];
  private readonly root = new THREE.Group();
  private readonly foam = new THREE.Group();
  private readonly foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.foam.visible = false;
    this.root.add(this.foam);
    this.fill(this.foam, new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), this.foamMat), FOAM_SIZE);
  }

  /** The match's stage: plain boxes now, the art (or the loose pieces) once the GLB is in. Resolves either way. */
  setStage(id: string): Promise<void> {
    if (id === this.stage) return Promise.resolve();
    this.stage = id;
    for (const d of this.drawn) this.root.remove(d.holder);
    const drawn: Drawn[] = [];
    stageData(id).segments.forEach((seg, segment) => {
      if (segment === 0) return;
      seg.props.forEach((data, index) => {
        const look = LOOKS[data.id];
        if (!look) return;
        const holder = new THREE.Group();
        holder.name = look.object;
        holder.visible = false;
        this.fill(holder, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: look.color })), look.size);
        this.root.add(holder);
        drawn.push({ segment, index, data, holder });
      });
    });
    this.drawn = drawn;
    return loadStageArt(id).then(
      (art) => {
        if (this.drawn === drawn) this.useArt(art);
      },
      () => undefined,
    );
  }

  show(on: boolean): void {
    this.root.visible = on;
  }

  private useArt(art: StageArt): void {
    for (const d of this.drawn) {
      const look = LOOKS[d.data.id];
      const own = art.objects.get(look.object);
      if (own) {
        // Built to the box, origin at its bottom centre: placed as it is.
        own.position.set(0, 0, 0);
        this.swap(d.holder, own);
        continue;
      }
      let mesh: THREE.Mesh | null = null;
      art.objects.get(look.standIn)?.traverse((c) => {
        if (!mesh && (c as THREE.Mesh).isMesh) mesh = c as THREE.Mesh;
      });
      if (!mesh) continue;
      const found = mesh as THREE.Mesh;
      d.holder.clear();
      this.fill(d.holder, new THREE.Mesh(found.geometry, found.material), look.size);
    }
    const foam = art.objects.get('fx_foam');
    if (foam) this.swap(this.foam, foam);
  }

  private swap(holder: THREE.Group, o: THREE.Object3D): void {
    holder.clear();
    o.traverse((c) => c.layers.set(FIGHT_LAYER));
    holder.add(o);
  }

  /** Puts `mesh` in `holder`, stretched to `size` with its bottom centre at the holder's origin. */
  private fill(holder: THREE.Group, mesh: THREE.Mesh, size: readonly [number, number, number]): void {
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!;
    const sx = size[0] / Math.max(1e-3, b.max.x - b.min.x);
    const sy = size[1] / Math.max(1e-3, b.max.y - b.min.y);
    const sz = size[2] / Math.max(1e-3, b.max.z - b.min.z);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set((-(b.max.x + b.min.x) / 2) * sx, -b.min.y * sy, (-(b.max.z + b.min.z) / 2) * sz);
    mesh.layers.set(FIGHT_LAYER);
    holder.add(mesh);
  }

  /** Once a frame, from the match as it stands. */
  update(m: MatchState): void {
    this.foam.visible = false;
    for (const d of this.drawn) {
      const p = m.stage === this.stage && d.segment === m.segment ? m.props[d.index] : undefined;
      const h = d.holder;
      h.visible = p !== undefined;
      if (!p) continue;
      const pd = d.data;
      const using = p.mode === 'rolling';
      const x = toFloat(p.x);
      const base = toFloat(pd.box.y);
      h.position.set(x, 0, p.mode === 'idle' ? IDLE_Z : 0);
      h.rotation.set(0, 0, 0);
      if (pd.area && !pd.quench) {
        // Tipped: it comes down toward whoever it was tipped at, and lies there.
        const fall = using ? Math.min(1, p.t / (pd.area.delay + pd.area.active)) : p.mode === 'spent' ? 1 : 0;
        h.rotation.z = (-p.dir * fall * fall * Math.PI) / 2;
      } else if (pd.thrown) {
        // Thrown: at its box's height, spinning flat; on the floor before and after.
        h.position.y = using ? base : 0;
        h.rotation.y = using ? p.t * 0.6 : p.mode === 'spent' ? 0.5 : 0;
      } else if (pd.rebound) {
        // Afloat: it rides the water and bobs.
        h.position.y = base + 0.03 * Math.sin(m.roundFrame * 0.08);
        h.rotation.z = 0.04 * Math.sin(m.roundFrame * 0.05);
      } else if (pd.quench) {
        h.rotation.z = p.mode === 'spent' ? (p.dir * Math.PI) / 2 : 0;
        // The cloud: swelling in front of whoever used it, then thinning.
        const age = using ? p.t - pd.area!.delay : p.mode === 'spent' ? pd.area!.active + p.t : -1;
        if (age >= 0 && age < FOAM_SWELL + FOAM_HANG) {
          const grow = Math.min(1, (age + 1) / FOAM_SWELL);
          this.foam.visible = true;
          this.foam.position.set(x + p.dir * 0.85, 0, 0);
          this.foam.scale.setScalar(grow);
          this.foamMat.opacity = 0.8 * (1 - Math.max(0, age - FOAM_SWELL) / FOAM_HANG);
        }
      } else if (using) {
        // Kicked or shoved along the floor: the lamp tumbles, the teleprompter just rolls.
        if (pd.box.h < pd.box.w * 2) h.rotation.z = -p.dir * p.t * 0.25;
      } else if (p.mode === 'spent') h.rotation.y = 0.25 * p.dir;
    }
  }
}
