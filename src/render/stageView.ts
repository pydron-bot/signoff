/**
 * The living stage, drawn: one set per stage (src/render/weatherSet.ts,
 * src/render/burnSet.ts, src/render/newsSet.ts), each built once and shown when a match is on it.
 * Each reads the match's stage state and sets the arena's fixed lights per
 * segment; its GLB replaces its flat stand-ins once loaded.
 */
import * as THREE from 'three';
import type { MatchState } from '../sim';
import { BurnSet } from './burnSet';
import { NewsSet } from './newsSet';
import type { SegmentLights } from './stageModel';
import { WeatherSet } from './weatherSet';

/** The arena's fixed lights, which the stage sets per segment. */
export interface StageLights {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
}

export interface StageSet {
  /** Loads the stage's GLB; resolves (either way) once the set is in the scene. */
  load(): Promise<void>;
  show(on: boolean): void;
  update(m: MatchState, frame: number): void;
}

/** Sets one segment's lights and background. */
export function applyLights(scene: THREE.Scene, lights: StageLights, spec: SegmentLights): void {
  const { ambient, key, rim } = lights;
  ambient.color.set(spec.ambient.color);
  ambient.intensity = spec.ambient.intensity;
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
  private active = '';

  constructor(scene: THREE.Scene, lights: StageLights) {
    this.sets = { weather: new WeatherSet(scene, lights), burn: new BurnSet(scene, lights), news: new NewsSet(scene, lights) };
    for (const s of Object.values(this.sets)) s.show(false);
  }

  /** Shows the match's stage and loads its GLB; resolves once it is in (or failed to load). */
  setStage(id: string): Promise<void> {
    this.use(id);
    return this.sets[id]?.load() ?? Promise.resolve();
  }

  update(m: MatchState, frame: number): void {
    if (m.stage !== this.active) this.use(m.stage);
    this.sets[m.stage]?.update(m, frame);
  }

  private use(id: string): void {
    if (id === this.active) return;
    this.sets[this.active]?.show(false);
    this.active = id;
    this.sets[id]?.show(true);
  }
}
