/**
 * The action replay after a watched match (CPU VS CPU): the deciding blow
 * again, from a couple of seconds before the KO to just after it. The tape
 * keeps the last half minute of both sides' inputs and a saved state every
 * second; a clip starts from the saved state before it, runs the match on
 * silently to the clip's start, then plays. The simulation is deterministic,
 * so it plays out exactly as it happened. No DOM, no three.js.
 */
import { saveMatch, step, type MatchState, type Phase, type SimEvent } from '../sim';

/** Steps shown before the KO and after it. */
export const REPLAY_BEFORE = 150;
export const REPLAY_AFTER = 50;
/** Steps between saved states, and how many steps of inputs the tape holds. */
const SNAP_EVERY = 60;
const RING = 2048;
const SNAPS = Math.ceil(RING / SNAP_EVERY);

/** A clip to play: where it starts (a saved state), how many steps to run silently first, and the inputs. */
export interface Clip {
  start: MatchState;
  lead: number;
  inputs: Uint16Array;
}

export class ReplayTape {
  private at = 0;
  private readonly inputs = new Uint16Array(RING * 2);
  private readonly snaps: { at: number; state: MatchState }[] = [];
  /** The step of the last KO that wasn't a finisher's (-1: none yet). */
  private koAt = -1;
  private phase: Phase = 'intro';

  /** Before each step: a saved state now and then, and the phase (a finisher's KO isn't the deciding blow). */
  before(m: MatchState): void {
    this.phase = m.phase;
    if (this.at % SNAP_EVERY !== 0) return;
    if (this.snaps.length >= SNAPS) this.snaps.shift();
    this.snaps.push({ at: this.at, state: saveMatch(m) });
  }

  /** After each step: both sides' inputs, and whether it was a KO. */
  after(in0: number, in1: number, ev: readonly SimEvent[]): void {
    const k = (this.at % RING) * 2;
    this.inputs[k] = in0;
    this.inputs[k + 1] = in1;
    if (this.phase !== 'finisher') for (const e of ev) if (e.type === 'ko') this.koAt = this.at;
    this.at++;
  }

  /** The deciding blow as a clip, or null (no KO: the match went to time, or it's off the tape). */
  clip(): Clip | null {
    if (this.koAt < 0) return null;
    const from = Math.max(0, this.koAt - REPLAY_BEFORE);
    const to = Math.min(this.at, this.koAt + REPLAY_AFTER + 1);
    let snap: { at: number; state: MatchState } | null = null;
    for (const s of this.snaps) if (s.at <= from && s.at > this.at - RING) snap = s;
    if (!snap) return null;
    const inputs = new Uint16Array((to - snap.at) * 2);
    for (let i = snap.at; i < to; i++) {
      const k = (i % RING) * 2;
      inputs[(i - snap.at) * 2] = this.inputs[k];
      inputs[(i - snap.at) * 2 + 1] = this.inputs[k + 1];
    }
    return { start: saveMatch(snap.state), lead: from - snap.at, inputs };
  }
}

/** Plays a clip: the match, stepped with the recorded inputs. */
export class ActionReplay {
  readonly match: MatchState;
  private i = 0;
  private readonly steps: number;

  constructor(private readonly clip: Clip) {
    this.match = saveMatch(clip.start);
    this.steps = clip.inputs.length / 2;
    // Silently on to where the clip starts.
    const ev: SimEvent[] = [];
    while (this.i < clip.lead) {
      this.next(ev);
      ev.length = 0;
    }
  }

  /** One step of the clip, its events into `ev`; false once it's over. */
  tick(ev: SimEvent[]): boolean {
    if (this.i >= this.steps) return false;
    this.next(ev);
    return true;
  }

  get done(): boolean {
    return this.i >= this.steps;
  }

  private next(ev: SimEvent[]): void {
    step(this.match, this.clip.inputs[this.i * 2], this.clip.inputs[this.i * 2 + 1], ev);
    this.i++;
  }
}
