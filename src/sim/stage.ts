/**
 * The living stage during a round: hazards on their announced rhythm, and
 * props in motion. Runs after the fighters' hits each fighting step.
 */
import { applyHit, applyHazardHit, blocks, ducking, hittable, touchesFighter } from './combat';
import type { SimEvent } from './events';
import { fighterData } from './fighters';
import { fx } from './fixed';
import { nextInt } from './rng';
import { segmentData, type PropData, type SegmentData } from './stages';
import type { FighterState, MatchState, PropState } from './state';
import type { Box } from './types';

/** Sets up the segment's hazards, props and wind for a new round. */
export function setupRound(m: MatchState): void {
  const seg = segmentData(m.stage, m.segment);
  m.roundFrame = 0;
  m.firstHit = false;
  // Wind blows the same on both; which way is picked from the match's own random numbers.
  m.wind = seg.wind ? (nextInt(m.rng, 2) ? seg.wind : -seg.wind) : 0;
  m.hazards = m.studio ? [] : seg.hazards.map(() => ({ spot: -1, hitMask: 0, out: false }));
  m.props = seg.props.map((p) => ({ x: p.x, mode: 'idle' as const, dir: 1 as const, owner: -1, t: 0, bounced: false }));
}

/** The idle prop within reach of this fighter, nearest first, or -1. */
export function propInReach(m: MatchState, f: FighterState): number {
  const seg = segmentData(m.stage, m.segment);
  let best = -1;
  let bestD = 0;
  for (let k = 0; k < m.props.length; k++) {
    const p = m.props[k];
    const d = Math.abs(p.x - f.x);
    if (p.mode === 'idle' && d <= seg.props[k].reach && (best < 0 || d < bestD)) {
      best = k;
      bestD = d;
    }
  }
  return best;
}

export function kickProp(m: MatchState, i: number, ev: SimEvent[]): void {
  const f = m.fighters[i];
  const k = propInReach(m, f);
  if (k < 0) return;
  const seg = segmentData(m.stage, m.segment);
  const pd = seg.props[k];
  const p = m.props[k];
  p.mode = 'rolling';
  p.dir = f.facing;
  p.owner = i;
  p.t = 0;
  p.bounced = false;
  ev.push({ type: 'propKick', player: i, prop: pd.id });
  if (pd.quench) {
    const h = seg.hazards.findIndex((hz) => hz.id === pd.quench);
    if (h >= 0 && m.hazards[h]) m.hazards[h].out = true;
  }
}

const PROP_Y = fx(0.5);

/** A prop's strike on one fighter, if it reaches them: a high goes over a duck, like any other. */
function propHits(m: MatchState, p: PropState, pd: PropData, b: Box, victim: number, ev: SimEvent[]): boolean {
  const d = m.fighters[victim];
  if (!hittable(d) || !touchesFighter(p.x, 0, p.dir, b, d)) return false;
  if (pd.effect.height === 'high' && ducking(d)) return false;
  applyHit(m, 1 - victim, pd.effect, pd.id, 'special', p.dir, PROP_Y, true, blocks(d, pd.effect.height), false, ev);
  return true;
}

function stepProps(m: MatchState, seg: SegmentData, ev: SimEvent[]): void {
  const wall = seg.halfWidth;
  for (let k = 0; k < m.props.length; k++) {
    const p = m.props[k];
    const pd = seg.props[k];
    if (p.mode === 'spent') {
      p.t++;
      // Picked up again where it fell (the shard).
      if (pd.reuse !== undefined && p.t >= pd.reuse) {
        p.mode = 'idle';
        p.t = 0;
        ev.push({ type: 'propReady', prop: pd.id, x: p.x });
      }
      continue;
    }
    if (p.mode !== 'rolling') continue;
    p.t++;
    if (pd.area) {
      // Used where it stands: nothing until the delay, then its box in front of the user.
      if (p.t < pd.area.delay) continue;
      if (propHits(m, p, pd, pd.area.box, 1 - p.owner, ev) || p.t >= pd.area.delay + pd.area.active - 1) p.mode = 'spent';
    } else {
      p.x += p.dir * pd.speed;
      // Off the wall and back, it hits whoever is there; before that, only the opponent.
      if (propHits(m, p, pd, pd.box, 1 - p.owner, ev) || (p.bounced && propHits(m, p, pd, pd.box, p.owner, ev))) p.mode = 'spent';
      else if (Math.abs(p.x) + (pd.box.w >> 1) >= wall) {
        p.x = Math.sign(p.x) * (wall - (pd.box.w >> 1));
        if (pd.rebound && !p.bounced) {
          p.bounced = true;
          p.dir = p.dir > 0 ? -1 : 1;
          ev.push({ type: 'propBounce', prop: pd.id, x: p.x });
        } else p.mode = 'spent';
      }
    }
    if (p.mode === 'spent') {
      p.t = 0;
      ev.push({ type: 'propStop', prop: pd.id, x: p.x });
    }
  }
}

export function updateStage(m: MatchState, ev: SimEvent[]): void {
  const seg = segmentData(m.stage, m.segment);
  stepProps(m, seg, ev);

  for (let k = 0; k < m.hazards.length; k++) {
    const hz = seg.hazards[k];
    const st = m.hazards[k];
    const c = m.roundFrame - hz.first;
    if (c < 0) continue;
    const t = c % hz.period;
    if (t === 0) {
      st.spot = hz.all ? -1 : nextInt(m.rng, hz.spots.length);
      st.hitMask = 0;
      ev.push({ type: 'hazardWarn', hazard: hz.id, caption: hz.caption, x: hz.all ? 0 : hz.spots[st.spot], all: !!hz.all });
    }
    const x = hz.all || st.spot < 0 ? 0 : hz.spots[st.spot];
    if (t === hz.warn) ev.push({ type: st.out ? 'hazardOut' : 'hazardStrike', hazard: hz.id, x, all: !!hz.all });
    if (t < hz.warn || t >= hz.warn + hz.active) continue;
    if (st.out) {
      // Put out: this strike doesn't happen; the next one does.
      if (t === hz.warn + hz.active - 1) st.out = false;
      continue;
    }
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      if (st.hitMask & (1 << i) || !hittable(f) || f.y >= hz.height) continue;
      if (hz.groundOnly && (f.y > 0 || f.mode === 'air' || f.mode === 'launched')) continue;
      const reach = hz.halfW + fighterData(f.fighter).pushW;
      let inside = false;
      if (hz.all) for (const sx of hz.spots) inside ||= Math.abs(f.x - sx) < reach;
      else inside = Math.abs(f.x - hz.spots[st.spot]) < reach;
      if (!inside) continue;
      st.hitMask |= 1 << i;
      applyHazardHit(m, i, hz.effect, hz.id, ev);
    }
  }
}
