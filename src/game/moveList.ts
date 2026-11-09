/**
 * The move list, built from a fighter's data so it can't drift from what
 * the game does: specials, strings (with the height of every hit), command
 * normals, the system moves and the finishers. Directions are written for a
 * fighter facing right (→ is forward). No DOM here.
 */
import { BOOST_TAP, DELAYED_GETUP, FLAWLESS_BLOCKSTUN_CUT, FLAWLESS_WINDOW, PUNISH_DAMAGE_PCT, TD_HEALTH_PCT, fighterData, frameData, stringMoves, type FighterData, type MoveData } from '../sim';
import { guides, runGuide } from './comboGuides';
import type { FinishDir, FinisherData, Height, SpecialDir } from '../sim/types';

export interface MoveRow {
  name: string;
  input: string;
  notes: string;
  /** Startup, on block, on hit (training shows these). */
  frames: string;
  /** A combo guide the game can play: its index in the fighter's guides. */
  watch?: number;
}

export interface MoveSection {
  title: string;
  rows: MoveRow[];
}

const DIR: Readonly<Record<SpecialDir, string>> = { n: '', f: '→ ', b: '← ', d: '↓ ' };
const TAP: Readonly<Record<FinishDir, string>> = { f: '→', b: '←', d: '↓', u: '↑' };
const HEIGHT: Readonly<Record<Height, string>> = { mid: 'mid', low: 'low', overhead: 'overhead', unblockable: 'unblockable' };
const RANGE = { close: 'close', mid: 'mid range', far: 'far', any: 'any range' } as const;

function signed(n: number | null): string {
  return n === null ? '–' : n > 0 ? `+${n}` : String(n);
}

function frames(m: MoveData): string {
  const fd = frameData(m);
  if (!fd.startup) return '';
  return `${fd.startup}f · ${signed(fd.onBlock)} block · ${fd.onHit === null ? (m.hits.at(-1)?.launch !== undefined ? 'launch' : m.hits.at(-1)?.knockdown ? 'down' : '–') : signed(fd.onHit)} hit`;
}

/** What a move does, in a few words: its heights, and launch, knockdown or grab. */
function traits(m: MoveData): string {
  const t: string[] = [];
  const heights = [...new Set(m.hits.map((h) => HEIGHT[h.height]))];
  if (heights.length) t.push(heights.join(', '));
  if (m.hits.length > 1) t.push(`${m.hits.length} hits`);
  if (m.spawns.some((s) => s.projectile.decoy)) t.push('decoy');
  else if (m.spawns.some((s) => s.projectile.delay)) t.push('delayed projectile');
  else if (m.spawns.length) t.push('projectile');
  if (m.counter) t.push('counters strikes');
  if (m.hits.some((h) => h.guardCrush)) t.push('crushes guard');
  if (m.spawns.some((s) => s.projectile.returnAfter !== undefined)) t.push('comes back');
  if (m.spawns.some((s) => s.projectile.collects)) t.push('collects a donation');
  if (m.tithe) t.push(`${m.tithe.cost} donation${m.tithe.cost > 1 ? 's' : ''}: ${m.tithe.into.replace(/^.*\((.*)\)$/, '$1')}`);
  if (m.heal) t.push(`heals ${m.heal.amount}`);
  if (m.hits.some((h) => h.hitstun >= 30)) t.push('staggers');
  if (m.throwData) t.push(m.throwData.untechable ? 'grab, unbreakable' : 'grab');
  const last = m.hits.at(-1);
  if (last?.launch !== undefined) t.push('launches');
  else if (last?.groundBounce) t.push('ground bounce');
  else if (last?.wallBounce) t.push('wall bounce near the wall');
  else if (last?.knockdown) t.push('knocks down');
  if (m.armor) t.push('armour');
  if (m.invuln) t.push('invincible start');
  if (m.teleport) t.push(m.teleport.to === 'behind' ? 'teleports behind' : 'teleports away');
  if (m.hits.some((h) => h.pull !== undefined)) t.push('pulls in');
  if (m.hits.some((h) => h.armorBreak)) t.push('breaks armour');
  if (m.passThrough) t.push('passes through');
  return t.join(' · ');
}

function normalInput(f: FighterData, id: string): string | null {
  const n = f.normals;
  for (const [btn, mid] of Object.entries(n.f)) if (mid === id) return `→ ${btn}`;
  for (const [btn, mid] of Object.entries(n.b)) if (mid === id) return `← ${btn}`;
  for (const [btn, mid] of Object.entries(n.c)) if (mid === id) return `↓ ${btn}`;
  for (const [btn, mid] of Object.entries(n.s)) if (mid === id) return btn;
  return null;
}

function finisherRow(fin: FinisherData): MoveRow {
  const input = fin.kind === 'cancellation' ? `win with ${fin.trigger}` : `${fin.input.map((d) => TAP[d]).join(' ')} ${fin.button === 'block' ? 'BLOCK' : fin.button}`;
  const kind = fin.kind === 'signoff' ? 'Sign-Off' : fin.kind === 'rerun' ? 'merciful' : 'Cancellation';
  return { name: fin.name, input, notes: fin.kind === 'cancellation' ? kind : `${kind} · ${RANGE[fin.range]}`, frames: '' };
}

/** The fighter's combo guides: the presses in order (a boost as SP SP), and what the combo does. */
export function comboRows(fighter: string): MoveRow[] {
  return guides(fighter).map((g, k) => {
    const r = runGuide(fighter, g);
    const meter = g.bars ? `${g.bars} bar${g.bars > 1 ? 's' : ''}` : 'no meter';
    return {
      name: g.name,
      // Non-breaking spaces inside a step, so "wait BP" or "↓SP SP" never splits across lines.
      input: r.steps.map((s) => `${s.wait ? 'wait ' : ''}${s.input}`.replaceAll(' ', '\u00a0')).join(' › '),
      notes: `${r.hits} hits · ${Math.round(r.pct)}% · ${meter}`,
      frames: r.steps.map((s) => s.move).join(' › '),
      watch: k,
    };
  });
}

export function moveList(fighter: string): MoveSection[] {
  const f = fighterData(fighter);
  const specials: MoveRow[] = [];
  for (const dir of ['n', 'f', 'b', 'd'] as const) {
    const id = f.specials[dir];
    if (!id) continue;
    const m = f.moves[id];
    const boost = m.boost ? f.moves[m.boost] : null;
    specials.push({ name: m.name, input: `${DIR[dir]}SP`, notes: [traits(m), boost ? `SP again: ${traits(boost) || 'stronger'}` : ''].filter(Boolean).join(' · '), frames: frames(m) });
  }

  const strings: MoveRow[] = f.strings.map((s) => {
    const ids = stringMoves(f, s) ?? [];
    const first = normalInput(f, s.path[0]) ?? s.path[0];
    const heights = ids.map((id) => {
      const h = f.moves[id].hits;
      return h.length ? HEIGHT[h[0].height] : '–';
    });
    const end = traits(f.moves[ids[ids.length - 1]]).split(' · ').filter((t) => /launches|knocks down|grab/.test(t));
    return { name: s.name, input: [first, ...s.path.slice(1)].join(' · '), notes: [heights.join(', '), s.safe ? 'safe on block' : '', ...end].filter(Boolean).join(' · '), frames: frames(f.moves[ids[ids.length - 1]]) };
  });

  // In the air: Special while jumping (once a jump), and the air strings.
  const air: MoveRow[] = [];
  for (const dir of ['n', 'f', 'b', 'd'] as const) {
    const id = f.airSpecials[dir];
    if (!id) continue;
    const m = f.moves[id];
    const boost = m.boost ? f.moves[m.boost] : null;
    air.push({ name: m.name, input: `in the air: ${DIR[dir]}SP`, notes: [traits(m), boost ? `SP again: ${traits(boost) || 'stronger'}` : ''].filter(Boolean).join(' · '), frames: '' });
  }
  for (const s of f.airStrings) {
    const ids = stringMoves(f, s) ?? [];
    air.push({ name: s.name, input: `in the air: ${s.path.map((p, k) => (k === 0 ? p.replace(/^j\./, '') : p)).join(' · ')}`, notes: [ids.map((id) => f.moves[id].name).join(', '), 'chains on hit or block'].join(' · '), frames: '' });
  }

  const command: MoveRow[] = [];
  for (const side of ['f', 'b'] as const) {
    for (const [btn, id] of Object.entries(f.normals[side])) {
      if (!id) continue;
      const m = f.moves[id];
      command.push({ name: m.name, input: `${side === 'f' ? '→' : '←'} ${btn}`, notes: traits(m), frames: frames(m) });
    }
  }
  // The launchers and other normals with something special about them.
  for (const id of [...Object.values(f.normals.s), ...Object.values(f.normals.c)]) {
    const m = f.moves[id];
    const t = traits(m);
    if (/launches|knocks down|armour|pulls|2 hits|3 hits/.test(t)) command.push({ name: m.name, input: normalInput(f, id) ?? id, notes: t, frames: frames(m) });
  }

  const system: MoveRow[] = [
    { name: 'Throw', input: 'THROW (← THROW: throw backward)', notes: 'break it with THROW', frames: '' },
    { name: 'Boost', input: 'SP SP (or SP, METER)', notes: `a quick double tap (within ${BOOST_TAP} frames, keep the direction from the first): 1 bar; on a juggled opponent it relaunches them (as often as you have bars)`, frames: '' },
    { name: 'Jump Cancel', input: '↑ (or ↗) as a launcher hits', notes: 'a hop after them, into an air string and an air special', frames: '' },
    { name: 'Tape Skip', input: 'METER during any ground move', notes: 'cancels it into a dash: 1 bar', frames: '' },
    { name: 'Cut Away', input: 'METER while being hit', notes: 'breaks the combo: needs a full meter and spends all of it, once a round', frames: '' },
    { name: 'Technical Difficulties', input: 'BLOCK + SP', notes: `under ${TD_HEALTH_PCT}% health, once a match`, frames: '' },
    { name: 'Flawless Block', input: 'BLOCK just before the hit', notes: `pressed within ${FLAWLESS_WINDOW} frames of it landing: no chip, out of blockstun ${FLAWLESS_BLOCKSTUN_CUT} frames sooner (easier to punish), a little meter`, frames: '' },
    { name: 'Stay Down', input: '↓ while knocked down', notes: `get up ${DELAYED_GETUP} frames later, once a knockdown: their timed attack on your getup misses`, frames: '' },
    { name: 'Reversal', input: 'any attack while getting up', notes: 'comes out on the first frame you can move', frames: '' },
    { name: 'Punish', input: 'hit them as a move recovers', notes: `after a whiff or a blocked move: the first hit does ${PUNISH_DAMAGE_PCT - 100}% more and earns meter`, frames: '' },
  ];

  return [
    { title: 'Specials', rows: specials },
    { title: 'Strings', rows: strings },
    { title: 'In the air', rows: air },
    { title: 'Combos (from point blank; wait = let them fall first)', rows: comboRows(fighter) },
    { title: 'Normals', rows: command },
    { title: 'System', rows: system },
    { title: 'Finishers (after the deciding round)', rows: f.finishers.map(finisherRow) },
  ];
}
