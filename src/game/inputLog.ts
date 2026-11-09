/**
 * The input display's history: one player's inputs, step by step, folded
 * into rows of what was held and for how long, newest first, like a
 * training-mode input list. Directions are relative to the way the fighter
 * faces (→ is forward). No DOM here.
 */
import { Input } from '../sim';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, METER } = Input;

export interface InputRow {
  /** An arrow (↖ ↑ ↗ ← → ↙ ↓ ↘), or '' for neutral. */
  dir: string;
  /** Buttons held, as the move list names them. */
  buttons: string[];
  /** Steps it was held, up to 99. */
  frames: number;
}

const BUTTONS: readonly (readonly [number, string])[] = [
  [FP, 'FP'],
  [BP, 'BP'],
  [FK, 'FK'],
  [BK, 'BK'],
  [SPECIAL, 'SP'],
  [BLOCK, 'BL'],
  [THROW, 'TH'],
  [METER, 'MT'],
];
/** The bits the display shows: directions and buttons (not Interact). */
const SHOWN = UP | DOWN | LEFT | RIGHT | BUTTONS.reduce((a, [b]) => a | b, 0);
const ARROWS = ['', '→', '←', '', '↓', '↘', '↙', '↓', '↑', '↗', '↖', '↑', '', '→', '←', ''];

/** The arrow for a set of held directions, forward and back by facing. */
export function arrow(bits: number, facing: number): string {
  const fwd = facing === 1 ? RIGHT : LEFT;
  const back = facing === 1 ? LEFT : RIGHT;
  const k = (bits & fwd ? 1 : 0) | (bits & back ? 2 : 0) | (bits & DOWN ? 4 : 0) | (bits & UP ? 8 : 0);
  return ARROWS[k];
}

export class InputLog {
  readonly rows: InputRow[] = [];
  /** Bumped whenever the rows change, so the display redraws only then. */
  version = 0;
  private last = -1;
  private lastFacing = 0;

  constructor(private readonly size = 14) {}

  /** One step's input. */
  push(bits: number, facing: number): void {
    const top = this.rows[0];
    // Neutral with nothing pressed only separates presses: no row, and no frames counted.
    const neutral = (bits & SHOWN) === 0;
    if (top && !neutral && bits === this.last && facing === this.lastFacing) {
      if (top.frames < 99) {
        top.frames++;
        this.version++;
      }
      return;
    }
    this.last = bits;
    this.lastFacing = facing;
    if (neutral) return;
    // Only now, on a change, build the row (nothing is allocated while an input is held).
    this.rows.unshift({ dir: arrow(bits, facing), buttons: BUTTONS.filter(([b]) => bits & b).map(([, n]) => n), frames: 1 });
    if (this.rows.length > this.size) this.rows.pop();
    this.version++;
  }

  clear(): void {
    this.rows.length = 0;
    this.last = -1;
    this.version++;
  }
}
