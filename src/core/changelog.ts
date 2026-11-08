/**
 * The game's version and what each release brought, newest first. The
 * version is Major.Minor.Patch: a minor step per feature release, a patch
 * for fixes. package.json's version must match (tests/changelog.test.ts).
 * Add an entry at the top with each release to main.
 */
export interface Release {
  version: string;
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  notes: readonly string[];
}

export const CHANGELOG: readonly Release[] = [
  {
    version: '0.6.0',
    date: '2026-11-08',
    title: 'Instant replay',
    notes: [
      'Watch your last match again: WATCH REPLAY after the result, or WATCH LAST MATCH on the title screen.',
      'Pause, skip back or forward 5 seconds, scrub to any moment, and watch at half or double speed (Space, arrow keys, S on a keyboard).',
      'Replays are tiny (a few kilobytes) and kept on your device until the next match ends or the game updates.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-08',
    title: 'Now in 3D',
    notes: [
      'The fighters are their 3D models in every fight, posed frame by frame with the action, so what you see is what hits.',
      'The specials\' effects are in: Cold Front, the hail, the Isobar Lasso and Heat Lightning; the Lariat\'s ribbon; the Flashlight beam and the Key Ring; the hand puppet; and Tape Skip\'s VHS smear.',
      'Hit boxes in Training show through the models. FIGHTERS on the title screen switches back to grey boxes.',
      'The models are saved for offline play with the rest of the game.',
    ],
  },
  {
    version: '0.4.4',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: [
      'The fighters\' 3D models get their detail pass: painted faces that wince when hit and grin when they win, fists that close to punch, Dale\'s check blazer and striped tie, Rox\'s FEEL THE BURN headband, Hollis\'s SECURITY uniform and Mister Mumbles\' chipped wooden face, jaw and strings. The fights still use grey boxes for now.',
      'New effects for the specials: the Isobar Lasso, Heat Lightning, the Key Ring, the Leg Warmer Lariat\'s ribbon, Tape Skip\'s VHS smear, a swirling Cold Front, and a hand puppet that really looks like Mumbles.',
    ],
  },
  {
    version: '0.4.3',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: ['The fighters\' animations read better: overheads come down from above the head, travelling moves take real steps, hits snap the head back, and Knock-Knock\'s wind-up is impossible to miss. The fights still use grey boxes for now.'],
  },
  {
    version: '0.4.2',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: ['The fighters\' 3D models now bend smoothly at the elbows, knees, hips and waist, in a stylised low-poly look. The fights still use grey boxes for now.'],
  },
  {
    version: '0.4.1',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: ['All four fighters now have rough 3D models and a full set of animations, made to match their moves. The fights still use grey boxes for now.'],
  },
  {
    version: '0.4.0',
    date: '2026-11-08',
    title: 'Two more channels',
    notes: [
      'Hollis Bey joins: a grappler with a command grab that blocking can\'t stop and Throw can\'t break, a Flashlight that cuts through armour, and an armoured Night Shift charge.',
      'Mister Mumbles joins: a trickster who vanishes on his strings and reappears behind you, leaves a hand puppet as a decoy, and tells a knock-knock joke you can\'t block. Jump it.',
      'The CPU plays all four styles, jumps unblockables, and can be fooled by a decoy (often on easy, rarely on hard).',
      'Rebalanced the four: closer to even in CPU-vs-CPU play. Dale has a little less health and a weaker Cold Front.',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: ['Dale Storm has a first 3D model (a rough blockout to settle the art style). The fights still use grey boxes for now.'],
  },
  {
    version: '0.3.0',
    date: '2026-11-08',
    title: 'The forecast comes true',
    notes: [
      'Weather at Eleven changes every round: kick the camera dollies, fight through wind and lightning, then knee-deep water with live puddles. Every hazard is announced first.',
      'New specials: Dale\'s Heat Lightning (a reversal, neutral + Special) and Rox\'s Star Jump (an overhead hop).',
      'Rebalanced Dale and Rox: Rox hits harder, Dale has less health and slower zoning.',
      'Sound: hits, blocks, the station ident, an announcer, a laugh track with bad timing, and the sign-off tone.',
      'Big hits wobble the tape, KOs crackle with static, and Technical Difficulties cuts to PLEASE STAND BY.',
      'Rules option (Studio: one segment, no hazards), sound options, and a segment picker in Training.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-08',
    title: 'First fight',
    notes: [
      'Dale Storm and Rox Vega fight on Weather at Eleven, in grey boxes: strings, specials, throws, the Signal meter and Technical Difficulties all work.',
      'VS CPU (easy, normal, hard), Training with frame advantage and a dummy, and VS Player with gamepads.',
      'Keyboard, gamepad and touch controls. Best of three, with a commercial break between rounds.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-07',
    title: 'Test card',
    notes: ['Channel 0 is on air: a title card and nothing else yet. The fighting comes next.'],
  },
];

export const VERSION: string = CHANGELOG[0].version;

/** Compare two Major.Minor.Patch versions: < 0 if a is older. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}
