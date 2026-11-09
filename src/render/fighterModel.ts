/**
 * The fighters' GLBs (docs/BLENDER-TODO.md): loaded once each, cloned per
 * fighter on screen, posed by clip and sim frame. Facing left mirrors the
 * model rather than turning it, so the open stance stays toward the camera.
 * Effect meshes (fx_*) are detached; the arena places copies of them.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { publicUrl } from '../core/paths';
import { STEPS_PER_SECOND } from '../sim/constants';
import { addRim } from './fighterLight';
import { addOutline } from './outline';
import { FLOOR, MIRROR, addReflection } from './reflection';
import { HELD_STAND_INS, LOOPS, standIn } from './pose';

const loader = new GLTFLoader();
const files = new Map<string, Promise<FighterArt>>();

/** One fighter's loaded art, shared by every copy on screen. */
export interface FighterArt {
  id: string;
  scene: THREE.Group;
  clips: Map<string, THREE.AnimationClip>;
  /** Effect meshes by name, at the origin: the bottom centre, facing glTF +z. */
  fx: Map<string, THREE.Object3D>;
}

/** Loads (once) a fighter's GLB. Rejects if there isn't one. */
export function loadFighterArt(id: string): Promise<FighterArt> {
  let p = files.get(id);
  if (!p) {
    p = loader.loadAsync(publicUrl(`assets/fighters/${id}.glb`)).then((g) => prepare(id, g));
    // A failed load can be tried again later.
    p.catch(() => files.delete(id));
    files.set(id, p);
  }
  return p;
}

function prepare(id: string, g: GLTF): FighterArt {
  const fx = new Map<string, THREE.Object3D>();
  for (const o of [...g.scene.children]) {
    if (!o.name.startsWith('fx_')) continue;
    g.scene.remove(o);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) m.material = lambert(m.material as THREE.MeshStandardMaterial);
    });
    fx.set(o.name, o);
  }
  return { id, scene: g.scene, clips: new Map(g.animations.map((c) => [c.name, c])), fx };
}

/**
 * Lambert, not the file's PBR material: the flat-coloured, faceted style
 * doesn't need it, it lights the same as the set, and it's cheaper on a phone.
 * The GLBs keep each part's flat colour as COLOR_0, already painted into the
 * atlas: with an atlas, vertex colours would tint it a second time.
 */
export function lambert(src: THREE.MeshStandardMaterial): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({
    color: src.color,
    map: src.map,
    vertexColors: src.vertexColors && !src.map,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
    side: src.side,
    // What glows, and the baked shading on a set's second UV set (docs/BLENDER-TODO.md, step 23).
    emissive: src.emissive,
    emissiveMap: src.emissiveMap,
    emissiveIntensity: src.emissiveIntensity,
    aoMap: src.aoMap,
    aoMapIntensity: src.aoMapIntensity,
  });
  m.name = src.name;
  return m;
}

/** Frames in a clip: a move of N frames lasts (N - 1)/60 s; a loop of N, N/60 s. */
export function clipFrames(c: THREE.AnimationClip): number {
  const n = Math.round(c.duration * STEPS_PER_SECOND);
  return LOOPS.has(c.name) ? Math.max(1, n) : n + 1;
}

/** One fighter on screen. */
export class FighterModel {
  /** Placed at the fighter's feet; scale.x is the facing. */
  readonly root = new THREE.Group();
  readonly art: FighterArt;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, { action: THREE.AnimationAction; frames: number }>();
  private readonly materials: THREE.MeshLambertMaterial[] = [];
  private current: THREE.AnimationAction | null = null;
  private clip = '';
  private frame = -1;
  private tint = -1;
  private readonly floorCopies: THREE.Mesh[];
  private readonly mirrorCopies: THREE.Mesh[];
  private readonly outline: THREE.Mesh[];
  private readonly reflectionMaterials: THREE.Material[];
  private readonly handL: THREE.Object3D;
  private readonly handR: THREE.Object3D;

  constructor(art: FighterArt) {
    this.art = art;
    const model = SkeletonUtils.clone(art.scene);
    // The model faces glTF +z: a quarter turn faces it along +x.
    model.rotation.y = Math.PI / 2;
    // Each copy gets its own materials, so a hit flash lights only the one hit.
    const swapped = new Map<THREE.Material, THREE.MeshLambertMaterial>();
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // Skinned meshes move far from their bind-pose bounds (knockdowns, teleports).
      m.frustumCulled = false;
      const src = m.material as THREE.MeshStandardMaterial;
      let mat = swapped.get(src);
      if (!mat) {
        mat = lambert(src);
        addRim(mat);
        swapped.set(src, mat);
        this.materials.push(mat);
      }
      m.material = mat;
    });
    this.root.add(model);
    // Reflections in the floor and Burn's mirrors: copies on the same skeleton.
    this.floorCopies = addReflection(model, FLOOR);
    this.mirrorCopies = addReflection(model, MIRROR);
    this.reflectionMaterials = [...this.floorCopies, ...this.mirrorCopies].map((c) => c.material as THREE.Material);
    // A dark line round the fighter (after the reflections, so they aren't outlined).
    this.outline = addOutline(model);
    for (const c of this.outline) c.visible = true;
    this.reflectionMaterials.push(this.outline[0]?.material as THREE.Material);
    // GLTFLoader drops the dot from bone names (hand.L is handL).
    this.handL = model.getObjectByName('handL') ?? model.getObjectByName('hand.L') ?? model;
    this.handR = model.getObjectByName('handR') ?? model.getObjectByName('hand.R') ?? model;
    this.mixer = new THREE.AnimationMixer(model);
    for (const [name, c] of art.clips) {
      const action = this.mixer.clipAction(c);
      // One-shot clips clamp on their last frame: repeating would wrap the
      // last frame (time = duration) back to the first (a KO would stand up).
      if (!LOOPS.has(name)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      action.paused = true;
      this.actions.set(name, { action, frames: clipFrames(c) });
    }
  }

  has(clip: string): boolean {
    return this.actions.has(clip);
  }

  /**
   * The world position of whichever hand is higher (an uppercut's fist),
   * into `out`. Poses the skeleton first, so call after pose().
   */
  raisedHand(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    this.handL.getWorldPosition(out);
    const ly = out.y;
    this.handR.getWorldPosition(out);
    if (ly > out.y) this.handL.getWorldPosition(out);
    return out;
  }

  /** Shows `clip` at move frame `frame` (1-based): sampled at (frame - 1)/60 s. */
  pose(clip: string, frame: number, loop: boolean): void {
    if (clip === this.clip && frame === this.frame) return;
    let a = this.actions.get(clip);
    let fr = frame;
    if (!a) {
      a = this.actions.get(standIn(this.art.id, clip) ?? 'idle') ?? this.actions.get('idle');
      // A held stand-in shows its last frame (Infinity clamps to it below).
      if (a && HELD_STAND_INS.has(clip)) fr = Infinity;
    }
    if (!a) return;
    if (a.action !== this.current) {
      this.current?.stop();
      a.action.play();
      a.action.paused = true;
      this.current = a.action;
    }
    const n = a.frames;
    const f = loop ? (fr - 1) % n : Math.min(Math.max(fr, 1), n) - 1;
    a.action.time = f / STEPS_PER_SECOND;
    this.mixer.update(0);
    this.clip = clip;
    this.frame = frame;
  }

  /** Shows the reflections the segment has (hidden, they cost no draw calls). */
  showReflections(floor: boolean, mirror: boolean): void {
    for (const c of this.floorCopies) c.visible = floor;
    for (const c of this.mirrorCopies) c.visible = mirror;
  }

  /** An emissive tint over the whole fighter (hit flash, armour, guard): 0 for none. */
  setTint(hex: number): void {
    if (hex === this.tint) return;
    this.tint = hex;
    for (const m of this.materials) m.emissive.setHex(hex);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
    for (const m of new Set(this.reflectionMaterials)) m?.dispose();
    this.root.removeFromParent();
  }
}
