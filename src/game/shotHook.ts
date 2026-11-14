/**
 * For the capture tools only (tools/shots.mjs, tools/readability.mjs): with
 * `?shots` in the address, `window.__shots` starts a match with a fixed
 * seed and steps it straight to a moment (a round start, a heavy hit,
 * Technical Difficulties at low health, a KO) without drawing the steps in
 * between, which software GL could take minutes to do. Without the
 * parameter nothing is installed and the game never looks at it. The match
 * moves by inputs, as in play, but for one shortcut: the low-health moments
 * set both fighters' health down once the round is under way.
 */
import type { Session } from './session';
import { BLOCK, SPECIAL } from '../sim/input';
import type { SimEvent } from '../sim';

export type ShotMode = 'watch' | 'cpu' | 'training';

export interface ShotHost {
  /** Starts a match (no cold open); resolves once its models are in and compiled. */
  start(mode: ShotMode, p1: string, p2: string, stage: string, seed: number): Promise<void>;
  session(): Session | null;
  /** One step of the session with player 1's input, through the presentation as the frame loop does it. */
  step(p1: number, ev: SimEvent[]): void;
  /** Stops the frame loop stepping by itself (it still draws). */
  hold(on: boolean): void;
  hideFighters(on: boolean): void;
  /** Draw calls in the last frame drawn. */
  calls(): number;
  /** Where each fighter is on screen, in CSS pixels: left, top, right, bottom for each. */
  rects(): number[];
}

/** What a moment is: steps until it, and steps after it. */
export type Moment = 'start' | 'heavy' | 'td' | 'ko';

const LIMIT = 6000;

export function installShots(host: ShotHost): void {
  const ev: SimEvent[] = [];
  let input = 0;
  const step = (): readonly SimEvent[] => {
    ev.length = 0;
    host.step(input, ev);
    return ev;
  };
  /** Steps until `done` says so (true) or the limit; false if it never did. */
  const until = (done: (e: readonly SimEvent[]) => boolean, limit = LIMIT): boolean => {
    for (let i = 0; i < limit; i++) if (done(step())) return true;
    return false;
  };
  const api = {
    async start(o: { mode: ShotMode; p1: string; p2: string; stage: string; seed: number; segment?: number }): Promise<void> {
      host.hold(true);
      input = 0;
      await host.start(o.mode, o.p1, o.p2, o.stage, o.seed);
      if (o.segment) host.session()?.setSegment(o.segment);
    },
    /** Steps to a moment, then `after` more; returns whether the moment came. */
    to(moment: Moment, after = 0): boolean {
      const s = host.session();
      if (!s) return false;
      const m = s.match;
      let ok = true;
      input = 0;
      if (moment === 'start') ok = until(() => m.phase === 'fight');
      else if (moment === 'heavy') ok = until((e) => e.some((x) => x.type === 'hit' && x.weight === 2));
      else if (moment === 'ko') {
        ok = until(() => m.phase === 'fight');
        // Both nearly out, so the next clean blow ends the round.
        for (const f of m.fighters) f.health = Math.min(f.health, Math.ceil(f.maxHealth * 0.04));
        ok &&= until((e) => e.some((x) => x.type === 'ko'));
      } else if (moment === 'td') {
        // Three seconds in, so the round's captions have gone.
        ok = until(() => m.phase === 'fight');
        for (let i = 0; i < 180; i++) step();
        // Low enough for Technical Difficulties, as late in a round as it can be.
        for (const f of m.fighters) f.health = Math.min(f.health, Math.floor(f.maxHealth * 0.18));
        let n = 0;
        // Block and Special, pressed afresh every other step until it starts.
        ok &&= until(() => ((input = BLOCK | (n++ & 1 ? SPECIAL : 0)), ev.some((x) => x.type === 'superStart')), 900);
        input = 0;
      }
      for (let i = 0; i < after; i++) step();
      return ok;
    },
    steps(n: number): void {
      for (let i = 0; i < n; i++) step();
    },
    /** Resolves after two frames have been drawn with the state as it is. */
    frame(): Promise<void> {
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    },
    hideFighters: (on: boolean) => host.hideFighters(on),
    calls: () => host.calls(),
    rects: () => host.rects(),
    phase: () => host.session()?.match.phase ?? '',
  };
  (window as unknown as { __shots: typeof api }).__shots = api;
}
