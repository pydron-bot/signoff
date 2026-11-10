/**
 * The CPU's combo routes: the move list's combo guides (src/game/comboGuides.ts),
 * read at run time, sorted by what opens them, and played press by press at
 * the guide's timing from the moment the opener started. The guides were
 * timed point blank against a standing Rox, so on other bodies and at other
 * ranges some drop part way, as a person's would; the CPU lets go when it
 * sees one has.
 */
import { BAR, fighterData, moveData, step, type MoveData, type SimEvent } from '../sim';
import { fx, type Fx } from '../sim/fixed';
import { GUIDE_DUMMY, guideInput, guideStart, guides, pressBits, type ComboGuide } from '../game/comboGuides';

/** What opens a route: a standing jab, a low, an overhead, a launcher (punish), or a launcher with bars to spend. */
export type Opener = 'jab' | 'low' | 'overhead' | 'punish' | 'meter';

export interface Route {
  readonly guide: ComboGuide;
  readonly kind: Opener;
  /** The move its first press brings out. */
  readonly opener: string;
  /** The first press, as input bits for a fighter facing right (turned by `openerBits`). */
  readonly press: string;
  readonly startup: number;
  /** How far in front the opener reaches. */
  readonly reach: Fx;
  /** Damage as % of the guide dummy's health, as the guide plays it. */
  readonly pct: number;
  /** Hits, as the guide plays it. */
  readonly hits: number;
  /** The furthest apart (centre to centre, as the opener hits) it still lands every hit. */
  readonly far: Fx;
  /** The freeze the opener's hit puts on the attacker, as the guide plays it (a counter hit freezes longer). */
  readonly stop: number;
}

/** Start gaps it's tried from: point blank (as the guides are made) and further out. */
const GAPS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4].map(fx);

interface Trial {
  hits: number;
  pct: number;
  /** Centre distance as the opener hit, and the attacker's freeze then. */
  dist: Fx;
  stop: number;
}

/** Plays a guide against the guide dummy from `gap` apart. */
function trial(fighter: string, g: ComboGuide, gap: Fx): Trial {
  const m = guideStart(fighter, g.bars);
  const [a, d] = m.fighters;
  a.x = -(gap >> 1);
  d.x = gap - (gap >> 1);
  const ev: SimEvent[] = [];
  const out: Trial = { hits: 0, pct: 0, dist: 0, stop: 0 };
  let dealt = 0;
  const last = g.presses[g.presses.length - 1][0];
  for (let t = 0; t <= last + 200; t++) {
    ev.length = 0;
    step(m, guideInput(g, t, a.facing), 0, ev);
    for (const e of ev) {
      if (e.type !== 'hit' || e.attacker !== 0) continue;
      if (!out.hits) {
        out.dist = Math.abs(d.x - a.x);
        out.stop = a.hitstop;
      }
      out.hits++;
      dealt += e.damage;
    }
    // Once it's over, it's over (a fire left burning isn't part of it).
    if (out.hits && d.combo === 0 && d.mode !== 'hitstun') break;
  }
  out.pct = (dealt * 100) / fighterData(GUIDE_DUMMY).health;
  return out;
}

const cache = new Map<string, readonly Route[]>();

/** The move a guide press brings out from a standing start, as the simulation picks a normal (or null for a special). */
export function moveForPress(fighter: string, press: string): string | null {
  const n = fighterData(fighter).normals;
  const parts = press.split(' ');
  const btn = parts[parts.length - 1] as 'FP' | 'BP' | 'FK' | 'BK' | 'SP';
  if (btn === 'SP') return null;
  if (parts.includes('d')) return n.c[btn];
  if (parts.includes('f')) return n.f[btn] ?? n.s[btn];
  if (parts.includes('b')) return n.b[btn] ?? n.s[btn];
  return n.s[btn];
}

function reachOf(mv: MoveData): Fx {
  let r = 0;
  for (const h of mv.hits) r = Math.max(r, h.box.x + h.box.w);
  return r;
}

function kindOf(fighter: string, g: ComboGuide, opener: string): Opener {
  if (g.bars > 0) return 'meter';
  if (opener === fighterData(fighter).normals.s.FP) return 'jab';
  const h = moveData(fighter, opener).hits[0]?.height;
  return h === 'low' ? 'low' : h === 'overhead' ? 'overhead' : 'punish';
}

/** Every guide of the fighter that opens with a normal, sorted by opener and measured in the simulation. Worked out once a fighter. */
export function routesFor(fighter: string): readonly Route[] {
  let rs = cache.get(fighter);
  if (rs) return rs;
  const out: Route[] = [];
  for (const g of guides(fighter)) {
    if (!g.presses.length || g.presses[0][0] !== 0) continue;
    const opener = moveForPress(fighter, g.presses[0][1]);
    if (!opener) continue;
    const mv = moveData(fighter, opener);
    const base = trial(fighter, g, GAPS[0]);
    // How far out it still holds together.
    let far = base.dist;
    for (let k = 1; k < GAPS.length; k++) {
      const t = trial(fighter, g, GAPS[k]);
      if (t.hits < base.hits) break;
      far = t.dist;
    }
    out.push({ guide: g, kind: kindOf(fighter, g, opener), opener, press: g.presses[0][1], startup: mv.startup, reach: reachOf(mv), pct: base.pct, hits: base.hits, far, stop: base.stop });
  }
  rs = out;
  cache.set(fighter, rs);
  return rs;
}

export function routeOf(fighter: string, kind: Opener): Route | null {
  for (const r of routesFor(fighter)) if (r.kind === kind) return r;
  return null;
}

/**
 * The route to carry on with after `move` hit: with bars to spend (and the
 * nerve), the cheapest meter route that finishes them, else the cheapest it
 * can pay for, else the plain one for that opener. `killPct`: the opponent's
 * health left, as % of the guide dummy's.
 */
export function routeAfter(fighter: string, move: string, meter: number, spend: boolean, killPct: number): Route | null {
  let plain: Route | null = null;
  let cheapest: Route | null = null;
  let finisher: Route | null = null;
  for (const r of routesFor(fighter)) {
    if (r.opener !== move) continue;
    if (r.kind !== 'meter') {
      plain ??= r;
      continue;
    }
    if (!spend || r.guide.bars * BAR > meter) continue;
    if (!cheapest || r.guide.bars < cheapest.guide.bars) cheapest = r;
    if (r.pct >= killPct && (!finisher || r.guide.bars < finisher.guide.bars)) finisher = r;
  }
  // No bar spent on a round the plain route already wins.
  if (plain && plain.pct >= killPct) return plain;
  return finisher ?? cheapest ?? plain;
}

/** A route under way: the presses still to come, at the guide's times from the opener's start. */
export class RouteRun {
  /** The next press to make. */
  private k = 0;

  constructor(
    readonly route: Route,
    /** The CPU's step on which the opener started. */
    readonly start: number,
    now: number,
  ) {
    const p = route.guide.presses;
    // Presses already behind it (it saw the hit late) are skipped.
    while (this.k < p.length && p[this.k][0] < now - start) this.k++;
  }

  get done(): boolean {
    return this.k >= this.route.guide.presses.length;
  }

  /** Is a press due on this step? */
  due(now: number): boolean {
    return !this.done && this.route.guide.presses[this.k][0] === now - this.start;
  }

  /** The presses made after the opener (some are already in). */
  get pressed(): number {
    return this.k;
  }

  /** This step's input (0 between presses), moving past the presses made. */
  input(now: number, facing: number): number {
    const p = this.route.guide.presses;
    let bits = 0;
    while (this.k < p.length && p[this.k][0] === now - this.start) bits |= pressBits(p[this.k++][1], facing);
    return bits;
  }
}

/** A route's opening press for the way the fighter faces. */
export function openerBits(r: Route, facing: number): number {
  return pressBits(r.press, facing);
}
