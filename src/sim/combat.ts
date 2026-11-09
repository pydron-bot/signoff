/**
 * Hit resolution, once both fighters have moved this step. Everything that
 * connects is found first and then applied, so two attacks landing on the
 * same frame trade instead of the first player winning.
 */
import {
  BLOCKSTOP,
  COUNTER_HITSTOP,
  DONATIONS_MAX,
  GUARD_CRUSH_STUN,
  COUNTER_READ_STOP,
  COUNTER_HITSTUN,
  HITSTOP,
  HITSTOP_BY_WEIGHT,
  JUGGLE_DECAY,
  JUGGLE_POP,
  JUGGLE_POP_MIN,
  KNOCK_VY,
  MAX_JUGGLE,
  PUNISH_DAMAGE_PCT,
  PUNISH_METER,
  RELAUNCH_DAMAGE,
  RELAUNCH_PULL,
  RELAUNCH_VY,
  REPEAT_KEEP,
  SLAM_VY,
  WALL_BOUNCE_RANGE,
  WALL_BOUNCE_VX,
  WALL_BOUNCE_VY,
  WEIGHT_HEAVY,
  WEIGHT_MEDIUM,
  METER_MAX,
  FLAWLESS_BLOCKSTUN_CUT,
  FLAWLESS_METER,
  FLAWLESS_WINDOW,
  METER_SCALE_MIN,
  METER_SCALE_STEP,
  SCALE_MIN,
  SCALE_STEP,
  TD_CINEMATIC_FRAMES,
  THROWER_FRAMES,
  THROW_HOLD,
} from './constants';
import type { SimEvent } from './events';
import { segmentData } from './stages';
import { airborne, firstHit, inWindow, launch, moveOf, setSlide, startMove, takeDamage, tech, toIdle, wallX } from './fighter';
import { fighterData, moveData } from './fighters';
import { clamp, type Fx } from './fixed';
import { BLOCK, DOWN, bitIndex } from './input';
import type { FighterState, MatchState } from './state';
import type { Box, HitEffect, HitWeight, MoveKind } from './types';

// Scratch for one step's pending contacts (not match state: rebuilt every step).
const pendingHit = [-1, -1];
const pendingMove = ['', ''];
const pendingBlocked = [false, false];
const pendingCounter = [false, false];
const pendingThrow = [false, false];
/** The defender is in a counter's window: the strike is read, not landed. */
const pendingRead = [false, false];
/** The decoy a strike hit instead of the fighter, or -1. */
const pendingDecoy = [-1, -1];
const projHits: number[] = [];
const projBlocked: boolean[] = [];

function boxesTouch(ax: Fx, ay: Fx, adir: number, ab: Box, bx: Fx, by: Fx, bdir: number, bb: Box): boolean {
  const a0 = adir > 0 ? ax + ab.x : ax - ab.x - ab.w;
  const b0 = bdir > 0 ? bx + bb.x : bx - bb.x - bb.w;
  return a0 < b0 + bb.w && b0 < a0 + ab.w && ay + ab.y < by + bb.y + bb.h && by + bb.y < ay + ab.y + ab.h;
}

/**
 * The body's hurtbox for the state it's in. Thrown up or knocked down, the
 * body is falling back, so the box is long and low (it lies behind them).
 * On the floor it's the same box on the ground, though nothing can hit it.
 */
export function hurtBox(f: FighterState): Box {
  const hurt = fighterData(f.fighter).hurt;
  if (f.mode === 'launched' || f.mode === 'down' || f.mode === 'ko' || f.mode === 'getup') return hurt.juggle;
  return airborne(f) ? hurt.air : f.crouching ? hurt.crouch : hurt.stand;
}

/** Does a box at (x, y) facing dir touch any of this fighter's hurtboxes? */
export function touchesFighter(x: Fx, y: Fx, dir: number, b: Box, d: FighterState): boolean {
  const base = hurtBox(d);
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

function throwable(f: FighterState, reeling = false): boolean {
  if (f.ko || f.y > 0) return false;
  switch (f.mode) {
    case 'hitstun':
      return reeling;
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
      return mv.stance !== 'air' && !inWindow(f.moveFrame, mv.invuln);
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

/**
 * Repeat scaling: the % of damage a move keeps for its earlier uses in this
 * combo (REPEAT_KEEP for each). A boosted special counts as its plain move.
 * A move's first connecting hit records the use.
 */
function repeatKeep(d: FighterState, moveId: string, fresh: boolean): number {
  const id = moveId.endsWith('+') ? moveId.slice(0, -1) : moveId;
  let uses = 0;
  for (let k = 0; k < d.comboMoves.length; k++) if (d.comboMoves[k] === id) uses++;
  if (fresh) d.comboMoves.push(id);
  else uses = Math.max(0, uses - 1);
  let keep = 100;
  for (let k = 0; k < uses; k++) keep = Math.floor((keep * REPEAT_KEEP) / 100);
  return keep;
}

/** Meter from hits and blocks, scaled by the segment's rule (the oven's heat). */
function gainMeter(m: MatchState, f: FighterState, n: number): void {
  const pct = segmentData(m.stage, m.segment).meterPct ?? 100;
  f.meter = Math.min(METER_MAX, f.meter + Math.floor((n * pct) / 100));
}

export function resolveHits(m: MatchState, ev: SimEvent[], frozen: readonly boolean[]): void {
  const fs = m.fighters;
  for (let i = 0; i < 2; i++) {
    pendingHit[i] = -1;
    pendingThrow[i] = false;
    pendingDecoy[i] = -1;
    pendingRead[i] = false;
    const a = fs[i];
    const d = fs[1 - i];
    if (frozen[i] || a.mode !== 'move') continue;
    const mv = moveOf(a);
    if (mv.throwData) {
      if (inWindow(a.moveFrame, mv.throwData.frames) && throwable(d, mv.throwData.reeling) && Math.abs(d.x - a.x) <= mv.throwData.range) pendingThrow[i] = true;
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
        pendingRead[i] = countering(d);
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
    if (pendingRead[i]) {
      read(fs[1 - i], a, 1 - i, ev);
      continue;
    }
    a.contact = pendingBlocked[i] ? 'block' : 'hit';
    // Only a boosted special's first hit relaunches, so a multi-hit one can't spend them all.
    const fresh = (a.hitMask & (a.hitMask - 1)) === 0;
    const relaunch = mv.boosted === true && fresh;
    applyHit(m, i, h, mv.id, mv.kind, a.facing, a.y + h.box.y + (h.box.h >> 1), false, pendingBlocked[i], pendingCounter[i], ev, relaunch, fresh);
  }
  for (let n = 0; n < projHits.length; n++) {
    const P = ps[projHits[n]];
    const pd = projData(m, projHits[n]);
    const fresh = P.hitsLeft === pd.hits;
    const relaunch = moveData(fs[P.owner].fighter, P.move).boosted === true && fresh;
    applyHit(m, P.owner, pd.effect, P.move, 'special', P.dir, P.y + (pd.box.h >> 1), true, projBlocked[n], false, ev, relaunch, fresh);
    P.rehit = pd.rehit;
    if (--P.hitsLeft <= 0) P.active = false;
    // The collection plate: every connection is a donation.
    const o = fs[P.owner];
    if (pd.collects && o.donations < DONATIONS_MAX) {
      o.donations++;
      ev.push({ type: 'donation', player: P.owner, total: o.donations, spent: 0 });
    }
  }

  // Throws lose to strikes: a thrower who was just hit is no longer throwing.
  const t0 = pendingThrow[0] && stillThrowing(fs[0]) && throwable(fs[1], moveOf(fs[0]).throwData!.reeling);
  const t1 = pendingThrow[1] && stillThrowing(fs[1]) && throwable(fs[0], moveOf(fs[1]).throwData!.reeling);
  if (t0 && t1) tech(m, ev, 0);
  else if (t0) grab(m, 0, ev);
  else if (t1) grab(m, 1, ev);
}

/** In a counter's window (Teleprompter), reading strikes. */
function countering(d: FighterState): boolean {
  return d.mode === 'move' && inWindow(d.moveFrame, moveOf(d).counter?.frames);
}

/** The strike is read: nothing lands (and it can't be cancelled from), both freeze, and the reader answers. */
function read(d: FighterState, a: FighterState, di: number, ev: SimEvent[]): void {
  const into = moveOf(d).counter!.into;
  ev.push({ type: 'counter', player: di, move: a.move });
  a.contact = 'block';
  a.hitstop = COUNTER_READ_STOP;
  startMove(d, into);
  d.hitstop = COUNTER_READ_STOP;
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
  /** A boosted special's first hit: relaunches a juggled body (1 bar). */
  relaunch = false,
  /** The move's first hit to connect (the later hits of a multi-hit move share its repeat scaling). */
  fresh = true,
): void {
  const a = m.fighters[ai];
  const di = 1 - ai;
  const d = m.fighters[di];
  const dir = projectile ? dirIfLevel : d.x > a.x ? 1 : d.x < a.x ? -1 : dirIfLevel;
  const stop = e.hitstop ?? HITSTOP;

  if (blocked) {
    // Block pressed just before the hit: flawless, no chip, out of blockstun sooner.
    const flawless = d.input.age[bitIndex(BLOCK)] <= FLAWLESS_WINDOW;
    const chip = flawless ? 0 : kind === 'special' || kind === 'super' ? (e.chip ?? Math.floor(e.damage / 8)) : 0;
    // Chip wears health down but never takes the last point.
    if (chip) d.health = Math.max(1, d.health - chip);
    d.mode = 'blockstun';
    d.timer = flawless ? Math.max(1, e.blockstun - FLAWLESS_BLOCKSTUN_CUT) : e.blockstun;
    if (flawless) {
      gainMeter(m, d, FLAWLESS_METER);
      ev.push({ type: 'flawless', player: di });
    }
    d.crouching = (d.input.held & DOWN) !== 0;
    d.move = '';
    d.vx = 0;
    if (e.pull !== undefined && e.pullOnBlock) pull(m, a, d, e.pull);
    else setSlide(d, dir, e.push);
    d.hitstop = BLOCKSTOP;
    if (!projectile) a.hitstop = BLOCKSTOP;
    gainMeter(m, a, Math.floor(e.damage / 4));
    gainMeter(m, d, Math.floor(e.damage / 8));
    ev.push({ type: 'block', attacker: ai, defender: di, move: moveId, chip, x: d.x, y });
    if (e.guardCrush) {
      // The guard gives: they reel as if hit, and the next blow isn't blocked.
      d.mode = 'hitstun';
      d.timer = GUARD_CRUSH_STUN;
      d.hitstop = HITSTOP;
      if (!projectile) a.hitstop = HITSTOP;
      ev.push({ type: 'guardCrush', attacker: ai, defender: di, move: moveId, x: d.x, y });
    }
    return;
  }

  // Armour soaks one hit: the damage lands but the move carries on.
  if (d.mode === 'move' && !d.armorUsed && !e.armorBreak && inWindow(d.moveFrame, moveOf(d).armor)) {
    d.armorUsed = true;
    const ko = takeDamage(d, e.damage);
    if (ko) d.koMove = moveId;
    d.hitstop = stop;
    if (!projectile) a.hitstop = stop;
    gainMeter(m, a, e.damage);
    ev.push({ type: 'armor', player: di, move: d.move });
    if (ko) {
      launch(d, dir, KNOCK_VY, false);
      ev.push({ type: 'ko', player: di });
    }
    return;
  }

  if (kind === 'super') {
    // Landed: spent for the match.
    a.tdUsed = true;
    a.tdCooldown = 0;
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

  const scale = Math.max(SCALE_MIN, 100 - SCALE_STEP * d.combo);
  const wasAir = airborne(d);
  const relaunching = relaunch && wasAir;
  const keep = repeatKeep(d, moveId, fresh);
  // Caught in a move's recovery (it whiffed or was blocked): a punish, worth more.
  const dm = d.mode === 'move' ? moveOf(d) : null;
  const punish = d.combo === 0 && dm !== null && dm.startup > 0 && d.moveFrame > dm.lastActive;
  const base = punish ? Math.floor((e.damage * PUNISH_DAMAGE_PCT) / 100) : e.damage;
  const dmg = Math.max(1, Math.floor((base * scale * keep) / 10000) + (relaunching ? Math.floor((RELAUNCH_DAMAGE * scale * keep) / 10000) : 0));
  if (punish) {
    gainMeter(m, a, PUNISH_METER);
    ev.push({ type: 'punish', player: ai });
  }
  // A move straight off the floor that connects: a reversal.
  if (!projectile && a.reversal) {
    a.reversal = false;
    ev.push({ type: 'reversal', player: ai });
  }
  d.combo++;
  const juggle = wasAir ? d.juggle + 1 : 0;
  const ko = takeDamage(d, dmg);
  d.move = '';
  // Anything that ends the exchange on the ground lands as an ender; a launcher on a body already up is one more juggle hit.
  let ender = ko || relaunching;
  if (ko) {
    d.koMove = moveId;
    launch(d, dir, KNOCK_VY, false);
  } else if (relaunching) {
    // A boosted special (1 bar) pops a juggled body back up to full height.
    launch(d, dir, RELAUNCH_VY, true);
    d.vx = 0;
    if (!projectile) pull(m, a, d, RELAUNCH_PULL);
    d.juggle = juggle;
    // The special stops there, so the attacker is free to follow them up.
    if (!projectile) toIdle(a);
    ev.push({ type: 'relaunch', player: di, how: 'special', x: d.x, y: d.y });
  } else if (e.groundBounce && !d.groundBounced) {
    // Slammed down: not hittable until they come back up off the floor.
    launch(d, dir, SLAM_VY, false);
    d.vx = 0;
    d.bounce = 'ground';
    d.juggle = juggle;
    ender = true;
  } else if (e.wallBounce && !d.wallBounced && wallX(m, d) - dir * d.x <= WALL_BOUNCE_RANGE) {
    launch(d, dir, WALL_BOUNCE_VY, false);
    d.vx = dir * WALL_BOUNCE_VX;
    d.bounce = 'wall';
    d.juggle = juggle;
    ender = true;
  } else if (wasAir || e.launch !== undefined || e.knockdown) {
    // A launcher only launches from the ground: on a body already in the air it's one more juggle hit.
    let pop = e.knockdown ? KNOCK_VY : wasAir ? JUGGLE_POP : (e.launch ?? JUGGLE_POP);
    // Each juggle hit pops them lower: juggles wind down on their own.
    if (wasAir && !e.knockdown) pop = Math.floor((pop * Math.max(JUGGLE_POP_MIN, 100 - JUGGLE_DECAY * juggle)) / 100);
    launch(d, dir, pop, !e.knockdown);
    d.juggle = juggle;
    if (e.knockdown || !wasAir) ender = true;
  } else {
    d.mode = 'hitstun';
    d.timer = e.hitstun + (counter ? COUNTER_HITSTUN : 0);
    d.vx = 0;
    setSlide(d, dir, e.push);
  }
  if (e.pull !== undefined) pull(m, a, d, e.pull);
  const weight = hitWeight(e.damage, ender);
  // Heavier strikes freeze longer; a projectile keeps the plain freeze, as its thrower doesn't freeze with it. Counter hits freeze a little longer, so they read.
  const hitStop = (e.hitstop ?? (projectile ? HITSTOP : HITSTOP_BY_WEIGHT[weight])) + (counter ? COUNTER_HITSTOP : 0);
  d.hitstop = hitStop;
  if (!projectile) a.hitstop = hitStop;
  // Later hits of a combo earn the attacker less; the defender's gain isn't scaled, so Cut Away stays in reach.
  const meterPct = Math.max(METER_SCALE_MIN, 100 - METER_SCALE_STEP * (d.combo - 1));
  gainMeter(m, a, Math.floor(((dmg + (dmg >> 1)) * meterPct) / 100));
  gainMeter(m, d, dmg);
  firstHit(m, ai, ev);
  ev.push({ type: 'hit', attacker: ai, defender: di, move: moveId, damage: dmg, height: e.height, counter, combo: d.combo, weight, dir, x: d.x, y });
  if (ko) ev.push({ type: 'ko', player: di });
}

/** How hard a hit lands: an ender, else by its damage before scaling (docs/DESIGN.md, Hit weight). */
export function hitWeight(damage: number, ender: boolean): HitWeight {
  if (ender) return 3;
  return damage >= WEIGHT_HEAVY ? 2 : damage >= WEIGHT_MEDIUM ? 1 : 0;
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
