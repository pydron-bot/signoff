// Shared set-ups for the simulation tests.
import { fx } from '../src/sim/fixed';
import { createMatch, step, type MatchOptions, type MatchState, type SimEvent } from '../src/sim';

export type InputFn = (m: MatchState, t: number) => number;

/** A match past the round intro, ready to fight. */
export function ready(p1 = 'dale', p2 = 'rox', opts: Partial<MatchOptions> = {}): MatchState {
  const m = createMatch({ p1, p2, ...opts });
  const ev: SimEvent[] = [];
  while (m.phase !== 'fight') step(m, 0, 0, ev);
  return m;
}

/** Puts the fighters at x0 and x1 (metres), facing each other. */
export function place(m: MatchState, x0: number, x1: number): void {
  const [a, b] = m.fighters;
  a.x = fx(x0);
  b.x = fx(x1);
  a.facing = x0 <= x1 ? 1 : -1;
  b.facing = x0 <= x1 ? -1 : 1;
}

/** Runs n steps; inputs are numbers or functions of (match, step index). */
export function run(m: MatchState, n: number, in0: number | InputFn = 0, in1: number | InputFn = 0): SimEvent[] {
  const ev: SimEvent[] = [];
  for (let t = 0; t < n; t++) {
    const a = typeof in0 === 'function' ? in0(m, t) : in0;
    const b = typeof in1 === 'function' ? in1(m, t) : in1;
    step(m, a, b, ev);
  }
  return ev;
}

/** Presses `bits` on the listed steps (held for one step), holding `hold` throughout. */
export function presses(at: Record<number, number>, hold = 0): InputFn {
  return (_m, t) => hold | (at[t] ?? 0);
}

export function count(ev: SimEvent[], type: SimEvent['type']): number {
  return ev.filter((e) => e.type === type).length;
}
