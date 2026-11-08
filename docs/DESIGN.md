# SIGN-OFF — Game Design

Nov 8, 2026 · Derek Ward

## Pitch

SIGN-OFF is a 2.5D one-on-one fighting game set inside a haunted 1987 UHF
channel: every stage is a TV show, and the show changes between rounds. It
plays like a modern 3D-modelled, 2D-plane fighter (strings, specials, meter,
finishers) and runs in the browser at deeek.org/signoff/, on iPhone and
desktop.

## Pillars

- **Every round is a new broadcast.** Living arenas change the stage, its
  hazards and its rules each round, so a best-of-three never plays the same
  way twice.
- **Easy to press, deep to master.** Specials are direction + one button on
  every device; depth comes from strings, meter spending and the arenas, not
  from hard inputs.
- **Horror-comedy on VHS.** Scanlines, colour bars, tracking errors, laugh
  tracks at the wrong moment. Scary first, funny second.
- **Built for a phone.** Short matches (about 3 minutes), touch controls
  designed in from day one, steady 60 frames a second on an iPhone 15 Pro.

**Tone and rating.** Brutal. Violence is heavy and the build-up is long: a
finisher is a real beating, many blows landing on screen with the camera in
close, before the broadcast cuts away. The gore itself is still
broadcast-censored: at the worst moment the picture breaks into static,
colour bars or a "PLEASE STAND BY" card, and the sound carries the rest
(the blows go on under the static). That keeps the look distinctive, avoids
realistic gore art, and keeps the rating flexible. A Settings toggle can
make the censoring lighter or heavier.

## Setting and story

Channel 0 is a station that was never licensed. It comes on air only at
3:33 a.m., on a frequency between channels, and anyone still awake and
watching can be pulled through the screen.

- **The Programme Director** runs the station. Nobody has seen its face; it
  speaks through the continuity announcer's voice and the on-screen captions.
  It needs ratings, and fights are what rate.
- **The deal.** Whoever lasts to the final broadcast, the Sign-Off, is
  promised one thing: their own show, on air forever, rewritten however they
  like. Losers become part of the furniture: extras, studio audience, puppets.
- **The fighters** are people the channel caught (a weatherman, an aerobics
  instructor, a night-shift security guard) and things the channel made (a
  puppet, a living test pattern). Each wants out, or wants the slot.
- **The twist for later chapters.** The Programme Director was once a
  contestant who won. Winning means becoming the next one.

Story mode is told as a night of TV: each chapter is a programme in the
schedule, with short cut-scenes made in the engine as "broadcast segments",
and a fight at the end of each. A run takes about 90 minutes and plays from
several fighters' points of view. Short arcade ladders give each fighter
their own ending, shown as the opening titles of the show they won.

## Living arenas

Each stage is a TV show with three segments, one per round; between rounds
the channel cuts to a 4-second commercial break and the set comes back
changed. This replaces assist characters as the game's signature: the
variety comes from the stage, not from a second fighter.

What a segment can change (each stage changes two or three of these):

- **Space:** the arena gets wider or narrower, a wall breaks open, a raised
  platform appears.
- **Hazards:** something that hurts either fighter, on a fixed, visible
  rhythm (a falling studio light, a live wire, a swinging boom mic).
- **Interactables:** one or two objects either fighter can use with Interact
  (throw the cooking pot, kick the camera dolly).
- **A rule:** one stage-wide modifier, such as lower gravity, faster meter
  gain, or chip damage that heals slowly.

### Rules that keep it fair

1. Every change applies to both fighters equally and never depends on who
   won the last round.
2. Every hazard is announced: a caption and a sound give at least 1 second
   of warning (60 frames) before it hits.
3. Fighters are reset to their start positions after each break, so nobody
   is caught in a new hazard.
4. A match that goes to a fourth round (draws) replays segment 3.
5. Studio rules (for ranked play and tournaments) locks a stage to one
   segment and turns hazards off; interactables stay.

**Live interruptions** (casual modes only): once per round, at a fixed time
shown on the timer, a short event plays out mid-fight: a "Breaking news"
banner that blocks part of the screen, a laugh track that slows both fighters
for a second, a power cut that leaves only silhouettes for 3 seconds.

**Fighter tie-ins.** Every fighter has one special interaction per stage
segment (the weatherman can stand in front of the green screen to call a
storm). These are the "home advantage" moments players learn and show off.

## Fighting systems

The core is a classic plane fighter: 3D characters on a 2D plane, a
dedicated block button, fixed button strings, specials and a three-bar
meter. Every number below is a starting value to tune.

### Movement and defence

- Walk, jump (neutral, forward, back), crouch, a forward dash and a
  backdash. No sidestep: the 3D is for looks.
- Block is a held button. Standing blocks mids and overheads; crouching
  blocks mids and lows. Blocked specials do small chip damage.
- Throw: a button pair at close range; tech it with the same pair within 10
  frames.

### Attacks

- Four attack buttons: Front Punch, Back Punch, Front Kick, Back Kick. Front
  is faster, back is stronger.
- Strings: fixed sequences (e.g. FP, FP, BK) with 8 to 12 per fighter. Each
  string has a defined height for every hit, so a blocked string can be
  punished.
- Specials: 4 to 6 per fighter, entered as direction + Special (or classic
  motions on keyboard and gamepad, see Controls).

### Signal meter

3 bars, fills from dealing and taking damage.

| Spend | Cost | Effect |
| --- | --- | --- |
| Boosted special | 1 bar | A stronger version of a special: more hits, armour or a new follow-up |
| Tape Skip | 1 bar | Cancels any move's recovery into a quick dash: extends combos or makes a blocked move safe |
| Cut Away | 2 bars + 5% health | Combo breaker: knocks the opponent away mid-combo; once per round |

**Technical Difficulties.** Once per match, below 30% health, a fighter can
launch their comeback super. If it connects, the screen tears, the broadcast
"loses signal", and a short cinematic attack deals about 30% damage. If it
misses, it is spent until the next match.

**Frame conventions.** The simulation runs at exactly 60 steps a second.
Every move is data: startup, active and recovery frames, hitboxes and
hurtboxes per frame, damage, hitstun and blockstun, cancel windows. Inputs
are buffered for 8 frames so specials and strings come out reliably on touch
screens.

## Roster

Version 1 ships 8 fighters; the first playable has 2 with opposite styles,
Dale Storm (keeps you out) and Rox Vega (gets in). The Programme Director is
the final boss and not playable at launch.

| Fighter | Who they are | Plays as | Signature specials |
| --- | --- | --- | --- |
| Dale Storm | Channel 0's weatherman, smiling through every forecast | Zoner: controls space from range | Cold Front (a rolling wall of wind) · Pressure Drop (hail from above, an overhead) · Isobar Lasso (pulls the opponent in) |
| Rox Vega | Host of *Feel the Burn at Dawn*; has not stopped exercising since 1983 | Rushdown: fast, relentless, low damage per hit | Grapevine (a dash that crosses sides) · Leg Warmer Lariat · Count of Eight (eight quick kicks) |
| Mister Mumbles | A ventriloquist's dummy from a children's show, with no ventriloquist | Trickster: small, light, slippery | Strings Attached (rises on puppet strings to teleport) · Knock-Knock (an unblockable joke that must be jumped) · Hand Puppet (a decoy) |
| Test Pattern | A being made of colour bars and a 1 kHz tone | Set-play: places traps, strong once set up | Bar Shift (rearranges its own bars to change hitboxes) · The Tone (a sound wave that freezes briefly) · Calibrate (marks a spot that later explodes) |
| Hollis Bey | Night security guard of the transmitter building | Grappler: slow, high health, huge throws | Clocking In (command grab) · Flashlight (blinds, breaks armour) · Key Ring (a short chain whip) |
| Chef Gus Lamarre | Host of a cooking show filmed in one take, every night, forever | Mid-range: long reach with cleaver and pans | Flambé (fire on the floor) · Tenderise (a guard-crushing combo) · Mise en Place (sets up a thrown pan) |
| Margaret Okafor | The evening news anchor; calm, precise, never off-script | Footsies: the best normal moves in the game | Breaking (a fast stagger strike) · Teleprompter (reads the opponent's next attack: a counter) · Live Feed (a projectile on a delay) |
| Rev. Gideon Price | A late-night televangelist who promises miracles for a donation | All-rounder with a resource: collects "donations" | Collection Plate (a returning projectile) · Laying On of Hands (heals by spending donations) · Fire and Brimstone (boosted area attack) |

Later fighters (ideas for after version 1): the Shopping Channel host, a
soap-opera twin pair who tag in and out, the station's night janitor, a
cartoon mascot that's been off air since 1979, and the continuity announcer.

## Stages

Version 1 ships 6 stages, each a show in Channel 0's schedule with three
segments; the first playable has one, *Weather at Eleven*.

| Show | Segment 1 | Segment 2 | Segment 3 |
| --- | --- | --- | --- |
| Weather at Eleven (green-screen studio) | A calm studio with the map behind; the camera dolly can be kicked | The forecast comes true: a steady wind pushes both fighters toward one side; lightning strikes marked spots | The studio floods knee-deep: walking is slower, live puddles shock anyone standing in them when the caption flashes |
| Feel the Burn at Dawn (aerobics studio) | Mirrors and mats; a boombox can be thrown | The tape speeds up: the whole game runs 10% faster | The mirrors shatter and the arena opens wider into the dark; falling shards on a beat |
| Mumbles' Toybox (children's show set) | A cardboard house and a toy chest that can be thrown | A giant puppet hand sweeps low across the floor (jump it) every 8 seconds | The set collapses into a bare stage with two trapdoors that open on a rhythm |
| Kitchen Live (cooking show) | A counter with a pot and a knife block to throw | A grease fire takes one end of the kitchen: the arena narrows | The oven door opens: the heat makes meter fill 50% faster for both fighters |
| The Eleven O'Clock News (news studio) | The news desk, which can be vaulted or thrown across | The ticker runs across the bottom of the screen and the anchor desk becomes a raised platform | The studio lights fail one by one and fall on marked spots |
| Master Control (the Programme Director's room, final boss) | Banks of monitors replaying the match | The monitors show both fighters' worst moments; screens burst on a rhythm | The roof of the transmitter mast in high wind, the city below |

## Sign-Offs and presentation

After the deciding round the announcer says "Stay tuned": the loser gets up
and stands dazed, and for 4 seconds the winner can walk or dash (no jumping
or attacking) into range and enter a finisher. Every finisher is a scripted
scene, and every one cuts to static, colour bars, a stand-by card or the set
switching off at the moment of the worst damage. The scene ends on a closing
card: the loser's own show going off the air.

- **Sign-Off** (the full finisher): 2 per fighter, each at a set range
  (close up to 1.3 m between the fighters, far from 2.4 m, mid between),
  entered as two taps then a button: e.g. back, forward, Back Punch. About
  6 to 9 seconds: 8 or more blows, 5 or more of them on screen, with the
  camera in close, then the cut, more blows heard over it, and the card.
- **Cancellation** (the quick finish): ending the deciding round with the
  winner's cancellation special (Dale: Heat Lightning; Rox: Count of Eight;
  Hollis: Clocking In; Mumbles: Knock-Knock). Straight after the K.O., the
  set switches off and the card reads CANCELLED, about 3 seconds in all.
- **Rerun** (the merciful finish): up, down, Block at any range. The winner
  lets them go; the set switches off and the loser is shown waking on their
  sofa at 3:34 a.m. (Unlocking it per fighter can come later.)

The CPU finishes too: mostly a Sign-Off, now and then a Rerun, and on easy it
often lets the moment pass. Finisher inputs:

| Fighter (show) | Sign-Off 1 | Sign-Off 2 |
| --- | --- | --- |
| Dale Storm (*Weather at Eleven*) | Extended Forecast: close, back, forward, BP | Severe Weather Warning: far, down, back, BK |
| Rox Vega (*Feel the Burn at Dawn*) | Cool-Down: close, forward, back, FK | Feel the Burn: mid, down, forward, BK |
| Hollis Bey (*The Night Watch*) | Lights Out: close, back, down, BP | End of Shift: mid, forward, down, BK |
| Mister Mumbles (*Mumbles' Toybox*) | Peekaboo: close, back, up, FP | Exit Stage Left: far, back, forward, BK |

### The broadcast look

- Health bars are channel-strength meters; the round timer is a broadcast
  clock; round announcements are on-screen captions with a station logo in
  the corner.
- A light VHS layer over everything: scanlines, slight colour bleed, a
  tracking wobble on big hits. A Settings slider turns it down, and Reduce
  Motion turns the wobble off.
- Commercial breaks between rounds show fake ads for the stage's world (a
  mattress store, a hotline, a toy) for 4 seconds while the set changes.

### Audio

- An announcer for the channel (round calls, fighter names, "Stay tuned"),
  a laugh track and applause that react at the wrong moments.
- Music per show in the style of its era: synth news themes, aerobics pop, a
  jingle for the children's show, an organ for the televangelist. Made with
  Web Audio like Curbside's radio, so no big audio files.

## Controls

Every move can be done the same way on every device: specials are direction
+ Special, and meter is spent by pressing Special again or tapping the
meter. Classic motion inputs (quarter circles and the like) work on keyboard
and gamepad as an alternative and give exactly the same move, with no bonus.

| Action | Touch (landscape) | Keyboard | Gamepad (Xbox labels) |
| --- | --- | --- | --- |
| Move, jump, crouch | Floating stick on the left half of the screen | W A S D | Left stick or D-pad |
| Front Punch / Back Punch | Top-left / top-right of the 4-button diamond | U / I | X / Y |
| Front Kick / Back Kick | Bottom-left / bottom-right of the diamond | J / K | A / B |
| Block | Large button under the right thumb | L | RB |
| Special (direction + Special) | Button above the diamond | O | RT |
| Boosted special | Press Special again as the special starts (1 bar) | O again | RT again |
| Throw | Small button beside Block | U + J | LB |
| Interact with the stage | Button that appears only near an object | ; | LT |
| Tape Skip / Cut Away | Tap the meter (Cut Away when being hit) | Space | Y + B |
| Technical Difficulties | Button that appears below 30% health | Block + Special | RB + RT |

### Input rules

- 8-frame input buffer; a special entered during a string's cancel window
  comes out on the first allowed frame.
- Touch buttons are 56 points or larger, inside the safe areas, and can be
  moved and resized in Settings.
- Every control can be rebound on keyboard and gamepad; a button-mash guard
  stops held buttons repeating attacks.

## Technical design

SIGN-OFF uses Curbside's stack (three.js, TypeScript in strict mode, Vite,
vite-plugin-pwa, Vitest) and is built around one rule: the fight simulation
is pure, deterministic code that knows nothing about rendering.

### Simulation

- Runs at exactly 60 steps a second, separate from the display rate.
  Rendering draws the latest step and never changes it.
- Uses whole-number (fixed-point) maths and a seeded random generator, so
  the same inputs give the same fight on every browser and device.
- The whole match state can be saved and restored in one call. That gives
  training-mode resets and replays now, and rollback online play later,
  without a rewrite.
- The CPU opponent sends inputs through the same interface as a player, so
  it can't cheat by reading state the player can't see.

**Moves as data.** Each fighter is a data file: every move's frames,
hitboxes, hurtboxes, damage, stun and cancel windows. Training mode shows
the boxes and frame advantage. Unit tests check the data (every move has a
recovery, a string listed as safe on block really is safe).

**Simulation emits, presentation subscribes.** As in Curbside, the
simulation raises typed events (hit, block, knockdown, round over, segment
change, finisher start); the renderer, camera, audio, HUD and the VHS
effects listen to them.

### Art and budget

- Characters are made in Blender and exported as GLB. All human fighters
  share one skeleton so animation clips can be reused. Each fighter has
  about 20,000 triangles and 2 materials.
- Animations are played by the simulation's frame number, not by clock
  time, so the pose on screen always matches the hitboxes.
- With only two fighters on screen the budget is easier than Curbside's:
  under 100 draw calls on the iPhone profile, a fixed light setup per
  segment, and every shader compiled during loading.

**Deploy.** The repo pydron-bot/signoff builds to https://deeek.org/signoff/
with a copy of Curbside's Pages workflow and base path `/signoff/`. Storage
keys start with `signoff.`, and the service worker's scope is `/signoff/`,
so it shares the deeek.org origin safely. Online play would need a small
connection server, which GitHub Pages can't host; that would live on a
subdomain such as play.deeek.org.

## Scope and milestones

The first goal is a fight that feels good with grey boxes; art starts only
once that gate is passed. No dates are set yet.

Each phase ends at a gate that must be met before the next starts; the first
playable is the first build worth adding to the deeek.org hub.

## Open questions

- [x] How heavy should violence be under the static? **Brutal: more hits and
      a longer lead-up before the cut** (Tone and rating, Sign-Offs).
- [x] Is the iPhone the main target again, or desktop first? **Both, equally.**
- [x] Is online play wanted for version 1? **Not yet:** local two-player and
      CPU. The deterministic sim keeps rollback possible later.
- [x] Are the first two fighters right, and the first stage? **Settled in
      practice:** four fighters and Weather at Eleven are in.
- [x] Who makes the character art? **Blender**, scripted headless
      (docs/BLENDER-TODO.md), in a stylised low-poly look.
- [ ] Should SIGN-OFF reference Curbside's city? **Leaning towards a universe
      crossover**; what form it takes (a news story, a TV cameo, a guest
      fighter or stage) is still open.
