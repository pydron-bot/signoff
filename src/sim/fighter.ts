/**
 * One fighter's step, in three passes the match runs for both players in
 * turn: tick (timers and move frames advance), control (inputs choose what
 * happens next) and physics (movement, landing, walls). Hits are resolved
 * afterwards in combat.ts, once both fighters have moved.
 */
import {
  AIR_ATTACK_LAND_FRAMES,
  BAR,
  BOOST_TAP,
  REVERSAL_WINDOW,
  BOOST_WINDOW,
  CUT_AWAY_FRAMES,
  DOWN_FRAMES,
  FIRST_HIT_METER,
  DELAYED_GETUP,
  GETUP_FRAMES,
  GRAVITY,
  HOP_PCT,
  GROUND_BOUNCE_VY,
  JUGGLE_GRAVITY,
  JUMP_LAND_FRAMES,
  KNOCK_VX,
  LAUNCH_VX,
  KNOCK_VY,
  METER_MAX,
  PREJUMP_FRAMES,
  SLIDE_FRICTION,
  TAPE_SKIP_FRAMES,
  TAPE_SKIP_SPEED,
  TD_DAMAGE_PCT,
  TD_HEALTH_PCT,
  TD_RECHARGE_FRAMES,
  TECH_FRAMES,
  TECH_PUSH,
  THROW_HOLD,
  THROW_TECH,
  WALL_BOUNCE_BACK_VX,
  WALL_REBOUND_VY,
  CATCH_RANGE,
} from './constants';
import type { SimEvent } from './events';
import { fighterData, moveData } from './fighters';
import { approach, clamp, fx, type Fx } from './fixed';
import { ATTACK_BITS, BLOCK, DOWN, INTERACT, METER, SPECIAL, THROW, UP, backBit, bitIndex, bufferedAttack, consume, doubleTapped, forwardBit, pressed } from './input';
import { kickProp, propInReach } from './stage';
import { segmentData, stageData } from './stages';
import type { FighterState, MatchState } from './state';
import type { Attack, MoveData } from './types';

const BACK_THROW_OFFSET = fx(0.7);

export function moveOf(f: FighterState): MoveData {
  return moveData(f.fighter, f.move);
}

export function airborne(f: FighterState): boolean {
  return f.y > 0 || f.mode === 'air' || f.mode === 'launched' || (f.mode === 'move' && moveOf(f).stance === 'air');
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
  endCombo(f);
}

/** The combo on this fighter is over: scaling, juggles and bounces start fresh. */
export function endCombo(f: FighterState): void {
  f.combo = 0;
  f.juggle = 0;
  f.comboMoves.length = 0;
  f.groundBounced = false;
  f.wallBounced = false;
  f.bounce = 'none';
}

/** The round's first hit (strike, throw or super) is worth a bar to whoever lands it. */
export function firstHit(m: MatchState, ai: number, ev: SimEvent[]): void {
  if (m.firstHit) return;
  m.firstHit = true;
  const a = m.fighters[ai];
  a.meter = Math.min(METER_MAX, a.meter + FIRST_HIT_METER);
  ev.push({ type: 'firstHit', player: ai });
}

export function startMove(f: FighterState, id: string): void {
  const mv = moveData(f.fighter, id);
  f.mode = 'move';
  f.move = id;
  f.moveFrame = 1;
  f.hitMask = 0;
  f.contact = 'none';
  f.armorUsed = false;
  // Straight off the floor: a reversal (said when it hits).
  f.reversal = f.wakeup > 0;
  f.wakeup = 0;
  f.crouching = mv.stance === 'crouch';
  if (mv.stance !== 'air') f.vx = 0;
}

/** Into the air, falling: juggleable or (knockdowns, KOs) not. */
export function launch(f: FighterState, dir: number, vy: Fx, juggleable: boolean): void {
  f.mode = 'launched';
  f.move = '';
  f.vy = vy;
  // A juggle keeps them close enough to follow up; a knockdown sends them away.
  f.vx = dir * (juggleable ? LAUNCH_VX : KNOCK_VX);
  f.slide = 0;
  f.juggleable = juggleable;
  f.crouching = false;
}

export function setSlide(f: FighterState, dir: number, speed: Fx): void {
  f.slide = speed;
  f.slideDir = dir < 0 ? -1 : 1;
}

/** The directions a fighter holds, relative to facing: 1 forward, 2 back, 4 down, 8 up. */
export function heldDirs(f: FighterState): number {
  const h = f.input.held;
  return (h & forwardBit(f.facing) ? 1 : 0) | (h & backBit(f.facing) ? 2 : 0) | (h & DOWN ? 4 : 0) | (h & UP ? 8 : 0);
}

/** The blow that took the last of `d`'s health: which move, and what its attacker held (for cancellations). */
export function markKo(d: FighterState, a: FighterState, move: string): void {
  d.koMove = move;
  d.koHeld = heldDirs(a);
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
  if (f.wakeup > 0 && f.mode !== 'getup') f.wakeup--;
  // Recharging only while the fight is on (and not during its own attempt).
  if (f.tdCooldown > 0 && m.phase === 'fight' && f.move !== fighterData(f.fighter).superMove && --f.tdCooldown === 0 && !f.tdUsed) ev.push({ type: 'superReady', player: i });
  switch (f.mode) {
    case 'move': {
      const mv = moveOf(f);
      if (f.moveFrame < mv.total) f.moveFrame++;
      else if (mv.stance === 'air') f.mode = 'air';
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
      // Out of a launcher, a lower hop: it meets the body on its way up instead of sailing over it.
      f.vy = f.hop ? Math.floor((d.jumpVy * HOP_PCT) / 100) : d.jumpVy;
      f.hop = false;
      f.vx = f.jumpDir * f.facing * d.jumpVx;
      f.airAttackUsed = false;
      f.airSpecialUsed = false;
      return;
    case 'down':
      // Down held: stay down a little longer (once a knockdown), so a timed attack on the getup misses.
      if (!f.getupDelayed && (f.input.held & DOWN) !== 0) {
        f.getupDelayed = true;
        f.timer = DELAYED_GETUP - 1;
        ev.push({ type: 'delayedGetup', player: i });
        return;
      }
      f.mode = 'getup';
      f.timer = GETUP_FRAMES - 1;
      return;
    case 'getup':
      toIdle(f);
      f.wakeup = REVERSAL_WINDOW;
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
  if (ko) markKo(f, t, grabMove);
  launch(f, dir, KNOCK_VY, false);
  firstHit(m, 1 - i, ev);
  ev.push({ type: 'hit', attacker: 1 - i, defender: i, move: grabMove, damage: dmg, height: 'mid', counter: false, combo: 1, weight: 3, dir, x: f.x, y: f.y });
  if (ko) ev.push({ type: 'ko', player: i });
}

function landSuper(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const a = m.fighters[1 - i];
  const dmg = Math.floor((f.maxHealth * TD_DAMAGE_PCT) / 100);
  f.victim = false;
  const ko = takeDamage(f, dmg);
  if (ko) markKo(f, a, 'td');
  const dir = f.x >= a.x ? 1 : -1;
  launch(f, dir, KNOCK_VY, false);
  firstHit(m, 1 - i, ev);
  ev.push({ type: 'hit', attacker: 1 - i, defender: i, move: 'td', damage: dmg, height: 'mid', counter: false, combo: 1, weight: 3, dir, x: f.x, y: f.y });
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
      airControl(f, i, ev);
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

/** Technical Difficulties is there to use: under 30% health, never landed this match, not recharging after a miss. */
export function canTD(f: FighterState): boolean {
  return !f.tdUsed && f.tdCooldown === 0 && f.health > 0 && f.health * 100 < f.maxHealth * TD_HEALTH_PCT;
}

function startSpecial(f: FighterState, i: number, ev: SimEvent[]): void {
  const d = fighterData(f.fighter);
  let id = d.specials[f.input.specialDir] ?? d.specials.f;
  // Only Throw (held back) throws backwards.
  f.throwBack = false;
  // Paid in donations when there are enough: the bigger version, automatically.
  const tithe = d.moves[id].tithe;
  if (tithe && f.donations >= tithe.cost) {
    f.donations -= tithe.cost;
    id = tithe.into;
    ev.push({ type: 'donation', player: i, total: f.donations, spent: tithe.cost });
  }
  beginSpecial(f, i, id, ev);
}

/** The air special for the direction held, if the fighter has one and hasn't used it this jump. */
function airSpecialFor(f: FighterState): string | null {
  if (f.airSpecialUsed) return null;
  const a = fighterData(f.fighter).airSpecials;
  return a[f.input.specialDir] ?? a.n ?? a.f ?? a.d ?? a.b ?? null;
}

function startAirSpecial(f: FighterState, i: number, id: string, ev: SimEvent[]): void {
  f.airSpecialUsed = true;
  f.airAttackUsed = true;
  beginSpecial(f, i, id, ev);
}

function beginSpecial(f: FighterState, i: number, id: string, ev: SimEvent[]): void {
  startMove(f, id);
  ev.push({ type: 'special', player: i, move: id });
  // A double tap, or METER with it, boosts it straight away, however long the special waited to come out.
  const inp = f.input;
  if (inp.gap[bitIndex(SPECIAL)] <= BOOST_TAP && boost(f, i, ev)) return;
  if (inp.age[bitIndex(METER)] <= BOOST_TAP && boost(f, i, ev)) consume(inp, METER);
}

/** Spends a bar on the boosted version of the special just started, if it has one and there's a bar. */
function boost(f: FighterState, i: number, ev: SimEvent[]): boolean {
  const mv = moveOf(f);
  if (!mv.boost || f.meter < BAR) return false;
  f.meter -= BAR;
  f.move = mv.boost;
  ev.push({ type: 'boost', player: i, move: mv.boost });
  return true;
}

function groundControl(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const o = m.fighters[1 - i];
  const d = fighterData(f.fighter);
  const inp = f.input;
  if (o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  const back = backBit(f.facing);
  const held = inp.held;

  if (held & BLOCK) {
    if (pressed(inp, SPECIAL) && canTD(f)) {
      consume(inp, SPECIAL);
      // Spent only if it lands (combat.ts); a miss or a block leaves it recharging.
      f.tdCooldown = TD_RECHARGE_FRAMES;
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
    startMove(f, normalFor(f, atk));
    return;
  }
  footwork(m, i, true);
}

/** The normal an attack button starts, by the direction held. */
function normalFor(f: FighterState, atk: Attack): string {
  const n = fighterData(f.fighter).normals;
  const held = f.input.held;
  if (held & DOWN) return n.c[atk];
  return (held & forwardBit(f.facing) && n.f[atk]) || (held & backBit(f.facing) && n.b[atk]) || n.s[atk];
}

/** Dashes, jumps, crouching and walking: what's left of control once nothing else was pressed. */
export function footwork(m: MatchState, i: number, canJump: boolean): void {
  const f = m.fighters[i];
  const d = fighterData(f.fighter);
  const inp = f.input;
  const fwd = forwardBit(f.facing);
  const back = backBit(f.facing);
  const held = inp.held;
  // Segment rules (knee-deep water) slow walking and dashing for both.
  const pct = segmentData(m.stage, m.segment).walkPct ?? 100;
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
  if (canJump && held & UP) {
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
  if (mv.kind === 'throw' || mv.kind === 'super') return;
  const air = mv.stance === 'air';
  const inp = f.input;
  // Only presses made during this move count, so a held or early press can't fire twice.
  const since = f.moveFrame;
  // Special again, or METER (the touch meter), early in a special boosts it: a strike even after its
  // first hit (the rest come out boosted), a projectile only until it's thrown.
  if (mv.boost && f.moveFrame <= BOOST_WINDOW && (!mv.spawns.length || f.moveFrame < mv.startup) && f.meter >= BAR) {
    const bit = pressed(inp, SPECIAL, since) ? SPECIAL : pressed(inp, METER, since) ? METER : 0;
    if (bit && boost(f, i, ev)) {
      consume(inp, bit);
      return;
    }
  }
  // Not while a special is waiting to cancel out of a hit: then METER is for boosting it.
  const specialNext = f.contact === 'hit' && mv.kind !== 'special' && pressed(inp, SPECIAL, since);
  // No Tape Skip in the air: it's a dash.
  if (!air && mv.startup > 0 && f.moveFrame >= mv.startup && f.meter >= BAR && !specialNext && pressed(inp, METER, since)) {
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
    // Specials cancel only out of a hit (and never out of another special): confirm it first. Strings go on regardless.
    if (f.contact === 'hit' && mv.kind !== 'special' && pressed(inp, SPECIAL, since)) {
      if (!air) {
        consume(inp, SPECIAL);
        startSpecial(f, i, ev);
        return;
      }
      const id = airSpecialFor(f);
      if (id) {
        consume(inp, SPECIAL);
        startAirSpecial(f, i, id, ev);
        return;
      }
    }
    // A launcher that connects can be jump-cancelled, to follow them up into an air string.
    if (!air && f.contact === 'hit' && opensJuggle(mv) && pressed(inp, UP, since)) {
      consume(inp, UP);
      jump(f, i, ev);
      return;
    }
    const atk = bufferedAttack(inp, since);
    const next = atk && mv.chain[atk];
    if (atk && next) {
      consume(inp, ATTACK_BITS[atk]);
      startMove(f, next);
    } else if (!air && atk && f.contact === 'hit' && opensJuggle(mv)) {
      // A launcher (or a bounce) that connects cancels into any normal, to follow them up into the air.
      consume(inp, ATTACK_BITS[atk]);
      startMove(f, normalFor(f, atk));
    }
  }
}

/** Its last hit launches or bounces them: it can be followed up. */
function opensJuggle(mv: MoveData): boolean {
  const h = mv.hits[mv.hits.length - 1];
  return h !== undefined && (h.launch !== undefined || h.groundBounce === true || h.wallBounce === true);
}

function airControl(f: FighterState, i: number, ev: SimEvent[]): void {
  if (pressed(f.input, SPECIAL)) {
    const id = airSpecialFor(f);
    if (id) {
      consume(f.input, SPECIAL);
      startAirSpecial(f, i, id, ev);
      return;
    }
  }
  if (f.airAttackUsed) return;
  const atk = bufferedAttack(f.input);
  if (!atk) return;
  consume(f.input, ATTACK_BITS[atk]);
  f.airAttackUsed = true;
  startMove(f, fighterData(f.fighter).normals.j[atk]);
}

/** Straight up out of a launcher that hit (holding forward or back picks the arc), via the usual take-off. */
function jump(f: FighterState, i: number, ev: SimEvent[]): void {
  const held = f.input.held;
  f.mode = 'prejump';
  f.move = '';
  f.hop = true;
  f.timer = PREJUMP_FRAMES - 1;
  f.jumpDir = held & forwardBit(f.facing) ? 1 : held & backBit(f.facing) ? -1 : 0;
  f.vx = 0;
  f.crouching = false;
  ev.push({ type: 'jumpCancel', player: i });
}

/** Cut Away, the combo breaker: a full meter, all of it, to knock the attacker away mid-combo, once a round. */
function cutAway(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  if (f.ko || f.cutAwayUsed || f.meter < METER_MAX) return;
  if (f.mode === 'launched' && !f.juggleable && f.bounce === 'none') return;
  if (!pressed(f.input, METER)) return;
  consume(f.input, METER);
  f.meter = 0;
  f.cutAwayUsed = true;
  f.mode = 'recover';
  f.timer = CUT_AWAY_FRAMES - 1;
  f.vx = 0;
  f.vy = 0;
  f.slide = 0;
  endCombo(f);
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
    if (mv.heal && mv.heal.frame === f.moveFrame && f.health > 0) {
      const amount = Math.min(mv.heal.amount, f.maxHealth - f.health);
      f.health += amount;
      ev.push({ type: 'heal', player: i, amount });
    }
    if (mv.stance !== 'air') {
      f.vx = 0;
      for (const mo of mv.motion) if (inWindow(f.moveFrame, mo.frames)) f.vx = f.facing * mo.vx;
    } else {
      // In the air a move keeps the jump's drift unless it says otherwise.
      for (const mo of mv.motion) if (inWindow(f.moveFrame, mo.frames)) f.vx = f.facing * mo.vx;
      if (mv.dive && mv.dive.frame === f.moveFrame) {
        f.vx = f.facing * mv.dive.vx;
        f.vy = mv.dive.vy;
      }
    }
  }
  const hover = f.mode === 'move' && inWindow(f.moveFrame, moveOf(f).hover);
  if (hover) {
    // Hanging in the air: no fall while it lasts.
    f.vy = 0;
    f.x += f.vx;
  } else if (airborne(f)) {
    // A juggled body falls faster with every juggle hit.
    f.vy -= f.mode === 'launched' && f.juggleable ? Math.floor((GRAVITY * (100 + JUGGLE_GRAVITY * f.juggle)) / 100) : GRAVITY;
    f.y += f.vy;
    f.x += f.vx;
    if (f.bounce === 'wall' && Math.abs(f.x) >= wallX(m, f)) wallBounce(m, i, ev);
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      land(f, i, ev);
    }
  } else {
    f.x += f.vx;
  }
  // The forecast's wind pushes everyone the same way.
  if (m.wind !== 0 && m.phase === 'fight' && f.mode !== 'thrown' && f.mode !== 'cinematic' && f.mode !== 'down' && f.mode !== 'ko') f.x += m.wind;
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
  // From the air it reappears at the same height, hanging there.
  if (moveOf(f).stance === 'air') f.vy = 0;
  else f.y = 0;
  f.vx = 0;
  f.slide = 0;
  if (o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  ev.push({ type: 'teleport', player: i, x: f.x });
}

/** Off the wall: back towards the middle, up into a juggle. */
function wallBounce(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const side = f.x > 0 ? 1 : -1;
  f.x = side * wallX(m, f);
  f.bounce = 'none';
  f.wallBounced = true;
  f.vx = -side * WALL_BOUNCE_BACK_VX;
  f.vy = WALL_REBOUND_VY;
  f.juggleable = true;
  ev.push({ type: 'relaunch', player: i, how: 'wall', x: f.x, y: f.y });
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
      f.timer = (moveOf(f).landing ?? AIR_ATTACK_LAND_FRAMES) - 1;
      f.move = '';
      f.vx = 0;
      return;
    case 'launched':
      if (f.bounce === 'ground' && !f.ko) {
        // Off the floor and back up into a juggle.
        f.bounce = 'none';
        f.groundBounced = true;
        f.vy = GROUND_BOUNCE_VY;
        f.juggleable = true;
        ev.push({ type: 'relaunch', player: i, how: 'ground', x: f.x, y: 0 });
        return;
      }
      f.vx = 0;
      endCombo(f);
      if (f.ko) f.mode = 'ko';
      else {
        f.mode = 'down';
        f.timer = DOWN_FRAMES - 1;
        f.getupDelayed = false;
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
  // A delayed projectile can't hit until it sets off.
  p.rehit = pd.delay ?? 0;
  p.back = false;
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
    // A delayed one holds still where it appeared until its delay is up.
    if (pd.life - p.life >= (pd.delay ?? 0)) {
      p.x += p.dir * pd.vx;
      p.y += pd.vy;
    }
    p.life--;
    if (p.rehit > 0) p.rehit--;
    const edge = stageData(m.stage).segments[m.segment].halfWidth + fx(1);
    if (pd.returnAfter !== undefined) {
      const owner = m.fighters[p.owner];
      // Turns for home (off the wall, too) and can hit on the way back.
      if (!p.back && (pd.life - p.life >= pd.returnAfter || Math.abs(p.x) > edge - fx(1))) {
        p.back = true;
        p.dir = p.x > owner.x ? -1 : 1;
        p.rehit = 0;
      }
      // Caught.
      if (p.back && Math.abs(p.x - owner.x) <= CATCH_RANGE) p.active = false;
      if (p.life <= 0) p.active = false;
      continue;
    }
    if (p.life <= 0 || (pd.groundEnds && p.y <= 0) || Math.abs(p.x) > edge) p.active = false;
  }
}
