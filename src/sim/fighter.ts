/**
 * One fighter's step, in three passes the match runs for both players in
 * turn: tick (timers and move frames advance), control (inputs choose what
 * happens next) and physics (movement, landing, walls). Hits are resolved
 * afterwards in combat.ts, once both fighters have moved.
 */
import {
  AIR_ATTACK_LAND_FRAMES,
  BAR,
  BOOST_WINDOW,
  CUT_AWAY_BARS,
  CUT_AWAY_FRAMES,
  CUT_AWAY_HEALTH_PCT,
  DOWN_FRAMES,
  GETUP_FRAMES,
  GRAVITY,
  JUMP_LAND_FRAMES,
  KNOCK_VX,
  KNOCK_VY,
  PREJUMP_FRAMES,
  SLIDE_FRICTION,
  TAPE_SKIP_FRAMES,
  TAPE_SKIP_SPEED,
  TD_DAMAGE_PCT,
  TD_HEALTH_PCT,
  TECH_FRAMES,
  TECH_PUSH,
  THROW_HOLD,
  THROW_TECH,
} from './constants';
import type { SimEvent } from './events';
import { fighterData, moveData } from './fighters';
import { approach, clamp, fx, type Fx } from './fixed';
import { ATTACK_BITS, BLOCK, DOWN, INTERACT, METER, SPECIAL, THROW, UP, backBit, bufferedAttack, consume, doubleTapped, forwardBit, pressed } from './input';
import { kickProp, propInReach } from './stage';
import { segmentData, stageData } from './stages';
import type { FighterState, MatchState } from './state';
import type { MoveData } from './types';

const BACK_THROW_OFFSET = fx(0.7);

export function moveOf(f: FighterState): MoveData {
  return moveData(f.fighter, f.move);
}

export function airborne(f: FighterState): boolean {
  return f.y > 0 || f.mode === 'air' || f.mode === 'launched' || (f.mode === 'move' && moveOf(f).kind === 'air');
}

export function inWindow(frame: number, w: readonly [number, number] | undefined): boolean {
  return w !== undefined && frame >= w[0] && frame <= w[1];
}

/** How far from centre a fighter's middle can go before their pushbox meets the wall. */
export function wallX(m: MatchState, f: FighterState): Fx {
  return stageData(m.stage).segments[m.segment].halfWidth - fighterData(f.fighter).pushW;
}

export function toIdle(f: FighterState): void {
  f.mode = 'idle';
  f.vx = 0;
  f.move = '';
  f.crouching = false;
  f.combo = 0;
  f.juggle = 0;
}

export function startMove(f: FighterState, id: string): void {
  const mv = moveData(f.fighter, id);
  f.mode = 'move';
  f.move = id;
  f.moveFrame = 1;
  f.hitMask = 0;
  f.contact = 'none';
  f.armorUsed = false;
  f.crouching = mv.stance === 'crouch';
  if (mv.kind !== 'air') f.vx = 0;
}

/** Into the air, falling: juggleable or (knockdowns, KOs) not. */
export function launch(f: FighterState, dir: number, vy: Fx, juggleable: boolean): void {
  f.mode = 'launched';
  f.move = '';
  f.vy = vy;
  f.vx = dir * KNOCK_VX;
  f.slide = 0;
  f.juggleable = juggleable;
  f.crouching = false;
}

export function setSlide(f: FighterState, dir: number, speed: Fx): void {
  f.slide = speed;
  f.slideDir = dir < 0 ? -1 : 1;
}

/** Returns true if this took the fighter's last health. */
export function takeDamage(f: FighterState, dmg: number): boolean {
  f.health = Math.max(0, f.health - dmg);
  if (f.health === 0 && !f.ko) {
    f.ko = true;
    return true;
  }
  return false;
}

// ---- tick ----

export function tick(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  switch (f.mode) {
    case 'move': {
      const mv = moveOf(f);
      if (f.moveFrame < mv.total) f.moveFrame++;
      else if (mv.kind === 'air') f.mode = 'air';
      else toIdle(f);
      return;
    }
    case 'hitstun':
    case 'blockstun':
    case 'prejump':
    case 'landing':
    case 'dash':
    case 'backdash':
    case 'down':
    case 'getup':
    case 'recover':
    case 'throwing':
    case 'thrown':
    case 'cinematic':
      if (f.timer > 0) f.timer--;
      else endTimed(m, i, ev);
      return;
    default:
      return;
  }
}

function endTimed(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const d = fighterData(f.fighter);
  switch (f.mode) {
    case 'prejump':
      f.mode = 'air';
      f.vy = d.jumpVy;
      f.vx = f.jumpDir * f.facing * d.jumpVx;
      f.airAttackUsed = false;
      return;
    case 'down':
      f.mode = 'getup';
      f.timer = GETUP_FRAMES - 1;
      return;
    case 'thrown':
      landThrow(m, i, ev);
      return;
    case 'cinematic':
      if (f.victim) landSuper(m, i, ev);
      else toIdle(f);
      return;
    default:
      toIdle(f);
  }
}

function landThrow(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const t = m.fighters[1 - i];
  const grabMove = f.grabMove || fighterData(t.fighter).throwMove;
  const dmg = moveData(t.fighter, grabMove).throwData!.damage;
  let dir: number = t.facing;
  if (t.throwBack) {
    const w = wallX(m, f);
    f.x = clamp(t.x - t.facing * BACK_THROW_OFFSET, -w, w);
    dir = -t.facing;
  }
  const ko = takeDamage(f, dmg);
  launch(f, dir, KNOCK_VY, false);
  ev.push({ type: 'hit', attacker: 1 - i, defender: i, move: grabMove, damage: dmg, height: 'mid', counter: false, combo: 1, x: f.x, y: f.y });
  if (ko) ev.push({ type: 'ko', player: i });
}

function landSuper(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const a = m.fighters[1 - i];
  const dmg = Math.floor((f.maxHealth * TD_DAMAGE_PCT) / 100);
  f.victim = false;
  const ko = takeDamage(f, dmg);
  launch(f, f.x >= a.x ? 1 : -1, KNOCK_VY, false);
  ev.push({ type: 'hit', attacker: 1 - i, defender: i, move: 'td', damage: dmg, height: 'mid', counter: false, combo: 1, x: f.x, y: f.y });
  if (ko) ev.push({ type: 'ko', player: i });
}

// ---- control ----

export function control(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  switch (f.mode) {
    case 'idle':
    case 'walk':
    case 'crouch':
    case 'guard':
      groundControl(m, i, ev);
      return;
    case 'move':
      moveControl(f, i, ev);
      return;
    case 'air':
      airControl(f);
      return;
    case 'hitstun':
    case 'launched':
      cutAway(m, i, ev);
      return;
    case 'thrown':
      if (f.techable && THROW_HOLD - f.timer <= THROW_TECH && pressed(f.input, THROW)) {
        consume(f.input, THROW);
        tech(m, ev, i);
      }
      return;
    default:
      return;
  }
}

function scaled(v: Fx, pct: number): Fx {
  return pct === 100 ? v : Math.floor((v * pct) / 100);
}

function canTD(f: FighterState): boolean {
  return !f.tdUsed && f.health > 0 && f.health * 100 < f.maxHealth * TD_HEALTH_PCT;
}

function startSpecial(f: FighterState, i: number, ev: SimEvent[]): void {
  const d = fighterData(f.fighter);
  const id = d.specials[f.input.specialDir] ?? d.specials.f;
  // Only Throw (held back) throws backwards.
  f.throwBack = false;
  startMove(f, id);
  ev.push({ type: 'special', player: i, move: id });
}

function groundControl(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const o = m.fighters[1 - i];
  const d = fighterData(f.fighter);
  const inp = f.input;
  if (o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  const fwd = forwardBit(f.facing);
  const back = backBit(f.facing);
  const held = inp.held;
  // Segment rules (knee-deep water) slow walking and dashing for both.
  const pct = segmentData(m.stage, m.segment).walkPct ?? 100;

  if (held & BLOCK) {
    if (pressed(inp, SPECIAL) && canTD(f)) {
      consume(inp, SPECIAL);
      f.tdUsed = true;
      startMove(f, d.superMove);
      ev.push({ type: 'superStart', player: i });
      return;
    }
    f.mode = 'guard';
    f.crouching = (held & DOWN) !== 0;
    f.vx = 0;
    return;
  }
  if (pressed(inp, INTERACT) && propInReach(m, f) >= 0) {
    consume(inp, INTERACT);
    startMove(f, d.interactMove);
    return;
  }
  if (pressed(inp, THROW)) {
    consume(inp, THROW);
    f.throwBack = (held & back) !== 0;
    startMove(f, d.throwMove);
    return;
  }
  if (pressed(inp, SPECIAL)) {
    consume(inp, SPECIAL);
    startSpecial(f, i, ev);
    return;
  }
  const atk = bufferedAttack(inp);
  if (atk) {
    consume(inp, ATTACK_BITS[atk]);
    const n = d.normals;
    const id = held & DOWN ? n.c[atk] : ((held & fwd && n.f[atk]) || (held & back && n.b[atk]) || n.s[atk]);
    startMove(f, id);
    return;
  }
  if (doubleTapped(inp, fwd)) {
    consume(inp, fwd);
    f.mode = 'dash';
    f.timer = d.dash.frames - 1;
    f.vx = f.facing * scaled(d.dash.speed, pct);
    f.crouching = false;
    return;
  }
  if (doubleTapped(inp, back)) {
    consume(inp, back);
    f.mode = 'backdash';
    f.timer = d.backdash.frames - 1;
    f.vx = -f.facing * scaled(d.backdash.speed, pct);
    f.crouching = false;
    return;
  }
  if (held & UP) {
    f.mode = 'prejump';
    f.timer = PREJUMP_FRAMES - 1;
    f.jumpDir = held & fwd ? 1 : held & back ? -1 : 0;
    f.vx = 0;
    f.crouching = false;
    return;
  }
  if (held & DOWN) {
    f.mode = 'crouch';
    f.crouching = true;
    f.vx = 0;
  } else if (held & fwd) {
    f.mode = 'walk';
    f.crouching = false;
    f.vx = f.facing * scaled(d.walkFwd, pct);
  } else if (held & back) {
    f.mode = 'walk';
    f.crouching = false;
    f.vx = -f.facing * scaled(d.walkBack, pct);
  } else {
    f.mode = 'idle';
    f.crouching = false;
    f.vx = 0;
  }
}

/** Inside a move: boost a special, Tape Skip the recovery, chain a string or cancel into a special. */
function moveControl(f: FighterState, i: number, ev: SimEvent[]): void {
  const mv = moveOf(f);
  if (mv.kind === 'air' || mv.kind === 'throw' || mv.kind === 'super') return;
  const inp = f.input;
  // Only presses made during this move count, so a held or early press can't fire twice.
  const since = f.moveFrame;
  if (mv.boost && f.moveFrame <= BOOST_WINDOW && f.meter >= BAR && pressed(inp, SPECIAL, since)) {
    consume(inp, SPECIAL);
    f.meter -= BAR;
    f.move = mv.boost;
    ev.push({ type: 'boost', player: i, move: mv.boost });
    return;
  }
  if (mv.startup > 0 && f.moveFrame >= mv.startup && f.meter >= BAR && pressed(inp, METER, since)) {
    consume(inp, METER);
    f.meter -= BAR;
    f.mode = 'dash';
    f.move = '';
    f.timer = TAPE_SKIP_FRAMES - 1;
    f.vx = f.facing * TAPE_SKIP_SPEED;
    f.crouching = false;
    ev.push({ type: 'tapeSkip', player: i });
    return;
  }
  if (inWindow(f.moveFrame, mv.cancel)) {
    if (pressed(inp, SPECIAL, since)) {
      consume(inp, SPECIAL);
      startSpecial(f, i, ev);
      return;
    }
    const atk = bufferedAttack(inp, since);
    const next = atk && mv.chain[atk];
    if (atk && next) {
      consume(inp, ATTACK_BITS[atk]);
      startMove(f, next);
    }
  }
}

function airControl(f: FighterState): void {
  if (f.airAttackUsed) return;
  const atk = bufferedAttack(f.input);
  if (!atk) return;
  consume(f.input, ATTACK_BITS[atk]);
  f.airAttackUsed = true;
  startMove(f, fighterData(f.fighter).normals.j[atk]);
}

/** Cut Away: 2 bars and 5% health to knock the attacker away mid-combo, once a round. */
function cutAway(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  if (f.ko || f.cutAwayUsed || f.meter < CUT_AWAY_BARS * BAR) return;
  if (f.mode === 'launched' && !f.juggleable) return;
  if (!pressed(f.input, METER)) return;
  const cost = Math.floor((f.maxHealth * CUT_AWAY_HEALTH_PCT) / 100);
  if (f.health <= cost) return;
  consume(f.input, METER);
  f.meter -= CUT_AWAY_BARS * BAR;
  f.health -= cost;
  f.cutAwayUsed = true;
  f.mode = 'recover';
  f.timer = CUT_AWAY_FRAMES - 1;
  f.vx = 0;
  f.vy = 0;
  f.slide = 0;
  f.combo = 0;
  f.juggle = 0;
  const o = m.fighters[1 - i];
  o.hitstop = 0;
  launch(o, o.x >= f.x ? 1 : -1, KNOCK_VY, false);
  o.vx *= 2;
  ev.push({ type: 'cutAway', player: i });
}

/** A broken throw: both slide apart and recover. */
export function tech(m: MatchState, ev: SimEvent[], player: number): void {
  const [a, b] = m.fighters;
  const dir = b.x >= a.x ? 1 : -1;
  for (const f of m.fighters) {
    f.mode = 'recover';
    f.timer = TECH_FRAMES - 1;
    f.move = '';
    f.vx = 0;
    f.crouching = false;
  }
  setSlide(a, -dir, TECH_PUSH);
  setSlide(b, dir, TECH_PUSH);
  ev.push({ type: 'throwTech', player });
}

// ---- physics ----

export function physics(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  if (f.mode === 'move') {
    const mv = moveOf(f);
    for (let k = 0; k < mv.spawns.length; k++) if (mv.spawns[k].frame === f.moveFrame) spawnProjectile(m, i, mv, k);
    if (mv.interactFrame === f.moveFrame) kickProp(m, i, ev);
    if (mv.teleport && mv.teleport.frame === f.moveFrame) teleport(m, i, mv.teleport.to, ev);
    if (mv.kind !== 'air') {
      f.vx = 0;
      for (const mo of mv.motion) if (inWindow(f.moveFrame, mo.frames)) f.vx = f.facing * mo.vx;
    }
  }
  if (airborne(f)) {
    f.vy -= GRAVITY;
    f.y += f.vy;
    f.x += f.vx;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      land(f, i, ev);
    }
  } else {
    f.x += f.vx;
  }
  // The forecast's wind pushes everyone the same way.
  if (m.wind !== 0 && f.mode !== 'thrown' && f.mode !== 'cinematic' && f.mode !== 'down' && f.mode !== 'ko') f.x += m.wind;
  const w = wallX(m, f);
  if (f.slide > 0) {
    const want = f.x + f.slideDir * f.slide;
    f.slide = approach(f.slide, 0, SLIDE_FRICTION);
    f.x = clamp(want, -w, w);
    // Pushed into the wall: the attacker takes the rest of the push.
    const over = want - f.x;
    if (over !== 0) {
      const o = m.fighters[1 - i];
      const ow = wallX(m, o);
      o.x = clamp(o.x - over, -ow, ow);
    }
  }
  f.x = clamp(f.x, -w, w);
}

const BEHIND = fx(0.8);
const AWAY = fx(3);

/** Reappear behind the opponent (in front if the wall's in the way), or well back from them; then face them. */
function teleport(m: MatchState, i: number, to: 'behind' | 'away', ev: SimEvent[]): void {
  const f = m.fighters[i];
  const o = m.fighters[1 - i];
  const w = wallX(m, f);
  const dir = o.x >= f.x ? 1 : -1;
  if (to === 'behind') {
    const x = o.x + dir * BEHIND;
    f.x = Math.abs(x) <= w ? x : o.x - dir * BEHIND;
  } else f.x = clamp(f.x - dir * AWAY, -w, w);
  f.x = clamp(f.x, -w, w);
  f.y = 0;
  f.vx = 0;
  f.slide = 0;
  if (o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  ev.push({ type: 'teleport', player: i, x: f.x });
}

function land(f: FighterState, i: number, ev: SimEvent[]): void {
  switch (f.mode) {
    case 'air':
      f.mode = 'landing';
      f.timer = JUMP_LAND_FRAMES - 1;
      f.vx = 0;
      return;
    case 'move':
      f.mode = 'landing';
      f.timer = AIR_ATTACK_LAND_FRAMES - 1;
      f.move = '';
      f.vx = 0;
      return;
    case 'launched':
      f.vx = 0;
      f.combo = 0;
      f.juggle = 0;
      if (f.ko) f.mode = 'ko';
      else {
        f.mode = 'down';
        f.timer = DOWN_FRAMES - 1;
      }
      ev.push({ type: 'knockdown', player: i });
      return;
    default:
      f.vx = 0;
  }
}

function spawnProjectile(m: MatchState, i: number, mv: MoveData, k: number): void {
  const p = m.projectiles.find((q) => !q.active);
  if (!p) return;
  const f = m.fighters[i];
  const pd = mv.spawns[k].projectile;
  p.active = true;
  p.owner = i;
  p.move = mv.id;
  p.spawn = k;
  p.dir = f.facing;
  p.x = f.x + f.facing * pd.x;
  p.y = f.y + pd.y;
  p.life = pd.life;
  p.hitsLeft = pd.hits;
  p.rehit = 0;
}

/** Pushboxes keep the fighters apart, except where a move passes through. */
function solid(f: FighterState): boolean {
  if (f.mode === 'down' || f.mode === 'thrown' || f.mode === 'cinematic' || f.mode === 'ko') return false;
  return !(f.mode === 'move' && inWindow(f.moveFrame, moveOf(f).passThrough));
}

export function resolvePush(m: MatchState): void {
  const [a, b] = m.fighters;
  if (!solid(a) || !solid(b)) return;
  const da = fighterData(a.fighter);
  const db = fighterData(b.fighter);
  const ha = a.crouching ? da.pushHCrouch : da.pushH;
  const hb = b.crouching ? db.pushHCrouch : db.pushH;
  if (!(a.y < b.y + hb && b.y < a.y + ha)) return;
  const dx = b.x - a.x;
  const minD = da.pushW + db.pushW;
  const ad = Math.abs(dx);
  if (ad >= minD) return;
  const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.facing;
  const overlap = minD - ad;
  const half = overlap >> 1;
  const wa = wallX(m, a);
  const wb = wallX(m, b);
  a.x = clamp(a.x - dir * half, -wa, wa);
  b.x = clamp(b.x + dir * (overlap - half), -wb, wb);
  // One of them is against a wall: the other gives way.
  if ((b.x - a.x) * dir < minD) {
    if (Math.abs(a.x) === wa) b.x = clamp(a.x + dir * minD, -wb, wb);
    else a.x = clamp(b.x - dir * minD, -wa, wa);
  }
}

export function updateProjectiles(m: MatchState): void {
  for (const p of m.projectiles) {
    if (!p.active) continue;
    const pd = moveData(m.fighters[p.owner].fighter, p.move).spawns[p.spawn].projectile;
    p.x += p.dir * pd.vx;
    p.y += pd.vy;
    p.life--;
    if (p.rehit > 0) p.rehit--;
    const edge = stageData(m.stage).segments[m.segment].halfWidth + fx(1);
    if (p.life <= 0 || (pd.groundEnds && p.y <= 0) || Math.abs(p.x) > edge) p.active = false;
  }
}
