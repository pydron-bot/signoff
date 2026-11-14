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
    version: '0.62.0',
    date: '2026-11-14',
    title: 'Fair Fights',
    notes: [
      'Everyone now has between 850 and 1020 health (it was 660 to 990), so Rox and Mister Mumbles no longer go down in two combos. They pay for it with lighter hits; Rox\'s boosted Star Jump and Count of Eight hit harder, so her meter still pays.',
      'Jumps have weight: Mister Mumbles floats, Hollis and Gus jump short and heavy, Rox is quick and low. The hop out of a launcher is the same height for everyone, so air combos work alike whoever is chasing.',
      'The first hit of a round no longer earns a bar of Signal.',
      "Dale's Cold Front and Gideon's Collection Plate and Low Offering hit a little harder. Hollis's boosted specials hit a little lighter, since his new jump let him carry a juggle too far.",
      'The CPU has new plans for ten matchups. The most one-sided matchup between two CPUs is now 61 to 39, where it was 70 to 30.',
    ],
  },
  {
    version: '0.61.0',
    date: '2026-11-14',
    title: 'Clear Picture',
    notes: [
      'The fighters come through the tape clearer: the colour smear and the grain go easier on them than on the set, and the effects take turns instead of piling up on a fighter who is low on health.',
      "Technical Difficulties cuts to a close-up you can see: the fighter's face, at any health, below the health bars and clear of the touch buttons.",
      'Afterimages trail real speed (a dash, a lunge, the start of a special) and look the same at any refresh rate.',
      'A blow lights the side of the body it came from, amber on a counter hit. Armour and boosted specials glow round the edges.',
      'Fighters cast their own shadow on the floor, and ease between standing, walking, crouching and landing. Attacks still come out on the frame.',
      'The camera looks up ahead of a launched body, so the juggle is in frame before it starts.',
      "The darkest sets give the fighters a stronger rim of light, and Kitchen Live's first segment is dimmed a little so the cooks stand out.",
    ],
  },
  {
    version: '0.60.1',
    date: '2026-11-12',
    title: 'Mic Check',
    notes: [
      "Fixed: the first match after opening the game often had a fighter's opening line babbled instead of spoken, because the voices were still loading. They now start loading as soon as the game opens, each one is ready the moment it arrives, and the cold open waits a moment for a line that's on its way.",
    ],
  },
  {
    version: '0.60.0',
    date: '2026-11-12',
    title: 'Live on Air',
    notes: [
      "Everyone has a voice. All seven fighters speak in their own voice: Dale's broadcast smile, Rox's breathless count, Hollis's tired growl, Mister Mumbles' sing-song, Margaret's newsreader calm, Gus's kitchen bark and Gideon's sermon.",
      'The cold open is spoken: the lines the two fighters trade before round 1 are heard, not babbled, and every round win ends on a line.',
      'Fighters grunt as they attack, shout their specials and throws, cry out when hit, groan when they hit the floor and scream at the K.O.',
    ],
  },
  {
    version: '0.59.0',
    date: '2026-11-12',
    title: 'Foley',
    notes: [
      'Every hit is now a real recorded sound: the slap of a punch, the heavier crack of a kick, the body taking the weight, a crunch on the big ones and a boom on knockdowns and K.O.s. Blocks thump, throws slam, and bodies hit the studio floor.',
      "Attacks cut the air: light and heavy swings whoosh as they come out. Gus's pan rings, his knives chop, and Hollis's nightstick knocks.",
      'Hollis Bey sounds hurt when he is: real grunts of pain, a groan when he hits the floor, and a scream at the K.O.',
    ],
  },
  {
    version: '0.58.0',
    date: '2026-11-10',
    title: 'Lights, Camera',
    notes: [
      'The fight lights up the studio: every blow flashes on the set and the fighters, a counter flashes amber, lightning strikes light the whole room, and projectiles carry their glow with them. Flambé and Fire and Brimstone throw flickering orange across the floor and walls, Heat Lightning crackles, the flashlight throws a cool beam, and Cold Front glows icy.',
      "Big hits hit harder: the colour drains from everything but the blow while it lands, the camera is knocked back before it follows through, and the lens punches in. Wall splats, Tape Skip and teleports send speed lines to the edges, and a K.O. catches the tape for a moment before the slow motion.",
      'Technical Difficulties cuts to a close-up of the fighter in a band of colour bars as it starts, and boosts do too, briefly.',
      'CPU VS CPU: after a K.O., an action replay rewinds and plays the deciding blow again in slow motion (any button skips). The Endless channel changes over with static and the next pairing on screen, and On the TV everything sounds like it comes from the set across the room.',
    ],
  },
  {
    version: '0.57.0',
    date: '2026-11-10',
    title: 'Insomnia',
    notes: [
      "With Endless on, CPU VS CPU keeps your screen from dimming and locking, so the channel can play all night. Pause, or leave CPU VS CPU, and the screen sleeps as usual again.",
      "Fixed: the lines the two fighters trade before round 1 sometimes had one of them out of shot (the camera was still where the title screen's match left it, or framed for the phone the other way up). Now it's always the two of them, close, then the round's wide shot cuts in.",
    ],
  },
  {
    version: '0.56.0',
    date: '2026-11-10',
    title: 'Up All Night',
    notes: [
      "CPU VS CPU can be watched on the TV: set View to On the TV and you stay on the sofa at 3:33 a.m., the match on the set across the room with no health bars in the way. Tap the screen (or press Esc) for the menu.",
      "Endless: the channel never goes off air. After each match the winner gets a moment, then the next random match starts by itself. Tap or press Esc between matches to stop.",
    ],
  },
  {
    version: '0.55.0',
    date: '2026-11-10',
    title: 'CPU vs CPU',
    notes: [
      'CPU VS CPU on the title screen: pick both fighters and the stage, set each side\'s CPU from Easy up to the Director, and sit back with the health bars, the announcer and the cold open. Random Match picks two fighters and a stage for you.',
      'Pause to play it at half or double speed, show the hit boxes (B on a keyboard), or start the same match again; afterwards, a rematch or another random match. Watching never replaces your last match\'s replay.',
    ],
  },
  {
    version: '0.54.0',
    date: '2026-11-10',
    title: 'Loose Ends',
    notes: [
      'Every stage has odds and ends lying about the floor that get knocked around by the fight: coffee mugs, clipboards and gaffer tape in the weather studio, dumbbells, water bottles and towels at the aerobics show, scripts and a wastebasket in the newsroom, onions, a pot lid and wooden spoons in the kitchen.',
      'Walk through them and you kick them along; big hits, knockdowns and lightning strikes send them flying. The storm blows the light ones across the studio and the flood floats them. They never affect the fight.',
    ],
  },
  {
    version: '0.53.0',
    date: '2026-11-10',
    title: 'Signatures',
    notes: [
      "Round intros and wins play out: Dale points down the lens to hand back to the studio, Rox asks if you're ready with two big claps and pumps her fists when she wins, and Hollis checks his watch and cracks his knuckles, then waves you along with his thumb.",
      "Signature specials look their part: Dale shoves his Cold Front through with both hands and twirls the Isobar Lasso over his head before he throws it and reels it in, and Gus works the skillet over the hob before tossing it in Flambé and throws his cleaver overhand.",
    ],
  },
  {
    version: '0.52.0',
    date: '2026-11-10',
    title: 'Every Move Animated',
    notes: [
      "Every new move has its own animation now, no more borrowed ones: the air drops (Dale's umbrella spear, Rox's splits, Mumbles falling like dead weight, Hollis's elbow, Margaret's heel, Gus's belly flop, Gideon falling with the Bible held high), every follow-up, Begone, and all fourteen new air string steps and spikes.",
      "The boosted specials look bigger than the plain ones: Dale's boosted Heat Lightning leaves the floor, Gideon's boosted Laying On of Hands is two-handed and lifts them, and his boosted Fire and Brimstone reaches higher.",
      'Heavy blows land harder: the arm or leg smears through the swing, big wind-ups hold before they snap, the strike reaches through at contact, and a heavy hit throws the head back on the very first frame.',
      "Dale's Heat Lightning no longer flicks his arm over his head as he crouches.",
    ],
  },
  {
    version: '0.51.0',
    date: '2026-11-10',
    title: 'Combo School',
    notes: [
      'Combo School, on the title: every combo in the move list taught a part at a time. A coach over the fight shows the next press and how it works, a timing bar from the last hit with the moment to press marked, and how many frames early or late you were when it drops; practise at half or quarter speed, watch the part, and land it three times to pass.',
      'More specials for everyone. Down + Special in the air drops straight onto them (Low Pressure, Splits Drop, Puppet Drop, Elbow Drop, Cut to Commercial, Belly Flop, Fall from Grace). Each fighter has a follow-up: press a button while the special plays (Thunderclap, And Down and Reach for the Sky, Boo!, Yank, And Now This, Fan the Flames, Slain in the Spirit). Gideon casts them out with Begone (back + Special).',
      'Two more air strings each, three hits long and ending in a spike that bounces them off the floor for more. Air strings hang in the air now: a step that chains or hits a body in the air stops your fall, so they land in full off a jump cancel.',
      'New combos in the move list: Into the air (a jump cancel into an air string), Jump in, Air with a bar, and one with a follow-up.',
      "Balance for the air: once a combo is jump-cancelled its damage scaling bottoms out at 20% instead of 30%, and a follow-up counts as its special when a combo repeats it. Rox's jumping jab, kick and elbow hit lighter; Dale's boosted Heat Lightning hits harder and his boosted lasso lighter. The CPU has new matchup knowledge: Margaret goes low on Dale, Hollis spends his specials on Rox, and Mumbles mixes Margaret up.",
      'Heavy hits and enders now send a shockwave through the picture from where they land, and an ender rushes the picture in toward the blow.',
      'Every blow throws light: a glow at the contact and a pool on the floor, amber on a counter hit. The one hit jolts in the freeze, and counter hits flash warm.',
      'Heavy attacks sweep a bright arc in the fighter\'s colour, and a body hitting the floor or the wall sends a ring across it and kicks up dust. Spending meter (a boost, Cut Away, Technical Difficulties) drops the studio into shadow round the fighter for a moment. Reduce Motion drops the effects that move the picture.',
    ],
  },
  {
    version: '0.50.0',
    date: '2026-11-10',
    title: 'Even Odds',
    notes: [
      'Every matchup is now winnable: against the CPU at hard and on the final fight, no fighter wins more than 70% against any other.',
      'Health now balances the cast: Dale 990, Hollis 980, Gideon 970, Gus 960, Margaret 820, Mumbles 740 and Rox 660. The fast ones who combo hardest have the least to lose.',
      "Gideon's collection plate hits lighter (26, 36 boosted).",
      'The CPU knows its matchups and defends like a player: it ducks you if you throw it every time it gets up, keeps its guard when your string can carry on, and guards a projectile from further off the faster it flies.',
      'The title fits a phone held sideways: a smaller logo, the menu in two even columns inside the screen, the version in the corner, and long choices shortened rather than cut off. The trial count is on the MOVE LIST row.',
    ],
  },
  {
    version: '0.49.0',
    date: '2026-11-10',
    title: 'Every Bar Counts',
    notes: [
      "Meter now pays for everyone: Dale's Heat Lightning boosts into a second relaunch, and Gideon can spend a bar on Laying On of Hands or Fire and Brimstone when he hasn't the donations.",
      'Dale is sturdier (900 health), backs away quicker and hits harder with Cold Front, Heat Lightning and his long pokes; his plain Isobar Lasso is safer when blocked.',
      "Rox's jab is +3 on block, as intended, and her Leg Warmer Lariat and Star Jump hit a little lighter.",
    ],
  },
  {
    version: '0.48.0',
    date: '2026-11-10',
    title: 'The Programme Director Is Watching',
    notes: [
      'The CPU fights like a player now: when its first hit lands it carries on into the combos from the move list, punishes what it blocks and what it sees whiff, and times its attacks on your getup (and waits out a delayed one).',
      'It spends meter with purpose: Tape Skip to get away with an unsafe move or keep a combo going, and Cut Away to break a long combo when the round is at stake.',
      'It learns you over a match: what you do after blocking, how you get up, how often you jump or throw. Throw after every blocked string and it starts ducking them. It blocks low projectiles and the moves it knows go low.',
      "The last fight in Arcade is against the Programme Director's own CPU: it converts nearly every opening and reads your habits fastest.",
    ],
  },
  {
    version: '0.47.0',
    date: '2026-11-10',
    title: 'Rehearsal',
    notes: [
      "Training's dummy plays like an opponent: it can block everything, only after the first hit, at random or flawlessly; stand, crouch or duck; and answer after blocking, after being hit or on getting up with a jab, a throw, a reversal, a boosted special, a jump, a backdash or a delayed getup. Set its meter and let it Cut Away.",
      'Take control of the dummy and record up to ten seconds into one of three slots, then have it play the recording on a loop, from every reset, or as its answer, from either side. Reset can go to the middle, either wall, or a moment you saved.',
      'A frame meter in Training shows each fighter’s last 80 frames as startup, active, recovery, hitstun and blockstun.',
      'Every combo guide is a trial: press TRY beside WATCH in the move list. If you drop it, it tells you where and whether you were early or late. Cleared trials are ticked and counted on the fighter select.',
      'New on the title: twelve short lessons, from blocking high and low to landing a Stage Sign-Off, played as your own fighter.',
    ],
  },
  {
    version: '0.46.0',
    date: '2026-11-10',
    title: 'Duck!',
    notes: [
      "Highs: standing jabs (all but Mumbles'), their strings' next steps and a few blows thrown at the head go over anyone ducking. DUCKED says so. Everything else reaches every crouching fighter, even Mumbles.",
      'A plain throw goes over a neutral duck (crouching without Block), and the whiff can be punished; crouch-blocking is still thrown, and command grabs take a duck.',
      'A forward dash can be cancelled into Block, a normal, a throw or a special after its first 6 frames: dash, Block, dash to close in under a guard.',
      'A hit knocks a crouching fighter upright, so a combo plays the same however it began. Training has a DUCK dummy.',
    ],
  },
  {
    version: '0.45.0',
    date: '2026-11-10',
    title: 'Through the Glass',
    notes: [
      'The title is a living room at 3:33 a.m.: the attract mode plays on the TV across the room, and starting a match pushes in through the glass.',
      'In Arcade, the fighters you have beaten watch from the bleachers in the dark past the walls.',
      'Studio cameras, boom mics and lamps stand at the edges of the frame as the camera pulls back, and step out of the way of a fighter at the wall.',
    ],
  },
  {
    version: '0.44.0',
    date: '2026-11-10',
    title: 'House Styles',
    notes: [
      "Rox and Hollis fight like themselves: Rox claps, high-kicks, drops into the splits and steps on the beat, with a quick, springy rhythm; Hollis grabs collars, drives knees, barges with his shoulder and shoves with a stiff arm, loading up big and carrying his weight through.",
    ],
  },
  {
    version: '0.43.0',
    date: '2026-11-10',
    title: 'Airborne',
    notes: [
      "Every air special has its own animation: Dale's umbrella up as the hail comes down, Rox's heel-first dive, Mumbles dropping feet first after his strings snap, Hollis sweeping the floor with his flashlight, Margaret cutting straight across, Gus's cleaver toss and Gideon's rapture.",
    ],
  },
  {
    version: '0.42.0',
    date: '2026-11-10',
    title: 'Clear Picture',
    notes: [
      'With the touch buttons on screen, the camera keeps the fight beside them: the fighters sit a little off-centre, and at the wall on the buttons\' side the camera looks past it, so a fighter pinned there stands clear of the buttons.',
      'A touch button with a fighter behind it fades so the fight shows through. It still works, and still lights while held.',
    ],
  },
  {
    version: '0.41.0',
    date: '2026-11-10',
    title: 'Studio Audience',
    notes: [
      'Behind the scenes: the studio kit at the edges of the frame, the bleachers in the dark where beaten fighters will sit, and the living room at 3:33 a.m. are built, ready for the game to bring in.',
    ],
  },
  {
    version: '0.40.0',
    date: '2026-11-10',
    title: 'Practicals',
    notes: [
      "The lamps you can see on each stage light it now: pools under the news studio's lamps, warm bars of dawn sun through Feel the Burn's windows, the hood light over the hob, the oven's orange glow, the weather map washed from above.",
    ],
  },
  {
    version: '0.39.1',
    date: '2026-11-10',
    title: 'Call Sheet',
    notes: ['The recording script for the voices and hits is online at deeek.org/signoff/recording/, with takes to tick off during a session.'],
  },
  {
    version: '0.39.0',
    date: '2026-11-09',
    title: 'Sound Check',
    notes: [
      'The game is ready for real voices and real hits: recordings can now replace the fighters\' grunts, shouts, cries and screams, their lines before a match, and every layer of a hit, one sound at a time. Nothing sounds different until the first recordings arrive.',
      'Settings → SCREEN BUTTONS: the touch buttons get out of the way while a gamepad is playing (or keep them with ALWAYS).',
      'The menus scroll on a phone held sideways: Settings no longer runs off the bottom of the screen.',
      "The move list's columns no longer run into each other: long inputs wrap.",
    ],
  },
  {
    version: '0.38.0',
    date: '2026-11-09',
    title: 'Sweeps Week',
    notes: [
      "Specials in the air: press Special while jumping (once a jump; Special again boosts it). Dale hangs under his umbrella dropping hail, Rox dives heel first, Mumbles vanishes and drops on you from behind, Hollis sweeps the floor with his flashlight, Margaret shoots straight across, Gus throws a cleaver down and Gideon lights up all round him.",
      'Air strings: jumping attacks chain into each other (the move list has them under In the air), and a jumping attack that hits cancels into the air special.',
      'Jump cancel: when a launcher hits, press Up (or Up-Forward) to hop after them and keep the combo going in the air.',
      "Technical Difficulties isn't gone if it misses or is blocked any more: it comes back 12 seconds later (SIGNAL RESTORED). Only a hit spends it for the match.",
      "Two new Cancellations for every fighter, found by ending the match the right way: with an air special, a string's last hit, a throw, or a direction held as the blow lands. The move list shows them as ??? with a hint until you've landed one.",
      'Stage Sign-Offs: close up with their back to a wall, press → ↓ BLOCK, and the set finishes them: the studio lightning, the mirrors, a falling lamp or the burners, depending on the show.',
      'Finisher practice in Training (FINISHERS in the menu): one hit wins the match, Stay tuned waits as long as you like, and it starts again after the finisher. AT THE WALL sets up the Stage Sign-Off.',
      "Before a match, the two fighters trade a line, and some of them have history. Any button skips it.",
      "Signal damage: as a fighter gets hurt their picture breaks up, snow and colour bleeding through, and some of it is still there after the commercial break. VHS LOOK turns it down.",
      'Every stage has soft shading baked into its corners: where walls meet the floor, under the kitchen hood, along the foot of the mirrors, and round the props.',
      'Signs, screens and lamps on every stage glow now: the neon over the mirrors, the dawn sun through the windows, the CH 0 NEWS header and the globe, the KITCHEN LIVE sign, the grease fire and the oven, the lightning and the sparking cables.',
      "Energy specials glow too: Dale's Cold Front and Heat Lightning, Margaret's Live Feed and Gideon's Fire and Brimstone.",
    ],
  },
  {
    version: '0.37.0',
    date: '2026-11-09',
    title: 'House Style',
    notes: [
      'Rox and Hollis now fight like nobody else (the rest of the cast follows).',
      "Rox is the routine: she steps in on every string step, claps twice in your face, kicks straight up (it catches jumpers but sails over anyone crouching), slides into her splits sweep, and her jab is the most plus in the game. Her new Full Routine (FP, FP, FK, FK, BP) ends low then overhead.",
      "Hollis is the night watch: his jab grabs your collar and drags you into grab range, his knee staggers long enough to link the jab, his Rising Clothesline and Shoulder Check are armoured (and the shoulder barges forward), and forward + FK is a slow Stiff Arm that crushes a guard. His strings are fewer and shorter, and Frisk (BP, FP, FK) is a second one that ends in a grab.",
      'Their new moves play stand-in animations until the new ones are made; the combo guides in the move list are updated.',
    ],
  },
  {
    version: '0.36.0',
    date: '2026-11-09',
    title: 'Big Finish',
    notes: [
      'Specials, launchers and combo enders have more showmanship: a wind-up before, the whole body stretching into the blow, and a follow-through after. Boosted specials go bigger still, sinking lower into the swing.',
      "A fighter left dazed before a Sign-Off is properly pitiful now: slumped, arms hanging, knees buckling as they sway.",
    ],
  },
  {
    version: '0.35.0',
    date: '2026-11-09',
    title: 'Sharp Dressed',
    notes: [
      "More detail on the whole cast: hair in chunky locks and curls instead of smooth helmets (Rox's perm especially), Gus's toque with real pleats and a puffed top, Gideon's hair swept back into a ducktail, and Hollis's cropped hair under a rounder cap.",
      'Clothes with edges: collar points, jacket hems, pocket flaps, Mumbles\' pocket hanky and shoe straps, Hollis\'s belt loops and boot laces, heels on the shoes.',
    ],
  },
  {
    version: '0.34.0',
    date: '2026-11-09',
    title: 'Picture Quality',
    notes: [
      'A new picture: colour smears off edges the way it did on tape, big hits tear the tracking and knock the colours out of line, lights and sparks glow, and every segment has its own colour grade. Edges are smooth, not jagged.',
      'Studio lighting: the sets fall away into the dark behind the fight, light bounces up off the floor, haze hangs in the air, lamps throw faint beams and dust drifts through them. Kitchen Live is no longer one shade of white.',
      'Reflections: the fighters show in the studio floors (and in the flood water), and in Feel the Burn at Dawn they fight in the mirrors too, until Burnout shatters them.',
      'The fighters are drawn with a dark outline and stepped light and shade, so they stand out from any set; their shadows fall away from the light.',
      'Fast moves trail cyan and magenta ghosts, like a tape that can\'t keep up, and enders and K.O.s land on a flash of negative.',
      'Each round opens on a wide shot of the studio as the lights bang on bank by bank, then settles on the fighters; a match opens with each fighter introduced by name and show.',
      'A broadcast HUD: names on caption plates with their shows, health bars that leave a red chunk where the last hits landed before it drains, and a blinking LIVE beside the station logo (no longer on top of Gideon\'s donations).',
      'The title is a TV in a dark room at 3:33 a.m.; starting a match pushes in through the glass.',
      'Reduce Motion drops the negative flashes, the ghosts and the push-in; the VHS LOOK setting turns the tape effects down or off.',
      'Hits look different by where they land: a snap of the head, a punch to the ribs, doubled over by a heavy one, a knee buckling, reeling from a long stun.',
      'Performance overlay: Settings → PERFORMANCE (or the ` key on a keyboard) shows the frame rate, how long frames take (and the worst in the last second), simulation steps a second, draw calls and triangles, in the top left.',
    ],
  },
  {
    version: '0.33.0',
    date: '2026-11-09',
    title: 'Face Time',
    notes: [
      'Sharper faces for the whole cast: a proper nose, cheekbones, a line over each eye that squints with it, and real lips on Dale, Rox, Margaret, Gus and Gideon. The intros, wins and Sign-Off close-ups show it most. Mister Mumbles keeps his painted-on face.',
      'Sharper hands up close: they get as much texture detail as the faces now.',
    ],
  },
  {
    version: '0.32.0',
    date: '2026-11-09',
    title: 'Say Something',
    notes: [
      'The fighters have voices: a grunt behind a heavy swing, a shout on every special and throw, a cry when they\'re hit (bigger the harder the hit), an "oof" as they hit the floor, and a scream on a K.O.',
      'Everyone sounds like themselves: Hollis deep and rough, Rox high and breathy, Gus gravelly, Margaret crisp, Gideon with a preacher\'s tremble, and Mister Mumbles squeaky, his wooden jaw clacking.',
      'Sound on iPhone: the game now plays with the silent switch on, and starts on your first tap (it could stay silent before). Like most games, it pauses music from other apps while it plays.',
      'Sound picks up again after a call or switching apps, on your next tap.',
    ],
  },
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
