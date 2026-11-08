/**
 * Rox Vega, host of Feel the Burn at Dawn. Rushdown: fast, short normals,
 * long strings with low damage per hit, a dash that crosses sides, a moving
 * lariat and eight quick kicks.
 */
import { fx } from '../fixed';
import type { FighterData, HitData } from '../types';
import { box, interactMove, move, normal, strike, table, technicalDifficulties, throwMove } from './build';

/** Eight kicks three frames apart; the last one knocks down (or launches, boosted). */
function countOfEight(damage: number, boosted: boolean): HitData[] {
  return Array.from({ length: 8 }, (_, k) => {
    const last = k === 7;
    const f = 9 + 3 * k;
    return strike({
      frames: [f, f + 1],
      reach: [0.2, 1.1],
      at: [0.4, 0.9],
      damage: last ? 48 : damage,
      hitstun: last ? 0 : 12,
      blockstun: last ? 14 : 8,
      push: last ? 0.06 : 0.01,
      knockdown: last && !boosted,
      launch: last && boosted ? 0.17 : undefined,
    });
  });
}

/** A spin that hits on both sides as she travels. */
function lariat(frames: readonly number[], damage: readonly number[]): HitData[] {
  return frames.map((f, k) => {
    const last = k === frames.length - 1;
    return strike({ frames: [f, f + 1], reach: [-0.6, 1.0], at: [0.8, 1.4], damage: damage[k], hitstun: last ? 0 : 20, blockstun: last ? 16 : 12, knockdown: last, push: last ? 0.06 : 0.02 });
  });
}

const moves = table(
  // Standing
  normal('s.FP', { name: 'Wake-Up Jab', startup: 6, active: 2, recovery: 8, reach: [0.2, 0.85], at: [1.15, 1.45], damage: 36, hitstun: 14, blockstun: 11, chain: { FP: 'FP FP' } }),
  normal('s.BP', { name: 'Power Punch', startup: 8, active: 2, recovery: 12, reach: [0.2, 0.95], at: [1.05, 1.4], damage: 63, hitstun: 17, blockstun: 13, chain: { BP: 'BP BP' } }),
  normal('s.FK', { name: 'Leg Lift', startup: 7, active: 3, recovery: 12, reach: [0.2, 1.05], at: [0.55, 0.9], damage: 55, hitstun: 16, blockstun: 12, chain: { FK: 'FK FK' } }),
  normal('s.BK', { name: 'Roundhouse Rep', startup: 11, active: 3, recovery: 18, reach: [0.2, 1.15], at: [0.8, 1.2], damage: 94, hitstun: 20, blockstun: 14, push: 0.07 }),
  // Crouching
  normal('c.FP', { name: 'Crunch Jab', stance: 'crouch', startup: 6, active: 2, recovery: 8, reach: [0.2, 0.8], at: [0.7, 0.95], damage: 32, hitstun: 13, blockstun: 10 }),
  normal('c.BP', { name: 'Star Jump Uppercut', stance: 'crouch', startup: 8, active: 3, recovery: 18, reach: [0.1, 0.75], at: [1.0, 1.8], damage: 78, hitstun: 22, blockstun: 11, launch: 0.16 }),
  normal('c.FK', { name: 'Toe Tap', stance: 'crouch', startup: 7, active: 2, recovery: 11, reach: [0.2, 1.1], at: [0, 0.3], height: 'low', damage: 39, hitstun: 14, blockstun: 10, chain: { FK: 'c.FK FK' } }),
  normal('c.BK', { name: 'Splits Sweep', stance: 'crouch', startup: 10, active: 3, recovery: 22, reach: [0.2, 1.2], at: [0, 0.3], height: 'low', damage: 87, hitstun: 0, blockstun: 10, knockdown: true }),
  // Command normal
  normal('f.FK', { name: 'Step Touch', startup: 16, active: 2, recovery: 14, reach: [0.2, 1.0], at: [1.0, 1.5], height: 'overhead', damage: 78, hitstun: 18, blockstun: 13, chain: { BK: 'f.FK BK' } }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Jab', kind: 'air', startup: 4, active: 6, recovery: 5, reach: [0.1, 0.75], at: [0.6, 1.1], height: 'overhead', damage: 55, hitstun: 17, blockstun: 11 }),
  normal('j.BP', { name: 'Jumping Elbow', kind: 'air', startup: 6, active: 5, recovery: 6, reach: [0.1, 0.8], at: [0.8, 1.3], height: 'overhead', damage: 71, hitstun: 18, blockstun: 12 }),
  normal('j.FK', { name: 'Jumping Kick', kind: 'air', startup: 5, active: 8, recovery: 5, reach: [0.1, 0.85], at: [0.1, 0.6], height: 'overhead', damage: 63, hitstun: 17, blockstun: 11 }),
  normal('j.BK', { name: 'Jumping Split', kind: 'air', startup: 7, active: 6, recovery: 7, reach: [-0.6, 0.95], at: [0.1, 0.6], height: 'overhead', damage: 87, hitstun: 19, blockstun: 12 }),
  // String steps
  normal('FP FP', { name: 'Warm-Up', startup: 6, active: 2, recovery: 10, reach: [0.2, 1.0], at: [1.1, 1.45], damage: 36, hitstun: 15, blockstun: 11, chain: { FK: 'FP FP FK' } }),
  normal('FP FP FK', { name: 'Reps', startup: 8, active: 3, recovery: 14, reach: [0.2, 1.15], at: [0.55, 0.9], damage: 55, hitstun: 18, blockstun: 13, chain: { BK: 'FP FP FK BK' } }),
  normal('FP FP FK BK', { name: 'Feel the Burn', startup: 10, active: 3, recovery: 22, reach: [0.2, 1.3], at: [0.8, 1.25], damage: 87, hitstun: 0, blockstun: 14, push: 0.07, knockdown: true }),
  normal('BP BP', { name: 'Jazzercise', startup: 8, active: 3, recovery: 14, reach: [0.2, 1.1], at: [1.0, 1.4], damage: 63, hitstun: 17, blockstun: 13, chain: { FK: 'BP BP FK' } }),
  normal('BP BP FK', { name: 'Low Impact', startup: 9, active: 2, recovery: 16, reach: [0.2, 1.25], at: [0, 0.35], height: 'low', damage: 55, hitstun: 16, blockstun: 12 }),
  normal('FK FK', { name: 'Kick Ball Change', startup: 9, active: 2, recovery: 13, reach: [0.2, 1.15], at: [0.55, 0.9], damage: 48, hitstun: 16, blockstun: 12, chain: { BP: 'FK FK BP' } }),
  normal('FK FK BP', { name: 'Step Up', startup: 14, active: 2, recovery: 16, reach: [0.2, 1.2], at: [1.0, 1.6], height: 'overhead', damage: 71, hitstun: 18, blockstun: 13 }),
  normal('c.FK FK', { name: 'Floor Work', stance: 'crouch', startup: 7, active: 2, recovery: 14, reach: [0.2, 1.2], at: [0, 0.3], height: 'low', damage: 39, hitstun: 14, blockstun: 10 }),
  normal('f.FK BK', { name: 'Cool-Down', startup: 12, active: 3, recovery: 20, reach: [0.2, 1.25], at: [0.9, 1.4], damage: 78, hitstun: 0, blockstun: 12, launch: 0.15 }),
  // Specials
  move('Grapevine', {
    name: 'Grapevine',
    kind: 'special',
    total: 28,
    boost: 'Grapevine+',
    motion: [{ frames: [1, 20], vx: 0.13 }],
    passThrough: [3, 20],
  }),
  move('Grapevine+', {
    name: 'Grapevine (boosted)',
    kind: 'special',
    total: 36,
    motion: [{ frames: [1, 20], vx: 0.13 }],
    passThrough: [3, 20],
    // She has passed the opponent by now, so the kick goes out behind her.
    hits: [strike({ frames: [22, 24], reach: [-1.0, -0.1], at: [0.5, 1.3], damage: 78, hitstun: 0, blockstun: 12, knockdown: true })],
  }),
  move('Leg Warmer Lariat', {
    name: 'Leg Warmer Lariat',
    kind: 'special',
    total: 46,
    boost: 'Leg Warmer Lariat+',
    motion: [{ frames: [6, 26], vx: 0.06 }],
    hits: lariat([10, 16, 22], [48, 48, 71]),
  }),
  move('Leg Warmer Lariat+', {
    name: 'Leg Warmer Lariat (boosted)',
    kind: 'special',
    total: 46,
    armor: [1, 16],
    motion: [{ frames: [6, 26], vx: 0.06 }],
    hits: lariat([10, 14, 18, 22, 26], [39, 39, 39, 39, 71]),
  }),
  move('Count of Eight', { name: 'Count of Eight', kind: 'special', total: 47, boost: 'Count of Eight+', hits: countOfEight(19, false) }),
  move('Count of Eight+', { name: 'Count of Eight (boosted)', kind: 'special', total: 47, armor: [1, 9], hits: countOfEight(25, true) }),
  // A hop forward into an overhead: safe, and her answer to crouch-blocking.
  move('Star Jump', {
    name: 'Star Jump',
    kind: 'special',
    total: 34,
    boost: 'Star Jump+',
    motion: [{ frames: [3, 18], vx: 0.07 }],
    hits: [strike({ frames: [16, 18], reach: [0.2, 1.0], at: [0.9, 1.6], height: 'overhead', damage: 87, hitstun: 20, blockstun: 16 })],
  }),
  move('Star Jump+', {
    name: 'Star Jump (boosted)',
    kind: 'special',
    total: 34,
    armor: [1, 15],
    motion: [{ frames: [3, 18], vx: 0.07 }],
    hits: [strike({ frames: [16, 18], reach: [0.2, 1.0], at: [0.9, 1.6], height: 'overhead', damage: 112, hitstun: 0, blockstun: 18, knockdown: true })],
  }),
  throwMove(110),
  interactMove(),
  technicalDifficulties(1.4),
);

export const ROX: FighterData = {
  id: 'rox',
  name: 'Rox Vega',
  style: 'rushdown',
  health: 1000,
  walkFwd: fx(0.06),
  walkBack: fx(0.04),
  jumpVy: fx(0.2),
  jumpVx: fx(0.065),
  dash: { frames: 14, speed: fx(0.1) },
  backdash: { frames: 18, speed: fx(0.08) },
  hurt: { stand: box(-0.3, 0.3, 0, 1.75), crouch: box(-0.3, 0.35, 0, 1.05), air: box(-0.3, 0.3, 0.2, 1.55) },
  pushW: fx(0.3),
  pushH: fx(1.6),
  pushHCrouch: fx(1.0),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { FK: 'f.FK' },
    b: {},
  },
  specials: { n: 'Star Jump', f: 'Grapevine', b: 'Leg Warmer Lariat', d: 'Count of Eight' },
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  strings: [
    { name: 'Warm-Up', path: ['s.FP', 'FP'], safe: true },
    { name: 'Reps', path: ['s.FP', 'FP', 'FK'], safe: true },
    { name: 'Feel the Burn', path: ['s.FP', 'FP', 'FK', 'BK'], safe: false },
    { name: 'Jazzercise', path: ['s.BP', 'BP'], safe: true },
    { name: 'Low Impact', path: ['s.BP', 'BP', 'FK'], safe: true },
    { name: 'Kick Ball Change', path: ['s.FK', 'FK'], safe: true },
    { name: 'Step Up', path: ['s.FK', 'FK', 'BP'], safe: true },
    { name: 'Floor Work', path: ['c.FK', 'FK'], safe: true },
    { name: 'Cool-Down', path: ['f.FK', 'BK'], safe: false },
  ],
};
