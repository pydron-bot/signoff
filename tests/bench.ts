// The balance bench's engine: the CPU against itself over pairs of fighters
// and seeds, counting what happens. tests/matchups.test.ts runs it over
// everything and writes docs/MATCHUPS.md; tests/bench.test.ts checks each
// measure over a fixed seed. Not a test file itself.
import { Cpu, type CpuLevel } from '../src/ai/cpu';
import { FIGHTERS, STAGE_IDS, TD_HEALTH_PCT, createMatch, fighterData, moveData, step, type MatchState, type SimEvent } from '../src/sim';
import { ONE } from '../src/sim/fixed';

/** The mechanics counted per round, in the order the doc lists them. `counter` is a counter move's read (Teleprompter); `counterHit` a hit on a move's startup or active frames. */
export const MECHANICS = ['boost', 'tapeSkip', 'jumpCancel', 'relaunch', 'cutAway', 'flawless', 'punish', 'reversal', 'delayedGetup', 'ducked', 'throw', 'throwTech', 'guardCrush', 'counter', 'counterHit', 'superHit'] as const;
export type Mechanic = (typeof MECHANICS)[number];
/** Damage sources, by what landed the hit. Hazards and props only hit under LIVE BROADCAST rules (props stay in studio). */
export const SOURCES = ['normals', 'air normals', 'specials', 'projectiles', 'throws', 'super', 'chip', 'props', 'hazards'] as const;
export type Source = (typeof SOURCES)[number];
/** Ranges between the fighters' centres, in metres: throw range, close, mid, far (the upper bound of each). */
export const RANGES: readonly [string, number][] = [
  ['throw', 1.0],
  ['close', 1.8],
  ['mid', 3.0],
  ['far', Infinity],
];

export interface Openings {
  /** Openings that hit (a combo; a single hit counts as one), and their damage. */
  n: number;
  damage: number;
  /** Of those, the ones carried past a single hit. */
  n2: number;
  damage2: number;
}

/** Chances to use a mechanic (the CPU tried), beside the times it came off (the mechanic counts). */
export interface Tries {
  /** Moves started straight off the floor (a reversal tried). */
  reversal: number;
  /** Guard-crushing moves started. */
  guardCrush: number;
  /** Counter moves (Teleprompter) started. */
  counter: number;
  /** Strikes that hit (counter hits are a share of these). */
  strikes: number;
}

export interface BenchOptions {
  level: CpuLevel;
  seeds: number;
  /** Studio rules (one segment, hazards off): true unless the LIVE BROADCAST pass. */
  studio?: boolean;
  /** The first hit's meter, when weighing it. */
  firstHitMeter?: number;
  /** Only these ordered pairs (default: every one). */
  pairs?: readonly (readonly [string, string])[];
}

export interface Bench {
  level: CpuLevel;
  studio: boolean;
  ids: string[];
  /** wins[a][b]: matches fighter a won against b, both sides counted (2 × seeds played). */
  wins: Record<string, Record<string, number>>;
  played: Record<string, Record<string, number>>;
  rounds: number;
  roundSteps: number;
  timeouts: number;
  /** By unordered pair ("a|b", ids in roster order): rounds, time-outs, and steps fought. */
  pairRounds: Record<string, number>;
  pairTimeouts: Record<string, number>;
  pairSteps: Record<string, number>;
  firstHitRounds: number;
  firstHitWins: number;
  /** Rounds won by someone who had been under TD_HEALTH_PCT health in that round, and rounds where anyone had. */
  comebacks: number;
  lowRounds: number;
  /** Matches won by the loser of round 1, and matches whose round 1 had a winner. */
  turnarounds: number;
  decidedFirstRounds: number;
  source: Record<Source, number>;
  mechanics: Record<Mechanic, number>;
  tries: Tries;
  /** Per fighter, per move: hits landed, blocked, damage. */
  moves: Record<string, Record<string, { hits: number; blocks: number; damage: number }>>;
  /** openings[a][b]: what a's openings on b did. */
  openings: Record<string, Record<string, Openings>>;
  /** Per fighter: steps spent at each range (RANGES), counted from their matches. */
  ranges: Record<string, number[]>;
  combos: number[];
  comboDamage: number[];
}

export const pairKey = (ids: readonly string[], a: string, b: string): string => (ids.indexOf(a) <= ids.indexOf(b) ? `${a}|${b}` : `${b}|${a}`);

export function source(fighter: string, move: string): Source {
  if (move === 'td') return 'super';
  const mv = fighterData(fighter).moves[move];
  // A stage prop hits under its own id.
  if (!mv) return 'props';
  if (mv.throwData) return 'throws';
  if (mv.spawns.length) return 'projectiles';
  if (mv.kind === 'special') return 'specials';
  return mv.kind === 'air' ? 'air normals' : 'normals';
}

export function emptyBench(level: CpuLevel, studio = true): Bench {
  const ids = Object.keys(FIGHTERS);
  const per = <T>(f: () => T) => Object.fromEntries(ids.map((id) => [id, f()]));
  return {
    level,
    studio,
    ids,
    wins: per(() => Object.fromEntries(ids.map((x) => [x, 0]))),
    played: per(() => Object.fromEntries(ids.map((x) => [x, 0]))),
    rounds: 0,
    roundSteps: 0,
    timeouts: 0,
    pairRounds: {},
    pairTimeouts: {},
    pairSteps: {},
    firstHitRounds: 0,
    firstHitWins: 0,
    comebacks: 0,
    lowRounds: 0,
    turnarounds: 0,
    decidedFirstRounds: 0,
    source: Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<Source, number>,
    mechanics: Object.fromEntries(MECHANICS.map((s) => [s, 0])) as Record<Mechanic, number>,
    tries: { reversal: 0, guardCrush: 0, counter: 0, strikes: 0 },
    moves: per(() => ({})),
    openings: per(() => Object.fromEntries(ids.map((x) => [x, { n: 0, damage: 0, n2: 0, damage2: 0 }]))),
    ranges: per(() => RANGES.map(() => 0)),
    combos: [],
    comboDamage: [],
  };
}

/** The bench's seed and stage for a pair (by roster index) and seed number. */
export function matchSeed(ia: number, ib: number, s: number): { seed: number; stage: string } {
  return { seed: s * 7919 + ia * 131 + ib * 17, stage: STAGE_IDS[s % STAGE_IDS.length] };
}

const ev: SimEvent[] = [];

/** Plays one match of the bench and counts it into `b`. */
export function playMatch(b: Bench, p1: string, p2: string, s: number, o: Pick<BenchOptions, 'level' | 'studio' | 'firstHitMeter'>): MatchState {
  const p = [p1, p2];
  const { seed, stage } = matchSeed(b.ids.indexOf(p1), b.ids.indexOf(p2), s);
  const m = createMatch({ p1, p2, stage, seed, studio: o.studio ?? true, firstHitMeter: o.firstHitMeter });
  const cpus = [new Cpu(0, o.level, seed * 7 + 1), new Cpu(1, o.level, seed)];
  const key = pairKey(b.ids, p1, p2);
  let firstBy = -1;
  let roundStart = 0;
  let round1 = -2;
  const low = [false, false];
  // A move's first frame can last several steps in a freeze: count its start once.
  const started = [false, false];
  const run = [0, 0];
  const runDmg = [0, 0];
  const close = (k: number) => {
    if (run[k] === 0) return;
    b.combos.push(run[k]);
    b.comboDamage.push(runDmg[k]);
    const op = b.openings[p[k]][p[1 - k]];
    op.n++;
    op.damage += runDmg[k];
    if (run[k] > 1) {
      op.n2++;
      op.damage2 += runDmg[k];
    }
    run[k] = 0;
    runDmg[k] = 0;
  };
  for (let guard = 0; guard < 60 * 60 * 10 && m.phase !== 'over' && m.phase !== 'stayTuned' && m.phase !== 'finisher'; guard++) {
    ev.length = 0;
    step(m, cpus[0].next(m), cpus[1].next(m), ev);
    if (m.phase === 'fight') {
      const metres = Math.abs(m.fighters[0].x - m.fighters[1].x) / ONE;
      const r = RANGES.findIndex(([, hi]) => metres < hi);
      b.ranges[p1][r]++;
      b.ranges[p2][r]++;
      for (let k = 0; k < 2; k++) {
        const f = m.fighters[k];
        if (f.health * 100 < f.maxHealth * TD_HEALTH_PCT) low[k] = true;
        const first = f.mode === 'move' && f.moveFrame === 1;
        if (first && !started[k] && f.move in fighterData(f.fighter).moves) {
          const mv = moveData(f.fighter, f.move);
          if (f.reversal) b.tries.reversal++;
          if (mv.counter) b.tries.counter++;
          if (mv.hits.some((h) => h.guardCrush)) b.tries.guardCrush++;
        }
        started[k] = first;
      }
    }
    for (const e of ev) {
      if (e.type === 'fight') {
        firstBy = -1;
        roundStart = m.frame;
        low[0] = low[1] = false;
      } else if (e.type === 'firstHit') firstBy = e.player;
      else if (e.type === 'hit') {
        const f = p[e.attacker];
        const src = source(f, e.move);
        b.source[src] += e.damage;
        if (src !== 'super' && src !== 'throws' && src !== 'props') b.tries.strikes++;
        if (e.counter) b.mechanics.counterHit++;
        const row = (b.moves[f][e.move] ??= { hits: 0, blocks: 0, damage: 0 });
        row.hits++;
        row.damage += e.damage;
        // An opening ends when the next one starts (hit 1) or the round does.
        if (e.combo === 1) close(e.attacker);
        run[e.attacker] = e.combo;
        runDmg[e.attacker] += e.damage;
      } else if (e.type === 'block') {
        b.source.chip += e.chip;
        const f = p[e.attacker];
        (b.moves[f][e.move] ??= { hits: 0, blocks: 0, damage: 0 }).blocks++;
      } else if (e.type === 'hazardHit') {
        b.source.hazards += e.damage;
      } else if (e.type === 'roundOver') {
        close(0);
        close(1);
        b.rounds++;
        b.roundSteps += m.frame - roundStart;
        b.pairRounds[key] = (b.pairRounds[key] ?? 0) + 1;
        b.pairSteps[key] = (b.pairSteps[key] ?? 0) + m.frame - roundStart;
        if (e.reason === 'time') {
          b.timeouts++;
          b.pairTimeouts[key] = (b.pairTimeouts[key] ?? 0) + 1;
        }
        if (firstBy >= 0) {
          b.firstHitRounds++;
          if (firstBy === e.winner) b.firstHitWins++;
        }
        if (low[0] || low[1]) {
          b.lowRounds++;
          if (e.winner >= 0 && low[e.winner]) b.comebacks++;
        }
        if (round1 === -2) round1 = e.winner;
      }
      if ((MECHANICS as readonly string[]).includes(e.type)) b.mechanics[e.type as Mechanic]++;
    }
  }
  b.played[p1][p2]++;
  b.played[p2][p1]++;
  if (m.matchWinner === 0 || m.matchWinner === 1) {
    b.wins[p[m.matchWinner]][p[1 - m.matchWinner]]++;
    if (round1 >= 0) {
      b.decidedFirstRounds++;
      if (round1 !== m.matchWinner) b.turnarounds++;
    }
  } else if (round1 >= 0) b.decidedFirstRounds++;
  return m;
}

/** Runs the bench: every ordered pair (or those given), seeds 1 to `seeds`. */
export function bench(o: BenchOptions): Bench {
  const b = emptyBench(o.level, o.studio ?? true);
  const pairs = o.pairs ?? b.ids.flatMap((a) => b.ids.map((x) => [a, x] as const));
  for (const [a, x] of pairs) for (let s = 1; s <= o.seeds; s++) playMatch(b, a, x, s, o);
  return b;
}

/** Fighter a's share of the matches against b, in %. Mirrors count both sides, so they're 50. */
export function winPct(b: Bench, a: string, o: string): number {
  if (a === o) return 50;
  return (100 * b.wins[a][o]) / b.played[a][o];
}

export function overall(b: Bench, a: string): number {
  const others = b.ids.filter((o) => o !== a);
  return others.reduce((s, o) => s + winPct(b, a, o), 0) / others.length;
}

/** The average damage of a's openings on b that hit (`multi`: only those past one hit). */
export function openingDamage(b: Bench, a: string, o: string, multi = false): number {
  const op = b.openings[a][o];
  return multi ? (op.n2 ? op.damage2 / op.n2 : 0) : op.n ? op.damage / op.n : 0;
}

/** Openings a needs to win a round from b: b's health over a's average opening on b. */
export function openingsToWin(b: Bench, a: string, o: string, multi = false): number {
  const dmg = openingDamage(b, a, o, multi);
  return dmg ? fighterData(o).health / dmg : Infinity;
}

/** Over every opponent (mirrors left out): the openings a needs to win, and the openings anyone needs to beat a. */
export function fighterOpenings(b: Bench, a: string, multi = false): { needs: number; gives: number } {
  const others = b.ids.filter((o) => o !== a);
  const mean = (f: (o: string) => number) => others.reduce((s, o) => s + f(o), 0) / others.length;
  return { needs: mean((o) => openingsToWin(b, a, o, multi)), gives: mean((o) => openingsToWin(b, o, a, multi)) };
}
