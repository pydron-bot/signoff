/**
 * Combo School: every combo guide taught a part at a time. A course is one
 * guide; its parts are the guide cut short after a few of its moves have
 * landed (three, then three more, and so on to the whole combo), each a trial
 * of its own to land REPS times. Every step comes with how it's done (a
 * string, a cancel, a link, a jump cancel...) and a tip, worked out from the
 * moves, so the school follows the guides whenever they're regenerated.
 * No DOM here.
 */
import { fighterData, type MoveData } from '../sim';
import { guides, type ComboGuide, type GuideStep } from './comboGuides';
import { Cleared } from './cleared';
import { trialOf, type Trial } from './trials';

/** Clean landings that pass a part. */
export const REPS = 3;
/** Where passed parts are kept, as "fighter:guide name:part". */
export const SCHOOL_KEY = 'signoff.school';
/** Moves landed in the first part, and added by each part after it. */
const PART = 3;

export function schoolId(fighter: string, guide: string, part: number): string {
  return `${fighter}:${guide}:${part}`;
}

export interface Course {
  fighter: string;
  /** The guide's index in the fighter's guides. */
  guide: number;
  name: string;
  bars: number;
  /** Moves that land in the whole combo. */
  moves: number;
  /** The moves landed at the end of each part; the last is the whole combo. */
  parts: readonly number[];
}

/**
 * Where each part ends: three moves, then three more, to the whole combo
 * (a last part of one move joins the one before it).
 */
export function partEnds(moves: number): number[] {
  const out: number[] = [];
  let c = Math.min(PART, moves);
  while (c < moves) {
    out.push(c);
    c += PART;
  }
  if (out.length && moves - out[out.length - 1] < 2) out.pop();
  out.push(moves);
  return out;
}

/** A fighter's courses, easiest first: fewer steps, no meter, then the rest. */
export function courses(fighter: string): Course[] {
  const out: (Course & { weight: number })[] = [];
  guides(fighter).forEach((g, k) => {
    const t = trialOf(fighter, g, k);
    const air = t.steps.some((s) => s.move === 'Jump' || s.move === 'Jump Cancel');
    out.push({ fighter, guide: k, name: g.name, bars: g.bars, moves: t.conns.length, parts: partEnds(t.conns.length), weight: t.steps.length + g.bars * 3 + (air ? 2 : 0) });
  });
  return out.sort((a, b) => a.weight - b.weight || a.guide - b.guide).map(({ weight: _w, ...c }) => c);
}

/** The guide cut short after `moves` moves have landed: its presses up to that move's (and a boost's second press). */
export function partGuide(fighter: string, guide: number, moves: number): ComboGuide {
  const g = guides(fighter)[guide];
  const t = trialOf(fighter, g, guide);
  if (moves >= t.conns.length) return g;
  const last = t.steps[t.conns[moves - 1].step].at;
  // The next move's press can come before this one lands (buffered): stop short of it.
  const next = t.steps[t.conns[moves].step].at;
  const cut = Math.min(last + 3, next - 1);
  return { name: g.name, bars: g.bars, presses: g.presses.filter(([at]) => at <= Math.max(last, cut)) };
}

/** The trial for one part of a course (`part` counts from 0). */
export function partTrial(c: Course, part: number): Trial {
  return trialOf(c.fighter, partGuide(c.fighter, c.guide, c.parts[part]), c.guide);
}

/** Parts passed of a course, out of how many. */
export function coursePassed(done: Cleared, c: Course): number {
  let n = 0;
  for (let p = 0; p < c.parts.length; p++) if (done.has(schoolId(c.fighter, c.name, p))) n++;
  return n;
}

/** How a step is done. */
export type How = 'opener' | 'jumpIn' | 'string' | 'link' | 'cancel' | 'followUp' | 'juggle' | 'bounce' | 'jumpCancel' | 'jump' | 'air' | 'airString' | 'airSpecial' | 'boost' | 'relaunch' | 'wait';

export interface Coaching {
  how: How;
  /** One line on doing it. */
  tip: string;
}

const LABEL: Readonly<Record<How, string>> = {
  opener: 'OPENER',
  jumpIn: 'JUMP IN',
  string: 'STRING',
  link: 'LINK',
  cancel: 'CANCEL',
  followUp: 'FOLLOW-UP',
  juggle: 'JUGGLE',
  bounce: 'BOUNCE',
  jumpCancel: 'JUMP CANCEL',
  jump: 'JUMP',
  air: 'IN THE AIR',
  airString: 'AIR STRING',
  airSpecial: 'AIR SPECIAL',
  boost: 'BOOST',
  relaunch: 'RELAUNCH',
  wait: 'WAIT',
};

export function howLabel(h: How): string {
  return LABEL[h];
}

/** Its last hit launches or bounces them. */
function opens(mv: MoveData | null): boolean {
  const h = mv?.hits[mv.hits.length - 1];
  return h !== undefined && (h.launch !== undefined || h.groundBounce === true || h.wallBounce === true);
}

/** How each step of a trial is done, and a tip for it, worked out from the moves on either side. */
export function coaching(t: Trial): Coaching[] {
  const f = fighterData(t.fighter);
  const out: Coaching[] = [];
  let prev: MoveData | null = null;
  let airborne = false;
  t.steps.forEach((s: GuideStep, k) => {
    const mv = s.id ? f.moves[s.id] : null;
    const plain = mv && mv.id.endsWith('+') ? f.moves[mv.id.slice(0, -1)] : mv;
    let c: Coaching;
    if (s.move === 'Jump Cancel') {
      c = { how: 'jumpCancel', tip: `${s.input} as the launcher connects: a hop that meets them on the way up` };
      airborne = true;
    } else if (s.move === 'Jump') {
      c = { how: 'jump', tip: `${s.input} to jump; the attack comes on the way down` };
      airborne = true;
    } else if (!mv) c = { how: 'link', tip: `${s.input}` };
    else if (k === 0) c = { how: 'opener', tip: `${mv.name} starts it: land it point blank` };
    else if (k === 1 && airborne && mv.stance === 'air' && out[0].how === 'jump') c = { how: 'jumpIn', tip: `${s.input} on the way down, close to them: the jump-in` };
    else if (s.input.endsWith('SP SP')) {
      const relaunch = prev !== null && airborne;
      c = relaunch ? { how: 'relaunch', tip: `SP SP quickly (1 bar): the boost pops them back up` } : { how: 'boost', tip: `SP SP quickly (1 bar): the boosted ${plain!.name}` };
    } else if (mv.kind === 'special' && mv.stance === 'air') c = { how: 'airSpecial', tip: `${s.input} in the air, once a jump: ${mv.name}` };
    else if (mv.kind === 'special' && prev?.kind === 'special' && Object.values(prev.chain).includes(mv.id)) c = { how: 'followUp', tip: `${s.input} while ${prev.name} plays: its follow-up comes out` };
    else if (mv.kind === 'special') c = { how: 'cancel', tip: `${s.input} as the hit lands: it cancels the move (press it in the freeze; the buffer keeps it)` };
    else if (mv.kind === 'air' && prev?.kind === 'air' && Object.values(prev.chain).includes(mv.id)) c = { how: 'airString', tip: `${s.input} as the last one lands: you hang in the air while the string connects` };
    else if (mv.kind === 'air') c = { how: 'air', tip: `${s.input} straight after take-off, to meet them as they rise` };
    else if (s.wait) c = { how: 'wait', tip: `let them fall, then ${s.input}: too soon and it goes under them` };
    else if (prev && prev.hits.some((h) => h.groundBounce) && prev.stance === 'air') c = { how: 'bounce', tip: `they bounce off the floor: land, then ${s.input} as they come back up` };
    else if (prev && Object.values(prev.chain).includes(mv.id)) c = { how: 'string', tip: `${s.input} as the hit lands: the string carries on` };
    else if (opens(prev)) c = { how: 'juggle', tip: `${s.input} as they go up: any normal follows a launcher` };
    else c = { how: 'link', tip: `${s.input} just as ${prev?.name ?? 'it'} finishes: a link is rhythm, not speed` };
    if (mv && mv.stance !== 'air' && s.move !== 'Jump Cancel' && c.how !== 'airSpecial') airborne = mv.kind === 'normal' && opens(mv) ? airborne : false;
    out.push(c);
    if (mv) prev = mv;
  });
  return out;
}

/** "3 frames late", "1 frame early". */
export function framesText(n: number): string {
  const a = Math.abs(n);
  return `${a} frame${a === 1 ? '' : 's'} ${n < 0 ? 'early' : 'late'}`;
}
