/**
 * Hollis Bey, night security guard of the transmitter building. Grappler:
 * slow, high health, hits hard, and a command grab that blocking can't stop
 * and Throw can't break. Flashlight blinds and goes through armour; Night
 * Shift walks through one hit to get in.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { box, interactMove, move, normal, strike, table, technicalDifficulties, throwMove } from './build';

const moves = table(
  // Standing
  normal('s.FP', { name: 'Badge Flash', startup: 8, active: 2, recovery: 11, reach: [0.2, 1.0], at: [1.2, 1.55], damage: 40, hitstun: 17, blockstun: 13, chain: { FP: 'FP FP', BK: 'FP BK' } }),
  normal('s.BP', { name: 'Nightstick', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.15], at: [1.1, 1.5], damage: 75, hitstun: 21, blockstun: 15, chain: { FP: 'BP FP' } }),
  normal('s.FK', { name: 'Boot', startup: 10, active: 3, recovery: 16, reach: [0.2, 1.2], at: [0.5, 0.9], damage: 60, hitstun: 19, blockstun: 14, chain: { FK: 'FK FK' } }),
  normal('s.BK', { name: 'Door Kick', startup: 15, active: 3, recovery: 22, reach: [0.2, 1.35], at: [0.8, 1.3], damage: 95, hitstun: 23, blockstun: 17, push: 0.08 }),
  // Crouching
  normal('c.FP', { name: 'Low Jab', stance: 'crouch', startup: 8, active: 2, recovery: 10, reach: [0.2, 0.95], at: [0.7, 1.0], damage: 35, hitstun: 15, blockstun: 12, chain: { FK: 'c.FP FK' } }),
  normal('c.BP', { name: 'Rising Clothesline', stance: 'crouch', startup: 11, active: 4, recovery: 22, reach: [0.1, 0.85], at: [1.0, 2.0], damage: 85, hitstun: 0, blockstun: 12, launch: 0.17 }),
  normal('c.FK', { name: 'Toe Stomp', stance: 'crouch', startup: 9, active: 2, recovery: 16, reach: [0.2, 1.25], at: [0, 0.3], height: 'low', damage: 45, hitstun: 16, blockstun: 10 }),
  normal('c.BK', { name: 'Floor Sweep', stance: 'crouch', startup: 14, active: 3, recovery: 26, reach: [0.2, 1.4], at: [0, 0.3], height: 'low', damage: 85, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normal
  normal('f.BP', { name: 'Shoulder Check', startup: 22, active: 2, recovery: 18, reach: [0.2, 1.05], at: [1.0, 1.7], height: 'overhead', damage: 85, hitstun: 22, blockstun: 15 }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Chop', kind: 'air', startup: 6, active: 6, recovery: 6, reach: [0.1, 0.8], at: [0.6, 1.1], height: 'overhead', damage: 50, hitstun: 18, blockstun: 12 }),
  normal('j.BP', { name: 'Jumping Hammer', kind: 'air', startup: 8, active: 5, recovery: 6, reach: [0.1, 0.9], at: [0.8, 1.3], height: 'overhead', damage: 65, hitstun: 19, blockstun: 12 }),
  normal('j.FK', { name: 'Jumping Knee', kind: 'air', startup: 7, active: 8, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 60, hitstun: 18, blockstun: 12 }),
  normal('j.BK', { name: 'Body Drop', kind: 'air', startup: 10, active: 6, recovery: 8, reach: [-0.3, 1.0], at: [0, 0.5], height: 'overhead', damage: 80, hitstun: 20, blockstun: 13 }),
  // String steps
  normal('FP FP', { name: 'Pat Down', startup: 9, active: 2, recovery: 13, reach: [0.2, 1.1], at: [1.1, 1.5], damage: 45, hitstun: 18, blockstun: 15, chain: { BP: 'FP FP BP' } }),
  normal('FP FP BP', { name: 'Lights Out', startup: 14, active: 3, recovery: 22, reach: [0.2, 1.3], at: [0.9, 1.4], damage: 90, hitstun: 0, blockstun: 18, push: 0.08, knockdown: true }),
  normal('FP BK', { name: 'Rounds', startup: 13, active: 3, recovery: 18, reach: [0.2, 1.35], at: [0.7, 1.2], damage: 70, hitstun: 21, blockstun: 16 }),
  normal('BP FP', { name: 'Night Watch', startup: 9, active: 2, recovery: 14, reach: [0.2, 1.15], at: [1.1, 1.5], damage: 45, hitstun: 18, blockstun: 14, chain: { BK: 'BP FP BK' } }),
  normal('BP FP BK', { name: 'Lockup', startup: 16, active: 3, recovery: 22, reach: [0.2, 1.4], at: [0, 0.35], height: 'low', damage: 80, hitstun: 0, blockstun: 14, knockdown: true }),
  normal('FK FK', { name: 'Patrol', startup: 11, active: 3, recovery: 16, reach: [0.2, 1.3], at: [0.5, 0.9], damage: 60, hitstun: 19, blockstun: 14, chain: { BP: 'FK FK BP' } }),
  normal('FK FK BP', { name: 'Clock Out', startup: 20, active: 2, recovery: 16, reach: [0.2, 1.2], at: [1.0, 1.7], height: 'overhead', damage: 75, hitstun: 21, blockstun: 15 }),
  normal('c.FP FK', { name: 'Sweep the Floor', stance: 'crouch', startup: 10, active: 2, recovery: 22, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 50, hitstun: 16, blockstun: 10 }),
  // Specials
  move('Clocking In', {
    name: 'Clocking In',
    kind: 'special',
    total: 50,
    boost: 'Clocking In+',
    throwData: { frames: [10, 12], range: fx(1.1), damage: 120, untechable: true },
  }),
  move('Clocking In+', {
    name: 'Clocking In (boosted)',
    kind: 'special',
    total: 50,
    throwData: { frames: [10, 12], range: fx(1.3), damage: 170, untechable: true },
  }),
  move('Flashlight', {
    name: 'Flashlight',
    kind: 'special',
    total: 37,
    boost: 'Flashlight+',
    hits: [strike({ frames: [14, 17], reach: [0.4, 2.2], at: [1.2, 1.7], damage: 50, hitstun: 30, blockstun: 14, armorBreak: true })],
  }),
  move('Flashlight+', {
    name: 'Flashlight (boosted)',
    kind: 'special',
    total: 37,
    hits: [strike({ frames: [14, 17], reach: [0.4, 2.6], at: [0.9, 1.8], damage: 70, hitstun: 40, blockstun: 22, armorBreak: true })],
  }),
  move('Key Ring', {
    name: 'Key Ring',
    kind: 'special',
    total: 32,
    boost: 'Key Ring+',
    hits: [strike({ frames: [12, 14], reach: [0.4, 1.9], at: [0, 0.4], height: 'low', damage: 65, hitstun: 20, blockstun: 12 })],
  }),
  move('Key Ring+', {
    name: 'Key Ring (boosted)',
    kind: 'special',
    total: 40,
    hits: [
      strike({ frames: [12, 14], reach: [0.4, 1.9], at: [0, 0.4], height: 'low', damage: 55, hitstun: 20, blockstun: 12 }),
      strike({ frames: [20, 22], reach: [0.4, 1.9], at: [0.8, 1.5], damage: 60, hitstun: 0, blockstun: 14, launch: 0.15 }),
    ],
  }),
  // Walks through one hit to get in.
  move('Night Shift', {
    name: 'Night Shift',
    kind: 'special',
    total: 39,
    boost: 'Night Shift+',
    armor: [1, 18],
    motion: [{ frames: [4, 18], vx: 0.07 }],
    hits: [strike({ frames: [16, 19], reach: [0.1, 1.0], at: [0.6, 1.6], damage: 80, hitstun: 0, blockstun: 16, knockdown: true, push: 0.07 })],
  }),
  move('Night Shift+', {
    name: 'Night Shift (boosted)',
    kind: 'special',
    total: 39,
    armor: [1, 22],
    motion: [{ frames: [4, 18], vx: 0.09 }],
    hits: [strike({ frames: [16, 19], reach: [0.1, 1.1], at: [0.6, 1.6], damage: 110, hitstun: 0, blockstun: 18, knockdown: true, push: 0.08 })],
  }),
  throwMove(130),
  interactMove(),
  technicalDifficulties(1.6),
);

export const HOLLIS: FighterData = {
  id: 'hollis',
  name: 'Hollis Bey',
  style: 'grappler',
  health: 1050,
  walkFwd: fx(0.032),
  walkBack: fx(0.028),
  jumpVy: fx(0.18),
  jumpVx: fx(0.045),
  dash: { frames: 18, speed: fx(0.07) },
  backdash: { frames: 22, speed: fx(0.065) },
  hurt: { stand: box(-0.35, 0.35, 0, 1.9), crouch: box(-0.35, 0.4, 0, 1.2), air: box(-0.35, 0.35, 0.2, 1.7) },
  pushW: fx(0.35),
  pushH: fx(1.7),
  pushHCrouch: fx(1.1),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP' },
    b: {},
  },
  specials: { n: 'Night Shift', f: 'Clocking In', b: 'Flashlight', d: 'Key Ring' },
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  strings: [
    { name: 'Pat Down', path: ['s.FP', 'FP'], safe: true },
    { name: 'Lights Out', path: ['s.FP', 'FP', 'BP'], safe: false },
    { name: 'Rounds', path: ['s.FP', 'BK'], safe: true },
    { name: 'Night Watch', path: ['s.BP', 'FP'], safe: true },
    { name: 'Lockup', path: ['s.BP', 'FP', 'BK'], safe: false },
    { name: 'Patrol', path: ['s.FK', 'FK'], safe: true },
    { name: 'Clock Out', path: ['s.FK', 'FK', 'BP'], safe: true },
    { name: 'Sweep the Floor', path: ['c.FP', 'FK'], safe: false },
  ],
};
