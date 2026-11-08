/**
 * A play session around one match: who sends player 2's inputs (the CPU, a
 * second player or the training dummy), and training mode's extras (no
 * clock, health and meter refills, reset, frame advantage). No DOM here.
 */
import { Cpu, type CpuLevel } from '../ai/cpu';
import { Input, METER_MAX, ROUND_FRAMES, createMatch, moveData, saveMatch, step, type MatchState, type SimEvent } from '../sim';
import { AdvantageTracker } from './advantage';

/** demo: CPU against CPU, behind the title screen. */
export type Mode = 'cpu' | 'training' | 'versus' | 'demo';
export type Dummy = 'stand' | 'block' | 'crouch' | 'cpu';
export const DUMMIES: readonly Dummy[] = ['stand', 'block', 'crouch', 'cpu'];

export interface SessionOptions {
  mode: Mode;
  p1: string;
  p2: string;
  level: CpuLevel;
  seed: number;
}

/** Frames both fighters must be at rest before training refills health. */
const REFILL_AFTER = 40;

export class Session {
  readonly match: MatchState;
  readonly adv = new AdvantageTracker();
  dummy: Dummy = 'stand';
  private readonly cpu: Cpu | null;
  private readonly cpu1: Cpu | null;
  private readonly start: MatchState | null = null;
  private rest = 0;

  constructor(readonly options: SessionOptions) {
    this.match = createMatch({ p1: options.p1, p2: options.p2, seed: options.seed });
    this.cpu = options.mode === 'versus' ? null : new Cpu(1, options.level, options.seed);
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

  tick(p1: number, p2: number, ev: SimEvent[]): void {
    const m = this.match;
    const o = this.options;
    const in1 = this.cpu1 ? this.cpu1.next(m) : p1;
    const in2 = o.mode === 'versus' ? p2 : o.mode !== 'training' || this.dummy === 'cpu' ? this.cpu!.next(m) : this.dummyInput();
    const from = ev.length;
    step(m, in1, in2, ev);
    if (this.training) this.trainingAfter(ev, from);
    this.adv.update(m, from ? ev.slice(from) : ev);
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
        f.cutAwayUsed = false;
      }
      m.fighters[0].meter = METER_MAX;
    }
  }
}
