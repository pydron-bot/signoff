/**
 * The living stage, drawn: one set per stage (src/render/weatherSet.ts,
 * src/render/burnSet.ts, src/render/newsSet.ts, src/render/kitchenSet.ts), each built once and shown when a match is on it.
 * Each reads the match's stage state and sets the arena's fixed lights per
 * segment; its GLB replaces its flat stand-ins once loaded.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { BurnSet } from './burnSet';
import { StageDepth } from './depth';
import { KitchenSet } from './kitchenSet';
import { NewsSet } from './newsSet';
import { setFalloff } from './look';
import { setFighterRim } from './fighterLight';
import { setReflections } from './reflection';
import type { Grade } from './post';
import { applyLightMap, loadStageArt, type SegmentLights, type StageArt } from './stageModel';
import { WeatherSet } from './weatherSet';

/** The arena's fixed lights, which the stage sets per segment. */
export interface StageLights {
  /** Sky above, the floor's bounce below. */
  ambient: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  /** The post pass's colour grade, set per segment. */
  grade: Grade;
}

export interface StageSet {
  /** Loads the stage's GLB; resolves (either way) once the set is in the scene. */
  load(): Promise<void>;
  show(on: boolean): void;
  update(m: MatchState, frame: number): void;
}

/** Sets one segment's lights, background, grade and falloff, and its baked light map when the art has one. */
export function applyLights(scene: THREE.Scene, lights: StageLights, spec: SegmentLights, art?: StageArt | null): void {
  const { ambient, key, rim, grade } = lights;
  ambient.color.set(spec.ambient.color);
  ambient.groundColor.set(spec.ground ?? spec.ambient.color);
  ambient.intensity = spec.ambient.intensity;
  if (spec.grade) {
    grade.lift = spec.grade.lift;
    grade.gain = spec.grade.gain;
    grade.saturation = spec.grade.saturation;
    grade.contrast = spec.grade.contrast;
    grade.bloom = spec.grade.bloom;
  }
  setFalloff(spec.falloff ?? 0.5, spec.setDim ?? 0);
  setFighterRim(spec.fighterRim ?? 1);
  setReflections(spec.gloss ?? 0, spec.floorY ?? 0, spec.mirror ?? 0);
  if (art) applyLightMap(art, spec);
  key.color.set(spec.key.color);
  key.intensity = spec.key.intensity;
  if (spec.key.position) key.position.set(...spec.key.position);
  rim.color.set(spec.rim.color);
  rim.intensity = spec.rim.intensity;
  if (spec.rim.position) rim.position.set(...spec.rim.position);
  (scene.background as THREE.Color).set(spec.background);
}

export class StageView {
  private readonly sets: Readonly<Record<string, StageSet>>;
  /** Each stage's foreground and audience (src/render/depth.ts), once its GLB is in. */
  private readonly depths = new Map<string, StageDepth>();
  private active = '';

  constructor(
    private readonly scene: THREE.Scene,
    lights: StageLights,
  ) {
    this.sets = { weather: new WeatherSet(scene, lights), burn: new BurnSet(scene, lights), news: new NewsSet(scene, lights), kitchen: new KitchenSet(scene, lights) };
    for (const s of Object.values(this.sets)) s.show(false);
  }

  /** Shows the match's stage and loads its GLB; resolves once it is in (or failed to load). */
  setStage(id: string): Promise<void> {
    this.use(id);
    const set = this.sets[id];
    if (!set) return Promise.resolve();
    const depth = loadStageArt(id).then(
      (art) => {
        if (this.depths.has(id)) return;
        const d = new StageDepth();
        d.useArt(art);
        d.root.visible = id === this.active;
        this.scene.add(d.root);
        this.depths.set(id, d);
      },
      () => undefined,
    );
    return Promise.all([set.load(), depth]).then(() => undefined);
  }

  /** The active stage's foreground and audience, once loaded. */
  get depth(): StageDepth | null {
    return this.depths.get(this.active) ?? null;
  }

  update(m: MatchState, frame: number): void {
    if (m.stage !== this.active) this.use(m.stage);
    this.sets[m.stage]?.update(m, frame);
  }

  private use(id: string): void {
    if (id === this.active) return;
    this.sets[this.active]?.show(false);
    const was = this.depths.get(this.active);
    if (was) was.root.visible = false;
    this.active = id;
    this.sets[id]?.show(true);
    const d = this.depths.get(id);
    if (d) d.root.visible = true;
  }
}
