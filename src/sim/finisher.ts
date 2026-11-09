/**
 * Finishers, after the deciding round. During "Stay tuned" the loser stands
 * dazed and the winner can walk and dash into range and enter a Sign-Off or
 * a Rerun; a Cancellation starts by itself when the final K.O. came from
 * the winner's cancellation special. A finisher is a script: the winner
 * plays their own moves (clips, motion, projectiles, but nothing can hit)
 * and scripted blows land on the loser as ordinary hit events. The picture
 * cuts away at the worst moment; the sound carries on under it.
 */
import { BUFFER, FINISH_CLOSE, FINISH_FAR, FINISH_INPUT_WINDOW, GETUP_FRAMES, STAGE_FINISH_WALL } from './constants';
import type { SimEvent } from './events';
import { hitWeight } from './combat';
import { footwork, launch, moveOf, startMove, toIdle, wallX } from './fighter';
import { fighterData, moveData } from './fighters';
import { Script } from './fighters/build';
import { stageData } from './stages';
import { clamp, type Fx } from './fixed';
import { ATTACK_BITS, BLOCK, DOWN, UP, backBit, bitIndex, consume, forwardBit, type InputState } from './input';
import type { FighterState, MatchState } from './state';
import type { FinishBlow, FinishDir, FinishRange, FinisherData } from './types';

/** A hit reaction long enough to hold until the next beat changes it. */
const HELD = 600;

export function finisherData(fighter: string, id: string): FinisherData {
  if (id.startsWith(STAGE_PREFIX)) return stageFinisher(id.slice(STAGE_PREFIX.length), fighter);
  const f = fighterData(fighter).finishers.find((x) => x.id === id);
  if (!f) throw new Error(`unknown finisher ${fighter}/${id}`);
  return f;
}

const STAGE_PREFIX = 'stage:';
const stageFinishers = new Map<string, FinisherData>();

/**
 * The Stage Sign-Off, the same for every fighter on a stage (their own
 * moves, then the set takes over): close up, the loser's back to a wall,
 * forward, down, Block. Two blows, a throw into the set, and the cue: the
 * stage's piece comes down on them (the lightning, the lamp, the mirrors,
 * the fire), and the broadcast cuts away.
 */
export function stageFinisher(stage: string, fighter: string): FinisherData {
  const key = `${stage}/${fighter}`;
  let fin = stageFinishers.get(key);
  if (fin) return fin;
  const st = stageData(stage);
  const d = fighterData(fighter);
  fin = new Script(d.moves)
    .strike(d.normals.s.FP, { react: 'high', damage: 30, pull: 0.85 })
    .strike(d.normals.s.BP, { react: 'high', damage: 60 })
    .strike(d.throwMove, { react: 'knockdown', damage: 100, pop: 0.13, carry: 0.09 }, 26)
    .cue()
    .blow(0, { react: 'none', damage: 150 })
    .blow(12, { react: 'none', damage: 90 })
    .wait(22)
    .cut(st.finisher.censor)
    .blow(10, { react: 'none', damage: 120 })
    .blow(26, { react: 'none', damage: 140 })
    .done({ id: `${STAGE_PREFIX}${stage}`, name: st.finisher.name, kind: 'signoff', range: 'close', input: [...STAGE_INPUT], button: 'block', stage }, 90);
  stageFinishers.set(key, fin);
  return fin;
}

/** The Stage Sign-Off's taps (then Block). */
export const STAGE_INPUT: readonly FinishDir[] = ['f', 'd'];

/** The loser has a wall close behind them (on the far side from the winner). */
export function backToWall(m: MatchState, winner: number): boolean {
  const w = m.fighters[winner];
  const l = m.fighters[1 - winner];
  const away = l.x >= w.x ? 1 : -1;
  return wallX(m, l) - away * l.x <= STAGE_FINISH_WALL;
}

/** Frames since a playing Stage Sign-Off's cue (the set's moment), or -1: what the set shows reads it. */
export function stageCueAge(m: MatchState): number {
  if (m.phase !== 'finisher' || !m.finish.id.startsWith(STAGE_PREFIX)) return -1;
  const fin = finisherData(m.fighters[m.finish.player].fighter, m.finish.id);
  const cue = fin.beats.find((b) => b.cue);
  return cue && m.finish.frame >= cue.at ? m.finish.frame - cue.at : -1;
}

export function rangeOf(dist: Fx): Exclude<FinishRange, 'any'> {
  const d = Math.abs(dist);
  return d <= FINISH_CLOSE ? 'close' : d >= FINISH_FAR ? 'far' : 'mid';
}

function dirBit(d: FinishDir, facing: number): number {
  return d === 'f' ? forwardBit(facing) : d === 'b' ? backBit(facing) : d === 'd' ? DOWN : UP;
}

export function buttonBit(b: FinisherData['button']): number {
  return b === 'block' ? BLOCK : ATTACK_BITS[b];
}

/**
 * The taps were last pressed in this order, the button after (or with) the
 * last tap, all within the window, and the button inside the buffer.
 */
export function enteredFinisher(inp: InputState, facing: number, f: FinisherData): boolean {
  if (!f.input.length) return false;
  const btn = inp.age[bitIndex(buttonBit(f.button))];
  if (btn > BUFFER) return false;
  let newer = btn;
  for (let k = f.input.length - 1; k >= 0; k--) {
    const a = inp.age[bitIndex(dirBit(f.input[k], facing))];
    // The last tap may share the button's frame; earlier taps must come strictly before.
    if (a > FINISH_INPUT_WINDOW || a < newer || (a === newer && k < f.input.length - 1)) return false;
    newer = a;
  }
  return true;
}

/** "Stay tuned" begins: the winner is free, the loser is dazed (or getting up to be). */
export function beginStayTuned(m: MatchState): void {
  const w = m.fighters[m.matchWinner];
  if (w.y === 0) toIdle(w);
  settleLoser(m, true);
}

/** Keeps the loser out of it: on their feet and dazed, or (in a finisher) wherever the script left them. */
function settleLoser(m: MatchState, standUp: boolean): void {
  const f = m.fighters[1 - m.matchWinner];
  f.hitstop = 0;
  switch (f.mode) {
    case 'ko':
    case 'down':
      if (standUp) {
        f.mode = 'getup';
        f.timer = GETUP_FRAMES - 1;
      }
      return;
    case 'launched':
    case 'getup':
    case 'thrown':
    case 'dazed':
      return;
    case 'hitstun':
      // A finisher's stagger holds until the script moves on.
      if (m.phase === 'finisher') return;
      break;
    case 'air':
    case 'move':
      if (f.y > 0) return;
      break;
  }
  f.mode = 'dazed';
  f.move = '';
  f.vx = 0;
  f.slide = 0;
  f.crouching = false;
}

/** The winner's control during "Stay tuned": enter a finisher, or move into range (no jumping or attacking). */
export function stayTunedControl(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  if (i !== m.matchWinner) return;
  const free = f.mode === 'idle' || f.mode === 'walk' || f.mode === 'crouch';
  // A tap of back after walking back reads as a backdash: the finisher still comes out of it.
  if (!free && f.mode !== 'dash' && f.mode !== 'backdash') return;
  const o = m.fighters[1 - i];
  if (free && o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  // The loser must be on their feet to be finished.
  if (o.mode === 'dazed') {
    const range = rangeOf(o.x - f.x);
    for (const fin of fighterData(f.fighter).finishers) {
      if (fin.range !== 'any' && fin.range !== range) continue;
      if (!enteredFinisher(f.input, f.facing, fin)) continue;
      consume(f.input, buttonBit(fin.button));
      startFinisher(m, i, fin.id, ev);
      return;
    }
    // The stage's own, close up with their back to a wall.
    const st = stageFinisher(m.stage, f.fighter);
    if (range === 'close' && backToWall(m, i) && enteredFinisher(f.input, f.facing, st)) {
      consume(f.input, buttonBit(st.button));
      startFinisher(m, i, st.id, ev);
      return;
    }
  }
  if (free) footwork(m, i, false);
}

/** After each "Stay tuned" step. */
export function afterStayTuned(m: MatchState): void {
  settleLoser(m, true);
}

const HOLD_BIT: Readonly<Record<FinishDir, number>> = { f: 1, b: 2, d: 4, u: 8 };

/**
 * The cancellation the winner earned with the final K.O., or null. They're
 * tried in the order the fighter lists them, so one that asks for a held
 * direction comes before a plain one on the same move.
 */
export function earnedCancellation(m: MatchState, winner: number): FinisherData | null {
  const w = m.fighters[winner];
  const l = m.fighters[1 - winner];
  if (!l.ko || !l.koMove) return null;
  for (const fin of fighterData(w.fighter).finishers) {
    if (fin.kind !== 'cancellation' || !fin.trigger) continue;
    if (fin.hold && (l.koHeld & HOLD_BIT[fin.hold]) === 0) continue;
    const t = moveData(w.fighter, fin.trigger);
    // The special itself, its boost, or its paid-for version.
    if (l.koMove === fin.trigger || l.koMove === `${fin.trigger}+` || l.koMove === t.boost || l.koMove === t.tithe?.into) return fin;
  }
  return null;
}

export function startFinisher(m: MatchState, i: number, id: string, ev: SimEvent[]): void {
  const fin = finisherData(m.fighters[i].fighter, id);
  m.phase = 'finisher';
  m.finish.player = i;
  m.finish.id = id;
  m.finish.frame = 0;
  for (const p of m.projectiles) p.active = false;
  const w = m.fighters[i];
  const l = m.fighters[1 - i];
  if (w.y === 0) toIdle(w);
  // Finished: whatever the script does, they stay down once they fall.
  l.ko = true;
  l.combo = 0;
  l.comboMoves.length = 0;
  ev.push({ type: 'finisher', player: i, id, kind: fin.kind });
}

/**
 * One step of the finisher, after the fighters have ticked and moved.
 * Returns true when it has finished.
 */
export function stepFinisher(m: MatchState, ev: SimEvent[]): boolean {
  const fs = m.finish;
  const i = fs.player;
  const w = m.fighters[i];
  const l = m.fighters[1 - i];
  const fin = finisherData(w.fighter, fs.id);
  fs.frame++;
  const t = fs.frame;
  for (const b of fin.beats) {
    if (b.at !== t) continue;
    if (b.move) {
      startMove(w, b.move);
      // Scripts play moves in place: the winner faces the loser as each one starts.
      if (l.x !== w.x && !moveOf(w).teleport) w.facing = l.x > w.x ? 1 : -1;
    }
    if (b.blow) blow(m, i, b.blow, fin.id, ev);
    if (b.cue) ev.push({ type: 'stageCue', player: i, stage: fin.stage!, x: l.x });
  }
  if (t === fin.cut) ev.push({ type: 'finisherCut', player: i, censor: fin.censor, frames: fin.card - fin.cut });
  if (t === fin.card) ev.push({ type: 'finisherCard', player: i, id: fin.id, kind: fin.kind });
  settleLoser(m, false);
  return t >= fin.total;
}

function blow(m: MatchState, i: number, b: FinishBlow, id: string, ev: SimEvent[]): void {
  const w = m.fighters[i];
  const l = m.fighters[1 - i];
  if (b.pull !== undefined) {
    const lim = wallX(m, l);
    l.x = clamp(w.x + w.facing * b.pull, -lim, lim);
    l.slide = 0;
  }
  const dir = l.x >= w.x ? 1 : -1;
  // A blow of 0 only places them.
  if (b.damage > 0) l.combo++;
  switch (b.react) {
    case 'high':
    case 'low':
      if (l.mode === 'ko' || l.y > 0) break;
      stagger(l, b.react === 'low');
      break;
    case 'grab':
      l.mode = 'thrown';
      l.timer = HELD;
      l.vx = 0;
      l.y = 0;
      l.crouching = false;
      break;
    case 'launch':
    case 'knockdown':
      launch(l, dir, b.pop ?? 0, b.react === 'launch');
      l.vx = dir * (b.carry ?? 0);
      break;
    case 'none':
      break;
  }
  if (b.damage > 0) {
    const weight = hitWeight(b.damage, b.react === 'launch' || b.react === 'knockdown');
    ev.push({ type: 'hit', attacker: i, defender: 1 - i, move: id, damage: b.damage, height: b.react === 'low' ? 'low' : 'mid', counter: false, combo: l.combo, weight, dir, x: l.x, y: l.y });
  }
}

function stagger(l: FighterState, low: boolean): void {
  l.mode = 'hitstun';
  l.timer = HELD;
  l.move = '';
  l.vx = 0;
  l.slide = 0;
  l.crouching = low;
}
