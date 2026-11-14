/**
 * The night's figures for the results screen, read from the match's events
 * step by step (the sim's own account, so they agree with what happened):
 * damage dealt (chip included), the best combo (hits and damage), first hits, counter hits,
 * punishes, flawless blocks and the time on air. Pure: plain numbers, no
 * DOM, nothing allocated per step.
 */
import type { SimEvent } from '../sim/events';
import type { MatchState } from '../sim/state';
import { STEPS_PER_SECOND } from '../sim/constants';

export interface SideFigures {
  damage: number;
  bestCombo: number;
  bestComboDamage: number;
  firstHits: number;
  counters: number;
  punishes: number;
  flawless: number;
  rounds: number;
}

function side(): SideFigures {
  return { damage: 0, bestCombo: 0, bestComboDamage: 0, firstHits: 0, counters: 0, punishes: 0, flawless: 0, rounds: 0 };
}

export class MatchFigures {
  readonly sides: [SideFigures, SideFigures] = [side(), side()];
  /** Steps of fighting (the round clock running), in all rounds. */
  steps = 0;
  /** Damage the set did (a stage hazard), to nobody's credit. */
  hazard = 0;
  /** The combo running for each attacker: damage so far. */
  private readonly running = [0, 0];

  reset(): void {
    this.sides[0] = side();
    this.sides[1] = side();
    this.steps = 0;
    this.hazard = 0;
    this.running[0] = this.running[1] = 0;
  }

  /** Once per step, after it. */
  step(m: MatchState, ev: readonly SimEvent[]): void {
    if (m.phase === 'fight') this.steps++;
    for (const e of ev) {
      switch (e.type) {
        case 'hit': {
          const a = this.sides[e.attacker];
          a.damage += e.damage;
          this.running[e.attacker] = e.combo <= 1 ? e.damage : this.running[e.attacker] + e.damage;
          if (e.combo > a.bestCombo || (e.combo === a.bestCombo && this.running[e.attacker] > a.bestComboDamage)) {
            a.bestCombo = e.combo;
            a.bestComboDamage = this.running[e.attacker];
          }
          if (e.counter) a.counters++;
          break;
        }
        case 'block':
          // Chip damage counts as damage dealt.
          this.sides[e.attacker].damage += e.chip;
          break;
        case 'hazardHit':
          this.hazard += e.damage;
          break;
        case 'firstHit':
          this.sides[e.player].firstHits++;
          break;
        case 'punish':
          this.sides[e.player].punishes++;
          break;
        case 'flawless':
          this.sides[e.player].flawless++;
          break;
        case 'roundOver':
          if (e.winner === 0 || e.winner === 1) this.sides[e.winner].rounds++;
          break;
        default:
          break;
      }
    }
  }

  /** The time on air as m:ss. */
  time(): string {
    const s = Math.floor(this.steps / STEPS_PER_SECOND);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
}

/** The rows of the results' table: a label, and each side's figure as text. */
export function figureRows(f: MatchFigures, maxHealth: readonly number[]): [string, string, string][] {
  const [a, b] = f.sides;
  const pct = (d: number, i: number) => `${Math.round((d * 100) / Math.max(1, maxHealth[1 - i]))}%`;
  const combo = (s: SideFigures, i: number) => (s.bestCombo >= 2 ? `${s.bestCombo} HITS ${pct(s.bestComboDamage, i)}` : '—');
  return [
    ['DAMAGE', String(a.damage), String(b.damage)],
    ['BEST COMBO', combo(a, 0), combo(b, 1)],
    ['FIRST HITS', String(a.firstHits), String(b.firstHits)],
    ['COUNTER HITS', String(a.counters), String(b.counters)],
    ['PUNISHES', String(a.punishes), String(b.punishes)],
    ['FLAWLESS BLOCKS', String(a.flawless), String(b.flawless)],
  ];
}
