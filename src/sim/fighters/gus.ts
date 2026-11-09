/**
 * Chef Gus Lamarre, host of a cooking show filmed in one take, every night,
 * forever. Mid-range: the longest reach in the game with cleaver and pans,
 * slow to start and slow to walk; fire on the floor, a pan set up in the air
 * that drops later, and a tenderising combo that crushes a guard.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { box, interactMove, move, normal, projectile, rerun, Script, strike, table, technicalDifficulties, throwMove } from './build';

/** Flambé: a patch of fire on the floor ahead of him that burns for a while. Blocked low. */
function flambe(x: number, hits: number, wide: number) {
  return projectile({
    at: [x, 0],
    speed: [0, 0],
    size: [-wide, wide, 0, 0.5],
    life: 30 + hits * 22,
    hits,
    rehit: 22,
    effect: { damage: 30, height: 'low', hitstun: 18, blockstun: 12, push: 0.03, chip: 8 },
  });
}

/** Mise en Place: a pan tossed high that hangs (spinning) before it drops. An overhead. */
function pan(x: number, delay: number) {
  return projectile({
    at: [x, 3.0],
    speed: [0, -0.13],
    size: [-0.3, 0.3, 0, 0.35],
    life: delay + 40,
    delay,
    groundEnds: true,
    effect: { damage: 60, height: 'overhead', hitstun: 24, blockstun: 14, push: 0.03, chip: 10 },
  });
}

const moves = table(
  // Standing: long and slow. The cleaver and the pans out-reach everyone.
  normal('s.FP', { name: 'Taste Test', startup: 8, active: 2, recovery: 11, reach: [0.2, 1.1], at: [1.15, 1.5], damage: 35, hitstun: 16, blockstun: 13, chain: { FP: 'FP FP', BP: 'FP BP' } }),
  normal('s.BP', { name: 'Skillet', startup: 12, active: 3, recovery: 17, reach: [0.2, 1.6], at: [0.95, 1.5], damage: 65, hitstun: 21, blockstun: 15, push: 0.06, chain: { BK: 'BP BK' } }),
  normal('s.FK', { name: 'Oven Door', startup: 10, active: 3, recovery: 14, reach: [0.2, 1.45], at: [0.5, 0.9], damage: 45, hitstun: 18, blockstun: 14, chain: { FP: 'FK FP' } }),
  normal('s.BK', { name: 'Cleaver', startup: 15, active: 3, recovery: 21, reach: [0.3, 1.85], at: [0.9, 1.5], damage: 80, hitstun: 22, blockstun: 16, push: 0.08 }),
  // Crouching
  normal('c.FP', { name: 'Paring Knife', stance: 'crouch', startup: 8, active: 2, recovery: 10, reach: [0.2, 1.0], at: [0.6, 0.9], damage: 28, hitstun: 15, blockstun: 12, chain: { BK: 'c.FP BK' } }),
  normal('c.BP', { name: 'Rising Ladle', stance: 'crouch', startup: 10, active: 4, recovery: 20, reach: [0.1, 0.9], at: [1.0, 2.0], damage: 65, hitstun: 24, blockstun: 12, launch: 0.16 }),
  normal('c.FK', { name: 'Rolling Pin', stance: 'crouch', startup: 9, active: 3, recovery: 14, reach: [0.2, 1.5], at: [0, 0.3], height: 'low', damage: 35, hitstun: 16, blockstun: 11 }),
  normal('c.BK', { name: 'Sweep the Floor', stance: 'crouch', startup: 13, active: 3, recovery: 24, reach: [0.2, 1.7], at: [0, 0.3], height: 'low', damage: 70, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normals
  normal('f.BP', { name: 'Meat Mallet', startup: 21, active: 2, recovery: 18, reach: [0.2, 1.25], at: [1.0, 1.7], height: 'overhead', damage: 75, hitstun: 22, blockstun: 14 }),
  // Steps back as he swings: whiff-punishes from the tip of the cleaver.
  move('b.BP', {
    name: 'Back of the Pan',
    kind: 'normal',
    total: 34,
    motion: [{ frames: [1, 8], vx: -0.04 }],
    hits: [strike({ frames: [13, 15], reach: [0.3, 1.7], at: [0.9, 1.4], damage: 55, hitstun: 20, blockstun: 14 })],
    hurt: [{ frames: [13, 24], box: box(0.3, 1.6, 0.9, 1.4) }],
    cancel: [16, 22],
  }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Spoon', kind: 'air', startup: 6, active: 6, recovery: 6, reach: [0.1, 0.85], at: [0.6, 1.1], height: 'overhead', damage: 40, hitstun: 18, blockstun: 12, chain: { BP: 'j.BP' } }),
  normal('j.BP', { name: 'Jumping Skillet', kind: 'air', startup: 9, active: 5, recovery: 7, reach: [0.1, 1.1], at: [0.7, 1.3], height: 'overhead', damage: 60, hitstun: 18, blockstun: 12 }),
  normal('j.FK', { name: 'Jumping Clog', kind: 'air', startup: 7, active: 7, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 45, hitstun: 18, blockstun: 12 }),
  normal('j.BK', { name: 'Jumping Cleaver', kind: 'air', startup: 10, active: 5, recovery: 8, reach: [0.1, 1.2], at: [0.3, 0.9], height: 'overhead', damage: 65, hitstun: 20, blockstun: 12 }),
  // String steps
  normal('FP FP', { name: 'Season', startup: 8, active: 2, recovery: 12, reach: [0.2, 1.15], at: [1.1, 1.5], damage: 35, hitstun: 17, blockstun: 14, chain: { BK: 'FP FP BK' } }),
  normal('FP FP BK', { name: 'Chef\'s Kiss', startup: 14, active: 3, recovery: 20, reach: [0.3, 1.75], at: [0.9, 1.5], damage: 70, hitstun: 0, blockstun: 17, push: 0.08, knockdown: true }),
  normal('FP BP', { name: 'Sear', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.5], at: [0.9, 1.5], damage: 55, hitstun: 20, blockstun: 15, chain: { BK: 'BP BK' } }),
  normal('BP BK', { name: 'Fillet', startup: 15, active: 3, recovery: 20, reach: [0.3, 1.8], at: [0.9, 1.5], damage: 75, hitstun: 0, blockstun: 17, push: 0.08, knockdown: true }),
  normal('FK FP', { name: 'Garnish', startup: 9, active: 2, recovery: 12, reach: [0.2, 1.2], at: [1.1, 1.5], damage: 35, hitstun: 17, blockstun: 14, chain: { BP: 'FK FP BP' } }),
  normal('FK FP BP', { name: 'Plate Up', startup: 13, active: 3, recovery: 19, reach: [0.2, 1.4], at: [0.9, 1.7], damage: 65, hitstun: 0, blockstun: 16, launch: 0.15 }),
  normal('c.FP BK', { name: 'Julienne', stance: 'crouch', startup: 12, active: 3, recovery: 22, reach: [0.2, 1.65], at: [0, 0.3], height: 'low', damage: 55, hitstun: 0, blockstun: 11, knockdown: true }),
  // Specials
  move('Flambé', {
    name: 'Flambé',
    kind: 'special',
    total: 42,
    boost: 'Flambé+',
    spawns: [{ frame: 16, projectile: flambe(1.6, 3, 0.45) }],
  }),
  move('Flambé+', {
    name: 'Flambé (boosted)',
    kind: 'special',
    total: 42,
    spawns: [{ frame: 16, projectile: flambe(1.9, 5, 0.75) }],
  }),
  // Tenderise: three blows with the mallet; blocked, the last one breaks the guard.
  move('Tenderise', {
    name: 'Tenderise',
    kind: 'special',
    // Blocked, the crush leaves him +10: time for a jab or Taste Test to land.
    total: 46,
    boost: 'Tenderise+',
    motion: [{ frames: [3, 10], vx: 0.04 }],
    hits: [
      strike({ frames: [12, 13], reach: [0.2, 1.1], at: [0.9, 1.5], damage: 30, hitstun: 16, blockstun: 12, push: 0.01 }),
      strike({ frames: [20, 21], reach: [0.2, 1.1], at: [0.9, 1.5], damage: 30, hitstun: 16, blockstun: 12, push: 0.01 }),
      strike({ frames: [30, 31], reach: [0.2, 1.15], at: [0.9, 1.7], damage: 55, hitstun: 0, blockstun: 14, push: 0.03, knockdown: true, guardCrush: true }),
    ],
  }),
  move('Tenderise+', {
    name: 'Tenderise (boosted)',
    kind: 'special',
    total: 42,
    armor: [3, 11],
    motion: [{ frames: [3, 10], vx: 0.05 }],
    hits: [
      strike({ frames: [12, 13], reach: [0.2, 1.15], at: [0.9, 1.5], damage: 35, hitstun: 16, blockstun: 12, push: 0.01 }),
      strike({ frames: [19, 20], reach: [0.2, 1.15], at: [0.9, 1.5], damage: 35, hitstun: 16, blockstun: 12, push: 0.01 }),
      strike({ frames: [26, 27], reach: [0.2, 1.2], at: [0.9, 1.7], damage: 60, hitstun: 0, blockstun: 14, push: 0.02, launch: 0.17, guardCrush: true }),
    ],
  }),
  // Mise en Place: the pan goes up, hangs while it spins, and comes down on them.
  move('Mise en Place', {
    name: 'Mise en Place',
    kind: 'special',
    total: 40,
    boost: 'Mise en Place+',
    spawns: [{ frame: 14, projectile: pan(2.3, 26) }],
  }),
  move('Mise en Place+', {
    name: 'Mise en Place (boosted)',
    kind: 'special',
    total: 40,
    spawns: [
      { frame: 14, projectile: pan(1.6, 18) },
      { frame: 16, projectile: pan(2.9, 26) },
    ],
  }),
  // A long low chop that knocks down; punishable from close.
  move('Chop Chop', {
    name: 'Chop Chop',
    kind: 'special',
    total: 48,
    boost: 'Chop Chop+',
    stance: 'crouch',
    hits: [strike({ frames: [14, 16], reach: [0.2, 2.0], at: [0, 0.35], height: 'low', damage: 75, hitstun: 0, blockstun: 12, knockdown: true })],
    hurt: [{ frames: [14, 30], box: box(0.2, 1.9, 0, 0.35) }],
  }),
  move('Chop Chop+', {
    name: 'Chop Chop (boosted)',
    kind: 'special',
    total: 48,
    stance: 'crouch',
    hits: [
      strike({ frames: [12, 13], reach: [0.2, 2.0], at: [0, 0.35], height: 'low', damage: 45, hitstun: 20, blockstun: 12 }),
      strike({ frames: [20, 22], reach: [0.2, 2.1], at: [0, 0.35], height: 'low', damage: 65, hitstun: 0, blockstun: 12, knockdown: true }),
    ],
    hurt: [{ frames: [12, 30], box: box(0.2, 1.9, 0, 0.35) }],
  }),
  // In the air: a cleaver thrown down and forward, flatter and further than the hail.
  move('Cleaver Toss', {
    name: 'Cleaver Toss',
    kind: 'special',
    stance: 'air',
    total: 32,
    boost: 'Cleaver Toss+',
    hover: [1, 12],
    landing: 6,
    spawns: [{ frame: 10, projectile: cleaver(0.11, -0.06, 50) }],
  }),
  move('Cleaver Toss+', {
    name: 'Cleaver Toss (boosted)',
    kind: 'special',
    stance: 'air',
    total: 32,
    hover: [1, 16],
    landing: 6,
    spawns: [
      { frame: 10, projectile: cleaver(0.11, -0.06, 42) },
      { frame: 14, projectile: cleaver(0.08, -0.09, 42) },
    ],
  }),
  throwMove(110),
  interactMove(),
  technicalDifficulties(1.8),
);

// Finishers. The blows are scripted; the picture cuts away at the worst of it.
const finishers = [
  // Close: prepped, seasoned and served, one course at a time.
  new Script(moves)
    .strike('s.FP', { react: 'high', damage: 35, pull: 0.9 })
    .strike('FP FP', { react: 'high', damage: 35 })
    .strike('s.BP', { react: 'high', damage: 65 })
    .strike('Tenderise', { react: 'high', damage: 30 }, 0)
    .blow(8, { react: 'high', damage: 30 })
    .blow(18, { react: 'knockdown', damage: 55, pop: 0.1 })
    .wait(40)
    .strike('c.BP', { react: 'launch', damage: 65, pop: 0.2, pull: 0.8 }, 12)
    .strike('s.BK', { react: 'none', damage: 120 }, 0)
    .cut('standby')
    .blow(12, { react: 'none', damage: 90 })
    .blow(22, { react: 'none', damage: 90 })
    .blow(36, { react: 'none', damage: 120 })
    .blow(50, { react: 'none', damage: 140 })
    .done({ id: 'Order Up', name: 'Order Up', kind: 'signoff', range: 'close', input: ['d', 'b'], button: 'BP' }, 110),
  // Mid: the kitchen on fire, two pans from above, then the cleaver.
  new Script(moves)
    .play('Flambé+', 42)
    .blow(0, { react: 'low', damage: 30 })
    .blow(20, { react: 'low', damage: 30 })
    .play('Mise en Place+', 46)
    .blow(4, { react: 'high', damage: 60 })
    .blow(14, { react: 'high', damage: 60 })
    .strike('b.BP', { react: 'high', damage: 55, pull: 1.4 })
    .strike('Chop Chop', { react: 'knockdown', damage: 75, pop: 0.12 }, 40)
    .strike('f.BP', { react: 'none', damage: 120 }, 0)
    .cut('bars')
    .blow(12, { react: 'none', damage: 90 })
    .blow(28, { react: 'none', damage: 110 })
    .blow(44, { react: 'none', damage: 140 })
    .done({ id: 'Last Service', name: 'Last Service', kind: 'signoff', range: 'mid', input: ['b', 'f'], button: 'BK' }, 100),
  // More cancellations: each asks for its own way of ending it (and a held direction comes before a plain one).
  new Script(moves).wait(16).cut('static').done({ id: 'Burnt', name: 'Burnt', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Flambé', hold: 'd' }, 40),
  new Script(moves).wait(22).cut('standby').done({ id: 'Off the Menu', name: 'Off the Menu', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Cleaver Toss' }, 40),
  new Script(moves).wait(20).cut('off').done({ id: 'Eighty-Sixed', name: 'Eighty-Sixed', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Tenderise' }, 40),
  rerun(moves),
];

/** A cleaver thrown from the air: an overhead that stops when it hits the floor. */
function cleaver(vx: number, vy: number, damage: number) {
  return projectile({ at: [0.5, 0.6], speed: [vx, vy], size: [-0.2, 0.2, 0, 0.3], life: 50, groundEnds: true, effect: { damage, height: 'overhead', hitstun: 20, blockstun: 14, push: 0.03, chip: 8 } });
}

export const GUS: FighterData = {
  id: 'gus',
  name: 'Chef Gus Lamarre',
  style: 'midrange',
  health: 1000,
  walkFwd: fx(0.036),
  walkBack: fx(0.032),
  jumpVy: fx(0.19),
  jumpVx: fx(0.05),
  dash: { frames: 17, speed: fx(0.075) },
  backdash: { frames: 20, speed: fx(0.075) },
  hurt: { stand: box(-0.35, 0.35, 0, 1.85), crouch: box(-0.35, 0.4, 0, 1.15), air: box(-0.35, 0.35, 0.2, 1.65), juggle: box(-0.85, 0.6, 0.2, 0.95) },
  pushW: fx(0.34),
  pushH: fx(1.65),
  pushHCrouch: fx(1.0),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP' },
    b: { BP: 'b.BP' },
  },
  specials: { n: 'Tenderise', f: 'Flambé', b: 'Mise en Place', d: 'Chop Chop' },
  airSpecials: { n: 'Cleaver Toss' },
  airStrings: [{ name: 'Spoon and Skillet', path: ['j.FP', 'BP'], safe: false }],
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  show: 'Kitchen Live',
  finishers,
  strings: [
    { name: 'Season', path: ['s.FP', 'FP'], safe: true },
    { name: "Chef's Kiss", path: ['s.FP', 'FP', 'BK'], safe: true },
    { name: 'Sear', path: ['s.FP', 'BP'], safe: true },
    { name: 'Fillet', path: ['s.BP', 'BK'], safe: true },
    { name: 'Garnish', path: ['s.FK', 'FP'], safe: true },
    { name: 'Plate Up', path: ['s.FK', 'FP', 'BP'], safe: true },
    { name: 'Julienne', path: ['c.FP', 'BK'], safe: false },
    { name: 'Sear and Fillet', path: ['s.FP', 'BP', 'BK'], safe: true },
  ],
};
