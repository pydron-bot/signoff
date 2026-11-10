/**
 * Combo guides: each fighter's showcase combos, found by the combo search
 * (`npm run combos:guides`, tests/combo-search.test.ts) among routes a person
 * can land, and stored as presses timed from a point-blank start against a
 * standing dummy. The move list shows them; a showcase session plays them.
 * No DOM here.
 */
import { BAR, createMatch, fighterData, moveData, Input, step, type MatchState, type SimEvent } from '../sim';
import { fx } from '../sim/fixed';
import { COMBO_ROUTES } from './comboRoutes';

const { UP, DOWN, LEFT, RIGHT, SPECIAL, FP, BP, FK, BK } = Input;

export interface ComboGuide {
  name: string;
  /** Bars of meter it starts with. */
  bars: number;
  /** [frames from the start, press]. A press is buttons and an optional direction, relative to facing: 'd BP', 'f SP', 'SP'. */
  presses: readonly (readonly [number, string])[];
}

/** Every guide is played against the same standing opponent, as the search measured it. */
export const GUIDE_DUMMY = 'rox';
/** The most a combo may take, as % of the dummy's health, by bars spent (the combo search checks every route against these). */
export const DAMAGE_CEILING: Readonly<Record<number, number>> = { 0: 33, 1: 42, 3: 52 };
/** Frames the showcase holds after the last hit before it plays the combo again. */
export const GUIDE_REST = 90;

export function guides(fighter: string): readonly ComboGuide[] {
  return COMBO_ROUTES[fighter] ?? [];
}

/** The start of every guide: the round under way, point blank, `bars` of meter, the first-hit bar already gone. */
export function guideStart(fighter: string, bars: number): MatchState {
  const m = createMatch({ p1: fighter, p2: GUIDE_DUMMY, stage: 'weather', seed: 1, studio: true });
  const ev: SimEvent[] = [];
  while (m.phase !== 'fight') step(m, 0, 0, ev);
  const [a, b] = m.fighters;
  a.x = fx(-0.4);
  b.x = fx(0.4);
  a.facing = 1;
  b.facing = -1;
  a.meter = bars * BAR;
  m.firstHit = true;
  return m;
}

const BUTTON: Readonly<Record<string, number>> = { FP, BP, FK, BK, SP: SPECIAL };

/** A press's input bits, its direction turned by the way the fighter faces now. */
export function pressBits(press: string, facing: number): number {
  let bits = 0;
  for (const part of press.split(' ')) {
    if (part === 'f') bits |= facing === 1 ? RIGHT : LEFT;
    else if (part === 'b') bits |= facing === 1 ? LEFT : RIGHT;
    else if (part === 'd') bits |= DOWN;
    else if (part === 'u') bits |= UP;
    else bits |= BUTTON[part] ?? 0;
  }
  return bits;
}

/** P1's input on step `t` of a guide (0 between presses). */
export function guideInput(g: ComboGuide, t: number, facing: number): number {
  let bits = 0;
  for (const [at, press] of g.presses) if (at === t) bits |= pressBits(press, facing);
  return bits;
}

const ARROW: Readonly<Record<string, string>> = { f: '→', b: '←', d: '↓', u: '↑' };

/** A press as the move list writes it: arrows for directions, SP for Special. */
export function pressText(press: string): string {
  return press
    .split(' ')
    .map((p) => ARROW[p] ?? p)
    .join('');
}

export interface GuideStep {
  /** As the move list writes it, a boost as "SP SP". */
  input: string;
  /** The move it brings out, and its id (a boosted special's own id, as hit events name it). */
  move: string;
  id: string;
  /** Pressed while they're in the air and well after the last hit: wait for the fall. */
  wait: boolean;
  /** The frame it's pressed on. */
  at: number;
}

export interface GuideRun {
  steps: GuideStep[];
  hits: number;
  /** Damage as % of the dummy's health. */
  pct: number;
  /** One unbroken combo from the first hit to the last. */
  unbroken: boolean;
  /** The step of the last hit. */
  end: number;
}

/** Plays a guide in the simulation and reads it back: the steps, the hits and the damage. */
export function runGuide(fighter: string, g: ComboGuide): GuideRun {
  const m = guideStart(fighter, g.bars);
  const [a, d] = m.fighters;
  const ev: SimEvent[] = [];
  const steps: GuideStep[] = [];
  let hits = 0;
  let dealt = 0;
  let unbroken = true;
  let lastHit = 0;
  // Once the combo is over, later hits (a fire still burning on the floor) aren't part of it.
  let over = false;
  const last = g.presses.length ? g.presses[g.presses.length - 1][0] : 0;
  let move = '';
  let frame = 0;
  for (let t = 0; t <= last + 200; t++) {
    const presses = g.presses.filter(([at]) => at === t);
    // A boost: Special again just after a special.
    const boost = presses.length && presses.every(([, p]) => p === 'SP') && steps.length && steps[steps.length - 1].input.endsWith('SP') && t - steps[steps.length - 1].at <= 8;
    if (boost) steps[steps.length - 1].input += ' SP';
    else for (const [, p] of presses) steps.push({ input: pressText(p), move: '', id: '', wait: d.y > 0 && t - lastHit > 14, at: t });
    ev.length = 0;
    step(m, guideInput(g, t, a.facing), 0, ev);
    for (const e of ev) {
      // A boost turns the special already named into its boosted version (one boosted as it starts is named so when it starts).
      if (e.type === 'boost' && e.player === 0) {
        let s: GuideStep | undefined;
        for (const x of steps) if (x.id && moveData(fighter, x.id).boost === e.move) s = x;
        if (s) {
          s.move = moveData(fighter, e.move).name;
          s.id = e.move;
        }
      }
      if (e.type !== 'hit' || e.attacker !== 0 || over) continue;
      if (e.combo !== hits + 1) unbroken = false;
      hits = e.combo;
      dealt += e.damage;
      lastHit = t;
    }
    if (hits && d.combo === 0) over = true;
    // Each move that starts names the first step still unnamed.
    if (a.mode === 'move' && (a.move !== move || a.moveFrame < frame)) {
      const s = steps.find((x) => !x.move);
      if (s) {
        s.move = moveData(fighter, a.move).name;
        s.id = a.move;
      }
    }
    move = a.mode === 'move' ? a.move : '';
    frame = a.mode === 'move' ? a.moveFrame : 0;
  }
  return { steps, hits, pct: (dealt * 100) / fighterData(GUIDE_DUMMY).health, unbroken, end: lastHit };
}
