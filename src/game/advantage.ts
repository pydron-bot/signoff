/**
 * Training mode's frame advantage readout: after a hit or block, counts the
 * steps until each fighter can act again. Positive means the attacker
 * recovered first. Not shown for knockdowns and launches.
 */
import type { FighterState, MatchState, SimEvent } from '../sim';

export interface Advantage {
  attacker: number;
  move: string;
  kind: 'hit' | 'block';
  frames: number;
}

function free(f: FighterState): boolean {
  return f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard' || f.mode === 'prejump' || f.mode === 'dash' || f.mode === 'backdash';
}

export class AdvantageTracker {
  last: Advantage | null = null;
  private pending: (Advantage & { t: number; aFree: number; dFree: number }) | null = null;

  /** Call after each step with that step's events. */
  update(m: MatchState, ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'hit' || e.type === 'block') this.pending = { attacker: e.attacker, move: e.move, kind: e.type, frames: 0, t: 0, aFree: -1, dFree: -1 };
    }
    const p = this.pending;
    if (!p) return;
    p.t++;
    const a = m.fighters[p.attacker];
    const d = m.fighters[1 - p.attacker];
    if (d.mode === 'launched' || d.mode === 'down' || d.mode === 'ko' || p.t > 240) {
      this.pending = null;
      return;
    }
    if (p.aFree < 0 && free(a)) p.aFree = p.t;
    if (p.dFree < 0 && free(d)) p.dFree = p.t;
    if (p.aFree >= 0 && p.dFree >= 0) {
      this.last = { attacker: p.attacker, move: p.move, kind: p.kind, frames: p.dFree - p.aFree };
      this.pending = null;
    }
  }
}
