/**
 * Frame data worked out from move data, for training mode and the tests.
 * Advantage assumes the hit connects on its first active frame: the
 * defender's stun minus the attacker's frames left after that frame.
 */
import { SAFE_ON_BLOCK } from './constants';
import type { FighterData, MoveData, StringData } from './types';

export interface FrameData {
  startup: number;
  active: number;
  recovery: number;
  /** null when it doesn't apply (projectiles, knockdowns, launchers). */
  onBlock: number | null;
  onHit: number | null;
}

export function frameData(m: MoveData): FrameData {
  const last = m.hits[m.hits.length - 1];
  const left = last ? m.total - last.frames[0] : 0;
  return {
    startup: m.startup,
    active: m.startup ? m.lastActive - m.startup + 1 : 0,
    recovery: m.total - m.lastActive,
    onBlock: last && !m.spawns.length ? last.blockstun - left : null,
    onHit: last && !m.spawns.length && !last.knockdown && last.launch === undefined ? last.hitstun - left : null,
  };
}

/** The move ids a string goes through, or null if the chain is broken. */
export function stringMoves(f: FighterData, s: StringData): string[] | null {
  const ids = [s.path[0]];
  for (const btn of s.path.slice(1)) {
    const next = f.moves[ids[ids.length - 1]]?.chain[btn as keyof MoveData['chain']];
    if (!next) return null;
    ids.push(next);
  }
  return ids;
}

export function isSafe(onBlock: number): boolean {
  return onBlock >= SAFE_ON_BLOCK;
}
