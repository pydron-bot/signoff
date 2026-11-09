/**
 * Replays: the simulation is deterministic, so a match is its options and
 * both players' input frames, step by step. Recorded run-length encoded
 * (a 3-minute match is a few kilobytes), played back by feeding the same
 * inputs to a fresh match, with snapshots every few seconds so seeking back
 * only re-simulates from the nearest one. No DOM here.
 */
import { STAGES, createMatch, saveMatch, step, type MatchState, type SimEvent } from '../sim';
import { INPUT_BITS } from '../sim/input';

export interface ReplayOptions {
  p1: string;
  p2: string;
  /** The stage (recordings from before 0.13.0 have none: Weather at Eleven). */
  stage?: string;
  seed: number;
  studio: boolean;
}

export interface Replay {
  /** The game version it was recorded on: other versions may simulate it differently. */
  version: string;
  options: ReplayOptions;
  /** Steps recorded. */
  frames: number;
  /** Pairs of [both inputs packed, steps held]. */
  runs: number[];
}

const MASK = (1 << INPUT_BITS) - 1;
/** Steps between snapshots: 5 seconds. */
export const SNAPSHOT_EVERY = 300;

const pack = (in0: number, in1: number) => (in0 & MASK) | ((in1 & MASK) << INPUT_BITS);

export class ReplayRecorder {
  private readonly runs: number[] = [];
  private frames = 0;

  constructor(
    readonly version: string,
    readonly options: ReplayOptions,
  ) {}

  /** The inputs one step was given. */
  push(in0: number, in1: number): void {
    const p = pack(in0, in1);
    const n = this.runs.length;
    if (n && this.runs[n - 2] === p) this.runs[n - 1]++;
    else this.runs.push(p, 1);
    this.frames++;
  }

  finish(): Replay {
    return { version: this.version, options: { ...this.options }, frames: this.frames, runs: this.runs.slice() };
  }
}

/** Checks data read back from storage; null if it isn't a replay. */
export function parseReplay(data: unknown): Replay | null {
  const r = data as Replay;
  if (!r || typeof r !== 'object' || typeof r.version !== 'string' || typeof r.frames !== 'number') return null;
  const o = r.options;
  if (!o || typeof o.p1 !== 'string' || typeof o.p2 !== 'string' || typeof o.seed !== 'number') return null;
  if (!Array.isArray(r.runs) || r.runs.length % 2 !== 0 || !r.runs.every((n) => Number.isInteger(n) && n >= 0)) return null;
  let total = 0;
  for (let i = 1; i < r.runs.length; i += 2) total += r.runs[i];
  if (total !== r.frames) return null;
  return { version: r.version, options: { p1: o.p1, p2: o.p2, stage: typeof o.stage === 'string' && o.stage in STAGES ? o.stage : 'weather', seed: o.seed, studio: o.studio === true }, frames: r.frames, runs: r.runs };
}

/** Plays a replay into its own match. */
export class ReplayPlayer {
  readonly match: MatchState;
  /** Steps played so far (the next step reads input `frame`). */
  frame = 0;
  private readonly inputs: Uint32Array;
  private readonly snapshots = new Map<number, MatchState>();
  private readonly scratch: SimEvent[] = [];

  constructor(readonly replay: Replay) {
    this.inputs = new Uint32Array(replay.frames);
    let at = 0;
    for (let i = 0; i < replay.runs.length; i += 2) {
      this.inputs.fill(replay.runs[i], at, at + replay.runs[i + 1]);
      at += replay.runs[i + 1];
    }
    this.match = createMatch(replay.options);
    this.snapshots.set(0, saveMatch(this.match));
  }

  get done(): boolean {
    return this.frame >= this.replay.frames;
  }

  /** One step, its events appended to `ev`. Does nothing at the end. */
  step(ev: SimEvent[]): void {
    if (this.done) return;
    const p = this.inputs[this.frame];
    step(this.match, p & MASK, (p >>> INPUT_BITS) & MASK, ev);
    this.frame++;
    if (this.frame % SNAPSHOT_EVERY === 0 && !this.snapshots.has(this.frame)) this.snapshots.set(this.frame, saveMatch(this.match));
  }

  /** Jumps to step `frame` (clamped), re-simulating silently from the nearest snapshot before it. */
  seek(frame: number): void {
    const to = Math.max(0, Math.min(this.replay.frames, Math.round(frame)));
    if (to < this.frame || to - this.frame > SNAPSHOT_EVERY) {
      let from = to - (to % SNAPSHOT_EVERY);
      while (!this.snapshots.has(from)) from -= SNAPSHOT_EVERY;
      // Only worth restoring if it's ahead of where we are, or we're going back.
      if (to < this.frame || from > this.frame) {
        Object.assign(this.match, saveMatch(this.snapshots.get(from)!));
        this.frame = from;
      }
    }
    while (this.frame < to) {
      this.scratch.length = 0;
      this.step(this.scratch);
    }
  }
}
