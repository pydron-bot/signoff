// The balance bench: the CPU against itself over every ordered pair of
// fighters, many seeds, studio rules (one segment, no hazards), on every
// stage in turn. It writes docs/MATCHUPS.md (who beats whom, how rounds go,
// where the damage comes from, what gets used) and fails on alarms: a
// matchup worse than 30:70, rounds that are too short or too long, too many
// time-outs. CPU results aren't the truth about a matchup, but they catch a
// fighter falling off a cliff after a data change. Slow (a minute or two),
// so it runs only on request: `npm run matchups`.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Cpu, type CpuLevel } from '../src/ai/cpu';
import { FIGHTERS, STAGE_IDS, createMatch, fighterData, moveData, step, type SimEvent } from '../src/sim';

const RUN = process.env.MATCHUPS === '1';
const SEEDS = Number(process.env.MATCHUP_SEEDS ?? 100);
const LEVELS: readonly CpuLevel[] = ['hard'];
/** Alarms: the worst matchup allowed, the average round's length in seconds, and the share of rounds that time out. */
export const WORST_MATCHUP = 30;
export const ROUND_SECONDS: readonly [number, number] = [25, 50];
export const MOST_TIMEOUTS = 10;
/** A move doing more than this share of a fighter's damage is called out (not an alarm). */
const ONE_MOVE_SHARE = 35;
/** The mechanics counted per round, in the order the doc lists them. */
const MECHANICS = ['boost', 'tapeSkip', 'jumpCancel', 'relaunch', 'cutAway', 'flawless', 'punish', 'reversal', 'delayedGetup', 'ducked', 'throw', 'throwTech', 'guardCrush', 'counter', 'superHit'] as const;
type Mechanic = (typeof MECHANICS)[number];
/** Damage sources, by what landed the hit. */
const SOURCES = ['normals', 'air normals', 'specials', 'projectiles', 'throws', 'super', 'chip'] as const;
type Source = (typeof SOURCES)[number];

export interface Bench {
  level: CpuLevel;
  ids: string[];
  /** wins[a][b]: matches fighter a won against b, both sides counted (2 × SEEDS played). */
  wins: Record<string, Record<string, number>>;
  played: Record<string, Record<string, number>>;
  rounds: number;
  roundSteps: number;
  timeouts: number;
  firstHitRounds: number;
  firstHitWins: number;
  source: Record<Source, number>;
  mechanics: Record<Mechanic, number>;
  /** Per fighter, per move: hits landed, blocked, damage. */
  moves: Record<string, Record<string, { hits: number; blocks: number; damage: number }>>;
  combos: number[];
  comboDamage: number[];
}

function source(fighter: string, move: string): Source {
  if (move === 'td') return 'super';
  const mv = fighterData(fighter).moves[move];
  if (!mv) return 'specials';
  if (mv.throwData) return 'throws';
  if (mv.spawns.length) return 'projectiles';
  if (mv.kind === 'special') return 'specials';
  return mv.kind === 'air' ? 'air normals' : 'normals';
}

/** Runs the bench at one level. Exported so a probe can run it on other settings. */
export function bench(level: CpuLevel, seeds: number): Bench {
  const ids = Object.keys(FIGHTERS);
  const b: Bench = {
    level,
    ids,
    wins: {},
    played: {},
    rounds: 0,
    roundSteps: 0,
    timeouts: 0,
    firstHitRounds: 0,
    firstHitWins: 0,
    source: Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<Source, number>,
    mechanics: Object.fromEntries(MECHANICS.map((s) => [s, 0])) as Record<Mechanic, number>,
    moves: Object.fromEntries(ids.map((id) => [id, {}])),
    combos: [],
    comboDamage: [],
  };
  for (const a of ids) {
    b.wins[a] = Object.fromEntries(ids.map((x) => [x, 0]));
    b.played[a] = Object.fromEntries(ids.map((x) => [x, 0]));
  }
  const ev: SimEvent[] = [];
  for (let ia = 0; ia < ids.length; ia++) {
    for (let ib = 0; ib < ids.length; ib++) {
      const p = [ids[ia], ids[ib]];
      for (let s = 1; s <= seeds; s++) {
        const seed = s * 7919 + ia * 131 + ib * 17;
        const stage = STAGE_IDS[s % STAGE_IDS.length];
        const m = createMatch({ p1: p[0], p2: p[1], stage, seed, studio: true });
        const cpus = [new Cpu(0, level, seed * 7 + 1), new Cpu(1, level, seed)];
        let firstBy = -1;
        let roundStart = 0;
        const run = [0, 0];
        const runDmg = [0, 0];
        for (let guard = 0; guard < 60 * 60 * 10 && m.phase !== 'over' && m.phase !== 'stayTuned' && m.phase !== 'finisher'; guard++) {
          ev.length = 0;
          step(m, cpus[0].next(m), cpus[1].next(m), ev);
          for (const e of ev) {
            if (e.type === 'fight') {
              firstBy = -1;
              roundStart = m.frame;
            } else if (e.type === 'firstHit') firstBy = e.player;
            else if (e.type === 'hit') {
              const f = p[e.attacker];
              b.source[source(f, e.move)] += e.damage;
              const row = (b.moves[f][e.move] ??= { hits: 0, blocks: 0, damage: 0 });
              row.hits++;
              row.damage += e.damage;
              // A combo ends when the next one starts (hit 1) or the round does.
              if (e.combo === 1 && run[e.attacker] > 0) {
                b.combos.push(run[e.attacker]);
                b.comboDamage.push(runDmg[e.attacker]);
                runDmg[e.attacker] = 0;
              }
              run[e.attacker] = e.combo;
              runDmg[e.attacker] += e.damage;
            } else if (e.type === 'block') {
              b.source.chip += e.chip;
              const f = p[e.attacker];
              (b.moves[f][e.move] ??= { hits: 0, blocks: 0, damage: 0 }).blocks++;
            } else if (e.type === 'roundOver') {
              b.rounds++;
              b.roundSteps += m.frame - roundStart;
              if (e.reason === 'time') b.timeouts++;
              if (firstBy >= 0) {
                b.firstHitRounds++;
                if (firstBy === e.winner) b.firstHitWins++;
              }
            }
            if ((MECHANICS as readonly string[]).includes(e.type)) b.mechanics[e.type as Mechanic]++;
          }
        }
        for (let k = 0; k < 2; k++) {
          if (run[k] > 0) {
            b.combos.push(run[k]);
            b.comboDamage.push(runDmg[k]);
          }
        }
        b.played[p[0]][p[1]]++;
        b.played[p[1]][p[0]]++;
        if (m.matchWinner === 0 || m.matchWinner === 1) b.wins[p[m.matchWinner]][p[1 - m.matchWinner]]++;
      }
    }
  }
  return b;
}

/** Fighter a's share of the matches against b, in %. Mirrors count both sides, so they're 50. */
export function winPct(b: Bench, a: string, o: string): number {
  if (a === o) return 50;
  return (100 * b.wins[a][o]) / b.played[a][o];
}

function overall(b: Bench, a: string): number {
  const others = b.ids.filter((o) => o !== a);
  return others.reduce((s, o) => s + winPct(b, a, o), 0) / others.length;
}

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : '–');

/** The bench as Markdown. */
function report(b: Bench, seeds: number): string {
  const name = (id: string) => fighterData(id).name;
  const short = (id: string) => name(id).split(' ').at(-1)!;
  const out: string[] = [];
  out.push(`## ${b.level}`, '');
  out.push(`${b.rounds} rounds. Average round ${(b.roundSteps / b.rounds / 60).toFixed(1)} s; ${pct(b.timeouts, b.rounds)}% time out. The first hit wins the round ${pct(b.firstHitWins, b.firstHitRounds)}% of the time.`, '');
  out.push('### Win rates', '', `The row fighter's share of the matches against the column, both sides counted (${2 * seeds} matches a pair).`, '');
  out.push(`| | ${b.ids.map(short).join(' | ')} | Overall |`, `| --- | ${b.ids.map(() => '---').join(' | ')} | --- |`);
  for (const a of b.ids) out.push(`| ${name(a)} | ${b.ids.map((o) => (a === o ? '–' : Math.round(winPct(b, a, o)).toString())).join(' | ')} | **${overall(b, a).toFixed(0)}** |`);
  out.push('', '### Combos', '');
  const hist = [1, 2, 3, 4, 5, 6, 8, 10].map((n, k, all) => {
    const hi = all[k + 1] ?? Infinity;
    const c = b.combos.filter((x) => x >= n && x < hi).length;
    return `${hi === Infinity ? `${n}+` : hi - n > 1 ? `${n}–${hi - 1}` : n} hits ${pct(c, b.combos.length)}%`;
  });
  const avg = b.comboDamage.reduce((s, x) => s + x, 0) / b.comboDamage.length;
  out.push(`${b.combos.length} combos (a single hit counts as one). ${hist.join(', ')}. Average ${avg.toFixed(0)} damage; ${pct(b.comboDamage.filter((x) => x >= 250).length, b.comboDamage.length)}% do 250 or more.`, '');
  const total = SOURCES.reduce((s, k) => s + b.source[k], 0);
  out.push('### Damage by source', '', SOURCES.map((k) => `${k} ${pct(b.source[k], total)}%`).join(' · '), '');
  out.push('### Mechanics, per round', '', MECHANICS.map((k) => `${k} ${(b.mechanics[k] / b.rounds).toFixed(2)}`).join(' · '), '');
  out.push('### What each fighter lands', '', `Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over ${ONE_MOVE_SHARE}% is marked: the fighter may be one move.`, '');
  for (const id of b.ids) {
    const rows = Object.entries(b.moves[id]);
    const dmg = rows.reduce((s, [, r]) => s + r.damage, 0);
    const top = rows
      .sort((x, y) => y[1].damage - x[1].damage)
      .slice(0, 5)
      .map(([mv, r]) => {
        const share = (100 * r.damage) / dmg;
        const label = mv === 'td' ? 'Technical Difficulties' : mv in fighterData(id).moves ? moveData(id, mv).name : mv;
        return `${share > ONE_MOVE_SHARE ? '**' : ''}${label} ${share.toFixed(0)}%${share > ONE_MOVE_SHARE ? '**' : ''} (${r.hits}/${r.blocks})`;
      });
    out.push(`- **${name(id)}:** ${top.join(' · ')}`);
  }
  out.push('');
  return out.join('\n');
}

describe.skipIf(!RUN)('the balance bench (npm run matchups)', () => {
  const benches: Bench[] = [];
  it('plays every pair at every level and writes docs/MATCHUPS.md', () => {
    for (const level of LEVELS) benches.push(bench(level, SEEDS));
    writeFileSync(
      'docs/MATCHUPS.md',
      `# SIGN-OFF — matchups\n\nWritten by \`npm run matchups\` (tests/matchups.test.ts); do not edit by hand.\n\nThe CPU against itself: every ordered pair of fighters, ${SEEDS} seeds each, studio rules (one segment, no hazards), the stages in turn. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than ${WORST_MATCHUP}:${100 - WORST_MATCHUP}, an average round outside ${ROUND_SECONDS[0]} to ${ROUND_SECONDS[1]} seconds, or more than ${MOST_TIMEOUTS}% of rounds timing out.\n\n${benches.map((b) => report(b, SEEDS)).join('\n')}`,
    );
  }, 1_200_000);

  it(`no matchup is worse than ${WORST_MATCHUP}:${100 - WORST_MATCHUP}`, () => {
    for (const b of benches) {
      const bad = b.ids.flatMap((a) => b.ids.filter((o) => winPct(b, a, o) < WORST_MATCHUP).map((o) => `${b.level}: ${a} ${winPct(b, a, o).toFixed(0)}% against ${o}`));
      expect(bad).toEqual([]);
    }
  });

  it(`rounds last ${ROUND_SECONDS[0]} to ${ROUND_SECONDS[1]} seconds on average, and few time out`, () => {
    for (const b of benches) {
      const secs = b.roundSteps / b.rounds / 60;
      expect(secs, b.level).toBeGreaterThanOrEqual(ROUND_SECONDS[0]);
      expect(secs, b.level).toBeLessThanOrEqual(ROUND_SECONDS[1]);
      expect((100 * b.timeouts) / b.rounds, b.level).toBeLessThanOrEqual(MOST_TIMEOUTS);
    }
  });
});
