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
    version: '0.12.0',
    date: '2026-11-08',
    title: 'Prime time',
    notes: [
      'Music: Weather at Eleven has a theme for every segment: a bright synth news bed in the studio, a driving storm, and a slow, out-of-tune flood.',
      'ARCADE: take your fighter through the night\'s schedule against everyone else, the CPU getting harder each show, with three continues. Win it and see the opening titles of the show you won.',
      'SETTINGS: Broadcast Standards (strict: finishers are heard, not seen; late night: a glimpse through the static), VHS look, motion, music volume, and the touch buttons\' size and side (left-handed play). Sound and the grey-box option moved here too.',
      'The title menu fits a phone held sideways.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-11-08',
    title: 'Fight club',
    notes: [
      'Specials now cancel only out of a hit: confirm it, then cancel.',
      'Launchers that hit can be followed by any normal: everyone can juggle now.',
      'Dale: the longest pokes in the game (Umbrella Jab, a longer Front Kick), an anti-air Forecast Cross, and a Step Back Kick (← FK).',
      'Rox: plus on block with her jab, Leg Lift and Reps; a Lunge (→ BP); Roundhouse Rep is two kicks; her sweep hits a little softer.',
      "Hollis: Cuff 'Em (FP · FP · FK) grabs them out of a string that hit; Door Kick walks through one hit; Nightstick links into his jab; Clock Out is a true combo.",
      'Mumbles: Hand Puppet hits before it sits down as a decoy (his combo ender); String Pull (← FP) reels them in; Shin Kick ducks under high attacks; less damage and health for all that.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-11-08',
    title: 'Move list',
    notes: [
      'MOVE LIST on the title screen and in the pause menu: every special, string, finisher and system move for each fighter, with its input and what it does (heights, launches, knockdowns, safe on block).',
      'In Training it also shows frame data: startup, and advantage on block and on hit.',
      'Switch fighters with ‹ › (or left and right); the controls for keyboard, gamepad and touch are at the bottom.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-11-08',
    title: 'Stay tuned',
    notes: [
      'Finishers. After the deciding round the loser stands dazed and you have 4 seconds: walk into range and enter a Sign-Off, and the broadcast cuts away at the worst of it.',
      'Two Sign-Offs each: Dale\'s Extended Forecast and Severe Weather Warning, Rox\'s Cool-Down and Feel the Burn, Hollis\'s Lights Out and End of Shift, Mumbles\' Peekaboo and Exit Stage Left.',
      'Cancellations: win the match with Heat Lightning, Count of Eight, Clocking In or Knock-Knock and the loser\'s show is cancelled on the spot.',
      'Rerun (up, down, Block): let them go home.',
      'The CPU finishes you too.',
    ],
  },
  {
    version: '0.8.1',
    date: '2026-11-08',
    title: 'Behind the scenes',
    notes: ['Work in progress can be played before it ships, at deeek.org/signoff/preview/. The game itself is unchanged.'],
  },
  {
    version: '0.8.0',
    date: '2026-11-08',
    title: 'Encore',
    notes: [
      'Every fighter has a second round intro and a second victory pose, and they take turns from round to round.',
      "Dale signs off the forecast, Rox marches it out, Hollis checks his watch and yawns, and Mister Mumbles can't stop laughing.",
      'Before a round, Rox stretches, Hollis cracks his knuckles, Dale fixes his tie and his hair, and Mumbles hangs limp until his strings snap him awake.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-11-08',
    title: 'Weather at Eleven, built',
    notes: [
      "Channel 0's weather studio is now a real set: the forecast map, the green screen, studio flats, and TV cameras on dollies you can kick.",
      'Round 2, the forecast comes true: a storm map, papers blowing in the wind, lightning bolts that light up the studio and scorch the floor.',
      'Round 3, flood warning: knee-deep water, live cables crackling in the puddles, and the puddles glow when the current runs.',
      'Each segment has its own lighting.',
      'The fighters show their painted colours as intended (they were drawn a little dark).',
    ],
  },
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
