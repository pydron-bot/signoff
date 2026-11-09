// The combo search: for each fighter, the most damaging unbroken combo the
// simulation allows from a point-blank hit, with no meter, one bar and three
// bars, found by a beam search over every normal, special and boosted special
// at every useful timing. It fails if any fighter goes over the damage
// ceilings, and writes the routes to docs/COMBOS.md. Slow (a few minutes), so
// it runs only on request: `npm run combos`. `npm run combos:guides` writes
// the move list's combo guides instead (src/game/comboRoutes.ts).
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAMAGE_CEILING, GUIDE_DUMMY as DUMMY, guideStart, pressBits, runGuide, type ComboGuide } from '../src/game/comboGuides';
import { BAR, FIGHTERS, saveMatch, step, type MatchState, type SimEvent } from '../src/sim';

const RUN = process.env.COMBOS === '1';
const GUIDES = process.env.GUIDES === '1';
const CEILING = DAMAGE_CEILING;

const BUTTONS = ['FP', 'BP', 'FK', 'BK'] as const;
/** Presses relative to the moment chosen: [frames later, press] (see pressBits). */
type Press = [number, string][];
const DELAYS = [0, 2, 4, 6, 8, 10, 12, 14, 17, 20, 24, 28, 33, 40];
const BEAM = 12;
const DEPTH = 30;

function actions(id: string, meter: boolean): Press[] {
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
      if (e.combo !== n.combo + 1) return null;
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

/** For the human-safe search: every press must also work this many frames early and late. */
const SLACK = 3;

/**
 * The best route. With `safe`, only presses a person can make reliably: the
 * same hit must follow when the press comes SLACK frames early or late.
 */
function best(id: string, bars: number, safe = false, pool: Node[] = [], openers?: readonly string[]): Node {
  let frontier: Node[] = [{ m: start(id, bars), dmg: 0, moves: [], inputs: [], t: 0, combo: 0 }];
  let top = frontier[0];
  for (let d = 0; d < DEPTH && frontier.length; d++) {
    const kids = new Map<string, Node>();
    for (const n of frontier) {
      const acts = d === 0 && openers ? openers.map((p): Press => [[0, p]]) : actions(id, n.m.fighters[0].meter >= BAR && bars > 0);
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
    frontier = [...kids.values()].sort((x, y) => y.dmg + y.m.fighters[0].meter * 0.08 - (x.dmg + x.m.fighters[0].meter * 0.08)).slice(0, BEAM);
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
    if (k === 0 || (p === 'SP' && t - inputs[k - 1][0] <= 3)) return true;
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
  const sorted = pool.sort((x, y) => y.dmg - x.dmg);
  let first: Node | null = null;
  let checked = 0;
  for (const n of sorted.slice(0, 4000)) {
    // The same moves at other timings are other candidates (one may be forgiving where another isn't), a few of each.
    const key = n.inputs.map(([t, p]) => `${t}${p}`).join('|');
    const moves = n.moves.join('|');
    if (seen.has(key) || (timings.get(moves) ?? 0) >= 4 || n.moves.length < minHits || (keep && !keep(n))) continue;
    if (first && n.dmg < first.dmg * 0.8) break;
    seen.add(key);
    timings.set(moves, (timings.get(moves) ?? 0) + 1);
    if (++checked > 300) break;
    const inputs = prune(id, bars, n.inputs);
    if (!forgiving(id, bars, inputs)) continue;
    const found = { ...n, inputs };
    if (!avoid.has(n.moves[n.moves.length - 1])) return found;
    first ??= found;
  }
  return first;
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
  const health = FIGHTERS[DUMMY].health;
  const rows: string[] = [];
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
        // The search is a beam, not every route, so either can come out ahead.
        expect((Math.max(b.dmg, h.dmg) * 100) / health).toBeLessThanOrEqual(CEILING[bars]);
      }, 120_000);
    }
  }
  it('writes docs/COMBOS.md', () => {
    writeFileSync(
      'docs/COMBOS.md',
      `# SIGN-OFF — best combos\n\nWritten by \`npm run combos\` (tests/combo-search.test.ts); do not edit by hand.\n\nThe most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against ${FIGHTERS[DUMMY].name} (${health} health), with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener still gives the whole combo 2 frames early or late, everything after it moved too, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: ${CEILING[0]}% with no meter, ${CEILING[1]}% with one bar, ${CEILING[3]}% with three.\n\n| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`,
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
    it(`${f.name}: at least five guides, each its own way in or out`, () => {
      const o = openers(f.id);
      const starts = [o.jab, o.low, ...(o.overhead ? [o.overhead] : []), o.punish];
      const plan: { name: string; bars: number; from: string[] }[] = [
        { name: 'From your jab', bars: 0, from: [o.jab] },
        { name: 'From a low', bars: 0, from: [o.low] },
        ...(o.overhead ? [{ name: 'From your overhead', bars: 0, from: [o.overhead] }] : []),
        { name: 'Punish', bars: 0, from: [o.punish] },
        { name: 'One bar', bars: 1, from: starts },
        { name: 'Full meter', bars: 3, from: starts },
      ];
      const list: ComboGuide[] = (guides[f.id] = []);
      const enders = new Set<string>();
      let meterless = 0;
      let lastMetered = 0;
      for (const g of plan) {
        const pool: Node[] = [];
        best(f.id, g.bars, true, pool, g.from);
        // Meter has to buy something: a boost, more than any guide without it, and a full meter clearly more than one bar.
        const keep = g.bars ? (n: Node) => boosts(n.inputs) && n.dmg > meterless && n.dmg > lastMetered + 30 : undefined;
        // A confirm into a special (two hits) is a combo worth knowing from a low or an overhead.
        const h = humanRoute(f.id, g.bars, pool, enders, keep, 2);
        if (!h) continue;
        enders.add(h.moves[h.moves.length - 1]);
        if (g.bars) lastMetered = h.dmg;
        else meterless = Math.max(meterless, h.dmg);
        list.push({ name: g.name, bars: g.bars, presses: h.inputs });
      }
      expect(list.length).toBeGreaterThanOrEqual(5);
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
