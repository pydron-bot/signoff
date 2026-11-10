/**
 * Dale Storm, Channel 0's weatherman. Zoner: long, slow normals, a slow
 * projectile, a hail drop from above and a lasso that pulls opponents in.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { box, interactMove, move, normal, projectile, rerun, Script, strike, table, technicalDifficulties, throwMove } from './build';

const moves = table(
  // Standing
  normal('s.FP', { name: 'Clipboard Jab', startup: 7, active: 2, recovery: 10, reach: [0.2, 0.95], at: [1.15, 1.45], height: 'high', damage: 30, hitstun: 16, blockstun: 12, chain: { FP: 'FP FP', BP: 'FP BP' } }),
  // Angled up: his anti-air, and what follows a launch.
  normal('s.BP', { name: 'Forecast Cross', startup: 10, active: 3, recovery: 16, reach: [0.2, 1.05], at: [0.75, 2.0], damage: 60, hitstun: 20, blockstun: 14, chain: { FK: 'BP FK' } }),
  normal('s.FK', { name: 'Front Kick', startup: 11, active: 3, recovery: 13, reach: [0.2, 1.5], at: [0.6, 0.95], damage: 50, hitstun: 19, blockstun: 13, chain: { BP: 'FK BP' } }),
  // The longest poke in the game: the umbrella, held out at arm's length.
  normal('s.BK', { name: 'Umbrella Jab', startup: 14, active: 3, recovery: 19, reach: [0.2, 1.75], at: [0.75, 1.4], damage: 70, hitstun: 22, blockstun: 15, push: 0.07 }),
  // Crouching
  normal('c.FP', { name: 'Low Jab', stance: 'crouch', startup: 7, active: 2, recovery: 9, reach: [0.2, 0.9], at: [0.7, 0.95], damage: 25, hitstun: 15, blockstun: 11, chain: { FK: 'c.FP FK' } }),
  normal('c.BP', { name: 'Rising Umbrella', stance: 'crouch', startup: 9, active: 4, recovery: 20, reach: [0.1, 0.8], at: [0.75, 1.9], damage: 70, hitstun: 24, blockstun: 12, launch: 0.16 }),
  normal('c.FK', { name: 'Shin Poke', stance: 'crouch', startup: 8, active: 2, recovery: 14, reach: [0.2, 1.25], at: [0, 0.3], height: 'low', damage: 35, hitstun: 16, blockstun: 10 }),
  normal('c.BK', { name: 'Ground Fog', stance: 'crouch', startup: 12, active: 3, recovery: 24, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 70, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normal
  normal('f.BP', { name: 'Barometer Smash', startup: 20, active: 2, recovery: 18, reach: [0.2, 1.0], at: [0.75, 1.6], height: 'overhead', damage: 70, hitstun: 22, blockstun: 14, chain: { BP: 'f.BP BP' } }),
  // Steps back as it kicks: makes room for the forecast.
  move('b.FK', {
    name: 'Step Back Kick',
    kind: 'normal',
    total: 26,
    motion: [{ frames: [1, 8], vx: -0.05 }],
    hits: [strike({ frames: [9, 10], reach: [0.2, 1.3], at: [0.5, 0.9], damage: 40, hitstun: 16, blockstun: 12 })],
    hurt: [{ frames: [9, 18], box: box(0.2, 1.2, 0.5, 0.9) }],
    cancel: [11, 17],
  }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Jab', kind: 'air', startup: 5, active: 6, recovery: 6, reach: [0.1, 0.8], at: [0.6, 1.1], height: 'overhead', damage: 40, hitstun: 18, blockstun: 12, chain: { BP: 'j.BP' } }),
  normal('j.BP', { name: 'Jumping Hammer', kind: 'air', startup: 7, active: 5, recovery: 6, reach: [0.1, 0.9], at: [0.8, 1.3], height: 'overhead', damage: 55, hitstun: 18, blockstun: 12 }),
  normal('j.FK', { name: 'Jumping Knee', kind: 'air', startup: 6, active: 8, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 50, hitstun: 18, blockstun: 12 }),
  normal('j.BK', { name: 'Jumping Boot', kind: 'air', startup: 9, active: 6, recovery: 8, reach: [0.1, 1.0], at: [0.1, 0.6], height: 'overhead', damage: 65, hitstun: 20, blockstun: 12 }),
  // String steps
  normal('FP FP', { name: 'Five-Day Outlook', startup: 8, active: 2, recovery: 12, reach: [0.2, 1.15], at: [1.1, 1.45], height: 'high', damage: 35, hitstun: 18, blockstun: 14, chain: { BK: 'FP FP BK' } }),
  normal('FP FP BK', { name: 'Front Moves In', startup: 12, active: 3, recovery: 20, reach: [0.2, 1.35], at: [0.7, 1.2], damage: 70, hitstun: 0, blockstun: 18, push: 0.07, knockdown: true }),
  normal('FP BP', { name: 'Cloud Cover', startup: 9, active: 3, recovery: 16, reach: [0.2, 1.2], at: [0.75, 1.4], damage: 50, hitstun: 20, blockstun: 13 }),
  normal('BP FK', { name: 'High Pressure', startup: 10, active: 3, recovery: 18, reach: [0.2, 1.3], at: [0.5, 0.9], damage: 55, hitstun: 20, blockstun: 14, chain: { FK: 'BP FK FK' } }),
  normal('BP FK FK', { name: 'Scattered Showers', startup: 11, active: 2, recovery: 16, reach: [0.2, 1.35], at: [0, 0.35], height: 'low', damage: 45, hitstun: 18, blockstun: 13 }),
  normal('FK BP', { name: 'Doppler', startup: 16, active: 2, recovery: 16, reach: [0.2, 1.2], at: [0.75, 1.6], height: 'overhead', damage: 60, hitstun: 20, blockstun: 14 }),
  normal('c.FP FK', { name: 'Ground Frost', stance: 'crouch', startup: 9, active: 2, recovery: 20, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 40, hitstun: 16, blockstun: 10 }),
  normal('f.BP BP', { name: 'Thunderhead', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.25], at: [0.75, 1.4], damage: 65, hitstun: 0, blockstun: 16, launch: 0.15 }),
  // Specials
  move('Cold Front', {
    name: 'Cold Front',
    kind: 'special',
    total: 48,
    boost: 'Cold Front+',
    spawns: [{ frame: 14, projectile: projectile({ at: [0.5, 0], speed: [0.07, 0], size: [-0.35, 0.35, 0, 1.4], life: 90, effect: { damage: 40, hitstun: 20, blockstun: 16, push: 0.05, chip: 8 } }) }],
  }),
  move('Cold Front+', {
    name: 'Cold Front (boosted)',
    kind: 'special',
    total: 48,
    spawns: [{ frame: 14, projectile: projectile({ at: [0.5, 0], speed: [0.1, 0], size: [-0.35, 0.35, 0, 1.4], life: 70, hits: 2, rehit: 12, effect: { damage: 38, hitstun: 20, blockstun: 16, push: 0.04, chip: 7 } }) }],
  }),
  move('Pressure Drop', {
    name: 'Pressure Drop',
    kind: 'special',
    total: 44,
    boost: 'Pressure Drop+',
    spawns: [{ frame: 18, projectile: hail(2.2, 70) }],
  }),
  move('Pressure Drop+', {
    name: 'Pressure Drop (boosted)',
    kind: 'special',
    total: 44,
    spawns: [
      { frame: 18, projectile: hail(1.6, 50) },
      { frame: 22, projectile: hail(2.4, 50) },
      { frame: 26, projectile: hail(3.2, 50) },
    ],
  }),
  move('Isobar Lasso', {
    name: 'Isobar Lasso',
    kind: 'special',
    total: 45,
    boost: 'Isobar Lasso+',
    hits: [strike({ frames: [18, 21], reach: [0.6, 2.6], at: [0.75, 1.4], damage: 40, hitstun: 28, blockstun: 12, push: 0, pull: 0.8 })],
  }),
  move('Isobar Lasso+', {
    name: 'Isobar Lasso (boosted)',
    kind: 'special',
    total: 45,
    hits: [strike({ frames: [18, 21], reach: [0.6, 2.6], at: [0.75, 1.4], damage: 55, hitstun: 28, blockstun: 30, push: 0, pull: 0.8, pullOnBlock: true })],
  }),
  // A rising, invulnerable reversal: wins against pressure, loses badly if blocked.
  move('Heat Lightning', {
    name: 'Heat Lightning',
    kind: 'special',
    total: 40,
    invuln: [1, 7],
    hits: [strike({ frames: [6, 9], reach: [0.1, 0.9], at: [0.75, 2.2], damage: 75, hitstun: 0, blockstun: 14, launch: 0.2 })],
  }),
  // In the air: the umbrella opens and he hangs there, dropping hail on the way down.
  move('Downpour', {
    name: 'Downpour',
    kind: 'special',
    stance: 'air',
    total: 34,
    boost: 'Downpour+',
    hover: [1, 16],
    landing: 6,
    spawns: [{ frame: 12, projectile: hailDown(0.05, 45) }],
  }),
  move('Downpour+', {
    name: 'Downpour (boosted)',
    kind: 'special',
    stance: 'air',
    total: 34,
    hover: [1, 20],
    landing: 6,
    spawns: [
      { frame: 12, projectile: hailDown(0.03, 38) },
      { frame: 15, projectile: hailDown(0.06, 38) },
      { frame: 18, projectile: hailDown(0.09, 38) },
    ],
  }),
  throwMove(100),
  interactMove(),
  technicalDifficulties(1.6),
);

// Finishers. The blows are scripted (nothing here can miss); the picture cuts away at the worst of it.
const finishers = [
  // Close: the full five-day forecast, then the barometer comes down.
  new Script(moves)
    .strike('s.FP', { react: 'high', damage: 30, pull: 0.85 })
    .strike('FP FP', { react: 'high', damage: 35 })
    .strike('s.BP', { react: 'high', damage: 60 })
    .strike('FK BP', { react: 'high', damage: 60 })
    .strike('BP FK FK', { react: 'low', damage: 45 })
    .strike('c.BP', { react: 'launch', damage: 70, pop: 0.17 }, 4)
    .strike('Heat Lightning', { react: 'launch', damage: 75, pop: 0.2 }, 44)
    .strike('f.BP', { react: 'none', damage: 120 }, 0)
    .cut('static')
    .blow(14, { react: 'none', damage: 90 })
    .blow(28, { react: 'none', damage: 90 })
    .blow(40, { react: 'none', damage: 110 })
    .blow(52, { react: 'none', damage: 140 })
    .done({ id: 'Extended Forecast', name: 'Extended Forecast', kind: 'signoff', range: 'close', input: ['b', 'f'], button: 'BP' }, 110),
  // Far: a cold front, three rounds of hail, then reeled in for the lightning.
  new Script(moves)
    .blow(0, { react: 'none', damage: 0, pull: 2.4 })
    .blow(31, { react: 'high', damage: 40 })
    .play('Cold Front', 44)
    .blow(33, { react: 'high', damage: 50 })
    .play('Pressure Drop+', 46)
    .blow(33, { react: 'low', damage: 55 })
    .play('Pressure Drop+', 46)
    .blow(33, { react: 'high', damage: 60 })
    .play('Pressure Drop+', 44)
    .strike('Isobar Lasso', { react: 'launch', damage: 40, pull: 0.9, pop: 0.15 }, 2)
    .strike('Heat Lightning', { react: 'launch', damage: 75, pop: 0.22 }, 44)
    .strike('f.BP', { react: 'none', damage: 130 }, 0)
    .cut('bars')
    .blow(12, { react: 'none', damage: 90 })
    .blow(24, { react: 'none', damage: 90 })
    .blow(36, { react: 'none', damage: 130 })
    .done({ id: 'Severe Weather Warning', name: 'Severe Weather Warning', kind: 'signoff', range: 'far', input: ['d', 'b'], button: 'BK' }, 100),
  // More cancellations: each asks for its own way of ending it (and a held direction comes before a plain one).
  new Script(moves).wait(16).cut('bars').done({ id: 'Cold Snap', name: 'Cold Snap', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Cold Front', hold: 'b' }, 40),
  new Script(moves).wait(22).cut('standby').done({ id: 'Washed Out', name: 'Washed Out', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Downpour' }, 40),
  new Script(moves).wait(20).cut('off').done({ id: 'Struck by Lightning', name: 'Struck by Lightning', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Heat Lightning' }, 40),
  rerun(moves),
];

/** A hailstone that falls from above at distance x: an overhead. */
function hail(x: number, damage: number) {
  return projectile({ at: [x, 3.0], speed: [0, -0.1], size: [-0.3, 0.3, 0, 0.5], life: 60, groundEnds: true, effect: { damage, height: 'overhead', hitstun: 22, blockstun: 14, push: 0.03, chip: 10 } });
}

/** Hail thrown down and forward from the air: an overhead. */
function hailDown(vx: number, damage: number) {
  return projectile({ at: [0.4, 0.4], speed: [vx, -0.09], size: [-0.25, 0.25, 0, 0.5], life: 50, groundEnds: true, effect: { damage, height: 'overhead', hitstun: 22, blockstun: 14, push: 0.03, chip: 8 } });
}

export const DALE: FighterData = {
  id: 'dale',
  name: 'Dale Storm',
  style: 'zoner',
  health: 830,
  walkFwd: fx(0.04),
  walkBack: fx(0.035),
  jumpVy: fx(0.2),
  jumpVx: fx(0.055),
  dash: { frames: 16, speed: fx(0.08) },
  backdash: { frames: 20, speed: fx(0.075) },
  hurt: { stand: box(-0.3, 0.3, 0, 1.8), crouch: box(-0.3, 0.35, 0, 1.1), air: box(-0.3, 0.3, 0.2, 1.6), juggle: box(-0.8, 0.6, 0.2, 0.9) },
  pushW: fx(0.3),
  pushH: fx(1.6),
  pushHCrouch: fx(1.0),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP' },
    b: { FK: 'b.FK' },
  },
  specials: { n: 'Heat Lightning', f: 'Cold Front', d: 'Pressure Drop', b: 'Isobar Lasso' },
  airSpecials: { n: 'Downpour' },
  airStrings: [{ name: 'Squall', path: ['j.FP', 'BP'], safe: false }],
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  show: 'Weather at Eleven',
  finishers,
  strings: [
    { name: 'Five-Day Outlook', path: ['s.FP', 'FP'], safe: true },
    { name: 'Front Moves In', path: ['s.FP', 'FP', 'BK'], safe: true },
    { name: 'Cloud Cover', path: ['s.FP', 'BP'], safe: true },
    { name: 'High Pressure', path: ['s.BP', 'FK'], safe: false },
    { name: 'Scattered Showers', path: ['s.BP', 'FK', 'FK'], safe: true },
    { name: 'Doppler', path: ['s.FK', 'BP'], safe: true },
    { name: 'Ground Frost', path: ['c.FP', 'FK'], safe: false },
    { name: 'Thunderhead', path: ['f.BP', 'BP'], safe: true },
  ],
};
