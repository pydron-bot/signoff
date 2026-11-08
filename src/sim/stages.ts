/**
 * Stages are TV shows with one segment per round. For now a segment only
 * sets the arena's width; hazards, interactables and rules come later.
 */
import { fx, type Fx } from './fixed';

export interface SegmentData {
  readonly name: string;
  /** Walls are at ±halfWidth. */
  readonly halfWidth: Fx;
}

export interface StageData {
  readonly id: string;
  readonly name: string;
  readonly segments: readonly [SegmentData, SegmentData, SegmentData];
}

export const STAGES: Readonly<Record<string, StageData>> = {
  weather: {
    id: 'weather',
    name: 'Weather at Eleven',
    segments: [
      { name: 'The Studio', halfWidth: fx(6) },
      { name: 'The Forecast Comes True', halfWidth: fx(6) },
      { name: 'Flood Warning', halfWidth: fx(6) },
    ],
  },
};

export function stageData(id: string): StageData {
  const s = STAGES[id];
  if (!s) throw new Error(`unknown stage ${id}`);
  return s;
}
