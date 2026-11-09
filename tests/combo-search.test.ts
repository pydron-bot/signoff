// The combo search: for each fighter, the most damaging unbroken combo the
// simulation allows from a point-blank hit, with no meter, one bar and three
// bars, found by a beam search over every normal, special and boosted special
// at every useful timing. It fails if any fighter goes over the damage
// ceilings, and writes the routes to docs/COMBOS.md. Slow (about a minute), so
// it runs only on request: `npm run combos`.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BAR, FIGHTERS, Input, createMatch, saveMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';

const { DOWN, LEFT, RIGHT, SPECIAL, FP, BP, FK, BK } = Input;
const RUN = process.env.COMBOS === '1';
/** Everyone is measured against the same opponent. */
const DUMMY = 'rox';
/** The most a combo may take, as % of the dummy's health: no meter, one bar, three bars. */
export const CEILING = { 0: 33, 1: 42, 3: 52 } as const;

const BUTTONS = { FP, BP, FK, BK } as const;
/** Presses relative to the moment chosen: [frames later, bits]. */
type Press = (fwd: number, back: number) => [number, number][];
const DELAYS = [0, 2, 4, 6, 8, 10, 12, 14, 17, 20, 24, 28, 33, 40];
const BEAM = 12;
const DEPTH = 30;

function actions(id: string, meter: boolean): Press[] {
  const f = FIGHTERS[id];
  const out: Press[] = [];
  for (const [b, bit] of Object.entries(BUTTONS)) {
    out.push(() => [[0, bit]], () => [[0, DOWN | bit]]);
    if (b in f.normals.f) out.push((fw) => [[0, fw | bit]]);
    if (b in f.normals.b) out.push((_fw, bk) => [[0, bk | bit]]);
  }
  for (const [d, mv] of Object.entries(f.specials)) {
    const dir = (fw: number, bk: number) => (d === 'f' ? fw : d === 'b' ? bk : d === 'd' ? DOWN : 0);
    out.push((fw, bk) => [[0, dir(fw, bk) | SPECIAL]]);
    if (meter && f.moves[mv as string]?.boost) out.push((fw, bk) => [[0, dir(fw, bk) | SPECIAL], [3, SPECIAL]]);
  }
  return out;
}

interface Node {
  m: MatchState;
  dmg: number;
  moves: string[];
  /** Every press so far: [frame from the start, bits]. */
  inputs: [number, number][];
  t: number;
  combo: number;
}

/** Plays one press from a node: the child at the next hit of the combo, or null if the combo ended. */
function expand(n: Node, press: Press, delay: number): Node | null {
  const m = saveMatch(n.m);
  const a = m.fighters[0];
  const fw = a.facing === 1 ? RIGHT : LEFT;
  const bk = a.facing === 1 ? LEFT : RIGHT;
  const at = new Map(press(fw, bk).map(([o, bits]) => [delay + o, bits]));
  const inputs: [number, number][] = [...n.inputs, ...[...at].map(([t, bits]): [number, number] => [n.t + t, bits])];
  const ev: SimEvent[] = [];
  for (let t = 0; t < 140; t++) {
    ev.length = 0;
    step(m, at.get(t) ?? 0, 0, ev);
    for (const e of ev) {
      if (e.type !== 'hit' || e.attacker !== 0) continue;
      if (e.combo !== n.combo + 1) return null;
      if (t >= delay) return { m, dmg: n.dmg + e.damage, moves: [...n.moves, e.move], inputs, t: n.t + t + 1, combo: e.combo };
    }
    if (t > delay + 4 && n.combo > 0 && m.fighters[1].combo === 0) return null;
  }
  return null;
}

function start(id: string, bars: number): MatchState {
  const m = createMatch({ p1: id, p2: DUMMY, stage: 'weather', seed: 1, studio: true });
  const ev: SimEvent[] = [];
  while (m.phase !== 'fight') step(m, 0, 0, ev);
  const [a, b] = m.fighters;
  a.x = fx(-0.4);
  b.x = fx(0.4);
  a.meter = bars * BAR;
  // No bar for the first hit, and no K.O. to cut a combo short.
  m.firstHit = true;
  b.health = b.maxHealth = 1_000_000;
  return m;
}

/** For the human-safe search: every press must also work this many frames early and late. */
const SLACK = 2;

/**
 * The best route. With `safe`, only presses a person can make reliably: the
 * same hit must follow when the press comes SLACK frames early or late.
 */
function best(id: string, bars: number, safe = false): Node {
  let frontier: Node[] = [{ m: start(id, bars), dmg: 0, moves: [], inputs: [], t: 0, combo: 0 }];
  let top = frontier[0];
  for (let d = 0; d < DEPTH && frontier.length; d++) {
    const kids = new Map<string, Node>();
    for (const n of frontier) {
      for (const press of actions(id, n.m.fighters[0].meter >= BAR && bars > 0)) {
        for (const delay of d === 0 ? [0] : DELAYS) {
          const c = expand(n, press, delay);
          if (!c) continue;
          if (safe && d > 0) {
            const same = (x: Node | null) => x !== null && x.moves.at(-1) === c.moves.at(-1);
            if (delay < SLACK || !same(expand(n, press, delay - SLACK)) || !same(expand(n, press, delay + SLACK))) continue;
          }
          if (c.dmg > top.dmg) top = c;
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

/** Plays presses from the start; the hits of the combo that follows. */
function replay(id: string, bars: number, inputs: readonly [number, number][]): number {
  const m = start(id, bars);
  const at = new Map<number, number>();
  for (const [t, bits] of inputs) at.set(t, (at.get(t) ?? 0) | bits);
  const ev: SimEvent[] = [];
  let hits = 0;
  for (let t = 0; t < 900; t++) {
    ev.length = 0;
    step(m, at.get(t) ?? 0, 0, ev);
    for (const e of ev) if (e.type === 'hit' && e.attacker === 0) hits = e.combo === hits + 1 ? hits + 1 : -1000;
  }
  return hits;
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
    if (prev && bits === SPECIAL && t - b.inputs[prev[0]][0] <= 3) prev.push(k);
    else groups.push([k]);
  });
  groups.forEach((g, gi) => {
    // The opener is the anchor: everything else is timed from it.
    if (gi === 0) return;
    const ok = (shift: number) => replay(id, bars, b.inputs.map(([t, bits], k): [number, number] => [g.includes(k) ? t + shift : t, bits])) >= want;
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
        const h = best(f.id, bars, true);
        row(b, 'frame-perfect');
        row(h, 'human');
        // The search is a beam, not every route, so either can come out ahead.
        expect((Math.max(b.dmg, h.dmg) * 100) / health).toBeLessThanOrEqual(CEILING[bars]);
      }, 120_000);
    }
  }
  it('writes docs/COMBOS.md', () => {
    writeFileSync(
      'docs/COMBOS.md',
      `# SIGN-OFF — best combos\n\nWritten by \`npm run combos\` (tests/combo-search.test.ts); do not edit by hand.\n\nThe most damaging unbroken combo the simulation allows for each fighter, from a point-blank hit midscreen against ${FIGHTERS[DUMMY].name} (${health} health), with no meter, one bar and three bars. Found by a beam search over every normal, command normal, special and boosted special at every useful timing; the first-hit bonus bar is left out. Each is searched twice: *frame-perfect* (any timing) and *human* (every press after the opener must also give the same hit 2 frames early and 2 late, on top of the 8-frame input buffer). *Tightest press* is the narrowest window, in frames, of any press after the opener: 1–2 is frame-perfect play, 5 or more is comfortable. The ceilings apply to both: ${CEILING[0]}% with no meter, ${CEILING[1]}% with one bar, ${CEILING[3]}% with three.\n\n| Fighter | Bars | Search | Hits | Damage | Tightest press, frames | Route (×n: hits of one move) |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`,
    );
  });
});
