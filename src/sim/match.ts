/**
 * The match: rounds, the clock, commercial breaks and segments, and the
 * step that runs everything at exactly 60 a second. The only things that
 * come in are the two players' input frames; what comes out is events.
 */
import {
  BREAK_FRAMES,
  INTRO_FRAMES,
  KO_FRAMES,
  MAX_ROUNDS,
  ROUND_FRAMES,
  STAY_TUNED_FRAMES,
  WINS_NEEDED,
} from './constants';
import { resolveHits } from './combat';
import type { SimEvent } from './events';
import { control, physics, resolvePush, tick, updateProjectiles } from './fighter';
import { fighterData } from './fighters';
import { afterStayTuned, beginStayTuned, earnedCancellation, startFinisher, stayTunedControl, stepFinisher } from './finisher';
import { readInput } from './input';
import { createRng } from './rng';
import { setupRound, updateStage } from './stage';
import { stageData } from './stages';
import { PROJECTILE_SLOTS, createFighter, createProjectile, type MatchState, type Phase } from './state';

export interface MatchOptions {
  p1: string;
  p2: string;
  stage?: string;
  seed?: number;
  /** Studio rules: the stage stays on its first segment. */
  studio?: boolean;
}

export function createMatch(o: MatchOptions): MatchState {
  fighterData(o.p1);
  fighterData(o.p2);
  const stage = o.stage ?? 'weather';
  stageData(stage);
  const m: MatchState = {
    frame: 0,
    phase: 'intro',
    phaseTimer: INTRO_FRAMES,
    round: 1,
    segment: 0,
    timer: ROUND_FRAMES,
    roundFrame: 0,
    wind: 0,
    hazards: [],
    props: [],
    stage,
    studio: o.studio ?? false,
    roundWinner: -1,
    matchWinner: -1,
    rng: createRng(o.seed ?? 1),
    finish: { player: -1, id: '', frame: 0 },
    fighters: [createFighter(o.p1, 0), createFighter(o.p2, 1)],
    projectiles: Array.from({ length: PROJECTILE_SLOTS }, createProjectile),
  };
  setupRound(m);
  return m;
}

const frozen = [false, false];

/** Advances the match one step (1/60 s). Appends anything that happened to `ev`. */
export function step(m: MatchState, in0: number, in1: number, ev: SimEvent[]): void {
  m.frame++;
  const fs = m.fighters;
  const live = m.phase === 'fight';
  // "Stay tuned": the winner's input still counts (to enter a finisher).
  const tuned = m.phase === 'stayTuned';
  for (let i = 0; i < 2; i++) {
    frozen[i] = fs[i].hitstop > 0;
    if (frozen[i]) fs[i].hitstop--;
  }
  readInput(fs[0].input, live || (tuned && m.matchWinner === 0) ? in0 : 0, fs[0].facing, frozen[0]);
  readInput(fs[1].input, live || (tuned && m.matchWinner === 1) ? in1 : 0, fs[1].facing, frozen[1]);

  switch (m.phase) {
    case 'intro':
      if (m.phaseTimer === INTRO_FRAMES) ev.push({ type: 'roundStart', round: m.round, segment: m.segment });
      if (--m.phaseTimer <= 0) {
        m.phase = 'fight';
        ev.push({ type: 'fight', round: m.round });
      }
      return;
    case 'fight':
      m.roundFrame++;
      simulate(m, ev, true);
      // The clock stops for the Technical Difficulties cinematic.
      if (fs[0].mode !== 'cinematic' && fs[1].mode !== 'cinematic') m.timer--;
      checkRoundOver(m, ev);
      return;
    case 'ko':
      simulate(m, ev, false);
      if (--m.phaseTimer <= 0) afterRound(m, ev);
      return;
    case 'break':
      if (--m.phaseTimer <= 0) nextRound(m, ev);
      return;
    case 'stayTuned':
      simulate(m, ev, false);
      // A finisher started this step.
      if ((m.phase as Phase) === 'finisher') return;
      afterStayTuned(m);
      if (--m.phaseTimer <= 0) end(m, ev);
      return;
    case 'finisher':
      simulate(m, ev, false);
      if (stepFinisher(m, ev)) end(m, ev);
      return;
    case 'over':
      return;
  }
}

function end(m: MatchState, ev: SimEvent[]): void {
  m.phase = 'over';
  ev.push({ type: 'matchOver', winner: m.matchWinner });
}

function simulate(m: MatchState, ev: SimEvent[], hits: boolean): void {
  for (let i = 0; i < 2; i++) if (!frozen[i]) tick(m, i, ev);
  // After the deciding round only the winner has a say, and only to finish it; in a finisher, nobody.
  if (m.phase === 'stayTuned') {
    for (let i = 0; i < 2; i++) if (!frozen[i] && m.phase === 'stayTuned') stayTunedControl(m, i, ev);
  } else if (m.phase !== 'finisher') for (let i = 0; i < 2; i++) if (!frozen[i]) control(m, i, ev);
  for (let i = 0; i < 2; i++) if (!frozen[i]) physics(m, i, ev);
  resolvePush(m);
  updateProjectiles(m);
  if (hits) {
    resolveHits(m, ev, frozen);
    updateStage(m, ev);
  }
}

function checkRoundOver(m: MatchState, ev: SimEvent[]): void {
  const [a, b] = m.fighters;
  if (a.ko || b.ko) endRound(m, a.ko && b.ko ? -1 : a.ko ? 1 : 0, 'ko', ev);
  else if (m.timer <= 0) {
    // Time: the higher share of health wins.
    const sa = a.health * b.maxHealth;
    const sb = b.health * a.maxHealth;
    endRound(m, sa === sb ? -1 : sa > sb ? 0 : 1, 'time', ev);
  }
}

function endRound(m: MatchState, winner: number, reason: 'ko' | 'time', ev: SimEvent[]): void {
  m.roundWinner = winner;
  if (winner >= 0) m.fighters[winner].wins++;
  m.phase = 'ko';
  m.phaseTimer = KO_FRAMES;
  ev.push({ type: 'roundOver', winner, reason });
}

function segmentFor(m: MatchState, round: number): number {
  // A fourth or fifth round (after draws) replays segment 3.
  return m.studio ? 0 : Math.min(round, 3) - 1;
}

function afterRound(m: MatchState, ev: SimEvent[]): void {
  const [a, b] = m.fighters;
  const champ = a.wins >= WINS_NEEDED ? 0 : b.wins >= WINS_NEEDED ? 1 : -1;
  if (champ >= 0) {
    m.matchWinner = champ;
    const cancel = earnedCancellation(m, champ);
    if (cancel) {
      startFinisher(m, champ, cancel.id, ev);
      return;
    }
    m.phase = 'stayTuned';
    m.phaseTimer = STAY_TUNED_FRAMES;
    beginStayTuned(m);
    ev.push({ type: 'stayTuned', winner: champ });
  } else if (m.round >= MAX_ROUNDS) {
    m.matchWinner = 2;
    m.phase = 'over';
    ev.push({ type: 'matchOver', winner: -1 });
  } else {
    m.phase = 'break';
    m.phaseTimer = BREAK_FRAMES;
    ev.push({ type: 'commercialBreak', nextSegment: segmentFor(m, m.round + 1) });
  }
}

function nextRound(m: MatchState, ev: SimEvent[]): void {
  m.round++;
  const seg = segmentFor(m, m.round);
  const changed = seg !== m.segment;
  m.segment = seg;
  // Back to the start positions: meter, wins and the once-a-match super carry over.
  m.fighters.forEach((f, i) => {
    const fresh = createFighter(f.fighter, i as 0 | 1);
    fresh.wins = f.wins;
    fresh.meter = f.meter;
    fresh.tdUsed = f.tdUsed;
    Object.assign(f, fresh);
  });
  for (const p of m.projectiles) p.active = false;
  m.timer = ROUND_FRAMES;
  m.roundWinner = -1;
  setupRound(m);
  if (changed) ev.push({ type: 'segmentChange', segment: seg });
  m.phase = 'intro';
  m.phaseTimer = INTRO_FRAMES;
}
