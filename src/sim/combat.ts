/**
 * Hit resolution, once both fighters have moved this step. Everything that
 * connects is found first and then applied, so two attacks landing on the
 * same frame trade instead of the first player winning.
 */
import {
  BLOCKSTOP,
  COUNTER_HITSTOP,
  COUNTER_HITSTUN,
  HITSTOP,
  JUGGLE_POP,
  KNOCK_VY,
  MAX_JUGGLE,
  METER_MAX,
  SCALE_MIN,
  SCALE_STEP,
  TD_CINEMATIC_FRAMES,
  THROWER_FRAMES,
  THROW_HOLD,
} from './constants';
import type { SimEvent } from './events';
import { airborne, inWindow, launch, moveOf, setSlide, takeDamage, tech, wallX } from './fighter';
import { fighterData, moveData } from './fighters';
import { clamp, type Fx } from './fixed';
import { BLOCK, DOWN } from './input';
import type { FighterState, MatchState } from './state';
import type { Box, HitEffect, MoveKind } from './types';

// Scratch for one step's pending contacts (not match state: rebuilt every step).
const pendingHit = [-1, -1];
const pendingMove = ['', ''];
const pendingBlocked = [false, false];
const pendingCounter = [false, false];
const pendingThrow = [false, false];
/** The decoy a strike hit instead of the fighter, or -1. */
const pendingDecoy = [-1, -1];
const projHits: number[] = [];
const projBlocked: boolean[] = [];

function boxesTouch(ax: Fx, ay: Fx, adir: number, ab: Box, bx: Fx, by: Fx, bdir: number, bb: Box): boolean {
  const a0 = adir > 0 ? ax + ab.x : ax - ab.x - ab.w;
  const b0 = bdir > 0 ? bx + bb.x : bx - bb.x - bb.w;
  return a0 < b0 + bb.w && b0 < a0 + ab.w && ay + ab.y < by + bb.y + bb.h && by + bb.y < ay + ab.y + ab.h;
}

/** Does a box at (x, y) facing dir touch any of this fighter's hurtboxes? */
export function touchesFighter(x: Fx, y: Fx, dir: number, b: Box, d: FighterState): boolean {
  const hurt = fighterData(d.fighter).hurt;
  const base = airborne(d) ? hurt.air : d.crouching ? hurt.crouch : hurt.stand;
  if (boxesTouch(x, y, dir, b, d.x, d.y, d.facing, base)) return true;
  if (d.mode === 'move') {
    for (const h of moveOf(d).hurt) if (inWindow(d.moveFrame, h.frames) && boxesTouch(x, y, dir, b, d.x, d.y, d.facing, h.box)) return true;
  }
  return false;
}

export function hittable(f: FighterState): boolean {
  if (f.ko) return false;
  switch (f.mode) {
    case 'down':
    case 'getup':
    case 'thrown':
    case 'throwing':
    case 'cinematic':
    case 'recover':
    case 'ko':
      return false;
    case 'launched':
      return f.juggleable && f.juggle < MAX_JUGGLE;
    case 'move':
      return !inWindow(f.moveFrame, moveOf(f).invuln);
    default:
      return true;
  }
}

function throwable(f: FighterState): boolean {
  if (f.ko || f.y > 0) return false;
  switch (f.mode) {
    case 'idle':
    case 'walk':
    case 'crouch':
    case 'guard':
    case 'dash':
    case 'backdash':
    case 'landing':
    case 'prejump':
      return true;
    case 'move': {
      const mv = moveOf(f);
      return mv.kind !== 'air' && !inWindow(f.moveFrame, mv.invuln);
    }
    default:
      return false;
  }
}

/** Standing blocks mids and overheads; crouching blocks mids and lows. Only on the ground, holding Block. */
export function blocks(f: FighterState, height: HitEffect['height']): boolean {
  if (height === 'unblockable' || f.y > 0 || (f.input.held & BLOCK) === 0) return false;
  if (f.mode !== 'idle' && f.mode !== 'walk' && f.mode !== 'crouch' && f.mode !== 'guard' && f.mode !== 'blockstun') return false;
  const crouch = (f.input.held & DOWN) !== 0;
  return height === 'mid' || (height === 'low' ? crouch : !crouch);
}

function isCounter(f: FighterState): boolean {
  return f.mode === 'move' && f.moveFrame <= moveOf(f).lastActive;
}

function gainMeter(f: FighterState, n: number): void {
  f.meter = Math.min(METER_MAX, f.meter + n);
}

export function resolveHits(m: MatchState, ev: SimEvent[], frozen: readonly boolean[]): void {
  const fs = m.fighters;
  for (let i = 0; i < 2; i++) {
    pendingHit[i] = -1;
    pendingThrow[i] = false;
    pendingDecoy[i] = -1;
    const a = fs[i];
    const d = fs[1 - i];
    if (frozen[i] || a.mode !== 'move') continue;
    const mv = moveOf(a);
    if (mv.throwData) {
      if (inWindow(a.moveFrame, mv.throwData.frames) && throwable(d) && Math.abs(d.x - a.x) <= mv.throwData.range) pendingThrow[i] = true;
      continue;
    }
    for (let k = 0; k < mv.hits.length; k++) {
      const h = mv.hits[k];
      if (a.hitMask & (1 << k) || !inWindow(a.moveFrame, h.frames)) continue;
      // A decoy in the way takes the hit instead.
      const dec = decoyHit(m, 1 - i, a.x, a.y, a.facing, h.box);
      if (dec >= 0) {
        pendingHit[i] = k;
        pendingMove[i] = a.move;
        pendingDecoy[i] = dec;
      } else if (hittable(d) && touchesFighter(a.x, a.y, a.facing, h.box, d)) {
        pendingHit[i] = k;
        pendingMove[i] = a.move;
        pendingBlocked[i] = blocks(d, h.height);
        pendingCounter[i] = isCounter(d);
      }
      break;
    }
  }

  // Projectiles: opposing ones cancel out, then the rest hit fighters.
  const ps = m.projectiles;
  for (let p = 0; p < ps.length; p++) {
    const P = ps[p];
    if (!P.active) continue;
    for (let q = p + 1; q < ps.length; q++) {
      const Q = ps[q];
      if (!Q.active || Q.owner === P.owner) continue;
      const pb = projData(m, p).box;
      const qb = projData(m, q).box;
      if (boxesTouch(P.x, P.y, P.dir, pb, Q.x, Q.y, Q.dir, qb)) {
        if (--P.hitsLeft <= 0) P.active = false;
        if (--Q.hitsLeft <= 0) Q.active = false;
        ev.push({ type: 'projectileClash', x: (P.x + Q.x) >> 1, y: (P.y + Q.y) >> 1 });
        if (!P.active) break;
      }
    }
  }
  projHits.length = 0;
  projBlocked.length = 0;
  for (let p = 0; p < ps.length; p++) {
    const P = ps[p];
    if (!P.active || P.rehit > 0) continue;
    const d = fs[1 - P.owner];
    const pd = projData(m, p);
    if (pd.decoy) continue;
    if (hittable(d) && touchesFighter(P.x, P.y, P.dir, pd.box, d)) {
      projHits.push(p);
      projBlocked.push(blocks(d, pd.effect.height));
    }
  }

  for (let i = 0; i < 2; i++) {
    const k = pendingHit[i];
    if (k < 0) continue;
    const a = fs[i];
    const mv = moveData(a.fighter, pendingMove[i]);
    const h = mv.hits[k];
    a.hitMask |= 1 << k;
    if (pendingDecoy[i] >= 0) {
      popDecoy(m, pendingDecoy[i], ev);
      a.contact = 'hit';
      a.hitstop = BLOCKSTOP;
      continue;
    }
    a.contact = pendingBlocked[i] ? 'block' : 'hit';
    applyHit(m, i, h, mv.id, mv.kind, a.facing, a.y + h.box.y + (h.box.h >> 1), false, pendingBlocked[i], pendingCounter[i], ev);
  }
  for (let n = 0; n < projHits.length; n++) {
    const P = ps[projHits[n]];
    const pd = projData(m, projHits[n]);
    applyHit(m, P.owner, pd.effect, P.move, 'special', P.dir, P.y + (pd.box.h >> 1), true, projBlocked[n], false, ev);
    P.rehit = pd.rehit;
    if (--P.hitsLeft <= 0) P.active = false;
  }

  // Throws lose to strikes: a thrower who was just hit is no longer throwing.
  const t0 = pendingThrow[0] && stillThrowing(fs[0]) && throwable(fs[1]);
  const t1 = pendingThrow[1] && stillThrowing(fs[1]) && throwable(fs[0]);
  if (t0 && t1) tech(m, ev, 0);
  else if (t0) grab(m, 0, ev);
  else if (t1) grab(m, 1, ev);
}

function projData(m: MatchState, p: number) {
  const P = m.projectiles[p];
  return moveData(m.fighters[P.owner].fighter, P.move).spawns[P.spawn].projectile;
}

/** The defender's decoy this box touches, or -1. */
function decoyHit(m: MatchState, owner: number, x: Fx, y: Fx, dir: number, b: Box): number {
  for (let p = 0; p < m.projectiles.length; p++) {
    const P = m.projectiles[p];
    if (!P.active || P.owner !== owner) continue;
    const pd = projData(m, p);
    if (pd.decoy && boxesTouch(x, y, dir, b, P.x, P.y, P.dir, pd.box)) return p;
  }
  return -1;
}

function popDecoy(m: MatchState, p: number, ev: SimEvent[]): void {
  const P = m.projectiles[p];
  if (--P.hitsLeft <= 0) P.active = false;
  ev.push({ type: 'decoyPop', player: P.owner, x: P.x, y: P.y });
}

/** Throws and command grabs (specials with throw data). */
function stillThrowing(f: FighterState): boolean {
  return f.mode === 'move' && moveOf(f).throwData !== undefined;
}

function grab(m: MatchState, i: number, ev: SimEvent[]): void {
  const a = m.fighters[i];
  const d = m.fighters[1 - i];
  const td = moveOf(a).throwData!;
  const id = a.move;
  d.grabMove = id;
  d.techable = !td.untechable;
  a.mode = 'throwing';
  a.timer = THROWER_FRAMES;
  a.vx = 0;
  d.mode = 'thrown';
  d.timer = THROW_HOLD;
  d.move = '';
  d.vx = 0;
  d.slide = 0;
  d.crouching = false;
  ev.push({ type: 'throw', thrower: i, move: id });
}

export function applyHit(
  m: MatchState,
  ai: number,
  e: HitEffect,
  moveId: string,
  kind: MoveKind,
  dirIfLevel: number,
  y: Fx,
  projectile: boolean,
  blocked: boolean,
  counter: boolean,
  ev: SimEvent[],
): void {
  const a = m.fighters[ai];
  const di = 1 - ai;
  const d = m.fighters[di];
  const dir = projectile ? dirIfLevel : d.x > a.x ? 1 : d.x < a.x ? -1 : dirIfLevel;
  const stop = e.hitstop ?? HITSTOP;

  if (blocked) {
    const chip = kind === 'special' || kind === 'super' ? (e.chip ?? Math.floor(e.damage / 8)) : 0;
    // Chip wears health down but never takes the last point.
    if (chip) d.health = Math.max(1, d.health - chip);
    d.mode = 'blockstun';
    d.timer = e.blockstun;
    d.crouching = (d.input.held & DOWN) !== 0;
    d.move = '';
    d.vx = 0;
    if (e.pull !== undefined && e.pullOnBlock) pull(m, a, d, e.pull);
    else setSlide(d, dir, e.push);
    d.hitstop = BLOCKSTOP;
    if (!projectile) a.hitstop = BLOCKSTOP;
    gainMeter(a, Math.floor(e.damage / 4));
    gainMeter(d, Math.floor(e.damage / 8));
    ev.push({ type: 'block', attacker: ai, defender: di, move: moveId, chip, x: d.x, y });
    return;
  }

  // Armour soaks one hit: the damage lands but the move carries on.
  if (d.mode === 'move' && !d.armorUsed && !e.armorBreak && inWindow(d.moveFrame, moveOf(d).armor)) {
    d.armorUsed = true;
    const ko = takeDamage(d, e.damage);
    if (ko) d.koMove = moveId;
    d.hitstop = stop;
    if (!projectile) a.hitstop = stop;
    gainMeter(a, e.damage);
    ev.push({ type: 'armor', player: di, move: d.move });
    if (ko) {
      launch(d, dir, KNOCK_VY, false);
      ev.push({ type: 'ko', player: di });
    }
    return;
  }

  if (kind === 'super') {
    a.mode = 'cinematic';
    a.timer = TD_CINEMATIC_FRAMES;
    a.victim = false;
    a.vx = 0;
    d.mode = 'cinematic';
    d.timer = TD_CINEMATIC_FRAMES;
    d.victim = true;
    d.move = '';
    d.vx = 0;
    d.vy = 0;
    d.slide = 0;
    ev.push({ type: 'superHit', player: ai });
    return;
  }

  // Counter hits freeze a little longer, so they read.
  const hitStop = stop + (counter ? COUNTER_HITSTOP : 0);
  const scale = Math.max(SCALE_MIN, 100 - SCALE_STEP * d.combo);
  const dmg = Math.max(1, Math.floor((e.damage * scale) / 100));
  d.combo++;
  const wasAir = airborne(d);
  const ko = takeDamage(d, dmg);
  d.move = '';
  if (ko) {
    d.koMove = moveId;
    launch(d, dir, KNOCK_VY, false);
  }
  else if (wasAir || e.launch !== undefined || e.knockdown) {
    const juggle = wasAir ? d.juggle + 1 : 0;
    launch(d, dir, e.launch ?? (e.knockdown ? KNOCK_VY : JUGGLE_POP), !e.knockdown);
    d.juggle = juggle;
  } else {
    d.mode = 'hitstun';
    d.timer = e.hitstun + (counter ? COUNTER_HITSTUN : 0);
    d.vx = 0;
    setSlide(d, dir, e.push);
  }
  if (e.pull !== undefined) pull(m, a, d, e.pull);
  d.hitstop = hitStop;
  if (!projectile) a.hitstop = hitStop;
  gainMeter(a, dmg + (dmg >> 1));
  gainMeter(d, dmg);
  ev.push({ type: 'hit', attacker: ai, defender: di, move: moveId, damage: dmg, height: e.height, counter, combo: d.combo, x: d.x, y });
  if (ko) ev.push({ type: 'ko', player: di });
}

function pull(m: MatchState, a: FighterState, d: FighterState, dist: Fx): void {
  const w = wallX(m, d);
  d.x = clamp(a.x + a.facing * dist, -w, w);
  d.slide = 0;
}

/** A stage hazard: unblockable (it was announced), no combo scaling, no meter. */
export function applyHazardHit(m: MatchState, di: number, e: HitEffect, hazard: string, ev: SimEvent[]): void {
  const d = m.fighters[di];
  const o = m.fighters[1 - di];
  const dir = d.x >= o.x ? 1 : -1;
  const wasAir = airborne(d);
  const ko = takeDamage(d, e.damage);
  d.move = '';
  if (ko) launch(d, dir, KNOCK_VY, false);
  else if (wasAir || e.launch !== undefined || e.knockdown) launch(d, dir, e.launch ?? KNOCK_VY, false);
  else {
    d.mode = 'hitstun';
    d.timer = e.hitstun;
    d.vx = 0;
    setSlide(d, dir, e.push);
  }
  d.hitstop = HITSTOP;
  ev.push({ type: 'hazardHit', player: di, hazard, damage: e.damage });
  if (ko) ev.push({ type: 'ko', player: di });
}
