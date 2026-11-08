/**
 * Mister Mumbles, a ventriloquist's dummy from a children's show, with no
 * ventriloquist. Trickster: small (high attacks can sail over him), light,
 * quick, and hard to pin down: he vanishes on his strings and reappears
 * behind you or far away, leaves a hand puppet as a decoy, and tells a
 * knock-knock joke that can't be blocked, only jumped.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { box, interactMove, move, normal, projectile, strike, table, technicalDifficulties, throwMove } from './build';

const decoy = (hits: number, life: number) =>
  projectile({ at: [0.9, 0], speed: [0, 0], size: [-0.25, 0.25, 0, 1.2], life, hits, decoy: true, effect: { damage: 0, hitstun: 1, blockstun: 1 } });

const moves = table(
  // Standing
  normal('s.FP', { name: 'Wooden Jab', startup: 6, active: 2, recovery: 9, reach: [0.15, 0.9], at: [0.8, 1.1], damage: 39, hitstun: 14, blockstun: 11, chain: { FP: 'FP FP' } }),
  normal('s.BP', { name: 'Head Bonk', startup: 9, active: 2, recovery: 14, reach: [0.15, 0.95], at: [0.9, 1.35], damage: 78, hitstun: 18, blockstun: 13, chain: { FK: 'BP FK' } }),
  normal('s.FK', { name: 'Shin Kick', startup: 7, active: 2, recovery: 12, reach: [0.15, 1.05], at: [0.2, 0.5], damage: 58, hitstun: 15, blockstun: 12, chain: { FK: 'FK FK' } }),
  normal('s.BK', { name: 'Spin Kick', startup: 11, active: 3, recovery: 16, reach: [-0.5, 1.15], at: [0.4, 0.9], damage: 98, hitstun: 19, blockstun: 13 }),
  // Crouching
  normal('c.FP', { name: 'Knee Poke', stance: 'crouch', startup: 6, active: 2, recovery: 9, reach: [0.15, 0.85], at: [0.4, 0.65], damage: 34, hitstun: 13, blockstun: 10 }),
  normal('c.BP', { name: 'Pop Up', stance: 'crouch', startup: 8, active: 3, recovery: 18, reach: [0.1, 0.8], at: [0.8, 1.8], damage: 78, hitstun: 0, blockstun: 10, launch: 0.18 }),
  normal('c.FK', { name: 'Ankle Biter', stance: 'crouch', startup: 7, active: 2, recovery: 12, reach: [0.15, 1.15], at: [0, 0.25], height: 'low', damage: 43, hitstun: 14, blockstun: 10, chain: { BK: 'c.FK BK' } }),
  normal('c.BK', { name: 'Leg Sweep', stance: 'crouch', startup: 10, active: 3, recovery: 20, reach: [0.15, 1.25], at: [0, 0.25], height: 'low', damage: 87, hitstun: 0, blockstun: 10, knockdown: true }),
  // Command normal: back + BP hops into an overhead.
  normal('b.BP', { name: 'Peekaboo', startup: 18, active: 2, recovery: 14, reach: [0.15, 1.0], at: [0.7, 1.4], height: 'overhead', damage: 87, hitstun: 18, blockstun: 14 }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Bonk', kind: 'air', startup: 4, active: 6, recovery: 5, reach: [0.1, 0.85], at: [0.3, 0.8], height: 'overhead', damage: 53, hitstun: 16, blockstun: 11 }),
  normal('j.BP', { name: 'Jumping Clap', kind: 'air', startup: 5, active: 5, recovery: 6, reach: [0.1, 0.9], at: [0.4, 0.9], height: 'overhead', damage: 73, hitstun: 17, blockstun: 11 }),
  normal('j.FK', { name: 'Jumping Kick', kind: 'air', startup: 4, active: 8, recovery: 5, reach: [0.1, 0.95], at: [0, 0.5], height: 'overhead', damage: 62, hitstun: 16, blockstun: 11 }),
  normal('j.BK', { name: 'Jumping Split', kind: 'air', startup: 6, active: 6, recovery: 7, reach: [-0.5, 1.0], at: [0, 0.45], height: 'overhead', damage: 87, hitstun: 18, blockstun: 12 }),
  // String steps
  normal('FP FP', { name: 'Ha-Ha', startup: 7, active: 2, recovery: 10, reach: [0.15, 1.0], at: [0.8, 1.15], damage: 39, hitstun: 15, blockstun: 11, chain: { FP: 'FP FP FP' } }),
  normal('FP FP FP', { name: 'Ha-Ha-Ha', startup: 9, active: 2, recovery: 12, reach: [0.15, 1.1], at: [0.8, 1.2], damage: 48, hitstun: 16, blockstun: 12, chain: { BK: 'FP FP FP BK' } }),
  normal('FP FP FP BK', { name: 'Punchline', startup: 12, active: 3, recovery: 22, reach: [-0.5, 1.25], at: [0.4, 1.0], damage: 98, hitstun: 0, blockstun: 13, push: 0.07, knockdown: true }),
  normal('BP FK', { name: 'Clatter', startup: 8, active: 2, recovery: 14, reach: [0.15, 1.15], at: [0.2, 0.5], damage: 58, hitstun: 16, blockstun: 12, chain: { BP: 'BP FK BP' } }),
  normal('BP FK BP', { name: 'Curtain Call', startup: 16, active: 2, recovery: 16, reach: [0.15, 1.1], at: [0.7, 1.4], height: 'overhead', damage: 87, hitstun: 18, blockstun: 14 }),
  normal('FK FK', { name: 'Tap Dance', startup: 8, active: 2, recovery: 12, reach: [0.15, 1.15], at: [0, 0.3], height: 'low', damage: 48, hitstun: 14, blockstun: 11, chain: { FK: 'FK FK FK' } }),
  normal('FK FK FK', { name: 'Encore', startup: 10, active: 3, recovery: 20, reach: [0.15, 1.25], at: [0, 0.3], height: 'low', damage: 69, hitstun: 0, blockstun: 10, launch: 0.17 }),
  normal('c.FK BK', { name: 'Under the Bed', stance: 'crouch', startup: 9, active: 3, recovery: 16, reach: [0.15, 1.3], at: [0, 0.3], height: 'low', damage: 69, hitstun: 16, blockstun: 12 }),
  // Specials
  move('Hand Puppet', { name: 'Hand Puppet', kind: 'special', total: 30, boost: 'Hand Puppet+', spawns: [{ frame: 10, projectile: decoy(1, 300) }] }),
  move('Hand Puppet+', { name: 'Hand Puppet (boosted)', kind: 'special', total: 30, spawns: [{ frame: 10, projectile: decoy(2, 420) }] }),
  move('Strings Attached', {
    name: 'Strings Attached',
    kind: 'special',
    total: 27,
    boost: 'Strings Attached+',
    invuln: [1, 22],
    hidden: [6, 20],
    teleport: { frame: 14, to: 'behind' },
  }),
  move('Strings Attached+', {
    name: 'Strings Attached (boosted)',
    kind: 'special',
    total: 40,
    invuln: [1, 26],
    hidden: [6, 22],
    teleport: { frame: 14, to: 'behind' },
    hits: [strike({ frames: [24, 26], reach: [0.15, 1.0], at: [0.6, 1.3], damage: 94, hitstun: 0, blockstun: 12, knockdown: true })],
  }),
  move('Exit Stage Left', {
    name: 'Exit Stage Left',
    kind: 'special',
    total: 30,
    invuln: [1, 22],
    hidden: [6, 20],
    teleport: { frame: 12, to: 'away' },
  }),
  // The joke: slow, obvious, and it can't be blocked. Jump it.
  move('Knock-Knock', {
    name: 'Knock-Knock',
    kind: 'special',
    total: 55,
    boost: 'Knock-Knock+',
    hits: [strike({ frames: [30, 33], reach: [0.15, 1.2], at: [0, 0.9], height: 'unblockable', damage: 118, hitstun: 0, blockstun: 1, knockdown: true })],
  }),
  move('Knock-Knock+', {
    name: 'Knock-Knock (boosted)',
    kind: 'special',
    total: 50,
    hits: [strike({ frames: [24, 27], reach: [0.15, 1.4], at: [0, 0.9], height: 'unblockable', damage: 152, hitstun: 0, blockstun: 1, knockdown: true })],
  }),
  throwMove(85),
  interactMove(),
  technicalDifficulties(1.3),
);

export const MUMBLES: FighterData = {
  id: 'mumbles',
  name: 'Mister Mumbles',
  style: 'trickster',
  health: 1000,
  walkFwd: fx(0.055),
  walkBack: fx(0.05),
  jumpVy: fx(0.22),
  jumpVx: fx(0.07),
  dash: { frames: 12, speed: fx(0.11) },
  backdash: { frames: 16, speed: fx(0.1) },
  hurt: { stand: box(-0.25, 0.25, 0, 1.3), crouch: box(-0.25, 0.3, 0, 0.8), air: box(-0.25, 0.25, 0.15, 1.15) },
  pushW: fx(0.25),
  pushH: fx(1.2),
  pushHCrouch: fx(0.8),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: {},
    b: { BP: 'b.BP' },
  },
  specials: { n: 'Hand Puppet', f: 'Strings Attached', b: 'Exit Stage Left', d: 'Knock-Knock' },
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  strings: [
    { name: 'Ha-Ha', path: ['s.FP', 'FP'], safe: true },
    { name: 'Ha-Ha-Ha', path: ['s.FP', 'FP', 'FP'], safe: true },
    { name: 'Punchline', path: ['s.FP', 'FP', 'FP', 'BK'], safe: false },
    { name: 'Clatter', path: ['s.BP', 'FK'], safe: true },
    { name: 'Curtain Call', path: ['s.BP', 'FK', 'BP'], safe: true },
    { name: 'Tap Dance', path: ['s.FK', 'FK'], safe: true },
    { name: 'Encore', path: ['s.FK', 'FK', 'FK'], safe: false },
    { name: 'Under the Bed', path: ['c.FK', 'BK'], safe: false },
  ],
};
