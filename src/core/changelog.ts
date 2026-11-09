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
    version: '0.31.0',
    date: '2026-11-09',
    title: 'Impact',
    notes: [
      'A closer camera: the fighters fill about half the screen now, not a quarter. It pulls back as you part, rises with jumps and juggles, and stops at the walls.',
      'Hits have weight. A jab is quick and light; a heavy hit freezes longer, shakes the screen, flashes bigger and sounds it; a launcher, knockdown or bounce lands hardest of all. Frame advantage is exactly as it was.',
      'Hits sound like what hit you: fists snap, kicks thump, Gus\'s pans ring and his knives shing, Hollis\'s nightstick knocks, and enders land with a low boom.',
      'The signal spray: the picture tears where a hit lands, bars of broken video bursting the way the blow went. The harder the hit, the more it breaks.',
      'The camera hits back: it leans with the blow and pushes in on launchers, wall splats, boosted specials and Technical Difficulties. Reduce Motion turns all of this off.',
      'K.O.: the last hit plays in slow motion while the camera swings in on the loser.',
      'The fighters stand out from the set: a rim of light in each segment\'s colour, and a shadow under their feet.',
      "Mister Mumbles' boosted Hand Puppet hits a little softer (60 to 52), to keep his full-meter combo in line now that the timing of combos has shifted. Combo guides are updated to the new timing.",
    ],
  },
  {
    version: '0.30.0',
    date: '2026-11-09',
    title: 'Standing Your Ground',
    notes: [
      'Flawless Block: press Block just before a hit lands (within 4 frames) and you take no chip, get out of blockstun 6 frames sooner (so more of their moves can be punished) and earn a little meter.',
      'Stay Down: hold ↓ while knocked down to get up a moment later, once a knockdown, so an attack timed on your getup misses.',
      'Reversal: an attack pressed while getting up comes out on the first frame you can move. The CPU stays down sometimes too.',
      'Punish: hitting someone while their move recovers, after a whiff or a block, does 20% more on that first hit and earns meter.',
      'Each of these is called out on screen with its own sound, and the move list explains them under System.',
      'Input display: your inputs scroll down the side of the screen, newest on top, with how many frames each was held, like a training-mode input list. Settings → Input Display: Off, Training (also the combo showcases), or Always (versus and replays show both players).',
      'Boosting is easier again, especially on touch: the second Special tap (or the meter tap) now has a third of a second, from neutral as well as in a combo, and a quick second tap on the touchscreen is never lost.',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-11-09',
    title: 'Live from the Studio',
    notes: [
      "The Eleven O'Clock News has its set: the globe and the CH 0 NEWS header, the studio clock stuck at eleven, the cameras on their pedestals, BREAKING on the backdrop when the ticker starts, and a dead studio with its lamps fallen for Lights Out.",
      'Kitchen Live has its set: a chequered floor, a long stainless counter with the stockpot and the knife block on it, shelves of jars and the KITCHEN LIVE sign, walls of flame for Grease Fire, and the big oven hanging open in a blackened kitchen for The Oven.',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-11-09',
    title: 'Two taps',
    notes: [
      'Boosting is much easier. Double-tap Special and the special comes out boosted, even in a combo, where the special waits for your hit to land before it starts (both taps used to have to come after it started, so a quick double tap never worked there). Let go of the direction between taps if you like: the second tap keeps the first one\'s direction.',
      'On touch, tap the meter just after Special to boost it, as the controls always said. In a combo that used to Tape Skip your punch away instead.',
      'More combo guides: five or six for every fighter, each from a different way in (your jab, a low, your overhead, a punish with your launcher, then one bar and a full meter) and mostly ending on different moves.',
      'In the guides, "wait" before a press means let them fall a little first; it used to be a "…" that could end up on the line before its press.',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-11-09',
    title: 'Can I Get an Amen',
    notes: [
      "Rev. Gideon Price has his model: a powder-blue three-piece suit, a long gold tie, two-tone shoes, a lacquered silver pompadour and the widest smile on late-night television. The Bible never leaves his hand, the collection plate goes out like a frisbee, and Fire and Brimstone brings both arms down in a ring of fire. No more grey box.",
    ],
  },
  {
    version: '0.26.0',
    date: '2026-11-09',
    title: 'Yes, Chef',
    notes: [
      "Chef Gus Lamarre has his model: chef's whites gone grey at the cuffs, a tall toque that has seen things, a striped apron, check trousers, clogs and a waxed moustache. His cleaver rests on his shoulder, the pan comes out for the heavy swings and the mallet for Tenderise. No more grey box.",
    ],
  },
  {
    version: '0.25.0',
    date: '2026-11-09',
    title: 'How to do it',
    notes: [
      'Combo guides in the move list: every fighter has a bread-and-butter combo without meter, and most have a one-bar or full-meter combo too, written out press by press with the hits and damage it does. A … before a press means wait for them to fall first.',
      'WATCH plays a guide: your fighter performs it on a standing opponent, over and over, with the presses along the top and the one just made in brackets. Slow it to half or quarter speed from the pause menu. WATCH is on the move list from the title screen and in Training.',
      'Every guide is a real combo with forgiving timing: each press still works a couple of frames early or late.',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-11-09',
    title: 'Knuckles',
    notes: [
      'Every fighter has proper fingers now, four of them and a thumb, each bending at its knuckles: fists curl tight, open hands spread, and a point looks like a point.',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-11-09',
    title: 'Standards and Practices',
    notes: [
      'Launchers now only launch from the ground. On someone already in the air, a crouching Back Punch is one more juggle hit, so it can no longer be repeated up and down the screen; combos go through strings, bounces and specials instead.',
      'Using the same move again in a combo now does much less damage each time: 60% of its usual damage the second time, 36% the third, on top of the usual scaling. A boosted special counts as the same move as the plain one, and a multi-hit move counts once.',
      "A relaunch's bonus damage now scales with the combo like any other hit.",
      "The longer a combo goes on, the less Signal it earns the attacker, so a combo can no longer pay for its own boosted specials. Taking a combo still fills the defender's meter at the full rate.",
      "Rox, Hollis and Mumbles hit a little less hard, in line with everyone else. Rox: her launcher, Power Punch, Jazzercise, Leg Lift, the kick strings, Step Touch, Cool-Down, the Lariat, the last kick of Count of Eight and the boosted Star Jump and Grapevine. Hollis: the boosted Night Shift and Flashlight. Mumbles: the boosted Knock-Knock, Strings Attached and Hand Puppet.",
    ],
  },
  {
    version: '0.22.0',
    date: '2026-11-09',
    title: 'Live from the kitchen, and a word from our sponsor',
    notes: [
      "A seventh fighter: Rev. Gideon Price, an all-rounder with a second resource. His Collection Plate goes out and comes back, hitting on both passes, and every time it connects he collects a donation (up to five, shown as coins under his health). Laying On of Hands heals him when he has a donation to spend; Fire and Brimstone hits all round him, and with two donations it becomes a far bigger blast with armour.",
      "A fourth stage: Kitchen Live, Chef Gus's own show. In Prep, throw the stockpot (it flies at chest height) or the knife block (low and fast: block it crouching). In Grease Fire the flames take both ends of the kitchen, the walls close in and the fire flares up at one end. In The Oven the heat makes Signal fill half as fast again, for both of you.",
      "Gus's Arcade fights are now on his own show.",
    ],
  },
  {
    version: '0.21.0',
    date: '2026-11-09',
    title: 'Air time',
    notes: [
      'Juggles look like juggles: a body hit in the air jolts and folds, a relaunch sends it tumbling head over heels, a slam spreads it flat into the floor, a floor bounce crumples it and throws its knees up, and a wall splat slaps it into the wall and peels it off.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-11-09',
    title: 'Good evening, in 3D',
    notes: [
      "Margaret Okafor has her model: a burgundy pinstripe power suit with 1987's shoulder pads, pearls, a sharp bob and her script in hand. No more grey box.",
      'Teleprompter reads as a counter stance (tall, palm out, eyes on the prompter), the Read sweeps the pages across, Live Feed points right down the camera, and Lead Story slams the script down overhead.',
      'Her intros square the pages and take off her reading glasses; her wins set the script down and say goodnight.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-11-09',
    title: 'Hands on',
    notes: [
      'The fighters have hands now: fists close to punch, fingers splay when they get hit, hands cup to grab, and Dale points at his map in the intro.',
      'Faces talk: jaws move through intros and wins, open in a shout on every special, and hang slack when someone is dazed or out cold. Mister Mumbles\' jaw drops between its slots like a real dummy\'s.',
      "Things swing: Dale's tie and quiff, Rox's perm and her headband's new tails, Hollis's key ring and Mister Mumbles' bow tie and strings all follow the fight with a little lag.",
    ],
  },
  {
    version: '0.18.0',
    date: '2026-11-09',
    title: 'Kitchen Live and the late news',
    notes: [
      "A sixth fighter: Chef Gus Lamarre, mid-range. The longest reach in the game and the slowest walk. Flambé leaves fire on the floor (block it low), Mise en Place tosses a pan that hangs and drops as an overhead, Chop Chop is a long low sweep, and Tenderise's last blow breaks a guard: block it and you reel, open to a jab.",
      "A third stage: The Eleven O'Clock News. Shove the anchor desk across the floor in Headlines; in The Ticker the desk rides up on its riser and throws anyone in the middle; in Lights Out the studio lamps fall one by one and it gets darker with each. Margaret's Arcade fights are now on her own show.",
      'The news ticker carries the local headlines from a city you may know.',
      "Rox and Mister Mumbles hit a little softer with their heavy kicks and sweeps, to match their styles.",
      'Smoother on phones: no garbage from reading pads and menus every frame.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-11-09',
    title: 'Rise and shine',
    notes: [
      "Feel the Burn at Dawn gets its real set: a sprung floor and mirror wall under a sunrise, the neon sign, speaker stacks and a proper twin-deck boombox. Double Time brings the chase lights and the sun up; in Burnout the mirrors lie in pieces, the windows go black and only BURN is still lit.",
      'Picking up the boombox is a real throw now: bend down, lift it overhead and hurl it.',
    ],
  },
  {
    version: '0.16.1',
    date: '2026-11-09',
    title: 'Juggle reactions, cued up',
    notes: [
      'Ready for new juggle animations: a body hit in the air, relaunched, slammed, bounced off the floor or splatted on the wall will get its own reaction once the models have them. Until then it holds the launched pose, so nothing jumps.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-11-09',
    title: 'Extended coverage',
    notes: [
      'Longer combos: the four-hit juggle limit is gone. Each juggle hit pops them a little lower and they fall a little faster, so juggles wind down on their own, and strings and specials keep working on a falling opponent.',
      'Relaunch: a boosted special (1 bar) that hits a juggled opponent pops them straight back up in front of you, with extra damage, and ends the special so you can follow up. Spend as many bars as you have: each relaunch falls a little faster, so even a three-bar combo ends.',
      'Cut Away, the combo breaker, now takes a full meter and spends all of it (no longer 2 bars and 5% health). Still once a round. Holding three bars is the answer to a long combo.',
      "Bounces: some moves slam the opponent into the floor or (near it) the wall, and they come back up into a juggle, once each a combo. Rox's Leg Warmer Lariat ground-bounces and Feel the Burn wall-bounces.",
      'First hit: the first hit of each round is worth a bar of Signal.',
      'The combo counter shows the damage too (8 HITS 29%).',
      'Specials no longer cancel into other specials.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-11-08',
    title: 'Good evening',
    notes: [
      "A fifth fighter: Margaret Okafor, the anchor of The Eleven O'Clock News. Footsies: the best all-round normals in the game, Breaking (a fast strike that staggers, time for a normal after it), Teleprompter (reads the next strike and answers it: OFF THE SCRIPT), Live Feed (a signal that waits on standby, then goes out) and Lead Story (a stepping overhead).",
      'Her Sign-Offs: Breaking News (close: ↓ → BP) and And That Was the News (mid: ← ↓ BK). Win with Breaking to stop the presses.',
      'She plays as a grey box until her model is made.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-11-08',
    title: 'Feel the Burn at Dawn',
    notes: [
      "A second stage: Rox's aerobics show. Warm-Up has a boombox to pick up and throw; in Double Time the tape runs fast and the whole fight with it, 10% quicker; in Burnout the mirrors shatter, the studio opens out into the dark and glass falls on the beat.",
      'Pick the stage on the title screen. In ARCADE each fight is on the opponent\'s own show where it has a stage.',
      'Aerobics music for every segment, and new commercial breaks.',
      'Replays remember the stage.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-11-08',
    title: 'Props department',
    notes: [
      'The combat pass\'s new moves have their own animation: Dale\'s Step Back Kick, Rox\'s Lunge, Hollis\'s Cuff \'Em (with handcuffs) and Mumbles\' String Pull, which whips a string off his control bar.',
      'Dale jabs with his umbrella in Umbrella Jab, his Forecast Cross angles up, and Rox\'s Roundhouse Rep kicks off both legs.',
      'Hollis digs in behind his forearms while Door Kick\'s armour is up, and Mumbles\' Hand Puppet jabs with a little puppet of himself before setting it down as the decoy.',
      'A launched fighter lies flat on their back where they can be hit, so juggles look like they connect; a K.O. falls through the same pose.',
      'After the deciding round the loser sways on their feet, dazed, waiting for the finisher. Mumbles\' strings stay hanging from above when he\'s knocked down.',
    ],
  },
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
