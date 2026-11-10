/**
 * Training's frame meter: the last 80 steps of each fighter as a strip of
 * cells, coloured by what they were doing (startup, active, recovery,
 * hitstun, blockstun), so the advantage readout's number can be seen frame
 * by frame. Freezes once both have been free for a moment, and starts a
 * fresh strip when something happens again; steps both spend frozen in a
 * hit's freeze aren't counted (they change no advantage). Preallocated, no
 * allocation per step. No DOM here.
 */
import { moveData, type FighterState, type MatchState } from '../sim';

export const METER_STEPS = 80;
/** What a cell shows. EMPTY: nothing recorded yet. MOVING: jumping, dashing, landing. DOWN: knocked down, thrown, getting up. */
export const Cell = { EMPTY: 0, FREE: 1, STARTUP: 2, ACTIVE: 3, RECOVERY: 4, HITSTUN: 5, BLOCKSTUN: 6, MOVING: 7, DOWN: 8 } as const;
export type Cell = (typeof Cell)[keyof typeof Cell];
/** Steps both fighters must be free before the strip holds still. */
const SETTLE = 20;

export function cellOf(f: FighterState): Cell {
  switch (f.mode) {
    case 'idle':
    case 'walk':
    case 'crouch':
    case 'guard':
      return Cell.FREE;
    case 'move': {
      const mv = moveData(f.fighter, f.move);
      if (!mv.startup) return Cell.RECOVERY;
      return f.moveFrame < mv.startup ? Cell.STARTUP : f.moveFrame <= mv.lastActive ? Cell.ACTIVE : Cell.RECOVERY;
    }
    case 'throwing':
      return Cell.ACTIVE;
    case 'hitstun':
    case 'launched':
    case 'cinematic':
      return Cell.HITSTUN;
    case 'blockstun':
      return Cell.BLOCKSTUN;
    case 'down':
    case 'getup':
    case 'thrown':
    case 'ko':
    case 'dazed':
      return Cell.DOWN;
    default:
      return Cell.MOVING;
  }
}

export class FrameMeter {
  /** Both strips, oldest first: cells[side][k], k < length. */
  readonly cells: [Uint8Array, Uint8Array] = [new Uint8Array(METER_STEPS), new Uint8Array(METER_STEPS)];
  length = 0;
  /** Bumped whenever the strips change, so a drawing can tell when to redraw. */
  version = 0;
  private freeFor = SETTLE;
  private readonly stop = [0, 0];

  clear(): void {
    this.cells[0].fill(Cell.EMPTY);
    this.cells[1].fill(Cell.EMPTY);
    this.length = 0;
    this.freeFor = SETTLE;
    this.stop[0] = this.stop[1] = 0;
    this.version++;
  }

  /** After each step. */
  push(m: MatchState): void {
    const [a, b] = m.fighters;
    // Both frozen this step (they were frozen as it began): not a frame of anything.
    const frozen = this.stop[0] > 0 && this.stop[1] > 0;
    this.stop[0] = a.hitstop;
    this.stop[1] = b.hitstop;
    if (frozen) return;
    const ca = cellOf(a);
    const cb = cellOf(b);
    if (ca === Cell.FREE && cb === Cell.FREE) {
      if (this.freeFor >= SETTLE) return;
      this.freeFor++;
    } else {
      // Something new after a quiet spell: a fresh strip.
      if (this.freeFor >= SETTLE) this.clear();
      this.freeFor = 0;
    }
    if (this.length === METER_STEPS) {
      this.cells[0].copyWithin(0, 1);
      this.cells[1].copyWithin(0, 1);
      this.length--;
    }
    this.cells[0][this.length] = ca;
    this.cells[1][this.length] = cb;
    this.length++;
    this.version++;
  }

  /** Steps in the latest run of `cell` for a side, counted back from the end (startup of the move under way, say). */
  run(side: number, cell: Cell): number {
    const c = this.cells[side];
    let k = this.length - 1;
    while (k >= 0 && c[k] !== cell) k--;
    let n = 0;
    while (k >= 0 && c[k] === cell) {
      n++;
      k--;
    }
    return n;
  }
}
