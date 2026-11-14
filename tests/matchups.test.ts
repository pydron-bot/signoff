// The balance bench: the CPU against itself over every ordered pair of
// fighters, many seeds, studio rules (one segment, no hazards), on every
// stage in turn (the engine is tests/bench.ts). It writes docs/MATCHUPS.md
// (who beats whom, how many openings win a round, how rounds go, where the
// damage comes from, what gets used), then weighs the first hit's bonus,
// plays a pass under LIVE BROADCAST rules and counts the rarer mechanics at
// every CPU level. It fails on alarms: a matchup worse than 30:70, rounds
// that are too short or too long, too many time-outs. CPU results aren't
// the truth about a matchup, but they catch a fighter falling off a cliff
// after a data change. Slow (several minutes), so it runs only on request:
// `npm run matchups`.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CpuLevel } from '../src/ai/cpu';
import { BAR, FIRST_HIT_METER, ROUND_FRAMES, STEPS_PER_SECOND, TD_HEALTH_PCT, fighterData, moveData } from '../src/sim';
import { MECHANICS, RANGES, SOURCES, bench, fighterOpenings, openingDamage, openingsToWin, overall, pairKey, winPct, type Bench, type Mechanic } from './bench';

const RUN = process.env.MATCHUPS === '1';
const SEEDS = Number(process.env.MATCHUP_SEEDS ?? 100);
/** The rarer mechanics are counted at easy and normal too, over fewer seeds. */
const LEVEL_SEEDS = Number(process.env.MATCHUP_LEVEL_SEEDS ?? 30);
const LEVELS: readonly CpuLevel[] = ['hard', 'director'];
/** Alarms: the worst matchup allowed, the average round's length in seconds, and the share of rounds that time out. */
export const WORST_MATCHUP = 30;
export const ROUND_SECONDS: readonly [number, number] = [25, 50];
export const MOST_TIMEOUTS = 10;
/** The band every pair's openings to win a round should sit in (reported, not an alarm). */
export const OPENINGS_BAND: readonly [number, number] = [7, 10];
/** A move doing more than this share of a fighter's damage is called out (not an alarm). */
const ONE_MOVE_SHARE = 35;
/** Under LIVE BROADCAST rules a matchup moving further than this from its studio result is called out. */
const LIVE_SHIFT = 10;
const MECHANIC_LABEL: Partial<Record<Mechanic, string>> = { counter: 'counter (a read)', counterHit: 'counter hit' };

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : '–');
const name = (id: string) => fighterData(id).name;
const short = (id: string) => name(id).split(' ').at(-1)!;
const seconds = (b: Bench) => b.roundSteps / b.rounds / STEPS_PER_SECOND;
const inBand = (x: number) => x >= OPENINGS_BAND[0] && x <= OPENINGS_BAND[1];
const others = (b: Bench, a: string) => b.ids.filter((o) => o !== a);
const pairs = (b: Bench) => b.ids.flatMap((a) => others(b, a).map((o) => [a, o] as const));

/** A table of the row fighter against the column, both mirrors left blank. */
function grid(b: Bench, cell: (a: string, o: string) => string, last?: [string, (a: string) => string]): string[] {
  const out = [`| | ${b.ids.map(short).join(' | ')} |${last ? ` ${last[0]} |` : ''}`, `| --- | ${b.ids.map(() => '---').join(' | ')} |${last ? ' --- |' : ''}`];
  for (const a of b.ids) out.push(`| ${name(a)} | ${b.ids.map((o) => (a === o ? '–' : cell(a, o))).join(' | ')} |${last ? ` ${last[1](a)} |` : ''}`);
  return out;
}

function worst(b: Bench, n: number): string {
  return pairs(b)
    .sort((x, y) => winPct(b, y[0], y[1]) - winPct(b, x[0], x[1]))
    .slice(0, n)
    .map(([a, o]) => `${short(a)} ${Math.round(winPct(b, a, o))} over ${short(o)}`)
    .join(', ');
}

/** The bench at one level as Markdown. */
function report(b: Bench, seeds: number): string {
  const out: string[] = [];
  out.push(`## ${b.level}`, '');
  out.push(`${b.rounds} rounds. Average round ${seconds(b).toFixed(1)} s; ${pct(b.timeouts, b.rounds)}% time out. The first hit wins the round ${pct(b.firstHitWins, b.firstHitRounds)}% of the time. The furthest from even: ${worst(b, 6)}.`, '');
  out.push('### Win rates', '', `The row fighter's share of the matches against the column, both sides counted (${2 * seeds} matches a pair).`, '');
  out.push(...grid(b, (a, o) => Math.round(winPct(b, a, o)).toString(), ['Overall', (a) => `**${overall(b, a).toFixed(0)}**`]));
  const all = pairs(b).map(([a, o]) => openingsToWin(b, a, o));
  const out_ = pairs(b).filter(([a, o]) => !inBand(openingsToWin(b, a, o)));
  out.push('', '### Openings to win a round', '');
  out.push(
    `The column fighter's health over the average damage of the row fighter's openings on them that hit (an opening is a combo; a hit on its own counts as one): how many the row fighter needs to win a round. The aim is ${OPENINGS_BAND[0]} to ${OPENINGS_BAND[1]} for every pair; outside it is in bold. In brackets, the same over openings carried past one hit. *Needs*: the row fighter's average; *gives*: the average needed against them. Pairs run ${Math.min(...all).toFixed(1)} to ${Math.max(...all).toFixed(1)}; ${out_.length} of ${all.length} are outside the band.`,
    '',
  );
  out.push(
    ...grid(
      b,
      (a, o) => {
        const x = openingsToWin(b, a, o);
        const s = `${x.toFixed(1)} (${openingsToWin(b, a, o, true).toFixed(1)})`;
        return inBand(x) ? s : `**${s}**`;
      },
      ['Health · needs · gives · average opening', (a) => {
        const f = fighterOpenings(b, a);
        const dmg = others(b, a).reduce((s, o) => s + openingDamage(b, a, o), 0) / (b.ids.length - 1);
        return `${fighterData(a).health} · ${f.needs.toFixed(1)} · ${f.gives.toFixed(1)} · ${dmg.toFixed(0)}`;
      }],
    ),
  );
  out.push('', '### Comebacks', '');
  out.push(`Of the rounds where someone fell under ${TD_HEALTH_PCT}% health, ${pct(b.comebacks, b.lowRounds)}% were won by someone who had (${b.comebacks} of ${b.lowRounds}). The loser of round 1 went on to win ${pct(b.turnarounds, b.decidedFirstRounds)}% of the matches (${b.turnarounds} of ${b.decidedFirstRounds}).`, '');
  out.push('### Time-outs and round length by matchup', '', 'Per pair, both sides together: the share of rounds that went to time, and (in brackets) the average round in seconds.', '');
  out.push(
    ...grid(b, (a, o) => {
      const k = pairKey(b.ids, a, o);
      return `${pct(b.pairTimeouts[k] ?? 0, b.pairRounds[k])} (${((b.pairSteps[k] ?? 0) / b.pairRounds[k] / STEPS_PER_SECOND).toFixed(0)})`;
    }, ['Mirror', (a) => {
      const k = pairKey(b.ids, a, a);
      return `${pct(b.pairTimeouts[k] ?? 0, b.pairRounds[k])} (${((b.pairSteps[k] ?? 0) / b.pairRounds[k] / STEPS_PER_SECOND).toFixed(0)})`;
    }]),
  );
  out.push('', '### Range', '', `The share of each fighter's fighting time at each distance between the two (centre to centre): ${RANGES.map(([r, hi], k) => `${r} ${hi === Infinity ? `over ${RANGES[k - 1][1]}` : `under ${hi}`} m`).join(', ')}.`, '');
  out.push(`| | ${RANGES.map(([r]) => r).join(' | ')} |`, `| --- | ${RANGES.map(() => '---').join(' | ')} |`);
  for (const a of b.ids) {
    const t = b.ranges[a].reduce((s, x) => s + x, 0);
    out.push(`| ${name(a)} | ${b.ranges[a].map((x) => pct(x, t)).join(' | ')} |`);
  }
  out.push('', '### Combos', '');
  const hist = [1, 2, 3, 4, 5, 6, 8, 10].map((n, k, all) => {
    const hi = all[k + 1] ?? Infinity;
    const c = b.combos.filter((x) => x >= n && x < hi).length;
    return `${hi === Infinity ? `${n}+` : hi - n > 1 ? `${n}–${hi - 1}` : n} hits ${pct(c, b.combos.length)}%`;
  });
  const avg = b.comboDamage.reduce((s, x) => s + x, 0) / b.comboDamage.length;
  out.push(`${b.combos.length} combos (a single hit counts as one). ${hist.join(', ')}. Average ${avg.toFixed(0)} damage; ${pct(b.comboDamage.filter((x) => x >= 250).length, b.comboDamage.length)}% do 250 or more.`, '');
  out.push('### Damage by source', '', sourceLine(b), '');
  out.push('### Mechanics, per round', '', MECHANICS.map((k) => `${MECHANIC_LABEL[k] ?? k} ${(b.mechanics[k] / b.rounds).toFixed(2)}`).join(' · '), '');
  out.push('### What each fighter lands', '', `Each fighter's five most damaging moves, as a share of all the damage they did (hits and times blocked in brackets). A move over ${ONE_MOVE_SHARE}% is marked: the fighter may be one move.`, '');
  for (const id of b.ids) {
    const rows = Object.entries(b.moves[id]).filter(([mv]) => mv === 'td' || mv in fighterData(id).moves);
    const dmg = rows.reduce((s, [, r]) => s + r.damage, 0);
    const top = rows
      .sort((x, y) => y[1].damage - x[1].damage)
      .slice(0, 5)
      .map(([mv, r]) => {
        const share = (100 * r.damage) / dmg;
        const label = mv === 'td' ? 'Technical Difficulties' : moveData(id, mv).name;
        return `${share > ONE_MOVE_SHARE ? '**' : ''}${label} ${share.toFixed(0)}%${share > ONE_MOVE_SHARE ? '**' : ''} (${r.hits}/${r.blocks})`;
      });
    out.push(`- **${name(id)}:** ${top.join(' · ')}`);
  }
  out.push('');
  return out.join('\n');
}

function sourceLine(b: Bench): string {
  const total = SOURCES.reduce((s, k) => s + b.source[k], 0);
  return SOURCES.map((k) => `${k} ${pct(b.source[k], total)}%`).join(' · ');
}

/** The first hit's bonus weighed: the same seeds with a bar, half a bar and nothing. */
function firstHitReport(runs: [number, Bench][]): string {
  const out = ['## The first hit\'s worth', '', `The hard bench again on the same seeds with the first hit worth other amounts of meter (the game uses ${FIRST_HIT_METER / BAR} bar${FIRST_HIT_METER === BAR ? '' : 's'}). The aim: the smallest bonus that keeps the average round inside ${ROUND_SECONDS[0]} to ${ROUND_SECONDS[1]} seconds (and the bench passing).`, ''];
  out.push('| First hit | Average round, s | Time-outs | First hit wins the round | Cut Away a round | Furthest from even |', '| --- | --- | --- | --- | --- | --- |');
  for (const [meter, b] of runs) out.push(`| ${meter / BAR} bar | ${seconds(b).toFixed(1)} | ${pct(b.timeouts, b.rounds)}% | ${pct(b.firstHitWins, b.firstHitRounds)}% | ${(b.mechanics.cutAway / b.rounds).toFixed(2)} | ${worst(b, 3)} |`);
  out.push('');
  return out.join('\n');
}

/** The hard bench under LIVE BROADCAST rules (three segments, hazards on) against its studio result. */
function liveReport(live: Bench, studio: Bench): string {
  const total = SOURCES.reduce((s, k) => s + live.source[k], 0);
  const shift = pairs(live).filter(([a, o]) => a < o).map(([a, o]) => [a, o, winPct(live, a, o) - winPct(studio, a, o)] as const);
  const far = shift.filter(([, , d]) => Math.abs(d) > LIVE_SHIFT).sort((x, y) => Math.abs(y[2]) - Math.abs(x[2]));
  const mean = shift.reduce((s, [, , d]) => s + Math.abs(d), 0) / shift.length;
  const out = ['## Under LIVE BROADCAST rules', ''];
  out.push(`The hard bench again with the segments changing each round and the hazards on. ${live.rounds} rounds; average round ${seconds(live).toFixed(1)} s; ${pct(live.timeouts, live.rounds)}% time out; the first hit wins the round ${pct(live.firstHitWins, live.firstHitRounds)}% of the time. Hazards did ${pct(live.source.hazards, total)}% of the damage and props ${pct(live.source.props, total)}% (props are in studio rules too: ${pct(studio.source.props, SOURCES.reduce((s, k) => s + studio.source[k], 0))}% there).`, '');
  out.push(`A matchup moves ${mean.toFixed(1)} points from its studio result on average; ${far.length ? `further than ${LIVE_SHIFT}: ${far.map(([a, o, d]) => `${short(a)} against ${short(o)} ${d > 0 ? '+' : ''}${d.toFixed(0)}`).join(', ')}` : `none moves further than ${LIVE_SHIFT}`}. At ${seeds(live)} seeds a pair, a few points either way is noise.`, '');
  out.push('### Win rates, live', '', 'As in studio rules, with the change from the studio result in brackets.', '');
  out.push(...grid(live, (a, o) => {
    const d = Math.round(winPct(live, a, o) - winPct(studio, a, o));
    return `${Math.round(winPct(live, a, o))} (${d > 0 ? '+' : ''}${d})`;
  }, ['Overall', (a) => `**${overall(live, a).toFixed(0)}**`]));
  out.push('', '### Damage by source, live', '', sourceLine(live), '');
  return out.join('\n');
}

const seeds = (b: Bench) => b.played[b.ids[0]][b.ids[1]] / 2;

/** The rarer mechanics by CPU level, beside how often the CPU tried them. */
function levelReport(byLevel: Bench[]): string {
  const out = ['## The rarer mechanics by CPU level', '', `Per round, at every CPU level (easy and normal over ${LEVEL_SEEDS} seeds a pair). Beside each, how often it was tried: for a reversal, moves started straight off the floor; for a guard crush, guard-crushing moves started; for a counter's read, counter moves (Teleprompter) started; for a counter hit, its share of the strikes that hit.`, ''];
  out.push(`| | ${byLevel.map((b) => b.level).join(' | ')} |`, `| --- | ${byLevel.map(() => '---').join(' | ')} |`);
  const per = (b: Bench, n: number) => (n / b.rounds).toFixed(2);
  const row = (label: string, f: (b: Bench) => string) => out.push(`| ${label} | ${byLevel.map(f).join(' | ')} |`);
  row('counter hit (share of strikes)', (b) => `${per(b, b.mechanics.counterHit)} (${pct(b.mechanics.counterHit, b.tries.strikes)}%)`);
  row('reversal (tried)', (b) => `${per(b, b.mechanics.reversal)} (${per(b, b.tries.reversal)})`);
  row('guard crush (tried)', (b) => `${per(b, b.mechanics.guardCrush)} (${per(b, b.tries.guardCrush)})`);
  row('counter, a read (tried)', (b) => `${per(b, b.mechanics.counter)} (${per(b, b.tries.counter)})`);
  row('Cut Away', (b) => per(b, b.mechanics.cutAway));
  row('Technical Difficulties hit', (b) => per(b, b.mechanics.superHit));
  row('punish', (b) => per(b, b.mechanics.punish));
  row('throw tech', (b) => per(b, b.mechanics.throwTech));
  out.push('');
  return out.join('\n');
}

describe.skipIf(!RUN)('the balance bench (npm run matchups)', () => {
  const benches: Bench[] = [];
  it('plays every pair at every level and writes docs/MATCHUPS.md', () => {
    for (const level of LEVELS) benches.push(bench({ level, seeds: SEEDS }));
    const hard = benches[0];
    const firstHit: [number, Bench][] = [BAR, BAR / 2, 0].map((meter) => [meter, meter === FIRST_HIT_METER ? hard : bench({ level: 'hard', seeds: SEEDS, firstHitMeter: meter })]);
    const live = bench({ level: 'hard', seeds: SEEDS, studio: false });
    const byLevel = [bench({ level: 'easy', seeds: LEVEL_SEEDS }), bench({ level: 'normal', seeds: LEVEL_SEEDS }), ...benches];
    writeFileSync(
      'docs/MATCHUPS.md',
      `# SIGN-OFF — matchups\n\nWritten by \`npm run matchups\` (tests/matchups.test.ts, tests/bench.ts); do not edit by hand.\n\nThe CPU against itself: every ordered pair of fighters, ${SEEDS} seeds each, studio rules (one segment, no hazards), the stages in turn, with ${ROUND_FRAMES / STEPS_PER_SECOND}-second rounds. These are the CPU's results, not the truth about a matchup, but they show a fighter falling off a cliff after a change. The run fails on a matchup worse than ${WORST_MATCHUP}:${100 - WORST_MATCHUP}, an average round outside ${ROUND_SECONDS[0]} to ${ROUND_SECONDS[1]} seconds, or more than ${MOST_TIMEOUTS}% of rounds timing out.\n\n${benches.map((b) => report(b, SEEDS)).join('\n')}\n${firstHitReport(firstHit)}\n${liveReport(live, hard)}\n${levelReport(byLevel)}`,
    );
  }, 3_600_000);

  it(`no matchup is worse than ${WORST_MATCHUP}:${100 - WORST_MATCHUP}`, () => {
    for (const b of benches) {
      const bad = b.ids.flatMap((a) => b.ids.filter((o) => winPct(b, a, o) < WORST_MATCHUP).map((o) => `${b.level}: ${a} ${winPct(b, a, o).toFixed(0)}% against ${o}`));
      expect(bad).toEqual([]);
    }
  });

  it(`rounds last ${ROUND_SECONDS[0]} to ${ROUND_SECONDS[1]} seconds on average, and few time out`, () => {
    for (const b of benches) {
      const secs = seconds(b);
      expect(secs, b.level).toBeGreaterThanOrEqual(ROUND_SECONDS[0]);
      expect(secs, b.level).toBeLessThanOrEqual(ROUND_SECONDS[1]);
      expect((100 * b.timeouts) / b.rounds, b.level).toBeLessThanOrEqual(MOST_TIMEOUTS);
    }
  });
});
