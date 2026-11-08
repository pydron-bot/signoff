/**
 * Stages are TV shows with one segment per round, and the set changes
 * between rounds. A segment can change the space (width), add hazards on a
 * fixed, announced rhythm, offer props either fighter can use with
 * Interact, and set a rule (wind, slower walking). Every change applies to
 * both fighters equally; every hazard is announced at least 60 frames
 * before it hits (tests check both).
 */
import { effect, type EffectSpec } from './fighters/build';
import { fx, type Fx } from './fixed';
import type { Box, HitEffect } from './types';
import { box } from './fighters/build';

export interface HazardData {
  readonly id: string;
  /** Shown (and sounded) with the warning. */
  readonly caption: string;
  /** Where it can strike. */
  readonly spots: readonly Fx[];
  /** Every spot at once, rather than one picked per strike. */
  readonly all?: boolean;
  /** Round frame of the first warning, then every `period` frames. */
  readonly first: number;
  readonly period: number;
  /** Frames from the warning to the strike. */
  readonly warn: number;
  readonly active: number;
  /** Half-width of each struck area, and how high it reaches. */
  readonly halfW: Fx;
  readonly height: Fx;
  /** Only hurts fighters standing on the floor (puddles). */
  readonly groundOnly?: boolean;
  readonly effect: HitEffect;
}

export interface PropData {
  readonly id: string;
  readonly name: string;
  readonly x: Fx;
  /** How close a fighter must be to use it. */
  readonly reach: Fx;
  readonly box: Box;
  readonly speed: Fx;
  readonly effect: HitEffect;
}

export interface SegmentData {
  readonly name: string;
  /** Walls are at ±halfWidth. */
  readonly halfWidth: Fx;
  /** A push on both fighters every frame; its direction is picked each round. */
  readonly wind?: Fx;
  /** Walking and dashing speed, percent. */
  readonly walkPct?: number;
  readonly hazards: readonly HazardData[];
  readonly props: readonly PropData[];
}

export interface StageData {
  readonly id: string;
  readonly name: string;
  readonly segments: readonly [SegmentData, SegmentData, SegmentData];
}

function fxs(xs: number[]): Fx[] {
  return xs.map(fx);
}

function hazard(h: Omit<HazardData, 'spots' | 'halfW' | 'height' | 'effect'> & { spots: number[]; halfW: number; height: number; effect: EffectSpec }): HazardData {
  return { ...h, spots: fxs(h.spots), halfW: fx(h.halfW), height: fx(h.height), effect: effect(h.effect) };
}

function dolly(id: string, x: number): PropData {
  return {
    id,
    name: 'Camera dolly',
    x: fx(x),
    reach: fx(1.3),
    box: box(-0.45, 0.45, 0, 1.0),
    speed: fx(0.14),
    effect: effect({ damage: 70, hitstun: 0, blockstun: 18, chip: 12, push: 0.06, knockdown: true }),
  };
}

export const STAGES: Readonly<Record<string, StageData>> = {
  weather: {
    id: 'weather',
    name: 'Weather at Eleven',
    segments: [
      {
        name: 'The Studio',
        halfWidth: fx(6),
        hazards: [],
        props: [dolly('dolly-left', -4.6), dolly('dolly-right', 4.6)],
      },
      {
        name: 'The Forecast Comes True',
        halfWidth: fx(6),
        wind: fx(0.006),
        hazards: [
          hazard({
            id: 'lightning',
            caption: 'SEVERE STORM WARNING',
            spots: [-4, -2, 0, 2, 4],
            first: 240,
            period: 420,
            warn: 75,
            active: 8,
            halfW: 0.5,
            height: 4,
            effect: { damage: 80, hitstun: 0, blockstun: 1, knockdown: true },
          }),
        ],
        props: [],
      },
      {
        name: 'Flood Warning',
        halfWidth: fx(6),
        walkPct: 65,
        hazards: [
          hazard({
            id: 'puddles',
            caption: 'LIVE WIRE IN THE WATER',
            spots: [-3, 3],
            all: true,
            first: 300,
            period: 360,
            warn: 70,
            active: 10,
            halfW: 0.8,
            height: 0.3,
            groundOnly: true,
            effect: { damage: 50, hitstun: 36, blockstun: 1, push: 0.02 },
          }),
        ],
        props: [],
      },
    ],
  },
};

export function stageData(id: string): StageData {
  const s = STAGES[id];
  if (!s) throw new Error(`unknown stage ${id}`);
  return s;
}

export function segmentData(stage: string, segment: number): SegmentData {
  return stageData(stage).segments[segment];
}
