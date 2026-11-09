/**
 * Hollis Bey, night security guard of the transmitter building. Grappler,
 * and his style is the night watch (docs/STYLES.md): close, slow and
 * crushing. Short reach but the most damage and stun per hit, armour on his
 * heavies, a jab that drags you into grab range, links, and short strings
 * that end in a grab. A command grab that blocking can't stop and Throw
 * can't break; Flashlight blinds and goes through armour; Night Shift walks
 * through one hit to get in.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { box, interactMove, move, normal, rerun, Script, strike, table, technicalDifficulties, throwMove } from './build';

const moves = table(
  // Standing
  // Grabs a fistful of collar and hauls them in: on hit they end up in Clocking In's reach.
  normal('s.FP', { name: 'Collar Grab', startup: 8, active: 2, recovery: 11, reach: [0.2, 1.0], at: [1.2, 1.55], damage: 40, hitstun: 17, blockstun: 13, pull: 0.75, chain: { FP: 'FP FP' } }),
  // Heavy enough to stagger: the one normal in the game that links (into the jab).
  normal('s.BP', { name: 'Nightstick', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.15], at: [1.1, 1.5], damage: 75, hitstun: 28, blockstun: 15, push: 0.02, chain: { FP: 'BP FP' } }),
  // A knee to the gut, up close: short, but it staggers long enough to link the jab.
  normal('s.FK', { name: 'Knee', startup: 9, active: 3, recovery: 15, reach: [0.15, 0.85], at: [0.8, 1.35], damage: 66, hitstun: 24, blockstun: 15, push: 0.02, chain: { FK: 'FK FK' } }),
  // Walks through a poke: one hit of armour on the way.
  normal('s.BK', { name: 'Door Kick', startup: 15, active: 3, recovery: 22, reach: [0.2, 1.35], at: [0.8, 1.3], damage: 95, hitstun: 23, blockstun: 17, push: 0.08, armor: [1, 14] }),
  // Crouching
  normal('c.FP', { name: 'Low Jab', stance: 'crouch', startup: 8, active: 2, recovery: 10, reach: [0.2, 0.95], at: [0.7, 1.0], damage: 35, hitstun: 15, blockstun: 12, chain: { FK: 'c.FP FK' } }),
  // Comes up through a jump-in: armoured while he rises.
  normal('c.BP', { name: 'Rising Clothesline', stance: 'crouch', startup: 11, active: 4, recovery: 22, reach: [0.1, 0.85], at: [1.0, 2.0], damage: 85, hitstun: 0, blockstun: 12, launch: 0.17, armor: [1, 10] }),
  normal('c.FK', { name: 'Toe Stomp', stance: 'crouch', startup: 9, active: 2, recovery: 16, reach: [0.2, 1.25], at: [0, 0.3], height: 'low', damage: 45, hitstun: 16, blockstun: 10 }),
  normal('c.BK', { name: 'Floor Sweep', stance: 'crouch', startup: 14, active: 3, recovery: 26, reach: [0.2, 1.4], at: [0, 0.3], height: 'low', damage: 85, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normals
  // Barges forward behind his shoulder and through a poke, down onto them.
  normal('f.BP', { name: 'Shoulder Check', startup: 22, active: 2, recovery: 18, reach: [0.2, 1.05], at: [1.0, 1.7], height: 'overhead', damage: 85, hitstun: 22, blockstun: 15, armor: [1, 16], motion: [{ frames: [4, 20], vx: 0.05 }] }),
  // A stiff arm into the chest: slow, but it crushes a guard (and he can't be jabbed out of the stagger).
  normal('f.FK', { name: 'Stiff Arm', startup: 20, active: 3, recovery: 20, reach: [0.2, 1.05], at: [0.9, 1.6], damage: 55, hitstun: 20, blockstun: 14, push: 0.04, guardCrush: true }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Chop', kind: 'air', startup: 6, active: 6, recovery: 6, reach: [0.1, 0.8], at: [0.6, 1.1], height: 'overhead', damage: 50, hitstun: 18, blockstun: 12, chain: { BP: 'j.BP' } }),
  normal('j.BP', { name: 'Jumping Hammer', kind: 'air', startup: 8, active: 5, recovery: 6, reach: [0.1, 0.9], at: [0.8, 1.3], height: 'overhead', damage: 65, hitstun: 19, blockstun: 12 }),
  normal('j.FK', { name: 'Jumping Knee', kind: 'air', startup: 7, active: 8, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 60, hitstun: 18, blockstun: 12 }),
  normal('j.BK', { name: 'Body Drop', kind: 'air', startup: 10, active: 6, recovery: 8, reach: [-0.3, 1.0], at: [0, 0.5], height: 'overhead', damage: 80, hitstun: 20, blockstun: 13 }),
  // String steps
  normal('FP FP', { name: 'Pat Down', startup: 9, active: 2, recovery: 13, reach: [0.2, 1.1], at: [1.1, 1.5], damage: 45, hitstun: 18, blockstun: 15, chain: { BP: 'FP FP BP', FK: 'FP FP FK' } }),
  // The string's grab: catches them still reeling from the pat down (never if they blocked it).
  move('FP FP FK', {
    name: "Cuff 'Em",
    kind: 'normal',
    total: 34,
    throwData: { frames: [8, 9], range: fx(1.2), damage: 110, untechable: true, reeling: true },
  }),
  normal('FP FP BP', { name: 'Lights Out', startup: 14, active: 3, recovery: 22, reach: [0.2, 1.3], at: [0.9, 1.4], damage: 90, hitstun: 0, blockstun: 18, push: 0.08, knockdown: true }),
  normal('BP FP', { name: 'Night Watch', startup: 9, active: 2, recovery: 14, reach: [0.2, 1.15], at: [1.1, 1.5], damage: 45, hitstun: 18, blockstun: 14, chain: { BK: 'BP FP BK', FK: 'BP FP FK' } }),
  // The other grab ender: hands patting them down, then a wrist lock (never if they blocked).
  move('BP FP FK', {
    name: 'Frisk',
    kind: 'normal',
    total: 34,
    throwData: { frames: [8, 9], range: fx(1.2), damage: 100, untechable: true, reeling: true },
  }),
  normal('BP FP BK', { name: 'Lockup', startup: 16, active: 3, recovery: 22, reach: [0.2, 1.4], at: [0, 0.35], height: 'low', damage: 80, hitstun: 0, blockstun: 14, knockdown: true }),
  // The other knee: he walks into it.
  normal('FK FK', { name: 'Patrol', startup: 11, active: 3, recovery: 16, reach: [0.15, 0.9], at: [0.8, 1.35], damage: 58, hitstun: 20, blockstun: 15, motion: [{ frames: [2, 10], vx: 0.03 }] }),
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
    hits: [strike({ frames: [14, 17], reach: [0.4, 2.6], at: [0.9, 1.8], damage: 50, hitstun: 40, blockstun: 22, armorBreak: true })],
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
    hits: [strike({ frames: [16, 19], reach: [0.1, 1.1], at: [0.6, 1.6], damage: 70, hitstun: 0, blockstun: 18, knockdown: true, push: 0.08 })],
  }),
  // In the air: he hangs there and sweeps the flashlight down across the floor. It blinds and goes through armour.
  move('Searchlight', {
    name: 'Searchlight',
    kind: 'special',
    stance: 'air',
    total: 38,
    boost: 'Searchlight+',
    hover: [1, 22],
    landing: 8,
    hits: [strike({ frames: [12, 16], reach: [0.2, 2.0], at: [-1.6, 0.4], height: 'overhead', damage: 50, hitstun: 30, blockstun: 14, armorBreak: true })],
  }),
  move('Searchlight+', {
    name: 'Searchlight (boosted)',
    kind: 'special',
    stance: 'air',
    total: 38,
    hover: [1, 22],
    landing: 8,
    hits: [strike({ frames: [12, 16], reach: [0.2, 2.5], at: [-1.9, 0.5], height: 'overhead', damage: 50, hitstun: 40, blockstun: 22, armorBreak: true })],
  }),
  throwMove(130),
  interactMove(),
  technicalDifficulties(1.6),
);

// Finishers. The blows are scripted (nothing here can miss); the picture cuts away at the worst of it.
const finishers = [
  // Close: clocked in, beaten down with the nightstick, a light in the eyes, then the boot.
  new Script(moves)
    .strike('Clocking In', { react: 'grab', damage: 120, pull: 0.7 }, 30)
    .strike('s.BP', { react: 'high', damage: 75 })
    .strike('BP FP', { react: 'high', damage: 45 })
    .strike('s.BP', { react: 'high', damage: 75 })
    .strike('FP FP BP', { react: 'knockdown', damage: 90, pop: 0.1, carry: 0.02 }, 30)
    .play('Flashlight', 34)
    .strike('c.FK', { react: 'none', damage: 140 }, 0)
    .cut('standby')
    .blow(12, { react: 'none', damage: 100 })
    .blow(24, { react: 'none', damage: 100 })
    .blow(36, { react: 'none', damage: 100 })
    .blow(50, { react: 'none', damage: 150 })
    .done({ id: 'Lights Out', name: 'Lights Out', kind: 'signoff', range: 'close', input: ['b', 'd'], button: 'BP' }, 110),
  // Mid: the keys, the walk through, and the keys again until it's quiet.
  new Script(moves)
    .blow(11, { react: 'low', damage: 55, pull: 1.6 })
    .blow(19, { react: 'launch', damage: 60, pop: 0.15 })
    .play('Key Ring+', 26)
    .strike('Night Shift', { react: 'knockdown', damage: 80, pop: 0.1, carry: 0.02 }, 28)
    .strike('Key Ring', { react: 'none', damage: 65 }, 14)
    .strike('Key Ring', { react: 'none', damage: 65 }, 14)
    .strike('c.BK', { react: 'none', damage: 130 }, 0)
    .cut('bars')
    .blow(14, { react: 'none', damage: 95 })
    .blow(30, { react: 'none', damage: 95 })
    .blow(46, { react: 'none', damage: 140 })
    .done({ id: 'End of Shift', name: 'End of Shift', kind: 'signoff', range: 'mid', input: ['f', 'd'], button: 'BK' }, 100),
  new Script(moves).wait(20).cut('off').done({ id: 'Clocked Out', name: 'Clocked Out', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Clocking In' }, 40),
  rerun(moves),
];

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
  hurt: { stand: box(-0.35, 0.35, 0, 1.9), crouch: box(-0.35, 0.4, 0, 1.2), air: box(-0.35, 0.35, 0.2, 1.7), juggle: box(-0.85, 0.65, 0.2, 1.0) },
  pushW: fx(0.35),
  pushH: fx(1.7),
  pushHCrouch: fx(1.1),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP', FK: 'f.FK' },
    b: {},
  },
  specials: { n: 'Night Shift', f: 'Clocking In', b: 'Flashlight', d: 'Key Ring' },
  airSpecials: { n: 'Searchlight' },
  airStrings: [{ name: 'Lights Out Chop', path: ['j.FP', 'BP'], safe: false }],
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  show: 'The Night Watch',
  finishers,
  strings: [
    { name: 'Pat Down', path: ['s.FP', 'FP'], safe: true },
    { name: 'Lights Out', path: ['s.FP', 'FP', 'BP'], safe: false },
    { name: "Cuff 'Em", path: ['s.FP', 'FP', 'FK'], safe: false },
    { name: 'Night Watch', path: ['s.BP', 'FP'], safe: true },
    { name: 'Lockup', path: ['s.BP', 'FP', 'BK'], safe: false },
    { name: 'Frisk', path: ['s.BP', 'FP', 'FK'], safe: false },
    { name: 'Patrol', path: ['s.FK', 'FK'], safe: true },
    { name: 'Sweep the Floor', path: ['c.FP', 'FK'], safe: false },
  ],
};
