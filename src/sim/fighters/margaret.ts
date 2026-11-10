/**
 * Margaret Okafor, the evening news anchor: calm, precise, never off-script.
 * Footsies: the best normals in the game (fast, long enough, safe), a stagger
 * strike that sets up a follow-up, a counter that reads the next attack, and
 * a live feed that goes out on a delay.
 */
import { fx } from '../fixed';
import type { FighterData } from '../types';
import { airSpike, airStep, box, followUp, interactMove, move, normal, projectile, rerun, Script, strike, table, technicalDifficulties, throwMove } from './build';

/** Live Feed: a broadcast signal that appears in front of her, waits on standby, then goes out. */
function liveFeed(delay: number, hits = 1) {
  return projectile({
    at: [0.7, 0],
    speed: [0.1, 0],
    size: [-0.3, 0.3, 0.6, 1.3],
    life: delay + 60,
    delay,
    hits,
    rehit: 10,
    effect: { damage: hits > 1 ? 35 : 45, hitstun: 20, blockstun: 16, push: 0.05, chip: 8 },
  });
}

const moves = table(
  // Standing: quick, long enough, and safe.
  normal('s.FP', { name: 'Cue Card', startup: 6, active: 2, recovery: 9, reach: [0.2, 1.0], at: [1.15, 1.45], height: 'high', damage: 30, hitstun: 15, blockstun: 12, chain: { FP: 'FP FP', FK: 'FP FK' } }),
  normal('s.BP', { name: 'Lead Paragraph', startup: 9, active: 3, recovery: 14, reach: [0.2, 1.15], at: [0.75, 1.5], damage: 55, hitstun: 20, blockstun: 15, chain: { BP: 'BP BP' } }),
  normal('s.FK', { name: 'Pointed Shoe', startup: 9, active: 3, recovery: 13, reach: [0.2, 1.4], at: [0.55, 0.9], damage: 45, hitstun: 18, blockstun: 14, chain: { BK: 'FK BK' } }),
  normal('s.BK', { name: 'Anchor Kick', startup: 13, active: 3, recovery: 17, reach: [0.2, 1.55], at: [0.75, 1.4], damage: 70, hitstun: 22, blockstun: 16, push: 0.07 }),
  // Crouching
  normal('c.FP', { name: 'Footnote', stance: 'crouch', startup: 7, active: 2, recovery: 9, reach: [0.2, 0.95], at: [0.6, 0.9], damage: 25, hitstun: 15, blockstun: 12, chain: { FK: 'c.FP FK' } }),
  normal('c.BP', { name: 'Rising Headline', stance: 'crouch', startup: 9, active: 4, recovery: 19, reach: [0.1, 0.8], at: [0.75, 1.9], damage: 65, hitstun: 24, blockstun: 12, launch: 0.16 }),
  normal('c.FK', { name: 'Low Bulletin', stance: 'crouch', startup: 8, active: 2, recovery: 13, reach: [0.2, 1.3], at: [0, 0.3], height: 'low', damage: 35, hitstun: 16, blockstun: 11 }),
  normal('c.BK', { name: 'Cut the Wires', stance: 'crouch', startup: 12, active: 3, recovery: 22, reach: [0.2, 1.4], at: [0, 0.3], height: 'low', damage: 65, hitstun: 0, blockstun: 12, knockdown: true }),
  // Command normals
  normal('f.BP', { name: 'Paperweight', startup: 19, active: 2, recovery: 17, reach: [0.2, 1.0], at: [0.75, 1.6], height: 'overhead', damage: 65, hitstun: 22, blockstun: 14, chain: { BP: 'f.BP BP' } }),
  // Steps in as it kicks: closes the gap to the tip of her other normals.
  move('f.FK', {
    name: 'Field Report',
    kind: 'normal',
    total: 29,
    motion: [{ frames: [1, 10], vx: 0.045 }],
    hits: [strike({ frames: [12, 14], reach: [0.2, 1.3], at: [0.6, 1.0], damage: 50, hitstun: 18, blockstun: 14 })],
    hurt: [{ frames: [12, 20], box: box(0.2, 1.2, 0.6, 1.0) }],
    cancel: [15, 21],
  }),
  // Jumping (all overheads)
  normal('j.FP', { name: 'Jumping Cue', kind: 'air', startup: 5, active: 6, recovery: 6, reach: [0.1, 0.8], at: [0.6, 1.1], height: 'overhead', damage: 40, hitstun: 18, blockstun: 12, chain: { FK: 'j.FK', BP: 'j.BP' } }),
  normal('j.BP', { name: 'Jumping Headline', kind: 'air', startup: 7, active: 5, recovery: 6, reach: [0.1, 0.9], at: [0.8, 1.3], height: 'overhead', damage: 55, hitstun: 18, blockstun: 12, chain: { BK: 'j.BP BK' } }),
  normal('j.FK', { name: 'Jumping Heel', kind: 'air', startup: 6, active: 8, recovery: 6, reach: [0.1, 0.9], at: [0.1, 0.6], height: 'overhead', damage: 50, hitstun: 18, blockstun: 12, chain: { BP: 'j.BP' } }),
  normal('j.BK', { name: 'Jumping Kick', kind: 'air', startup: 9, active: 6, recovery: 8, reach: [0.1, 1.0], at: [0.1, 0.6], height: 'overhead', damage: 60, hitstun: 20, blockstun: 12, chain: { FP: 'j.BK FP' } }),
  // String steps
  // Air string steps: the cue cards flicked up, then brought down edge first, and they bounce.
  airStep('j.BK FP', { name: 'Wire Copy', damage: 32, chain: { BK: 'j.BP BK' } }),
  airSpike('j.BP BK', { name: 'Headline Drop', damage: 42 }),
  normal('FP FP', { name: 'Top Story', startup: 7, active: 2, recovery: 11, reach: [0.2, 1.05], at: [1.1, 1.45], height: 'high', damage: 30, hitstun: 17, blockstun: 14, chain: { BP: 'FP FP BP' } }),
  normal('FP FP BP', { name: 'And Finally', startup: 11, active: 3, recovery: 18, reach: [0.2, 1.25], at: [0.75, 1.4], damage: 60, hitstun: 0, blockstun: 16, push: 0.07, knockdown: true }),
  normal('FP FK', { name: 'Correspondent', startup: 9, active: 2, recovery: 15, reach: [0.2, 1.35], at: [0, 0.35], height: 'low', damage: 40, hitstun: 18, blockstun: 12 }),
  normal('BP BP', { name: 'Developing Story', startup: 10, active: 3, recovery: 16, reach: [0.2, 1.2], at: [0.75, 1.45], damage: 50, hitstun: 20, blockstun: 14, chain: { BK: 'BP BP BK' } }),
  normal('BP BP BK', { name: 'We Go Live', startup: 12, active: 3, recovery: 19, reach: [0.2, 1.3], at: [0.75, 1.6], damage: 70, hitstun: 0, blockstun: 16, launch: 0.15 }),
  normal('FK BK', { name: 'Weather and Sport', startup: 12, active: 3, recovery: 18, reach: [0.2, 1.45], at: [0.75, 1.4], damage: 60, hitstun: 20, blockstun: 15 }),
  normal('c.FP FK', { name: 'Small Print', stance: 'crouch', startup: 9, active: 2, recovery: 18, reach: [0.2, 1.35], at: [0, 0.3], height: 'low', damage: 40, hitstun: 16, blockstun: 10 }),
  normal('f.BP BP', { name: 'Exclusive', startup: 11, active: 3, recovery: 18, reach: [0.2, 1.2], at: [0.75, 1.4], damage: 60, hitstun: 0, blockstun: 15, knockdown: true }),
  // Specials
  // A fast strike that staggers: long enough to land a normal after it on hit, punishable on block.
  move('Breaking', {
    name: 'Breaking',
    // While they reel: BK, and the story goes up.
    chain: { BK: 'Breaking BK' },
    cancel: [10, 18],
    kind: 'special',
    total: 32,
    boost: 'Breaking+',
    hits: [strike({ frames: [8, 9], reach: [0.2, 1.15], at: [0.75, 1.4], damage: 60, hitstun: 36, blockstun: 10, push: 0.02 })],
  }),
  move('Breaking+', {
    name: 'Breaking (boosted)',
    kind: 'special',
    total: 40,
    hits: [
      strike({ frames: [8, 9], reach: [0.2, 1.15], at: [0.75, 1.4], damage: 45, hitstun: 22, blockstun: 12, push: 0 }),
      strike({ frames: [16, 17], reach: [0.2, 1.2], at: [0.75, 1.4], damage: 55, hitstun: 40, blockstun: 14, push: 0.02 }),
    ],
  }),
  // The counter: she reads the next strike off the teleprompter and answers it.
  followUp('Breaking BK', { name: 'And Now This', startup: 10, active: 3, recovery: 20, reach: [0.2, 1.3], at: [0.75, 1.6], damage: 34, hitstun: 0, blockstun: 12, launch: 0.16 }),
  move('Teleprompter', {
    name: 'Teleprompter',
    kind: 'special',
    total: 44,
    boost: 'Teleprompter+',
    counter: { frames: [8, 26], into: 'Teleprompter Read' },
  }),
  move('Teleprompter+', {
    name: 'Teleprompter (boosted)',
    kind: 'special',
    total: 44,
    counter: { frames: [8, 34], into: 'Teleprompter Read+' },
  }),
  move('Teleprompter Read', {
    name: 'Teleprompter: Read',
    kind: 'special',
    total: 30,
    invuln: [1, 6],
    hits: [strike({ frames: [3, 5], reach: [0.1, 1.8], at: [0.3, 1.8], damage: 90, hitstun: 0, blockstun: 14, knockdown: true })],
  }),
  move('Teleprompter Read+', {
    name: 'Teleprompter: Read (boosted)',
    kind: 'special',
    total: 34,
    invuln: [1, 6],
    hits: [strike({ frames: [3, 5], reach: [0.1, 1.8], at: [0.3, 1.8], damage: 80, hitstun: 0, blockstun: 14, launch: 0.18 })],
  }),
  move('Live Feed', {
    name: 'Live Feed',
    kind: 'special',
    total: 40,
    boost: 'Live Feed+',
    spawns: [{ frame: 14, projectile: liveFeed(30) }],
  }),
  move('Live Feed+', {
    name: 'Live Feed (boosted)',
    kind: 'special',
    total: 40,
    spawns: [{ frame: 14, projectile: liveFeed(12, 2) }],
  }),
  // Steps in with the night's top story: an overhead that knocks down.
  move('Lead Story', {
    name: 'Lead Story',
    kind: 'special',
    total: 46,
    boost: 'Lead Story+',
    motion: [{ frames: [4, 14], vx: 0.05 }],
    hits: [strike({ frames: [20, 21], reach: [0.2, 1.1], at: [0.75, 1.7], height: 'overhead', damage: 70, hitstun: 0, blockstun: 14, knockdown: true })],
  }),
  move('Lead Story+', {
    name: 'Lead Story (boosted)',
    kind: 'special',
    total: 46,
    armor: [4, 19],
    motion: [{ frames: [4, 14], vx: 0.06 }],
    hits: [strike({ frames: [20, 21], reach: [0.2, 1.1], at: [0.75, 1.7], height: 'overhead', damage: 85, hitstun: 0, blockstun: 16, knockdown: true })],
  }),
  // In the air: straight across at the height she's at, cue cards first. An answer to a zoner.
  move('On the Wire', {
    name: 'On the Wire',
    kind: 'special',
    stance: 'air',
    total: 32,
    boost: 'On the Wire+',
    hover: [1, 20],
    motion: [
      { frames: [6, 16], vx: 0.12 },
      { frames: [17, 32], vx: 0.02 },
    ],
    landing: 6,
    hits: [strike({ frames: [8, 14], reach: [0.1, 0.9], at: [0.4, 1.2], height: 'overhead', damage: 55, hitstun: 20, blockstun: 13 })],
  }),
  move('On the Wire+', {
    name: 'On the Wire (boosted)',
    kind: 'special',
    stance: 'air',
    total: 32,
    hover: [1, 20],
    motion: [
      { frames: [6, 16], vx: 0.12 },
      { frames: [17, 32], vx: 0.02 },
    ],
    landing: 6,
    hits: [
      strike({ frames: [8, 10], reach: [0.1, 0.9], at: [0.4, 1.2], height: 'overhead', damage: 40, hitstun: 20, blockstun: 13 }),
      strike({ frames: [13, 15], reach: [0.1, 0.9], at: [0.4, 1.2], height: 'overhead', damage: 45, hitstun: 0, blockstun: 13, knockdown: true, wallBounce: true }),
    ],
  }),
  // Down + Special in the air: straight down, heel first, and it staggers (time for a normal after it).
  move('Cut to Commercial', {
    name: 'Cut to Commercial',
    kind: 'special',
    stance: 'air',
    total: 32,
    boost: 'Cut to Commercial+',
    hover: [1, 4],
    dive: { frame: 5, vx: 0.01, vy: -0.2 },
    landing: 9,
    hits: [strike({ frames: [6, 30], reach: [-0.2, 0.7], at: [-0.1, 0.6], height: 'overhead', damage: 50, hitstun: 30, blockstun: 12 })],
  }),
  move('Cut to Commercial+', {
    name: 'Cut to Commercial (boosted)',
    kind: 'special',
    stance: 'air',
    total: 32,
    hover: [1, 4],
    dive: { frame: 5, vx: 0.01, vy: -0.2 },
    landing: 9,
    hits: [strike({ frames: [6, 30], reach: [-0.25, 0.8], at: [-0.1, 0.7], height: 'overhead', damage: 50, hitstun: 0, blockstun: 14, knockdown: true, groundBounce: true })],
  }),
  throwMove(110),
  interactMove(),
  technicalDifficulties(1.5),
);

// Finishers. The blows are scripted; the picture cuts away at the worst of it.
const finishers = [
  // Close: the bulletin, read out one blow at a time, then the paperweight.
  new Script(moves)
    .strike('s.FP', { react: 'high', damage: 30, pull: 0.85 })
    .strike('FP FP', { react: 'high', damage: 30 })
    .strike('s.BP', { react: 'high', damage: 55 })
    .strike('BP BP', { react: 'high', damage: 50 })
    .strike('Breaking', { react: 'high', damage: 60 }, 10)
    .strike('c.FK', { react: 'low', damage: 35 })
    .strike('c.BP', { react: 'launch', damage: 65, pop: 0.17 }, 4)
    .strike('BP BP BK', { react: 'launch', damage: 70, pop: 0.12 }, 30)
    .strike('f.BP', { react: 'none', damage: 120 }, 0)
    .cut('standby')
    .blow(14, { react: 'none', damage: 90 })
    .blow(26, { react: 'none', damage: 90 })
    .blow(40, { react: 'none', damage: 120 })
    .blow(54, { react: 'none', damage: 140 })
    .done({ id: 'Breaking News', name: 'Breaking News', kind: 'signoff', range: 'close', input: ['d', 'f'], button: 'BP' }, 110),
  // Mid: three live feeds on air, then she walks in and closes the broadcast herself.
  new Script(moves)
    .play('Live Feed+', 40)
    .blow(4, { react: 'high', damage: 35 })
    .blow(14, { react: 'high', damage: 35 })
    .play('Live Feed+', 40)
    .blow(4, { react: 'high', damage: 35 })
    .blow(14, { react: 'low', damage: 35 })
    .strike('Lead Story', { react: 'knockdown', damage: 70, pull: 0.9, pop: 0.12 }, 40)
    .strike('s.BK', { react: 'none', damage: 90 }, 4)
    .strike('Teleprompter Read', { react: 'none', damage: 120 }, 0)
    .cut('bars')
    .blow(12, { react: 'none', damage: 90 })
    .blow(26, { react: 'none', damage: 110 })
    .blow(40, { react: 'none', damage: 140 })
    .done({ id: 'And That Was the News', name: 'And That Was the News', kind: 'signoff', range: 'mid', input: ['b', 'd'], button: 'BK' }, 100),
  // More cancellations: each asks for its own way of ending it (and a held direction comes before a plain one).
  new Script(moves).wait(16).cut('standby').done({ id: 'Dead Air', name: 'Dead Air', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'On the Wire' }, 40),
  new Script(moves).wait(22).cut('bars').done({ id: 'Correction', name: 'Correction', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Teleprompter Read' }, 40),
  new Script(moves).wait(20).cut('off').done({ id: 'Stop the Presses', name: 'Stop the Presses', kind: 'cancellation', range: 'any', input: [], button: 'block', trigger: 'Breaking' }, 40),
  rerun(moves),
];

export const MARGARET: FighterData = {
  id: 'margaret',
  name: 'Margaret Okafor',
  style: 'footsies',
  health: 820,
  walkFwd: fx(0.042),
  walkBack: fx(0.038),
  jumpVy: fx(0.2),
  jumpVx: fx(0.055),
  dash: { frames: 15, speed: fx(0.085) },
  backdash: { frames: 18, speed: fx(0.08) },
  hurt: { stand: box(-0.3, 0.3, 0, 1.75), crouch: box(-0.3, 0.35, 0, 1.05), air: box(-0.3, 0.3, 0.2, 1.55), juggle: box(-0.8, 0.55, 0.2, 0.85) },
  pushW: fx(0.3),
  pushH: fx(1.55),
  pushHCrouch: fx(0.95),
  normals: {
    s: { FP: 's.FP', BP: 's.BP', FK: 's.FK', BK: 's.BK' },
    c: { FP: 'c.FP', BP: 'c.BP', FK: 'c.FK', BK: 'c.BK' },
    j: { FP: 'j.FP', BP: 'j.BP', FK: 'j.FK', BK: 'j.BK' },
    f: { BP: 'f.BP', FK: 'f.FK' },
    b: {},
  },
  specials: { n: 'Breaking', f: 'Live Feed', b: 'Teleprompter', d: 'Lead Story' },
  airSpecials: { n: 'On the Wire', d: 'Cut to Commercial' },
  airStrings: [
    { name: 'Top Story', path: ['j.FP', 'FK', 'BP'], safe: false },
    { name: 'Front Page', path: ['j.FP', 'BP', 'BK'], safe: false },
    { name: 'Wire Service', path: ['j.BK', 'FP', 'BK'], safe: false },
  ],
  throwMove: 'throw',
  superMove: 'td',
  interactMove: 'interact',
  moves,
  show: "The Eleven O'Clock News",
  finishers,
  strings: [
    { name: 'Top Story', path: ['s.FP', 'FP'], safe: true },
    { name: 'And Finally', path: ['s.FP', 'FP', 'BP'], safe: true },
    { name: 'Correspondent', path: ['s.FP', 'FK'], safe: true },
    { name: 'Developing Story', path: ['s.BP', 'BP'], safe: true },
    { name: 'We Go Live', path: ['s.BP', 'BP', 'BK'], safe: true },
    { name: 'Weather and Sport', path: ['s.FK', 'BK'], safe: true },
    { name: 'Small Print', path: ['c.FP', 'FK'], safe: false },
    { name: 'Exclusive', path: ['f.BP', 'BP'], safe: true },
  ],
};
