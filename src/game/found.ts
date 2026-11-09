/**
 * Cancellations found: each fighter's quick finishes beyond the first are
 * hidden in the move list (???) until a player lands one. Kept in
 * localStorage under signoff.found as a list of "fighter:finisher" ids.
 */
import type { Mode } from './session';

export const FOUND_KEY = 'signoff.found';

export function parseFound(raw: unknown): Set<string> {
  return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
}

export function loadFound(): Set<string> {
  try {
    return parseFound(JSON.parse(localStorage.getItem(FOUND_KEY) ?? 'null'));
  } catch {
    return new Set();
  }
}

/** Remembers a finisher a player landed; true if it's new. */
export function markFound(found: Set<string>, fighter: string, id: string): boolean {
  const key = `${fighter}:${id}`;
  if (found.has(key)) return false;
  found.add(key);
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify([...found]));
  } catch {
    // Private browsing: it's remembered until the page closes.
  }
  return true;
}

/** Whether a player (not the CPU, a replay or the attract mode) is on this side. */
export function humanSide(mode: Mode, player: number): boolean {
  if (mode === 'versus') return true;
  return (mode === 'cpu' || mode === 'training') && player === 0;
}
