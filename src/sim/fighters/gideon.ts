/**
 * Rev. Gideon Price, a late-night televangelist who promises miracles for a
 * donation. All-rounder with a second resource: the Collection Plate goes out
 * and comes back, and every time it connects it collects a donation (up to
 * five). Laying On of Hands and Fire and Brimstone spend them automatically
 * when he has enough: a heal, and a far bigger blast.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { airSpike, airStep, box, followUp, interactMove, move, normal, projectile, rerun, Script, strike, table, technicalDifficulties, throwMove } from './build';

/** The plate: out, back, and a donation each time it connects. */
function plate(speed: number, back: number, damage: number) {
  return projectile({
    at: [0.6, 0.95],
    speed: [speed, 0],
    size: [-0.3, 0.3, 0, 0.3],
    life: back * 3,
    returnAfter: back,
    hits: 2,
    rehit: 14,
    collects: true,
    // Skimmed at chest height: duck it.
    effect: { damage, height: 'high', hitstun: 18, blockstun: 14, push: 0.03, chip: 4 },
  });
}

const moves = table(
  // Standing: middle of the road in everything; good reach, fair speed.
  normal('s.FP', { name: 'Hand Raised', startup: 7, active: 2, recovery: 10, reach: [0.2, 1.0], at: [1.2, 1.5], height: 'high', damage: 32, hitstun: 15, blockstun: 12, chain: { FP: 'FP FP', FK: 'FP FK' } }),
  normal('s.BP', { name: 'Good Book', startup: 11, active: 3, recovery: 16, reach: [0.2, 1.2], at: [0.75, 1.55], damage: 62, hitstun: 21, blockstun: 15, chain: { BP: 'BP BP' } }),
  normal('s.FK', { name: 'Testify', startup: 9, active: 3, recovery: 13, reach: [0.2, 1.3], at: [0.5, 0.9], damage: 45, hitstun: 18, blockstun: 14, chain: { BK: 'FK BK' } }),
  normal('s.BK', { name: 'Pulpit Kick', startup: 13, active: 3, recovery: 19, reach: [0.2, 1.45], at: [0.75, 1.35], damage: 75, hitstun: 22, blockstun: 16, push: 0.07 }),
  // Crouching
  normal('c.FP', { name: 'Kneel', stance: 'crouch', startup: 7, active: 2, recovery: 9, reach: [0.2, 0.9], at: [0.6, 0.9], damage: 26, hitstun: 15, blockstun: 12, chain: { FK: 'c.FP FK' } }),
  normal('c.BP', { name: 'Rapture', stance: 'crouch', startup: 9, active: 4, recovery: 19, reach: [0.1, 0.8], at: [0.75, 2.0], damage: 68, hitstun: 24, blockstun: 12, launch: 0.17 }),
  normal('c.FK', { name: 'Low Offering', stance: 'crouch', startup: 8, active: 2, recovery: 13, reach: [0.2, 1.2], at: [0, 0.3], height: 'low', damage: 41, hitstun: 16, blockstun: 11 }),
  normal('c.BK', { name: 'Bow Down', stance: 'crouch', startup: 12, active: 3, recovery: 22, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 70, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normals
  normal('f.BP', { name: 'Smite', startup: 20, active: 2, recovery: 17, reach: [0.2, 1.05], at: [0.75, 1.7], height: 'overhead', damage: 70, hitstun: 22, blockstun: 14 }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Blessing', kind: 'air', startup: 5, active: 6, recovery: 6, reach: [0.1, 0.8], at: [0.6, 1.1], height: 'overhead', damage: 40, hitstun: 18, blockstun: 12, chain: { BK: 'j.BK', BP: 'j.BP' } }),
  normal('j.BP', { name: 'Descending Book', kind: 'air', startup: 8, active: 5, recovery: 7, reach: [0.1, 0.95], at: [0.6, 1.2], height: 'overhead', damage: 58, hitstun: 18, blockstun: 12, chain: { FP: 'j.BP FP', BK: 'j.BP BK' } }),
  normal('j.FK', { name: 'Jumping Heel', kind: 'air', startup: 6, active: 8, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 48, hitstun: 18, blockstun: 12 }),
  normal('j.BK', { name: 'Ascension Kick', kind: 'air', startup: 9, active: 6, recovery: 8, reach: [0.1, 1.0], at: [0.1, 0.6], height: 'overhead', damage: 62, hitstun: 20, blockstun: 12 }),
  // String steps
  // Air string steps: a blessing raised under them, then the book brought down from on high, and they bounce.
  airStep('j.BP FP', { name: 'Benediction', damage: 40, chain: { BK: 'j.BP BK' } }),
  airSpike('j.BP BK', { name: 'Smite from Above', damage: 45 }),
  normal('FP FP', { name: 'Amen', startup: 7, active: 2, recovery: 11, reach: [0.2, 1.05], at: [1.15, 1.5], height: 'high', damage: 32, hitstun: 17, blockstun: 14, chain: { BP: 'FP FP BP' } }),
  normal('FP FP BP', { name: 'Hallelujah', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.25], at: [0.75, 1.6], damage: 65, hitstun: 0, blockstun: 17, push: 0.07, knockdown: true }),
  normal('FP FK', { name: 'Sermon', startup: 9, active: 2, recovery: 15, reach: [0.2, 1.3], at: [0, 0.35], height: 'low', damage: 40, hitstun: 18, blockstun: 12, chain: { BK: 'FK BK' } }),
  normal('BP BP', { name: 'Chapter and Verse', startup: 11, active: 3, recovery: 16, reach: [0.2, 1.25], at: [0.75, 1.5], damage: 55, hitstun: 20, blockstun: 15, chain: { BK: 'BP BP BK' } }),
  normal('BP BP BK', { name: 'Born Again', startup: 13, active: 3, recovery: 19, reach: [0.2, 1.35], at: [0.75, 1.6], damage: 70, hitstun: 0, blockstun: 17, launch: 0.15 }),
  normal('FK BK', { name: 'Altar Call', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.45], at: [0.75, 1.4], damage: 62, hitstun: 20, blockstun: 16 }),
  normal('c.FP FK', { name: 'Humble Sweep', stance: 'crouch', startup: 10, active: 2, recovery: 19, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 42, hitstun: 16, blockstun: 10 }),
  // Specials
  move('Collection Plate', {
    name: 'Collection Plate',
    kind: 'special',
    total: 40,
    boost: 'Collection Plate+',
    spawns: [{ frame: 14, projectile: plate(0.11, 26, 31) }],
  }),
  move('Collection Plate+', {
    name: 'Collection Plate (boosted)',
    kind: 'special',
    total: 40,
    spawns: [{ frame: 14, projectile: plate(0.15, 24, 43) }],
  }),
  // A palm to the forehead. With a donation to spend, it heals him too.
  move('Laying On of Hands', {
    name: 'Laying On of Hands',
    // BK while they're still under his hand: slain in the spirit, up they go.
    chain: { BK: 'Laying On of Hands BK' },
    cancel: [13, 20],
    kind: 'special',
    total: 36,
    boost: 'Laying On of Hands+',
    tithe: { cost: 1, into: 'Laying On of Hands (healing)' },
    hits: [strike({ frames: [10, 12], reach: [0.2, 1.0], at: [1.2, 1.7], height: 'high', damage: 55, hitstun: 22, blockstun: 12, push: 0.05 })],
  }),
  move('Laying On of Hands (healing)', {
    name: 'Laying On of Hands (healing)',
    chain: { BK: 'Laying On of Hands BK' },
    cancel: [13, 20],
    kind: 'special',
    total: 46,
    hits: [strike({ frames: [10, 12], reach: [0.2, 1.0], at: [1.2, 1.7], height: 'high', damage: 55, hitstun: 22, blockstun: 12, push: 0.05 })],
    heal: { frame: 24, amount: 90 },
    boost: 'Laying On of Hands (healing)+',
  }),
  // Boosted (1 bar): both hands, and the spirit lifts them off their feet; on a juggled body, back up again. Paid in Signal, not donations.
  followUp('Laying On of Hands BK', { name: 'Slain in the Spirit', startup: 9, active: 3, recovery: 20, reach: [0.2, 1.1], at: [0.75, 1.6], damage: 40, hitstun: 0, blockstun: 12, launch: 0.16 }),
  move('Laying On of Hands+', {
    name: 'Laying On of Hands (boosted)',
    kind: 'special',
    total: 36,
    hits: [strike({ frames: [10, 12], reach: [0.2, 1.05], at: [0.75, 1.8], damage: 62, hitstun: 0, blockstun: 14, push: 0.05, launch: 0.17 })],
  }),
  // The same with a donation spent: it heals him as well.
  move('Laying On of Hands (healing)+', {
    name: 'Laying On of Hands (healing, boosted)',
    kind: 'special',
    total: 46,
    hits: [strike({ frames: [10, 12], reach: [0.2, 1.05], at: [0.75, 1.8], damage: 62, hitstun: 0, blockstun: 14, push: 0.05, launch: 0.17 })],
    heal: { frame: 24, amount: 90 },
  }),
  // A blast all round him, front and back. With two donations, the sky opens.
  move('Fire and Brimstone', {
    name: 'Fire and Brimstone',
    kind: 'special',
    total: 50,
    boost: 'Fire and Brimstone+',
    tithe: { cost: 2, into: 'Fire and Brimstone (blessed)' },
    hits: [strike({ frames: [18, 21], reach: [-1.2, 1.2], at: [0, 1.8], damage: 70, hitstun: 0, blockstun: 14, chip: 12, knockdown: true })],
  }),
  // Boosted (1 bar, when there aren't two donations to spend): the sky opens a little way, and a juggled body goes back up.
  move('Fire and Brimstone+', {
    name: 'Fire and Brimstone (boosted)',
    kind: 'special',
    total: 50,
    armor: [4, 17],
    hits: [strike({ frames: [18, 21], reach: [-1.6, 1.6], at: [0, 2.0], damage: 80, hitstun: 0, blockstun: 16, chip: 16, launch: 0.17 })],
  }),
  move('Fire and Brimstone (blessed)', {
    name: 'Fire and Brimstone (blessed)',
    kind: 'special',
    total: 54,
    armor: [4, 17],
    hits: [strike({ frames: [18, 22], reach: [-2.2, 2.2], at: [0, 2.4], damage: 110, hitstun: 0, blockstun: 16, chip: 22, launch: 0.18 })],
  }),
  // In the air: arms out, hanging there, and the light goes off all round him. Pops them up.
  // Back + Special: a palm to the forehead that casts them out (off the wall, near one).
  move('Begone', {
    name: 'Begone',
    kind: 'special',
    total: 40,
    boost: 'Begone+',
    hits: [strike({ frames: [13, 15], reach: [0.2, 1.25], at: [0.75, 1.6], damage: 70, hitstun: 0, blockstun: 16, push: 0.08, knockdown: true, wallBounce: true })],
    hurt: [{ frames: [13, 26], box: box(0.2, 1.1, 1.0, 1.6) }],
  }),
  // Boosted: he takes a hit to do it, and casts them up instead.
  move('Begone+', {
    name: 'Begone (boosted)',
    kind: 'special',
    total: 40,
    armor: [1, 12],
    hits: [strike({ frames: [13, 15], reach: [0.2, 1.3], at: [0.75, 1.7], damage: 60, hitstun: 0, blockstun: 18, push: 0.06, launch: 0.17 })],
    hurt: [{ frames: [13, 26], box: box(0.2, 1.1, 1.0, 1.6) }],
  }),
  move('Rapture', {
    name: 'Rapture',
    kind: 'special',
    stance: 'air',
    total: 40,
    boost: 'Rapture+',
    hover: [1, 26],
    landing: 6,
    hits: [strike({ frames: [14, 20], reach: [-1.0, 1.0], at: [-0.6, 1.8], damage: 55, hitstun: 0, blockstun: 14, chip: 8, launch: 0.16 })],
  }),
  move('Rapture+', {
    name: 'Rapture (boosted)',
    kind: 'special',
    stance: 'air',
    total: 40,
    armor: [1, 13],
    hover: [1, 26],
    landing: 6,
    hits: [strike({ frames: [14, 20], reach: [-1.5, 1.5], at: [-1.0, 2.2], damage: 70, hitstun: 0, blockstun: 14, chip: 12, launch: 0.18 })],
  }),
  // Down + Special in the air: he hangs there, arms wide, then comes down on them like judgement.
  move('Fall from Grace', {
    name: 'Fall from Grace',
    kind: 'special',
    stance: 'air',
    total: 38,
    boost: 'Fall from Grace+',
    hover: [1, 8],
    dive: { frame: 9, vx: 0.06, vy: -0.15 },
    landing: 12,
    hits: [strike({ frames: [10, 36], reach: [-0.3, 0.8], at: [-0.2, 0.7], height: 'overhead', damage: 55, hitstun: 0, blockstun: 12, knockdown: true })],
  }),
  move('Fall from Grace+', {
    name: 'Fall from Grace (boosted)',
    kind: 'special',
    stance: 'air',
    total: 38,
    armor: [1, 8],
    hover: [1, 8],
    dive: { frame: 9, vx: 0.06, vy: -0.15 },
    landing: 12,
    hits: [strike({ frames: [10, 36], reach: [-0.35, 0.9], at: [-0.2, 0.8], height: 'overhead', damage: 50, hitstun: 0, blockstun: 14, knockdown: true, groundBounce: true })],
  }),
  throwMove(105),
  interactMove(),
  technicalDifficulties(1.6),
);

// Finishers. The blows are scripted; the picture cuts away at the worst of it.
const finishers = [
  // Close: a laying on of hands that doesn't stop, then the good book.
  new Script(moves)
    .strike('s.FP', { react: 'high', damage: 32, pull: 0.85 })
    .strike('FP FP', { react: 'high', damage: 32 })
    .strike('Laying On of Hands', { react: 'high', damage: 55 })
    .strike('s.BP', { react: 'high', damage: 62 })
    .strike('BP BP', { react: 'high', damage: 55 })
    .strike('c.BP', { react: 'launch', damage: 68, pop: 0.2 }, 4)
    .strike('BP BP BK', { react: 'launch', damage: 70, pop: 0.12 }, 30)
    .strike('f.BP', { react: 'none', damage: 120 }, 0)
    .cut('static')
    .blow(14, { react: 'none', damage: 90 })
    .blow(26, { react: 'none', damage: 100 })
    .blow(40, { react: 'none', damage: 120 })
    .blow(54, { react: 'none', damage: 140 })
    .done({ id: 'Faith Healing', name: 'Faith Healing', kind: 'signoff', range: 'close', input: ['f', 'd'], button: 'BP' }, 110),
  // Mid: the plate passed twice, then fire from above.
  new Script(moves)
    .play('Collection Plate+', 40)
    .blow(0, { react: 'high', damage: 45 })
    .blow(30, { react: 'high', damage: 45 })
    .play('Collection Plate+', 40)
    .blow(0, { react: 'high', damage: 45 })
    .blow(30, { react: 'low', damage: 45 })
    .strike('Fire and Brimstone (blessed)', { react: 'launch', damage: 110, pull: 1.0, pop: 0.22 }, 40)
    .strike('s.BK', { react: 'none', damage: 120 }, 0)
    .cut('bars')
    .blow(12, { react: 'none', damage: 90 })
    .blow(26, { react: 'none', damage: 110 })
    .blow(40, { react: 'none', damage: 140 })
    .done({ id: 'Last Rites', name: 'Last Rites', kind: 'signoff', range: 'mid', input: ['d', 'b'], button: 'BK' }, 100),
  // More cancellations: each asks for its own way of ending it (and a held direction comes before a plain one).
  new Script(moves).wait(16).cut('standby').done({ id: 'Passing the Plate', name: 'Passing the Plate', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Collection Plate', hold: 'b' }, 40),
  new Script(moves).wait(22).cut('bars').done({ id: 'Raptured', name: 'Raptured', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Rapture' }, 40),
  new Script(moves).wait(20).cut('off').done({ id: 'Final Collection', name: 'Final Collection', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Fire and Brimstone' }, 40),
  rerun(moves),
];

export const GIDEON: FighterData = {
  id: 'gideon',
  name: 'Rev. Gideon Price',
  style: 'allrounder',
  health: 960,
  walkFwd: fx(0.042),
  walkBack: fx(0.037),
  jumpVy: fx(0.2),
  jumpVx: fx(0.055),
  dash: { frames: 15, speed: fx(0.085) },
  backdash: { frames: 18, speed: fx(0.08) },
  hurt: { stand: box(-0.32, 0.32, 0, 1.8), crouch: box(-0.32, 0.36, 0, 1.1), air: box(-0.32, 0.32, 0.2, 1.6), juggle: box(-0.8, 0.6, 0.2, 0.9) },
  pushW: fx(0.32),
  pushH: fx(1.6),
  pushHCrouch: fx(0.98),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP' },
    b: {},
  },
  specials: { n: 'Fire and Brimstone', f: 'Collection Plate', b: 'Begone', d: 'Laying On of Hands' },
  airSpecials: { n: 'Rapture', d: 'Fall from Grace' },
  airStrings: [
    { name: 'Hallelujah', path: ['j.FP', 'BK'], safe: false },
    { name: 'Hallelujah Chorus', path: ['j.FP', 'BP', 'BK'], safe: false },
    { name: 'Benediction', path: ['j.BP', 'FP', 'BK'], safe: false },
  ],
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  show: 'The Hour of Power',
  finishers,
  resource: 'donations',
  strings: [
    { name: 'Amen', path: ['s.FP', 'FP'], safe: true },
    { name: 'Hallelujah', path: ['s.FP', 'FP', 'BP'], safe: true },
    { name: 'Sermon', path: ['s.FP', 'FK'], safe: true },
    { name: 'Chapter and Verse', path: ['s.BP', 'BP'], safe: true },
    { name: 'Born Again', path: ['s.BP', 'BP', 'BK'], safe: true },
    { name: 'Altar Call', path: ['s.FK', 'BK'], safe: true },
    { name: 'Humble Sweep', path: ['c.FP', 'FK'], safe: false },
    { name: 'Sermon on the Mount', path: ['s.FP', 'FK', 'BK'], safe: true },
  ],
};
