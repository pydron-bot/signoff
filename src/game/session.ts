/**
 * A play session around one match: who sends player 2's inputs (the CPU, a
 * second player or the training dummy), and training mode's extras (no
 * clock, health and meter refills, reset, frame advantage). No DOM here.
 */
import { Cpu, type CpuLevel } from '../ai/cpu';
import { BAR, METER_MAX, ROUND_FRAMES, STAY_TUNED_FRAMES, createMatch, fighterData, saveMatch, step, type FighterState, type MatchState, type SimEvent } from '../sim';
import { fx } from '../sim/fixed';
import { segmentData } from '../sim/stages';
import { setupRound } from '../sim/stage';
import { AdvantageTracker } from './advantage';
import { GUIDE_DUMMY, GUIDE_REST, guideInput, guides, guideStart, runGuide, type ComboGuide, type GuideRun } from './comboGuides';
import { TrainingDummy } from './dummy';
import { FrameMeter } from './frameMeter';
import { LessonRun, lesson } from './lessons';
import { ReplayPlayer, ReplayRecorder, type Replay } from './replay';
import { TrialTracker, trial } from './trials';

/** demo: CPU against CPU, behind the title screen. replay: a recorded match played back. showcase: a combo guide played on a loop. */
export type Mode = 'cpu' | 'training' | 'versus' | 'demo' | 'replay' | 'showcase';
/** Who plays player 2 in training: the dummy (dummy.ts) or the CPU. */
export type Control = 'dummy' | 'cpu';
export const CONTROLS: readonly Control[] = ['dummy', 'cpu'];
/**
 * Where Reset goes: the round's start, point blank in the middle, the
 * dummy's back to the left or right wall, or a moment saved with
 * saveMoment().
 */
export type Position = 'start' | 'middle' | 'left' | 'right' | 'saved';
export const POSITIONS: readonly Position[] = ['start', 'middle', 'left', 'right', 'saved'];
/**
 * Training's finisher practice: the dummy on its last point of health and
 * the player a round up, so any hit ends the match: then a cancellation (if
 * that blow earned one) or "Stay tuned" with no time limit, a finisher, and
 * back to the start. 'wall' starts the dummy with its back to a wall, for
 * the Stage Sign-Off.
 */
export type Practice = 'off' | 'centre' | 'wall';
export const PRACTICES: readonly Practice[] = ['off', 'centre', 'wall'];

export interface SessionOptions {
  mode: Mode;
  p1: string;
  p2: string;
  /** Weather at Eleven if not given. */
  stage?: string;
  level: CpuLevel;
  seed: number;
  /** Studio rules: one segment, hazards off. */
  studio?: boolean;
  /** The game version, stamped on recordings. */
  version?: string;
  /** For mode 'replay': what to play. */
  replay?: Replay;
  /** For mode 'showcase', or a training trial: which of p1's combo guides. */
  guide?: number;
  /** Training: the guide is a trial to clear (from the guide's start, against its dummy). */
  trial?: boolean;
  /** Training: a lesson (lessons.ts) by id. */
  lesson?: string;
}

/** Frames both fighters must be at rest before training refills health. */
const REFILL_AFTER = 40;
/** Frames at rest after a trial or lesson attempt is decided before it starts again. */
const AGAIN_AFTER = 30;

export class Session {
  readonly match: MatchState;
  readonly adv = new AdvantageTracker();
  readonly dummy: TrainingDummy;
  control: Control = 'dummy';
  readonly frames = new FrameMeter();
  practice: Practice = 'off';
  position: Position = 'start';
  /** Training: the moment saveMoment() kept, which Reset can return to. */
  private saved: MatchState | null = null;
  /** A trial: the combo to land and how the attempt is going. */
  readonly tracker: TrialTracker | null = null;
  /** A lesson being played. */
  readonly lesson: LessonRun | null = null;
  /** Counts training's resets after a finished practice, so the presentation can start afresh. */
  resets = 0;
  private readonly cpu: Cpu | null;
  private readonly cpu1: Cpu | null;
  private start: MatchState | null = null;
  /** Training: the plain start (the segment chosen), before any practice set-up. */
  private base: MatchState | null = null;
  private rest = 0;
  /** CPU and versus matches are recorded for replays. */
  private readonly recorder: ReplayRecorder | null;
  private readonly player: ReplayPlayer | null;
  /** Showcase: the guide, how it plays out, and the step reached in this loop. */
  readonly guide: ComboGuide | null = null;
  readonly guideRun: GuideRun | null = null;
  guideFrame = 0;
  /** Both players' inputs on the last step, whoever sent them (player, CPU, replay or guide), for the input display. */
  readonly inputs: [number, number] = [0, 0];

  constructor(readonly options: SessionOptions) {
    const o = options;
    this.player = o.mode === 'replay' && o.replay ? new ReplayPlayer(o.replay) : null;
    this.dummy = new TrainingDummy(o.seed);
    if (o.mode === 'showcase') {
      this.guide = guides(o.p1)[o.guide ?? 0] ?? null;
      this.guideRun = this.guide ? runGuide(o.p1, this.guide) : null;
    }
    const tr = o.mode === 'training' && o.trial ? trial(o.p1, o.guide ?? 0) : null;
    const ls = o.mode === 'training' && o.lesson ? lesson(o.lesson) : null;
    if (tr) this.tracker = new TrialTracker(tr);
    if (ls) this.lesson = new LessonRun(ls);
    // A trial is the guide's own start; a lesson is in the studio against the guides' dummy.
    this.match =
      this.player?.match ??
      (this.guide ? guideStart(o.p1, this.guide.bars) : tr ? guideStart(o.p1, tr.bars) : createMatch({ p1: ls?.p1 ?? o.p1, p2: ls ? GUIDE_DUMMY : o.p2, stage: ls ? 'weather' : o.stage, seed: o.seed, studio: ls ? true : o.studio }));
    if (this.guide) this.start = saveMatch(this.match);
    const studio = o.studio === true;
    this.recorder = o.mode === 'cpu' || o.mode === 'versus' ? new ReplayRecorder(o.version ?? '', { p1: o.p1, p2: o.p2, stage: this.match.stage, seed: o.seed, studio }) : null;
    this.cpu = options.mode === 'versus' || options.mode === 'showcase' || this.player ? null : new Cpu(1, options.level, options.seed);
    this.cpu1 = options.mode === 'demo' ? new Cpu(0, options.level, options.seed * 7 + 1) : null;
    if (options.mode === 'training') {
      // Straight to the fight, and remember it for resets.
      const ev: SimEvent[] = [];
      while (this.match.phase !== 'fight') step(this.match, 0, 0, ev);
      this.lesson?.lesson.setup(this.match);
      this.start = saveMatch(this.match);
      this.base = saveMatch(this.match);
    }
  }

  /** Training with the usual tools (not a trial or a lesson, which have their own start and rules). */
  get freePlay(): boolean {
    return this.training && !this.tracker && !this.lesson;
  }

  get training(): boolean {
    return this.options.mode === 'training';
  }

  /** The recording so far (CPU and versus matches), or null. */
  recording(): Replay | null {
    return this.recorder?.finish() ?? null;
  }

  /** Replays: the step reached and the steps in all. */
  get replayFrame(): number {
    return this.player?.frame ?? 0;
  }

  get replayFrames(): number {
    return this.player?.replay.frames ?? 0;
  }

  /** Replays: jump to a step (the presentation should resync after). */
  seek(frame: number): void {
    this.player?.seek(frame);
    this.adv.last = null;
  }

  tick(p1: number, p2: number, ev: SimEvent[]): void {
    const m = this.match;
    const o = this.options;
    if (this.player) {
      const from = ev.length;
      this.player.step(ev);
      this.inputs[0] = this.player.last[0];
      this.inputs[1] = this.player.last[1];
      this.adv.update(m, from ? ev.slice(from) : ev);
      return;
    }
    if (this.guide) {
      this.showcase(ev);
      return;
    }
    let in1 = this.cpu1 ? this.cpu1.next(m) : p1;
    let in2 = o.mode === 'versus' ? p2 : o.mode !== 'training' || this.control === 'cpu' ? this.cpu!.next(m) : this.lesson ? this.lesson.dummy(m) : this.dummy.next(m);
    if (this.dummy.recording) {
      // Recording: the player's input goes to the dummy, and player 1 stands still.
      in2 = in1;
      in1 = 0;
      if (this.dummy.record(in2, m.fighters[1].facing)) this.dummy.stopRecording();
    }
    const from = ev.length;
    this.inputs[0] = in1;
    this.inputs[1] = in2;
    step(m, in1, in2, ev);
    this.recorder?.push(in1, in2);
    if (this.training) this.trainingAfter(ev, from, in1);
    this.adv.update(m, from ? ev.slice(from) : ev);
  }

  /** Showcase: the guide's presses for P1 against a standing dummy, then a pause, then again from the start. */
  private showcase(ev: SimEvent[]): void {
    const m = this.match;
    if (this.guideFrame > this.guideRun!.end + GUIDE_REST) {
      this.reset();
      this.guideFrame = 0;
    }
    const from = ev.length;
    this.inputs[0] = guideInput(this.guide!, this.guideFrame, m.fighters[0].facing);
    this.inputs[1] = 0;
    step(m, this.inputs[0], 0, ev);
    this.guideFrame++;
    m.timer = ROUND_FRAMES;
    this.adv.update(m, from ? ev.slice(from) : ev);
  }

  /** Showcase: the step of the guide last pressed (-1 before the first). */
  get guideStep(): number {
    const steps = this.guideRun?.steps ?? [];
    let k = -1;
    while (k + 1 < steps.length && steps[k + 1].at < this.guideFrame) k++;
    return k;
  }

  /** Training: practise on another segment of the stage (and reset to it). */
  setSegment(segment: number): void {
    if (!this.training) return;
    this.reset();
    this.match.segment = segment;
    setupRound(this.match);
    this.base = saveMatch(this.match);
    this.setPractice(this.practice);
  }

  /** Training: finisher practice on or off (and reset to it). */
  setPractice(p: Practice): void {
    this.practice = p;
    this.layout();
  }

  /** Training: where Reset goes (and reset to it). 'saved' without a saved moment is the round's start. */
  setPosition(p: Position): void {
    this.position = p;
    this.layout();
  }

  /** Training: keep this moment, and make it where Reset goes. */
  saveMoment(): void {
    if (!this.freePlay) return;
    this.saved = saveMatch(this.match);
    this.position = 'saved';
    this.start = saveMatch(this.saved);
  }

  get hasSaved(): boolean {
    return this.saved !== null;
  }

  /** The start Reset goes to: the base or the saved moment, the position preset, then finisher practice. */
  private layout(): void {
    if (!this.freePlay || !this.base) return;
    const p = this.position;
    const s = saveMatch(p === 'saved' && this.saved ? this.saved : this.base);
    const [a, d] = s.fighters;
    if (p === 'middle' || p === 'left' || p === 'right') {
      const wall = segmentData(s.stage, s.segment).halfWidth - fighterData(d.fighter).pushW;
      const side = p === 'left' ? -1 : 1;
      const gap = p === 'middle' ? fx(0.8) : fx(1.0);
      d.x = p === 'middle' ? fx(0.4) : side * wall;
      a.x = d.x - side * gap;
      a.facing = side === 1 ? 1 : -1;
      d.facing = side === 1 ? -1 : 1;
    }
    const pr = this.practice;
    if (pr !== 'off') {
      a.wins = 1;
      d.health = 1;
      if (pr === 'wall') {
        // The dummy's back to the right-hand wall, the player close in front.
        const w = segmentData(s.stage, s.segment).halfWidth;
        d.x = w - fx(0.9);
        a.x = d.x - fx(1.0);
        a.facing = 1;
        d.facing = -1;
      }
    }
    this.start = s;
    this.reset();
  }

  /** Training: back to the starting positions. */
  reset(): void {
    if (this.start) Object.assign(this.match, saveMatch(this.start));
    this.rest = 0;
    this.adv.last = null;
    if (!this.training) return;
    this.dummy.reset();
    this.frames.clear();
    this.tracker?.restart();
    this.lesson?.restart();
  }

  /** Finisher practice: the window stays open, and once it's over (or the dummy won the round) it starts again. */
  private practiceAfter(ev: SimEvent[], from: number): void {
    const m = this.match;
    if (m.phase === 'stayTuned') m.phaseTimer = STAY_TUNED_FRAMES;
    let again = false;
    for (let i = ev.length - 1; i >= from; i--) {
      const e = ev[i];
      // The match never ends here: no results screen.
      if (e.type === 'matchOver') {
        ev.splice(i, 1);
        again = true;
      } else if (e.type === 'roundOver' && e.winner !== 0) again = true;
    }
    if (again) {
      this.reset();
      this.resets++;
      return;
    }
    if (m.phase === 'fight') m.fighters[0].meter = METER_MAX;
  }

  private trainingAfter(ev: SimEvent[], from: number, in1: number): void {
    const m = this.match;
    m.timer = ROUND_FRAMES;
    this.frames.push(m);
    if (this.tracker || this.lesson) {
      this.drillAfter(ev, from, in1);
      return;
    }
    this.dummyMeter(m.fighters[1]);
    if (this.practice !== 'off') {
      this.practiceAfter(ev, from);
      return;
    }
    for (let i = from; i < ev.length; i++) {
      if (ev[i].type === 'roundOver') {
        this.reset();
        return;
      }
    }
    const atRest = m.fighters.every((f) => f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard');
    this.rest = atRest ? this.rest + 1 : 0;
    if (this.rest === REFILL_AFTER) {
      for (const f of m.fighters) {
        f.health = f.maxHealth;
        f.tdUsed = false;
        f.tdCooldown = 0;
        f.cutAwayUsed = false;
      }
      m.fighters[0].meter = METER_MAX;
      if (this.dummy.settings.meter === 'refill') m.fighters[1].meter = METER_MAX;
    }
  }

  /** The dummy's meter held where the settings put it (refilling is done at rest, with health). */
  private dummyMeter(d: FighterState): void {
    const level = this.dummy.settings.meter;
    if (level === 'empty') d.meter = 0;
    else if (level === 'one') d.meter = BAR;
    else if (level === 'full') d.meter = METER_MAX;
  }

  /** Trials and lessons: the attempt is judged, and once it's decided and things are still, it starts again. */
  private drillAfter(ev: SimEvent[], from: number, in1: number): void {
    const m = this.match;
    const t = this.tracker;
    const l = this.lesson;
    t?.update(m, ev, from, in1);
    l?.after(m, ev, from);
    if (m.phase === 'stayTuned') m.phaseTimer = STAY_TUNED_FRAMES;
    let over = false;
    for (let i = ev.length - 1; i >= from; i--) {
      const e = ev[i];
      // Never a results screen: the lesson starts again.
      if (e.type === 'matchOver') {
        ev.splice(i, 1);
        over = true;
      } else if (e.type === 'roundOver') over = true;
    }
    const decided = (t !== null && t.state !== 'ready' && t.state !== 'going') || (l !== null && l.result !== null);
    const atRest = m.phase === 'fight' && m.fighters.every((f) => f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch' || f.mode === 'guard');
    this.rest = decided && atRest ? this.rest + 1 : 0;
    if (over || this.rest >= AGAIN_AFTER) {
      this.reset();
      this.resets++;
    }
  }
}
