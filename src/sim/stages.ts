/**
 * Stages are TV shows with one segment per round, and the set changes
 * between rounds. A segment can change the space (width), add hazards on a
 * fixed, announced rhythm, offer props either fighter can use with
 * Interact, and set a rule (wind, slower walking, a faster tape). Every change applies to
 * both fighters equally; every hazard is announced at least 60 frames
 * before it hits (tests check both).
 */
import { effect, type EffectSpec } from './fighters/build';
import { fx, type Fx } from './fixed';
import type { Box, Censor, HitEffect } from './types';
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
  /** Picked up and thrown at head height (the boombox), rather than kicked along the floor. */
  readonly thrown?: boolean;
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
  /** The whole game's speed, percent: above 100, an extra step every so often (the tape runs fast). */
  readonly tempoPct?: number;
  /** Meter gained from hits and blocks, percent (both fighters). */
  readonly meterPct?: number;
  readonly hazards: readonly HazardData[];
  readonly props: readonly PropData[];
}

export interface StageData {
  readonly id: string;
  readonly name: string;
  /** The Stage Sign-Off: what the set does to the loser, and what the broadcast cuts to. */
  readonly finisher: { readonly name: string; readonly censor: Censor };
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

function boombox(): PropData {
  return {
    id: 'boombox',
    name: 'Boombox',
    x: 0,
    reach: fx(1.0),
    // Thrown at chest height: a crouching Mumbles is under it, everyone else isn't.
    box: box(-0.3, 0.3, 0.85, 1.25),
    speed: fx(0.2),
    thrown: true,
    effect: effect({ damage: 60, hitstun: 0, blockstun: 16, chip: 10, push: 0.05, knockdown: true }),
  };
}

function desk(): PropData {
  return {
    id: 'desk',
    name: 'News desk',
    x: 0,
    reach: fx(1.2),
    // Shoved along the floor at waist height: heavy and slow, and low enough to jump.
    box: box(-0.6, 0.6, 0, 0.8),
    speed: fx(0.1),
    effect: effect({ damage: 75, hitstun: 0, blockstun: 20, chip: 14, push: 0.07, knockdown: true }),
  };
}

function pot(): PropData {
  return {
    id: 'pot',
    name: 'Stockpot',
    x: fx(-3),
    reach: fx(1.0),
    // Heavy, thrown at chest height like the boombox: a crouching Mumbles is under it.
    box: box(-0.3, 0.3, 0.85, 1.3),
    speed: fx(0.17),
    thrown: true,
    effect: effect({ damage: 65, hitstun: 0, blockstun: 16, chip: 10, push: 0.05, knockdown: true }),
  };
}

function knives(): PropData {
  return {
    id: 'knives',
    name: 'Knife block',
    x: fx(3),
    reach: fx(1.0),
    // Hurled low and fast, at the knees: jump it or block low.
    box: box(-0.25, 0.25, 0.15, 0.55),
    speed: fx(0.24),
    thrown: true,
    effect: effect({ damage: 50, height: 'low', hitstun: 22, blockstun: 14, chip: 10, push: 0.04 }),
  };
}

export const STAGES: Readonly<Record<string, StageData>> = {
  weather: {
    id: 'weather',
    name: 'Weather at Eleven',
    finisher: { name: 'Act of God', censor: 'static' },
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
  burn: {
    id: 'burn',
    name: 'Feel the Burn at Dawn',
    finisher: { name: 'Mirror, Mirror', censor: 'bars' },
    segments: [
      {
        name: 'Warm-Up',
        halfWidth: fx(6),
        hazards: [],
        props: [boombox()],
      },
      {
        name: 'Double Time',
        halfWidth: fx(6),
        tempoPct: 110,
        hazards: [],
        props: [],
      },
      {
        name: 'Burnout',
        halfWidth: fx(8),
        hazards: [
          // On the beat: the music runs at 120 bpm (a beat every 30 steps) from the start of the round's intro.
          hazard({
            id: 'shards',
            caption: 'MIND THE GLASS',
            spots: [-6, -4, -2, 0, 2, 4, 6],
            first: 180,
            period: 240,
            warn: 90,
            active: 10,
            halfW: 0.6,
            height: 6,
            effect: { damage: 60, hitstun: 30, blockstun: 1, push: 0.03 },
          }),
        ],
        props: [],
      },
    ],
  },
  news: {
    id: 'news',
    name: "The Eleven O'Clock News",
    finisher: { name: 'Lights Down', censor: 'standby' },
    segments: [
      {
        name: 'Headlines',
        halfWidth: fx(6),
        hazards: [],
        props: [desk()],
      },
      {
        name: 'The Ticker',
        halfWidth: fx(6),
        hazards: [
          // The anchor desk rides up on its riser: anyone standing on the middle of the floor is thrown off.
          hazard({
            id: 'riser',
            caption: 'ANCHOR DESK RISING',
            spots: [0],
            all: true,
            first: 240,
            period: 360,
            warn: 75,
            active: 12,
            halfW: 1.0,
            height: 0.3,
            groundOnly: true,
            effect: { damage: 40, hitstun: 0, blockstun: 1, launch: 0.17 },
          }),
        ],
        props: [],
      },
      {
        name: 'Lights Out',
        halfWidth: fx(6),
        hazards: [
          // The rig fails one lamp at a time (the view dims with each).
          hazard({
            id: 'lamps',
            caption: 'LIGHTING FAILURE',
            spots: [-5, -3, -1, 1, 3, 5],
            first: 180,
            period: 300,
            warn: 80,
            active: 8,
            halfW: 0.6,
            height: 6,
            effect: { damage: 70, hitstun: 0, blockstun: 1, knockdown: true },
          }),
        ],
        props: [],
      },
    ],
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen Live',
    finisher: { name: 'Well Done', censor: 'off' },
    segments: [
      {
        name: 'Prep',
        halfWidth: fx(6),
        hazards: [],
        props: [pot(), knives()],
      },
      {
        name: 'Grease Fire',
        // The fire has taken the far ends of the kitchen: the walls close in.
        halfWidth: fx(4.5),
        hazards: [
          hazard({
            id: 'flare',
            caption: 'GREASE FIRE',
            spots: [-3.4, 3.4],
            first: 210,
            period: 330,
            warn: 70,
            active: 14,
            halfW: 0.7,
            height: 2.2,
            effect: { damage: 55, hitstun: 0, blockstun: 1, knockdown: true },
          }),
        ],
        props: [],
      },
      {
        name: 'The Oven',
        halfWidth: fx(6),
        meterPct: 150,
        hazards: [],
        props: [],
      },
    ],
  },
};

/** The stages in menu order. */
export const STAGE_IDS: readonly string[] = Object.keys(STAGES);

/** A fighter's home stage: the one named after their show, if it has been built. */
export function homeStage(show: string): string | undefined {
  return STAGE_IDS.find((id) => STAGES[id].name === show);
}

/** Extra steps for a segment's tempo: one every this many steps, or 0 for none. */
export function extraStepEvery(seg: SegmentData): number {
  const t = seg.tempoPct ?? 100;
  return t > 100 ? Math.round(100 / (t - 100)) : 0;
}

export function stageData(id: string): StageData {
  const s = STAGES[id];
  if (!s) throw new Error(`unknown stage ${id}`);
  return s;
}

export function segmentData(stage: string, segment: number): SegmentData {
  return stageData(stage).segments[segment];
}
