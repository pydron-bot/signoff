/**
 * What a hit sounds like it was made with: a fist, a foot, a special, or
 * the props some fighters swing (Gus's pans and knives, Hollis's
 * nightstick and keys, Gideon's plate). Read from the move's kind, its
 * button and its name, so new moves pick it up without a table.
 */
import type { MoveData } from '../sim';

export type Timbre = 'punch' | 'kick' | 'special' | 'metal' | 'blade' | 'wood';

const METAL = /Skillet|Pan\b|Mallet|Ladle|Collection Plate|Key Ring/;
const BLADE = /Cleaver|Knife|Fillet|Julienne|Chop Chop/;
const WOOD = /Nightstick|Rolling Pin|Spoon/;

/** `move` is undefined for a hit that isn't a move (a finisher's blow, the comeback super). */
export function timbre(id: string, move: MoveData | undefined): Timbre {
  if (!move) return 'special';
  if (BLADE.test(move.name)) return 'blade';
  if (METAL.test(move.name)) return 'metal';
  if (WOOD.test(move.name)) return 'wood';
  if (move.kind !== 'normal' && move.kind !== 'air') return 'special';
  // The last button of a string step (or the one button of a normal) decides.
  return id.endsWith('K') ? 'kick' : 'punch';
}
