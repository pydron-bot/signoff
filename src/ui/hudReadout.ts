/**
 * The HUD's readings that are worked out rather than shown as they are:
 * which meter spends are affordable (the tags under each health bar), how
 * big the combo counter is, when the clock goes urgent, and the callouts'
 * queue (one slot a side, so they never stack on the fighters). Pure: no DOM.
 */
import { BAR, METER_MAX } from '../sim/constants';
import type { FighterState } from '../sim/state';

/** The meter's spends, as bits: a boost and Tape Skip cost a bar, Cut Away all three (once a round). */
export const SPEND_BOOST = 1;
export const SPEND_SKIP = 2;
export const SPEND_CUT = 4;

export function spendsReady(f: Pick<FighterState, 'meter' | 'cutAwayUsed'>): number {
  let bits = 0;
  if (f.meter >= BAR) bits |= SPEND_BOOST | SPEND_SKIP;
  if (f.meter >= METER_MAX && !f.cutAwayUsed) bits |= SPEND_CUT;
  return bits;
}

/** The combo counter's size: it grows with the hits, and a heavy last hit (weight 2, an ender 3) adds weight. */
export function comboScale(hits: number, weight: number): number {
  const grow = Math.min(1, Math.max(0, hits - 2) / 10);
  return Math.round((1 + 0.6 * grow + (weight >= 3 ? 0.25 : weight >= 2 ? 0.12 : 0)) * 100) / 100;
}

/** Seconds left at which the round clock turns urgent. */
export const URGENT_SECS = 10;
export function clockUrgent(secs: number, running: boolean): boolean {
  return running && secs <= URGENT_SECS;
}

/** Steps a callout shows; queued ones wait their turn, the oldest dropped past QUEUE. */
export const CALLOUT_STEPS = 45;
const QUEUE = 3;

/** One side's callouts (FLAWLESS BLOCK, PUNISH, COUNTER, DUCKED, REVERSAL...): one at a time, the rest queued. */
export class CalloutQueue {
  /** What shows now ('' for nothing). */
  text = '';
  private left = 0;
  private readonly waiting: string[] = [];

  push(text: string): void {
    if (this.left === 0) this.show(text);
    else if (text !== this.text && !this.waiting.includes(text)) {
      if (this.waiting.length >= QUEUE) this.waiting.shift();
      this.waiting.push(text);
    }
  }

  /** Once per step: true if what shows changed. */
  step(): boolean {
    if (this.left === 0 || --this.left > 0) return false;
    const next = this.waiting.shift();
    if (next !== undefined) this.show(next);
    else this.text = '';
    return true;
  }

  clear(): void {
    this.text = '';
    this.left = 0;
    this.waiting.length = 0;
  }

  private show(text: string): void {
    this.text = text;
    // A queued callout shows for less, so the queue keeps up with the fight.
    this.left = this.waiting.length > 0 ? CALLOUT_STEPS * 0.6 : CALLOUT_STEPS;
  }
}
