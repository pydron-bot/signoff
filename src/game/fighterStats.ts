/**
 * The fighter select's bars: health, speed, reach and difficulty, worked out
 * from the fighter and move data (never written down, so they follow every
 * balance change), each from 1 to 5 against the rest of the roster. Pure.
 */
import { FIGHTERS } from '../sim';
import { toFloat } from '../sim/fixed';
import type { FighterData } from '../sim/types';

export interface FighterStats {
  health: number;
  speed: number;
  reach: number;
  difficulty: number;
}

/** The raw figures: health; metres a second walking forward and dashing, together; the furthest a grounded normal hits; how much there is to learn. */
export function rawStats(d: FighterData): FighterStats {
  const walk = toFloat(d.walkFwd) * 60;
  const dash = toFloat(d.dash.speed) * 60;
  let reach = 0;
  const grounded = [...Object.values(d.normals.s), ...Object.values(d.normals.c), ...Object.values(d.normals.f)];
  for (const id of grounded) {
    const mv = id ? d.moves[id] : undefined;
    for (const h of mv?.hits ?? []) reach = Math.max(reach, toFloat(h.box.x + h.box.w));
  }
  // Strings, specials (on the ground and in the air), boosts and an extra resource: more to learn.
  const specials = Object.keys(d.specials).length + Object.keys(d.airSpecials).length;
  const boosts = Object.values(d.moves).filter((m) => m.boost).length;
  const difficulty = d.strings.length + d.airStrings.length + specials * 1.5 + boosts * 0.5 + (d.resource ? 3 : 0);
  return { health: d.health, speed: walk + dash * 0.5, reach, difficulty };
}

const KEYS = ['health', 'speed', 'reach', 'difficulty'] as const;

/** 1 to 5 for each, from the lowest of the roster to the highest (`roster` defaults to every fighter). */
export function fighterStats(id: string, roster: readonly FighterData[] = Object.values(FIGHTERS)): FighterStats {
  const all = roster.map(rawStats);
  const me = rawStats(roster.find((d) => d.id === id) ?? FIGHTERS[id]);
  const out = { health: 0, speed: 0, reach: 0, difficulty: 0 };
  for (const k of KEYS) {
    const lo = Math.min(...all.map((s) => s[k]));
    const hi = Math.max(...all.map((s) => s[k]));
    out[k] = hi > lo ? 1 + Math.round(((me[k] - lo) / (hi - lo)) * 4) : 3;
  }
  return out;
}
