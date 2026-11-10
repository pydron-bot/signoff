// The combo search: for each fighter, the most damaging unbroken combo the
// simulation allows from a point-blank hit, with no meter, one bar and three
// bars, found by a beam search over every normal, special and boosted special
// at every useful timing. It fails if any fighter goes over the damage
// ceilings, and writes the routes to docs/COMBOS.md. Slow (a few minutes), so
// it runs only on request: `npm run combos`. `npm run combos:guides` writes
// the move list's combo guides instead (src/game/comboRoutes.ts).
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAMAGE_CEILING, GUIDE_DUMMY as DUMMY, GUIDE_HEALTH, guideStart, isJump, pressBits, runGuide, type ComboGuide } from '../src/game/comboGuides';
import { BAR, FIGHTERS, saveMatch, step, type MatchState, type SimEvent } from '../src/sim';

const RUN = process.env.COMBOS === '1';
const GUIDES = process.env.GUIDES === '1';
const CEILING = DAMAGE_CEILING;
/** The floor beside the ceilings: each bar spent (none to one, one to three) must add at least this much to a fighter's best human combo, in %. */
export const METER_FLOOR = 4;
/** Fighters excused from the floor, with the reason. */
const METER_EXEMPT: Readonly<Record<string, string>> = {};

const BUTTONS = ['FP', 'BP', 'FK', 'BK'] as const;
/** Presses relative to the moment chosen: [frames later, press] (see pressBits). */
type Press = [number, string][];
const DELAYS = [0, 2, 4, 6, 8, 10, 12, 14, 17, 20, 24, 28, 33, 40];
/** Wider for the ceilings (every route), narrower for the guides (forgiving ones, which are plenty). */
const BEAM = RUN ? 24 : 20;
const DEPTH = 30;

function actions(id: string, meter: boolean, air = RUN): Press[] {
  const f = FIGHTERS[id];
  const out: Press[] = [];
  for (const b of BUTTONS) {
    out.push([[0, b]], [[0, `d ${b}`]]);
    if (b in f.normals.f) out.push([[0, `f ${b}`]]);
    if (b in f.normals.b) out.push([[0, `b ${b}`]]);
  }
  for (const [d, mv] of Object.entries(f.specials)) {
    const sp = d === 'n' ? 'SP' : `${d} SP`;
    out.push([[0, sp]]);
    if (meter && f.moves[mv as string]?.boost) out.push([[0, sp], [3, 'SP']]);
  }
  // The ceilings also cover the air: a jump cancel (or a jump) and an air normal or an air special on the way.
  // Only the air guides take to the air; the others stay on the ground.
  if (air) {
    for (const k of [6, 10, 14]) {
      for (const up of RUN ? ['u f'] : ['u', 'u f']) {
        for (const b of BUTTONS) out.push([[0, up], [k, b]]);
        out.push([[0, up], [k, 'SP']], [[0, up], [k, 'd SP']]);
        if (meter) out.push([[0, up], [k, 'SP'], [k + 3, 'SP']]);
      }
    }
  }
  return out;
}

interface Node {
  m: MatchState;
  dmg: number;
  moves: string[];
  /** Every press so far: [frame from the start, press]. */
  inputs: [number, string][];
  t: number;
  combo: number;
}

/** Plays one press from a node: the child at the next hit of the combo, or null if the combo ended. */
function expand(n: Node, press: Press, delay: number): Node | null {
  const m = saveMatch(n.m);
  const a = m.fighters[0];
  const at = new Map(press.map(([o, p]) => [delay + o, p]));
  const inputs: [number, string][] = [...n.inputs, ...[...at].map(([t, p]): [number, string] => [n.t + t, p])];
  const ev: SimEvent[] = [];
  for (let t = 0; t < 140; t++) {
    ev.length = 0;
    const p = at.get(t);
    step(m, p ? pressBits(p, a.facing) : 0, 0, ev);
    for (const e of ev) {
      if (e.type !== 'hit' || e.attacker !== 0) continue;
      // The same combo while the count rises (a jump cancel adds to it, for scaling); a new one starts again at 1.
      if (e.combo <= n.combo) return null;
      if (t >= delay) return { m, dmg: n.dmg + e.damage, moves: [...n.moves, e.move], inputs, t: n.t + t + 1, combo: e.combo };
    }
    if (t > delay + 4 && n.combo > 0 && m.fighters[1].combo === 0) return null;
  }
  return null;
}

/** The guide's start, with no K.O. to cut a combo short. */
function start(id: string, bars: number): MatchState {
  const m = guideStart(id, bars);
  m.fighters[1].health = m.fighters[1].maxHealth = 1_000_000;
  return m;
}

/** A neutral jump point blank, an air normal on the way down: the jump-in (the ceilings open with it too). */
const JUMP_INS: Press[] = BUTTONS.flatMap((b) => [12, 16, 20, 24, 28].map((k): Press => [[0, 'u'], [k, b]]));

/** For the human-safe search: every press must also work this many frames early and late. */
const SLACK = 3;

/**
 * The best route. With `safe`, only presses a person can make reliably: the
 * same hit must follow when the press comes SLACK frames early or late.
 */
function best(id: string, bars: number, safe = false, pool: Node[] = [], openers?: readonly (string | Press)[], air = RUN, prefer?: (n: Node) => boolean): Node {
  let frontier: Node[] = [{ m: start(id, bars), dmg: 0, moves: [], inputs: [], t: 0, combo: 0 }];
  let top = frontier[0];
  for (let d = 0; d < DEPTH && frontier.length; d++) {
    const kids = new Map<string, Node>();
    for (const n of frontier) {
      const acts =
        d === 0 && openers
          ? openers.map((p): Press => (typeof p === 'string' ? [[0, p]] : p))
          : d === 0 && RUN
            ? [...actions(id, bars > 0, air), ...JUMP_INS]
            : actions(id, n.m.fighters[0].meter >= BAR && bars > 0, air);
      for (const press of acts) {
        for (const delay of d === 0 ? [0] : DELAYS) {
          const c = expand(n, press, delay);
          if (!c) continue;
          if (safe && d > 0) {
            const same = (x: Node | null) => x !== null && x.moves.at(-1) === c.moves.at(-1);
            if (delay < SLACK || !same(expand(n, press, delay - SLACK)) || !same(expand(n, press, delay + SLACK))) continue;
          }
          if (c.dmg > top.dmg) top = c;
          if (safe) pool.push(c);
          const f = c.m.fighters;
          const key = `${c.moves.join('|')}#${f[0].meter}${f[1].groundBounced}${f[1].wallBounced}`;
          const prev = kids.get(key);
          if (!prev || prev.t > c.t) kids.set(key, c);
        }
      }
    }
    // A guide that has to take a certain way (into the air) keeps the routes that do ahead of the rest, though they do less.
    const score = (n: Node) => n.dmg + n.m.fighters[0].meter * 0.08 + (prefer?.(n) ? 1e6 : 0);
    frontier = [...kids.values()].sort((x, y) => score(y) - score(x)).slice(0, BEAM);
  }
  return top;
}

/** Plays presses from the start as a guide; the hits of the combo that follows (and its damage, in `dealt`), or -1 if it broke. */
function replay(id: string, bars: number, inputs: readonly [number, string][], dealt = { dmg: 0 }): number {
  const r = runGuide(id, { name: '', bars, presses: inputs });
  dealt.dmg = r.pct;
  return r.unbroken ? r.hits : -1;
}

/** Drops presses that change nothing (a button pressed while a multi-hit special plays out), last first. */
function prune(id: string, bars: number, inputs: readonly [number, string][]): [number, string][] {
  const want = { dmg: 0 };
  const hits = replay(id, bars, inputs, want);
  let out = [...inputs];
  for (let k = out.length - 1; k > 0; k--) {
    const without = out.filter((_, i) => i !== k);
    const got = { dmg: 0 };
    if (replay(id, bars, without, got) === hits && got.dmg === want.dmg) out = without;
  }
  return out;
}

/** Whether every press after the first still gives the whole combo when it, and everything after it, comes 2 frames early or late. */
function forgiving(id: string, bars: number, inputs: readonly [number, string][]): boolean {
  const hits = replay(id, bars, inputs);
  return inputs.every(([t, p], k) => {
    // A jump-in's attack is timed by eye, against the fall: it's the opener's, not a press to hold to the frame.
    if (k === 0 || (p === 'SP' && t - inputs[k - 1][0] <= 3) || (k === 1 && isJump(inputs[0][1]))) return true;
    return [-2, 2].every((d) => replay(id, bars, inputs.map(([u, q], i): [number, string] => [i >= k ? u + d : u, q])) === hits);
  });
}

/**
 * The most damaging route in the pool that is forgiving, its idle presses
 * dropped. With `avoid`, one ending on another move is preferred while it
 * does at least 80% of the best.
 */
function humanRoute(id: string, bars: number, pool: Node[], avoid: ReadonlySet<string> = new Set(), keep?: (n: Node) => boolean, minHits = 3): Node | null {
  const seen = new Set<string>();
  const timings = new Map<string, number>();
  // Only routes that are the guide's kind are candidates (the air ones do less, and would sink below the rest).
  const sorted = (keep ? pool.filter(keep) : pool).sort((x, y) => y.dmg - x.dmg);
  let first: Node | null = null;
  let checked = 0;
  for (const n of sorted.slice(0, RUN ? 8000 : 4000)) {
    // The same moves at other timings are other candidates (one may be forgiving where another isn't), a few of each.
    const key = n.inputs.map(([t, p]) => `${t}${p}`).join('|');
    const moves = n.moves.join('|');
    if (seen.has(key) || (timings.get(moves) ?? 0) >= 4 || n.moves.length < minHits || (keep && !keep(n))) continue;
    if (first && n.dmg < first.dmg * 0.8) break;
    seen.add(key);
    timings.set(moves, (timings.get(moves) ?? 0) + 1);
    // The ceilings' human routes look further: falling back to an unforgiving one would misread the meter floor.
    if (++checked > (RUN ? 900 : 300)) break;
    const inputs = prune(id, bars, n.inputs);
    if (!forgiving(id, bars, inputs)) continue;
    const found = { ...n, inputs };
    if (!avoid.has(n.moves[n.moves.length - 1])) return found;
    first ??= found;
  }
  return first;
}

/** A special's follow-up: a special that another special chains into. */
function isFollowUp(fighter: string, id: string): boolean {
  return Object.values(FIGHTERS[fighter].moves).some((mv) => mv.kind === 'special' && Object.values(mv.chain).includes(id));
}

/** A boost: Special again just after one. */
const boosts = (inputs: readonly [number, string][]) => inputs.some(([t, p], k) => k > 0 && p === 'SP' && t - inputs[k - 1][0] <= 3);

/** The press for each way into a combo: the jab, the crouching low, the command overhead, and the launcher as a punish. */
function openers(id: string): { jab: string; low: string; overhead: string | null; punish: string } {
  const f = FIGHTERS[id];
  let overhead: string | null = null;
  for (const side of ['f', 'b'] as const) {
    for (const [btn, mv] of Object.entries(f.normals[side])) {
      if (!overhead && mv && f.moves[mv].hits[0]?.height === 'overhead') overhead = `${side} ${btn}`;
    }
  }
  return { jab: 'FP', low: 'd FK', overhead, punish: 'd BP' };
}


/**
 * How forgiving each press is: the frames it can move (earlier or later,
 * the rest staying put) and still give the whole combo. Returns the
 * tightest press after the opener: its window and which press it is. The
 * 8-frame input buffer is part of this, so a wide window is easy for a person.
 */
function tightest(id: string, bars: number, b: Node): { frames: number; at: number } {
  const want = b.moves.length;
  let worst = { frames: Infinity, at: 0 };
  // A boost's second Special press moves with its first.
  const groups: number[][] = [];
  b.inputs.forEach(([t, bits], k) => {
    const prev = groups.at(-1);
    if (prev && bits === 'SP' && t - b.inputs[prev[0]][0] <= 3) prev.push(k);
    else groups.push([k]);
  });
  groups.forEach((g, gi) => {
    // The opener is the anchor: everything else is timed from it.
    if (gi === 0) return;
    const ok = (shift: number) => replay(id, bars, b.inputs.map(([t, p], k): [number, string] => [g.includes(k) ? t + shift : t, p])) >= want;
    let lo = 0;
    while (lo > -20 && ok(lo - 1)) lo--;
    let hi = 0;
    while (hi < 20 && ok(hi + 1)) hi++;
    if (hi - lo + 1 < worst.frames) worst = { frames: hi - lo + 1, at: gi };
  });
  return worst;
}

/** A route as the move list writes it: crouching ↓, forward →, back ←; a multi-hit move once with its hits. */
function route(moves: readonly string[]): string {
  const dirs: Record<string, string> = { s: '', c: '↓', f: '→', b: '←' };
  const parts: string[] = [];
  for (let k = 0; k < moves.length; ) {
    let n = 1;
    while (moves[k + n] === moves[k]) n++;
    const id = moves[k];
    const name = /^[scfb]\./.test(id) ? dirs[id[0]] + id.slice(2) : id;
    parts.push(n > 1 ? `${name} ×${n}` : name);
    k += n;
  }
  return parts.join(' › ');
}

const FIGHTER_ORDER = Object.keys(FIGHTERS);

describe.skipIf(!RUN)('combo search (npm run combos)', () => {
  const health = GUIDE_HEALTH;
  const rows: string[] = [];
  /** Each fighter's best human combo by bars, in %. */
  const humanPct: Record<string, Record<number, number>> = {};
  for (const f of Object.values(FIGHTERS)) {
    for (const bars of [0, 1, 3] as const) {
      it(`${f.name}, ${bars} bar${bars === 1 ? '' : 's'}: under ${CEILING[bars]}%`, () => {
        const row = (b: Node, label: string) => {
          const w = tightest(f.id, bars, b);
          rows.push(`| ${f.name} | ${bars} | ${label} | ${b.moves.length} | ${((b.dmg * 100) / health).toFixed(1)}% | ${w.frames === Infinity ? '–' : w.frames} | ${route(b.moves)} |`);
        };
        const b = best(f.id, bars);
        const pool: Node[] = [];
        const top = best(f.id, bars, true, pool);
        // The human route: forgiving at every press.
        const human = humanRoute(f.id, bars, pool);
        const h = human ?? top;
        row(b, 'frame-perfect');
        row(h, human ? 'human' : 'human (none forgiving)');
        // The floor compares routes a person can land: an unforgiving fallback would misread it.
        if (human) (humanPct[f.id] ??= {})[bars] = (h.dmg * 100) / health;
        // The search is a beam, not every route, so either can come out ahead.
        expect((Math.max(b.dmg, h.dmg) * 100) / health).toBeLessThanOrEqual(CEILING[bars]);
      }, 120_000);
    }
  }
  it(`each bar buys at least ${METER_FLOOR}% more (the meter floor)`, () => {
    const short: string[] = [];
    for (const id of FIGHTER_ORDER) {
      const p = humanPct[id];
      if (!p || id in METER_EXEMPT) continue;
      // The search is a beam: three bars can't do worse than one, as the one-bar route is still there.
      const three = Math.max(p[3] ?? 0, p[1] ?? 0);
      if (p[0] !== undefined && p[1] !== undefined && p[1] - p[0] < METER_FLOOR) short.push(`${id}: one bar adds ${(p[1] - p[0]).toFixed(1)}%`);
      if (p[1] !== undefined && three - p[1] < METER_FLOOR) short.push(`${id}: three bars add ${(three - p[1]).toFixed(1)}% to one`);
    }
    expect(short).toEqual([]);
  });

  it('writes docs/COMBOS.md', () => {
    writeFileSync(
      'docs/COMBOS.md',
      `# SIGN-OFF — best combos\n\nWritten by \`npm run combos\` (tests/combo-search.test.ts); do not edit by hand.\n\nThe most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against ${FIGHTERS[DUMMY].name}, measured as a share of ${health} health, with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: ${CEILING[0]}% with no meter, ${CEILING[1]}% with one bar, ${CEILING[3]}% with three. The floor applies to the human routes: each bar spent, from none to one and from one to three, must add at least ${METER_FLOOR}%${Object.keys(METER_EXEMPT).length ? ` (excused: ${Object.entries(METER_EXEMPT).map(([id, why]) => `${FIGHTERS[id].name}, ${why}`).join('; ')})` : ''}.\n\n| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`,
    );
  });
});

/**
 * The move list's guides, for each fighter: the best forgiving combo from
 * each way in (jab, low, overhead, a punish with the launcher), then one bar
 * and a full meter from any of those (kept only if they boost and do clearly
 * more). Each prefers a finisher the ones before it haven't used.
 */
describe.skipIf(!GUIDES)('combo guides (npm run combos:guides)', () => {
  const guides: Record<string, ComboGuide[]> = {};
  for (const f of Object.values(FIGHTERS)) {
    it(`${f.name}: at least five guides, each its own way in or out, and the air`, () => {
      const o = openers(f.id);
      const starts = [o.jab, o.low, ...(o.overhead ? [o.overhead] : []), o.punish];
      const f0 = FIGHTERS[f.id];
      const jumped = (n: Node) => n.inputs.some(([, p]) => p.startsWith('u'));
      const aloft = (n: Node) => n.moves.some((id) => f0.moves[id].stance === 'air');
      const followUp = (n: Node) => n.moves.some((id) => isFollowUp(f.id, id));
      const plan: { name: string; bars: number; from: (string | Press)[]; air?: boolean; want?: (n: Node) => boolean; prefer?: (n: Node) => boolean }[] = [
        { name: 'From your jab', bars: 0, from: [o.jab] },
        { name: 'From a low', bars: 0, from: [o.low] },
        ...(o.overhead ? [{ name: 'From your overhead', bars: 0, from: [o.overhead] }] : []),
        { name: 'Punish', bars: 0, from: [o.punish] },
        { name: 'One bar', bars: 1, from: starts },
        { name: 'Full meter', bars: 3, from: starts },
        // The air: a jump cancel off the launcher into an air string, a jump-in, and a bar spent up there.
        { name: 'Into the air', bars: 0, from: [o.punish], air: true, want: (n) => jumped(n) && aloft(n), prefer: jumped },
        { name: 'Jump in', bars: 0, from: JUMP_INS, air: true, want: aloft },
        { name: 'Air, one bar', bars: 1, from: [o.punish], air: true, want: (n) => jumped(n) && aloft(n) && boosts(n.inputs), prefer: jumped },
        // A special's follow-up in the middle of it.
        { name: 'Follow-up', bars: 0, from: [o.jab, o.low, o.punish], want: followUp, prefer: followUp },
      ];
      const list: ComboGuide[] = (guides[f.id] = []);
      const enders = new Set<string>();
      let meterless = 0;
      let lastMetered = 0;
      for (const g of plan) {
        const pool: Node[] = [];
        best(f.id, g.bars, true, pool, g.from, g.air ?? false, g.prefer);
        // Meter has to buy something: a boost, more than any guide without it, and a full meter clearly more than one bar.
        // The air and follow-up guides show a way to play, so they only have to be that.
        const keep = g.want ?? (g.bars ? (n: Node) => boosts(n.inputs) && n.dmg > meterless && n.dmg > lastMetered + 30 : undefined);
        // A confirm into a special (two hits) is a combo worth knowing from a low or an overhead.
        const h = humanRoute(f.id, g.bars, pool, enders, keep, 2);
        if (!h) continue;
        enders.add(h.moves[h.moves.length - 1]);
        if (!g.want) {
          if (g.bars) lastMetered = h.dmg;
          else meterless = Math.max(meterless, h.dmg);
        }
        list.push({ name: g.name, bars: g.bars, presses: h.inputs });
      }
      expect(list.length).toBeGreaterThanOrEqual(5);
      // Every fighter shows the air: a jump cancel into an air string, and a jump-in (a follow-up where one combos).
      expect(list.map((g) => g.name)).toEqual(expect.arrayContaining(['Into the air', 'Jump in']));
    }, 600_000);
  }
  it('writes src/game/comboRoutes.ts', () => {
    const press = (p: readonly [number, string]) => `[${p[0]}, '${p[1]}']`;
    const body = FIGHTER_ORDER.filter((id) => guides[id])
      .map((id) => `  ${id}: [\n${guides[id].map((g) => `    { name: '${g.name}', bars: ${g.bars}, presses: [${g.presses.map(press).join(', ')}] },`).join('\n')}\n  ],`)
      .join('\n');
    writeFileSync(
      'src/game/comboRoutes.ts',
      `// Written by \`npm run combos:guides\` (tests/combo-search.test.ts); do not edit by hand.\nimport type { ComboGuide } from './comboGuides';\n\nexport const COMBO_ROUTES: Readonly<Record<string, readonly ComboGuide[]>> = {\n${body}\n};\n`,
    );
  });
});
