/**
 * A play session around one match: who sends player 2's inputs (the CPU, a
 * second player or the training dummy), and training mode's extras (no
 * clock, health and meter refills, reset, frame advantage). No DOM here.
 */
import { Cpu, type CpuLevel } from '../ai/cpu';
import { Input, METER_MAX, ROUND_FRAMES, createMatch, moveData, saveMatch, step, type MatchState, type SimEvent } from '../sim';
import { setupRound } from '../sim/stage';
import { AdvantageTracker } from './advantage';
import { GUIDE_REST, guideInput, guides, guideStart, runGuide, type ComboGuide, type GuideRun } from './comboGuides';
import { ReplayPlayer, ReplayRecorder, type Replay } from './replay';

/** demo: CPU against CPU, behind the title screen. replay: a recorded match played back. showcase: a combo guide played on a loop. */
export type Mode = 'cpu' | 'training' | 'versus' | 'demo' | 'replay' | 'showcase';
export type Dummy = 'stand' | 'block' | 'crouch' | 'cpu';
export const DUMMIES: readonly Dummy[] = ['stand', 'block', 'crouch', 'cpu'];

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
  /** For mode 'showcase': which of p1's combo guides. */
  guide?: number;
}

/** Frames both fighters must be at rest before training refills health. */
const REFILL_AFTER = 40;

export class Session {
  readonly match: MatchState;
  readonly adv = new AdvantageTracker();
  dummy: Dummy = 'stand';
  private readonly cpu: Cpu | null;
  private readonly cpu1: Cpu | null;
  private start: MatchState | null = null;
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
    if (o.mode === 'showcase') {
      this.guide = guides(o.p1)[o.guide ?? 0] ?? null;
      this.guideRun = this.guide ? runGuide(o.p1, this.guide) : null;
    }
    this.match = this.player?.match ?? (this.guide ? guideStart(o.p1, this.guide.bars) : createMatch({ p1: o.p1, p2: o.p2, stage: o.stage, seed: o.seed, studio: o.studio }));
    if (this.guide) this.start = saveMatch(this.match);
    const studio = o.studio === true;
    this.recorder = o.mode === 'cpu' || o.mode === 'versus' ? new ReplayRecorder(o.version ?? '', { p1: o.p1, p2: o.p2, stage: this.match.stage, seed: o.seed, studio }) : null;
    this.cpu = options.mode === 'versus' || options.mode === 'showcase' || this.player ? null : new Cpu(1, options.level, options.seed);
    this.cpu1 = options.mode === 'demo' ? new Cpu(0, options.level, options.seed * 7 + 1) : null;
    if (options.mode === 'training') {
      // Straight to the fight, and remember it for resets.
      const ev: SimEvent[] = [];
      while (this.match.phase !== 'fight') step(this.match, 0, 0, ev);
      this.start = saveMatch(this.match);
    }
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
    const in1 = this.cpu1 ? this.cpu1.next(m) : p1;
    const in2 = o.mode === 'versus' ? p2 : o.mode !== 'training' || this.dummy === 'cpu' ? this.cpu!.next(m) : this.dummyInput();
    const from = ev.length;
    this.inputs[0] = in1;
    this.inputs[1] = in2;
    step(m, in1, in2, ev);
    this.recorder?.push(in1, in2);
    if (this.training) this.trainingAfter(ev, from);
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
    this.start = saveMatch(this.match);
  }

  /** Training: back to the starting positions. */
  reset(): void {
    if (this.start) Object.assign(this.match, saveMatch(this.start));
    this.rest = 0;
  }

  private dummyInput(): number {
    const { BLOCK, DOWN } = Input;
    if (this.dummy === 'stand') return 0;
    if (this.dummy === 'crouch') return BLOCK | DOWN;
    // Blocks everything: the dummy may peek at the attack's height, the CPU may not.
    const a = this.match.fighters[0];
    if (a.mode !== 'move') return BLOCK;
    return BLOCK | (moveData(a.fighter, a.move).hits.some((h) => h.height === 'low') ? DOWN : 0);
  }

  private trainingAfter(ev: SimEvent[], from: number): void {
    const m = this.match;
    m.timer = ROUND_FRAMES;
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
    }
  }
}
