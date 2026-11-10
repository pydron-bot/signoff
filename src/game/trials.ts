/**
 * Trials: every combo guide is a challenge. A trial is built from the guide
 * when it's opened, so it follows the moves whenever the guides are
 * regenerated: its steps are the guide's presses, and the connections it
 * looks for are the moves that land in the guide's own run, in order. The
 * tracker reads the player's hits; each connection of the next move in the
 * same combo ticks it off, and a drop (the combo ends, or the wrong move
 * lands) says which step it was and whether the press came early or late
 * against the guide's timing. No DOM here.
 */
import { Input, moveData, step, type MatchState, type SimEvent } from '../sim';
import { guideInput, guides, guideStart, runGuide, type ComboGuide, type GuideStep } from './comboGuides';
import { Cleared } from './cleared';

const { FP, BP, FK, BK, SPECIAL, THROW } = Input;
const PRESS_BITS = FP | BP | FK | BK | SPECIAL | THROW;

/**
 * One move landing in the combo: the step that brought it out, the id its
 * hits carry, and (from the guide's run) steps from the hit before it to that
 * move starting, and to its press (negative: pressed before that hit landed).
 */
export interface Connection {
  step: number;
  id: string;
  offset: number;
  press: number;
  /** The step of the guide's run its first hit lands on. */
  hit: number;
}

export interface Trial {
  fighter: string;
  /** The guide's index in the fighter's guides. */
  guide: number;
  name: string;
  bars: number;
  steps: readonly GuideStep[];
  conns: readonly Connection[];
}

/** The trial for a fighter's guide `k` (null if there's no such guide). */
export function trial(fighter: string, k: number): Trial | null {
  const g = guides(fighter)[k];
  return g ? trialOf(fighter, g, k) : null;
}

/** The trial for any combo written as a guide (a part of one, in Combo School); `k` is the guide it comes from. */
export function trialOf(fighter: string, g: ComboGuide, k: number): Trial {
  const { steps, end } = runGuide(fighter, g);
  const m = guideStart(fighter, g.bars);
  const a = m.fighters[0];
  const ev: SimEvent[] = [];
  const conns: Connection[] = [];
  const startAt = steps.map(() => -1);
  let move = '';
  let frame = 0;
  let lastHit = -1;
  for (let t = 0; t <= end; t++) {
    ev.length = 0;
    step(m, guideInput(g, t, a.facing), 0, ev);
    // A move starting is the first pressed step not yet under way (as runGuide names them); a boost isn't a new one.
    if (a.mode === 'move' && (a.move !== move || a.moveFrame < frame) && moveData(fighter, move || a.move).boost !== a.move) {
      const j = steps.findIndex((s, i) => s.at <= t && startAt[i] < 0 && s.id !== '');
      if (j >= 0) startAt[j] = t;
    }
    move = a.mode === 'move' ? a.move : '';
    frame = a.mode === 'move' ? a.moveFrame : 0;
    for (const e of ev) {
      if (e.type !== 'hit' || e.attacker !== 0) continue;
      // The latest pressed step whose move this is.
      let j = -1;
      for (let i = 0; i < steps.length; i++) if (steps[i].at <= t && steps[i].id === e.move) j = i;
      const prev = conns.length ? conns[conns.length - 1].step : -1;
      if (j > prev) conns.push({ step: j, id: e.move, offset: lastHit < 0 ? 0 : Math.max(0, startAt[j] - lastHit), press: lastHit < 0 ? 0 : steps[j].at - lastHit, hit: t });
      lastHit = t;
    }
  }
  return { fighter, guide: k, name: g.name, bars: g.bars, steps, conns };
}

/** Where cleared trials are kept, as "fighter:guide name". */
export const TRIALS_KEY = 'signoff.trials';

export function trialId(fighter: string, name: string): string {
  return `${fighter}:${name}`;
}

/** Cleared trials of a fighter's, out of how many. */
export function trialCount(cleared: Cleared, fighter: string): [number, number] {
  const gs = guides(fighter);
  return [gs.filter((g) => cleared.has(trialId(fighter, g.name))).length, gs.length];
}

export type TrialState = 'ready' | 'going' | 'cleared' | 'dropped';
/** Why a combo dropped: the press for the step came too soon or too late against the guide, the wrong move landed, or (the right timing) it missed. */
export type Miss = 'early' | 'late' | 'wrong' | 'missed';

export class TrialTracker {
  state: TrialState = 'ready';
  /** Connections landed in the combo under way. */
  landed = 0;
  /** The guide step that dropped, and why. */
  dropStep = -1;
  miss: Miss = 'missed';
  /** Bumped on every change, so a caption can tell when to rebuild. */
  version = 0;
  /** Times it's been cleared since the trial opened. */
  clears = 0;
  /** On a drop judged early or late: by how many steps against the guide's timing (0 when it can't tell). */
  missBy = 0;
  private t = 0;
  private lastHit = -1;
  private lastStart = -1;
  private startMove = '';
  /** Presses and the moves (and boosts) they brought out, this attempt: a press that brought out nothing came too soon. */
  private presses = 0;
  private starts = 0;
  private move = '';
  private frame = 0;
  private held = 0;

  constructor(readonly trial: Trial) {}

  /** Steps since the last move of the combo landed (-1 when no attempt is going). */
  get sinceHit(): number {
    return this.state === 'going' ? this.t - this.lastHit : -1;
  }

  /** Back to the start of an attempt (the match was reset). */
  restart(): void {
    this.state = 'ready';
    this.landed = 0;
    this.dropStep = -1;
    this.lastHit = this.lastStart = -1;
    this.presses = this.starts = 0;
    this.move = '';
    this.frame = 0;
    this.version++;
  }

  /** The guide step reached: everything before it is ticked. */
  get stepsDone(): number {
    const c = this.trial.conns;
    return this.landed === 0 ? 0 : this.landed >= c.length ? this.trial.steps.length : c[this.landed - 1].step + 1;
  }

  /** After each step: the match, that step's events from `from`, and P1's input on it. */
  update(m: MatchState, ev: readonly SimEvent[], from: number, input: number): void {
    const t = ++this.t;
    const a = m.fighters[0];
    const conns = this.trial.conns;
    if (a.mode === 'move' && (a.move !== this.move || a.moveFrame < this.frame) && moveData(a.fighter, this.move || a.move).boost !== a.move) {
      this.lastStart = t;
      this.startMove = a.move;
      this.starts++;
    }
    this.move = a.mode === 'move' ? a.move : '';
    this.frame = a.mode === 'move' ? a.moveFrame : 0;
    if (input & ~this.held & PRESS_BITS) this.presses++;
    this.held = input;
    for (let i = from; i < ev.length; i++) {
      const e = ev[i];
      if (e.type === 'boost' && e.player === 0) this.starts++;
      if (e.type !== 'hit' || e.attacker !== 0) continue;
      if (this.state !== 'going') {
        // A fresh attempt starts with the opener landing, no reset needed.
        if (e.combo === 1 && e.move === conns[0]?.id) {
          this.state = 'going';
          this.landed = 1;
          this.lastHit = t;
          this.version++;
          if (conns.length === 1) this.clear();
        }
        continue;
      }
      const want = conns[this.landed];
      if (e.move === want.id) {
        this.landed++;
        this.lastHit = t;
        this.version++;
        if (this.landed === conns.length) this.clear();
      } else if (conns.some((c, k) => k < this.landed && c.id === e.move)) this.lastHit = t;
      else this.drop('wrong');
      if (this.state !== 'going') break;
    }
    // The combo is over before the next move landed.
    if (this.state === 'going' && m.fighters[1].combo === 0) this.drop(this.timing());
  }

  private clear(): void {
    this.state = 'cleared';
    this.clears++;
    this.version++;
  }

  private drop(why: Miss): void {
    if (why === 'wrong') this.missBy = 0;
    this.state = 'dropped';
    this.dropStep = this.trial.conns[this.landed].step;
    this.miss = why;
    this.version++;
  }

  /**
   * Early or late against the guide: when the step's move started after the
   * last hit; else a press that brought out nothing (pressed too soon, it ran
   * out of the buffer); else nothing pressed in time.
   */
  private timing(): Miss {
    const want = this.trial.conns[this.landed];
    const id = this.startMove;
    this.missBy = 0;
    if (this.lastStart > this.lastHit && id && (id === want.id || moveData(this.trial.fighter, id).boost === want.id)) {
      const off = this.lastStart - this.lastHit;
      this.missBy = off - want.offset;
      return off < want.offset ? 'early' : off > want.offset ? 'late' : 'missed';
    }
    return this.presses > this.starts ? 'early' : 'late';
  }
}

const MISS_TEXT: Readonly<Record<Miss, string>> = { early: 'too early', late: 'too late', wrong: 'wrong move', missed: 'missed' };

/** The trial's caption: the steps (ticked, the next in brackets) and how the last attempt went. */
export function trialLine(tr: TrialTracker): string {
  const { steps } = tr.trial;
  const done = tr.state === 'cleared' ? steps.length : tr.stepsDone;
  const at = tr.state === 'dropped' ? tr.dropStep : done;
  const presses = steps.map((s, i) => (i < done ? `✓${s.input}` : i === at ? `[${s.input}]` : s.input)).join(' › ');
  const status =
    tr.state === 'cleared'
      ? 'CLEARED'
      : tr.state === 'dropped'
        ? `dropped at ${steps[tr.dropStep].input}: ${MISS_TEXT[tr.miss]}`
        : tr.state === 'going'
          ? 'keep going'
          : steps[0].input + ' to start';
  return `${tr.trial.name.toUpperCase()} · ${presses}\n${status}`;
}
