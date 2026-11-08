/**
 * The living stage during a round: hazards on their announced rhythm, and
 * props in motion. Runs after the fighters' hits each fighting step.
 */
import { applyHit, applyHazardHit, blocks, hittable, touchesFighter } from './combat';
import type { SimEvent } from './events';
import { fighterData } from './fighters';
import { fx } from './fixed';
import { nextInt } from './rng';
import { segmentData } from './stages';
import type { FighterState, MatchState } from './state';

/** Sets up the segment's hazards, props and wind for a new round. */
export function setupRound(m: MatchState): void {
  const seg = segmentData(m.stage, m.segment);
  m.roundFrame = 0;
  m.firstHit = false;
  // Wind blows the same on both; which way is picked from the match's own random numbers.
  m.wind = seg.wind ? (nextInt(m.rng, 2) ? seg.wind : -seg.wind) : 0;
  m.hazards = m.studio ? [] : seg.hazards.map(() => ({ spot: -1, hitMask: 0 }));
  m.props = seg.props.map((p) => ({ x: p.x, mode: 'idle' as const, dir: 1 as const, owner: -1 }));
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
  const p = m.props[k];
  p.mode = 'rolling';
  p.dir = f.facing;
  p.owner = i;
  ev.push({ type: 'propKick', player: i, prop: segmentData(m.stage, m.segment).props[k].id });
}

const PROP_Y = fx(0.5);

export function updateStage(m: MatchState, ev: SimEvent[]): void {
  const seg = segmentData(m.stage, m.segment);
  const wall = seg.halfWidth;
  for (let k = 0; k < m.props.length; k++) {
    const p = m.props[k];
    if (p.mode !== 'rolling') continue;
    const pd = seg.props[k];
    p.x += p.dir * pd.speed;
    const d = m.fighters[1 - p.owner];
    if (hittable(d) && touchesFighter(p.x, 0, p.dir, pd.box, d)) {
      applyHit(m, p.owner, pd.effect, pd.id, 'special', p.dir, PROP_Y, true, blocks(d, pd.effect.height), false, ev);
      p.mode = 'spent';
    } else if (Math.abs(p.x) + (pd.box.w >> 1) >= wall) {
      p.x = Math.sign(p.x) * (wall - (pd.box.w >> 1));
      p.mode = 'spent';
    }
    if (p.mode === 'spent') ev.push({ type: 'propStop', prop: pd.id, x: p.x });
  }

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
    if (t === hz.warn) ev.push({ type: 'hazardStrike', hazard: hz.id, x: hz.all ? 0 : hz.spots[st.spot], all: !!hz.all });
    if (t < hz.warn || t >= hz.warn + hz.active) continue;
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
