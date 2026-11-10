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

**Arcade** (in now): your fighter against everyone else in turn, listed as
the night's schedule, easy to hard and the Programme Director's own CPU
(DIRECTOR) last, with three continues; winning plays the
ending, the opening titles of the show you won.

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
- **Dash cancel (0.46.0).** After its first 6 frames a forward dash can be
  cancelled into Block (it stops dead, guarding), a normal, a throw or a
  special, but not a jump or another dash: dash, Block, dash is how to
  close in under a guard. Backdashes and Tape Skip's dash run their course.
- Block is a held button. Standing blocks highs, mids and overheads;
  crouching blocks mids and lows. Blocked specials do small chip damage.
- **Highs and ducking (0.46.0).** Every hit has a height: high, mid, low,
  overhead or unblockable. A high goes over anyone ducking (crouching,
  crouch-blocking, or in a crouching move) and says DUCKED; everything
  else reaches every crouching fighter, the smallest included (a test
  checks every box). Every standing jab but Mumbles' (thrown at his own
  height) is a high, with its string's next step and a few moves thrown at
  the head (Rox's claps and High Kick, Hollis's Nightstick and Flashlight,
  Gideon's laying on of hands and collection plate). So the fastest,
  most plus button can be ducked and punished, and the crouching jab is
  the safe one. A hit knocks a croucher upright, so the rest of a combo
  meets a standing body whichever way it began.
- Throw: a button pair at close range; tech it with the same pair within 10
  frames. A plain throw is a high: a neutral duck (crouching without
  Block) goes under it and can punish the whiff, but crouch-blocking is
  thrown. Command grabs and string grabs take a duck too.
- **Defence (0.30.0).** A *flawless block* is Block pressed within 4
  frames of the hit landing: no chip, 6 frames less blockstun (so the
  blocker can punish more) and a little meter. A *delayed getup*: hold Down
  as a knockdown ends to stay down 20 frames longer, once a knockdown, so a
  timed attack on the getup misses. A *reversal* is any move pressed during
  the getup: it comes out on the first free frame. A *punish* is a hit on a
  move's recovery (whiffed or blocked): the first hit does 20% more and
  earns meter. Each is called out on screen.
- **The air (0.38.0).** Every fighter has a special in the air (Special
  while jumping, once a jump, with a boosted version): Dale hangs under his
  umbrella dropping hail (Downpour), Rox dives heel first (Aerobic Dive),
  Mumbles vanishes and drops on them from behind (Cut the Strings), Hollis
  sweeps the floor with his flashlight (Searchlight), Margaret shoots
  straight across (On the Wire), Gus throws a cleaver down (Cleaver Toss)
  and Gideon lights up all round him (Rapture). A move can hang in the air
  (`hover`), set off at a speed (`dive`) and have its own landing lag.
  **Air strings** chain one jumping normal into another, on hit or block,
  and an air normal that hits cancels into the air special as a ground one
  cancels into a special. A **jump cancel**: a launcher (or bounce) that
  hits can be cancelled into a hop (75% of a jump) with Up, which meets the
  body on the way up, so a juggle can go into the air. Once a combo, and it
  counts as two more hits for damage scaling: the air adds style, not
  damage. The combo search (`npm run combos`) tries jump cancels and air
  attacks too, so the damage ceilings cover them.
- **Input display.** Recent inputs scroll down the side of the screen, newest
  on top with the frames each was held (Settings: off, in Training and combo
  showcases, or always; versus and replays show both players).

### Attacks

- Four attack buttons: Front Punch, Back Punch, Front Kick, Back Kick. Front
  is faster, back is stronger.
- Strings: fixed sequences (e.g. FP, FP, BK) with 8 to 12 per fighter. Each
  string has a defined height for every hit, so a blocked string can be
  punished. A string carries on whether it hits, is blocked or whiffs, and
  every string is a true combo on hit.
- Cancels: a normal or string step that **hits** can be cancelled into any
  special (not on block or whiff: confirm it first; never special into
  special). A **launcher** or a **bounce** that hits can be cancelled into any
  normal, to follow them into the air. Tape Skip (1 bar) cancels anything into
  a dash, which is how strings join up.
- **Combo guides.** The move list shows each fighter's combos (no meter,
  one bar, full meter), found by searching the simulation for routes a
  person can land, and WATCH plays one on a loop, slowed down if you like.
- Combos aim at the length of a modern Mortal Kombat combo, 10 or more hits
  and about 30% without meter, 35 to 40% with a bar, without assists:
  - **Juggles wind down on their own.** No hard limit: each juggle hit pops
    the body 7% lower and it falls 6% faster, so a juggle ends by itself
    (a cap of 16 is only a safety net). Strings and specials work on a
    falling body. A launcher only launches from the ground: on a body
    already in the air it's one more juggle hit, so it can't be looped.
  - **Relaunch (1 bar).** A boosted special whose first hit lands on a
    juggled opponent pops them straight back up just in front of the
    attacker, for 70 extra damage (scaled like the hit), and the special stops there
    so the attacker can follow up. As many times as there are bars to
    spend: each relaunch falls faster than the last, so it still ends.
  - **Bounces.** A ground bounce slams them into the floor; a wall bounce,
    only within 1.6 m of the wall, throws them into it. Either way they come
    back up into a juggle, each once a combo; otherwise the move knocks
    down. Each fighter gets a bounce or two as signature combo tools.
  - **Damage scaling** stays at 10% less per hit, down to 30%, so the
    extra hits are worth having without letting combos run away.
  - **Repeats scale harder** (as in MK1, where a move used again in a
    combo takes more scaling): each earlier use of the same move in the
    combo keeps only 60% of its damage again (60%, 36%, 22%...), on top of
    the usual scaling. A boosted special counts as its plain move. A
    multi-hit move counts once.
  - **Meter scaling.** The attacker earns 15% less Signal for each hit of
    a combo (down to 10%), so a combo can't pay for its own relaunches.
    The defender's gain isn't scaled, which keeps Cut Away in reach.
  - **First hit.** The first hit of each round (strike, throw or super) is
    worth a bar of Signal.
  - **Breaking out.** The defender's answer to a long combo is Cut Away,
    which takes a full meter and spends all of it: the attacker has to
    weigh spending bars to extend against the bars the defender is holding.
- Each fighter's normals do their own job, and each fighter has a style of
  their own (`docs/STYLES.md`: shape, rhythm, space, properties, strings;
  Rox and Hollis first, in 0.37.0): Dale has the longest pokes and a
  step-back kick; Rox is the routine: the closest range and the most plus,
  every string step stepping in, two-hit claps, a high kick that's an
  anti-air but sails over a croucher, a sliding splits sweep, and the
  longest strings (the Full Routine branches low or overhead at its fourth
  hit); Hollis is the night watch: a jab that drags you into grab range, a
  close knee and the Nightstick that both link, armour on his heavies
  (Door Kick, Rising Clothesline, a barging Shoulder Check), a slow Stiff
  Arm that crushes a guard, and short strings, two of them ending in a
  grab (Cuff 'Em, Frisk);
  Mumbles ducks under high attacks, reels people in on a string, and ends
  combos with his Hand Puppet; Margaret has the best all-round normals
  (fast, long enough, safe), a step-in kick, and a stagger (Breaking) that
  leaves time for a normal after it.
- Specials: 4 to 6 per fighter, entered as direction + Special (or classic
  motions on keyboard and gamepad, see Controls).

### Signal meter

3 bars, fills from dealing and taking damage; the first hit of a round is
worth a bar.

| Spend | Cost | Effect |
| --- | --- | --- |
| Boosted special | 1 bar | A stronger version of a special: more hits, armour or a new follow-up; on a juggled opponent, a relaunch |
| Tape Skip | 1 bar | Cancels any move's recovery into a quick dash: extends combos or makes a blocked move safe |
| Cut Away | All 3 bars (a full meter) | Combo breaker: knocks the opponent away mid-combo; once per round |

**Meter has to pay (0.49.0).** Beside the damage ceilings, the combo
search (`npm run combos`) holds a floor: each bar spent, from none to one
and from one to three, must add at least 4% to a fighter's best human
combo. Dale's third bar and all of Gideon's added nothing, so Dale's
Heat Lightning boosts (invulnerable longer, a second relaunch) and
Gideon's Laying On of Hands and Fire and Brimstone boost for a bar
(beside their donation versions: with two donations the blessed Fire and
Brimstone is free; without, a bar opens the sky a little way).

**Technical Difficulties.** Below 30% health, a fighter can launch their
comeback super. If it connects, the screen tears, the broadcast "loses
signal", and a short cinematic attack deals about 30% damage, and it's spent
for the match. If it misses or is blocked it isn't spent: it comes back
after 12 seconds (SIGNAL RESTORED), as in MK1, so throwing it out isn't a
match-long gamble.

**Frame conventions.** The simulation runs at exactly 60 steps a second.
Every move is data: startup, active and recovery frames, hitboxes and
hurtboxes per frame, damage, hitstun and blockstun, cancel windows. Inputs
are buffered for 8 frames so specials and strings come out reliably on touch
screens.

### Rehearsal: training, trials and lessons (0.47.0)

- **The dummy** (`src/game/dummy.ts`), set from Training's DUMMY page.
  GUARD: none, all, after the first hit, random or flawless (it may peek
  at the attacker's move to block the right height; the CPU may not).
  STANCE: stand (blocks whatever height each hit needs), crouch (blocks
  crouching, so overheads hit it) or duck (down without Block, so highs and
  throws go over). It answers after a block, after a hit and on getting
  up with nothing, a jab, a throw, a reversal (a special with an
  invincible start, else armour, else the fastest), a boosted special, a
  jump, a backdash or the recording; getting up also offers staying down.
  Its meter is held at empty, one bar or full, or refilled at rest, and
  with Cut Away on it breaks a combo from the second hit.
- **Record and play back.** RECORD hands the player the dummy for up to
  ten seconds into one of three slots, stored relative to facing in the
  replays' run-length format; PLAYBACK plays it on a loop or once from
  every reset, and any answer can be the recording. RESET TO is round
  start, the middle, the dummy's back to either wall, or a moment kept with
  SAVE THIS MOMENT.
- **The frame meter** (`src/game/frameMeter.ts`) draws each fighter's last
  80 frames (startup, active, recovery, hitstun, blockstun), leaving out
  the frames both spend frozen in a hit's freeze.
- **Trials.** Every combo guide is a trial (TRY beside WATCH in the move
  list, `src/game/trials.ts`), built from the guide when it's opened so it
  follows the moves. It ticks each move as it lands in the same combo; on
  a drop it names the step and says whether the press was early or late
  against the guide. Cleared trials are kept in `signoff.trials`, ticked in
  the move list and counted on the fighter select.
- **Lessons.** LESSONS on the title offers twelve drills
  (`src/game/lessons.ts`): block high then low, anti-air, punish a blocked
  sweep, flawless block, break a throw, duck a throw and launch, stay down,
  boost a special, Tape Skip, Cut Away, Technical Difficulties and a
  Sign-Off, each a start, a dummy script and a test over the simulation's
  events, played as the player's fighter against Rox and kept in
  `signoff.lessons` once cleared. Every lesson carries the presses that
  clear it, and a test plays them for every fighter, so a lesson that
  can't be cleared fails the build.

### The CPU (0.48.0)

The CPU (`src/ai/`) sends input frames like a player and sees only what
is on screen, a reaction time late (24, 15 and 10 frames for easy,
normal and hard). When an opener it lands connects (a jab, a low, an
overhead or its launcher), it carries on with that fighter's combo guide
from the move list, press by press at the guide's timing, from the range
the guide was measured to hold at, and lets go when it sees the combo
drop; it chases anti-airs with a jump cancel. It punishes by the frames:
the launcher route when there's time, else the jab route, else nothing,
for moves it sees whiff and for unsafe moves it blocks. It spends Tape
Skip on unsafe moves and to extend, and saves a full meter for Cut Away
once its health is at stake. It dashes in behind Block, blocks
projectiles by where they fly and moves it knows go low, ducks throws it
expects, and times a strike or a throw for the first frame of a getup,
keyed on seeing the getup start. It counts the opponent's habits over
the match (the answer to a blocked attack, what they do on getting up,
how often they jump or throw projectiles) and plays against the
strongest. Easy does none of this, normal converts about a third of the
time and hard most of the time. DIRECTOR, Arcade's last fight only, has
hard's reactions, converts nearly always and adapts fastest. Everything
is seeded, so a match replays from its seed.

**Styles and leans (0.50.0).** Each style's choices (strings, throws,
specials, pokes, lows, approaching, retreating, waiting, guarding,
jumping, mix-ups) are weighted options, and each fighter's CPU has a lean
(`src/ai/lean.ts`) that scales those weights. Where a matchup needs it,
the losing side has matchup knowledge too: a lean for that opponent only,
searched to win that matchup, so the winner's play is never made worse to
even things up (Gus against Rox mixes up more and throws less; Gideon
presses Hollis instead of waiting; Rox stays out of Mumbles' reach and
uses her specials; Mumbles strings Margaret rather than spending
specials into her counter; Rox goes low on Margaret). On defence it
learns what the opponent does to its getup and ducks a habitual throw
(throws are highs), keeps its guard a moment after a blockstun when the
attacker can carry on, and guards a projectile it sees coming from
further away the faster it flies, including a returning one.

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
| Rev. Gideon Price | A late-night televangelist who promises miracles for a donation; host of *The Hour of Power* | All-rounder with a resource: collects "donations" (up to 5, each time the plate connects); his heal and big blast spend them automatically | Collection Plate (a returning projectile) · Laying On of Hands (heals by spending donations) · Fire and Brimstone (boosted area attack) |

Later fighters (ideas for after version 1): the Shopping Channel host, a
soap-opera twin pair who tag in and out, the station's night janitor, a
cartoon mascot that's been off air since 1979, and the continuity announcer.

## Stages

Version 1 ships 6 stages, each a show in Channel 0's schedule with three
segments. Four are in: *Weather at Eleven*, *Feel the Burn at Dawn*
(Warm-Up, Double Time, Burnout), *The Eleven O'Clock News* (Headlines,
The Ticker, Lights Out) and *Kitchen Live* (Prep, Grease Fire, The Oven). Pick one on the title screen; in Arcade each
fight is on the opponent's own show where it has a stage.

| Show | Segment 1 | Segment 2 | Segment 3 |
| --- | --- | --- | --- |
| Weather at Eleven (green-screen studio) | A calm studio with the map behind; the camera dolly can be kicked | The forecast comes true: a steady wind pushes both fighters toward one side; lightning strikes marked spots | The studio floods knee-deep: walking is slower, live puddles shock anyone standing in them when the caption flashes |
| Feel the Burn at Dawn (aerobics studio) | Mirrors and mats; a boombox can be thrown | The tape speeds up: the whole game runs 10% faster | The mirrors shatter and the arena opens wider into the dark; falling shards on a beat |
| Mumbles' Toybox (children's show set) | A cardboard house and a toy chest that can be thrown | A giant puppet hand sweeps low across the floor (jump it) every 8 seconds | The set collapses into a bare stage with two trapdoors that open on a rhythm |
| Kitchen Live (cooking show) | A counter with a pot (thrown at chest height) and a knife block (thrown low) | A grease fire takes the ends of the kitchen: the arena narrows to ±4.5 m and the fire flares at one end on a rhythm | The oven door opens: the heat makes meter fill 50% faster for both fighters |
| The Eleven O'Clock News (news studio) | The news desk, shoved along the floor into the opponent (jump it) | The ticker runs across the bottom of the screen; the anchor desk rides up on its riser on a rhythm, throwing anyone in the middle of the floor | The studio lights fail one by one and fall on marked spots; the studio gets darker with each |
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
- **Cancellation** (the quick finish): three per fighter, each earned by
  how the deciding round ends: a set move landing the K.O., sometimes with
  a direction held as it lands. One is a special on the ground, listed from
  the start (Dale: Heat Lightning; Rox: Count of Eight; Hollis: Clocking
  In; Mumbles: Knock-Knock; Margaret: Breaking; Gus: Tenderise; Gideon:
  Fire and Brimstone). The other two (0.38.0) are found by playing: the move
  list shows them as ??? with a hint (a throw, an air special, a string,
  holding a direction) until a player lands one, and remembers it
  (`signoff.found`). They are Cold Snap (Cold Front, holding back) and
  Washed Out (Downpour) for Dale; Hit the Wall (Aerobic Dive) and Out of
  Step (the Full Routine) for Rox; Off Duty (Searchlight) and Cuffed (Cuff
  'Em) for Hollis; Put Away (a throw, holding back) and Pulled the Strings
  (Cut the Strings) for Mumbles; Dead Air (On the Wire) and Correction
  (Teleprompter's answer) for Margaret; Burnt (Flambé, holding down) and
  Off the Menu (Cleaver Toss) for Gus; Passing the Plate (Collection Plate,
  holding back) and Raptured (Rapture) for Gideon. Straight after the K.O.
  the broadcast cuts away (each to its own censor) and the card reads
  CANCELLED, about 3 seconds in all.
- **Stage Sign-Off** (0.38.0): forward, down, Block, close up with the
  loser's back to a wall (within 1.5 m), on any stage, for anyone. Two
  blows and a throw into the set, then the set's own hazard comes down on
  them where they lie before the cut: *Act of God* (the studio's lightning,
  Weather at Eleven), *Mirror, Mirror* (the mirrors, Feel the Burn at
  Dawn), *Lights Down* (a lamp off the grid, the News) and *Well Done* (the
  burners, Kitchen Live). The CPU uses it when the loser is against a wall.
- **Rerun** (the merciful finish): up, down, Block at any range. The winner
  lets them go; the set switches off and the loser is shown waking on their
  sofa at 3:34 a.m. (Unlocking it per fighter can come later.)

**Finisher practice** (Training → FINISHERS): the dummy on its last point
of health and the player a round up, so one hit wins the match; "Stay
tuned" waits as long as it takes, and after the finisher it starts again.
AT THE WALL puts the dummy's back to the wall for the Stage Sign-Off.

The CPU finishes too: mostly a Sign-Off, now and then a Rerun, and on easy it
often lets the moment pass. Finisher inputs:

| Fighter (show) | Sign-Off 1 | Sign-Off 2 |
| --- | --- | --- |
| Dale Storm (*Weather at Eleven*) | Extended Forecast: close, back, forward, BP | Severe Weather Warning: far, down, back, BK |
| Rox Vega (*Feel the Burn at Dawn*) | Cool-Down: close, forward, back, FK | Feel the Burn: mid, down, forward, BK |
| Hollis Bey (*The Night Watch*) | Lights Out: close, back, down, BP | End of Shift: mid, forward, down, BK |
| Mister Mumbles (*Mumbles' Toybox*) | Peekaboo: close, back, up, FP | Exit Stage Left: far, back, forward, BK |
| Margaret Okafor (*The Eleven O'Clock News*) | Breaking News: close, down, forward, BP | And That Was the News: mid, back, down, BK |
| Chef Gus Lamarre (*Kitchen Live*) | Order Up: close, down, back, BP | Last Service: mid, back, forward, BK |
| Rev. Gideon Price (*The Hour of Power*) | Faith Healing: close, forward, down, BP | Last Rites: mid, down, back, BK |

### Hits and the camera

What makes a hit land is how much the game reacts to it, and how much
more it reacts to a big one than a small one.

- **Hit weight.** Every strike lands *light* (under 40 damage before
  scaling: jabs, the hits of a flurry), *medium* (40 to 59), *heavy* (60
  and up) or as an *ender* (it launches, knocks down, bounces, relaunches
  or KOs). The freeze on contact goes by weight: 6, 8, 11 and 14 frames,
  4 more on a counter hit. Both fighters freeze together, so it changes no
  frame advantage; a projectile keeps the plain 8, as its thrower doesn't
  freeze with it.
- **Everything else follows the weight:** the spark's size and how long it
  lingers, the body's flash, the screen shake, the VHS wobble (heavy and
  up), and the sound, built in layers: a snap (fist, foot, special, or the
  ring of a pan, the shing of a blade, the knock of a nightstick), a thud,
  a crunch from medium up, and a sub drop and tape warble on an ender. A
  bus compressor keeps it loud without clipping.
- **The signal spray** stands in for blood: thin bars of broken video
  (red, magenta, white, cyan) burst from the contact the way the blow
  travels, flicker like a tape dropout, fall a little and fade, more and
  further the heavier the hit; an ender adds tracking tears across the
  body.
- **The camera** keeps the fighters about half the screen's height up
  close, pulls back only as far as the gap between them needs, rises with
  jumps and juggles, and stops short of the walls. It shakes by weight
  (small hits barely stir it), leans the way the blow travels, and pushes
  in on enders, launches, wall splats, boosts and Technical Difficulties.
- **The KO.** The game drops to 30% speed for half a second of game time
  (about 1.7 seconds), then eases back, while the camera swings round and
  in on the loser. Replays and results are untouched: only the pacing
  changes.
- **Hit reactions** follow the hit: head, body or legs by where it lands
  (68% of the fighter's height and up is the head, under 35% the legs),
  a heavy version for heavy and counter hits, two light versions that
  alternate down a combo, their own for a crouching fighter, and a stagger
  for a stun of 26 frames or more (a crushed guard, Breaking).
- **The fighters' own light:** a rim on their edges in the segment's rim
  colour, the key light stepped into lit, half-lit and shade, and a dark
  outline, so they stand out from busy sets; a soft contact shadow that
  falls away from the key light and shrinks as they leave the floor; and
  their reflections in the floor (and in Burn's mirrors).
- **Echoes and impact frames:** fast moves (dashes, lunges, specials, Tape
  Skip) trail a cyan and a magenta afterimage a few frames behind, like a
  tape's colour lagging; an ender or a KO lands on two frames of negative.
- **The cold open** (0.38.0): before round 1 of a match against someone,
  the two trade a line each in captions on their sides of the screen, typed
  on with their voices babbling under them, in the half-lit studio before
  the lights bang on, like the top of a talk show. Pairings with history
  have their own exchange (Margaret and Dale; Gideon and Mumbles; Hollis
  and Mumbles; Rox and Gus...), otherwise one fighter's opener and the
  other's reply. Any button or a tap skips it; the match isn't stepped
  until it's done.
- **Signal damage** (0.38.0): a hurt fighter's picture breaks up. As health
  falls, bands of the body drop out to snow, the colour comes apart at the
  bands' edges, specks of snow show and the picture under it dulls like a
  bruise; 60% of it carries over the commercial break, so the loser of a
  round starts the next one already breaking up. A few lines in the
  fighters' shader with a per-fighter value: no draw calls. VHS LOOK turns
  the tape part down or off (the dulling stays); Reduce Motion holds it
  still.
- **Each round goes on air:** the studio lights bang on in three banks
  and the camera opens wide and high, settling on the fighters as the
  intro ends; the first round introduces both fighters in lower thirds.
- Reduce Motion drops the shake, lean, push-ins, KO swing, the round's
  establishing shot, the echoes and the impact frames; the framing and the
  slow motion stay.

### The broadcast look

- Health bars are channel-strength meters, leaving a red chunk where the
  last hits landed that drains a moment later; names sit on caption plates
  with each fighter's show; the round timer is a broadcast clock; round
  announcements are on-screen captions with a station logo (and a blinking
  LIVE) in the corner.
- **The picture** (`src/render/post.ts`): the scene is drawn into a
  multisampled high-range buffer, and one pass puts it on screen as a tape
  would: sharp brightness with the colour smeared sideways, a tracking
  tear and a colour split on big hits, a glow from anything brighter than
  white, a roll-off for highlights that leaves the darks alone, the
  segment's colour grade, a vignette and grain. Scanlines stay in CSS so
  they cover the HUD too. A phone draws the scene at 1.5x, not 2x. VHS
  LOOK in Settings turns the tape down or off; Reduce Motion drops the
  tears.
- **Studio light** (`src/render/look.ts`): each segment's rig is relit
  with less flat ambient and more key, a sky-and-ground ambient with the
  floor's bounce colour, and a falloff that darkens the set behind the
  fight, at the sides and up high, so the fighters read first. The set
  takes baked occlusion, light maps and emission from the art as it lands
  (docs/BLENDER-TODO.md, step 23). Haze, beams from the set's own lamps
  and drifting dust (`src/render/atmosphere.ts`) give the air depth.
- **The title** is the attract mode on the TV in a living room at 3:33
  a.m., seen from the sofa (lit by the screen and a streetlight through the
  blinds); starting a match pushes in through the glass.
- **The studio round the fight:** camera kit at the edges of the frame in
  silhouette, and bleachers in the dark past the walls, where in Arcade the
  fighters you've beaten sit and watch (the deal).
- Commercial breaks between rounds show fake ads for the stage's world (a
  mattress store, a hotline, a toy) for 4 seconds while the set changes.

### Audio

- **Recordings take over from the synth** (`docs/AUDIO-TODO.md`): every
  fighter's voice (efforts, shouts, pain, the K.O., win lines, the cold
  open's lines) and the hits' layers (snap, thud, crunch, boom; props;
  blocks, bodyfalls, whooshes) have slots for recorded takes. A slot with
  none keeps its synthesised sound, so recordings can arrive one at a time;
  takes never repeat back to back. About 2 MB for the lot, as AAC.
- An announcer for the channel (round calls, fighter names, "Stay tuned"),
  a laugh track and applause that react at the wrong moments.
- Music per show in the style of its era: synth news themes, aerobics pop, a
  jingle for the children's show, an organ for the televangelist. Made with
  Web Audio like Curbside's radio, so no big audio files.
- **Fighter voices**, synthesised too (a buzz at each fighter's pitch shaped
  into vowels by formant filters): an effort on heavy attacks, a shout on
  every special and throw, a cry when hit that grows with the hit's weight,
  an "oof" hitting the floor, a scream on a KO. One voice per fighter, and a
  cooldown so a combo isn't a wall of grunts (heavy hits and KOs always get
  through). Each has a profile: Hollis deep and rough, Rox high and
  breathy, Gideon with a preacher's vibrato, Mumbles squeaky with a jaw
  that clacks. NO ANNOUNCER mutes only the announcer.
- **On iPhone** the game plays through the silent switch (as a game should;
  it pauses other apps' music while it plays), and audio starts on the
  first tap's release, which is when iOS allows it.

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
| Boosted special | Double-tap Special, or Special then tap the meter (1 bar); in a combo both can come before the special starts | O O | RT RT |
| Throw | Small button beside Block | U + J | LB |
| Interact with the stage | Button that appears only near an object | ; | LT |
| Tape Skip / Cut Away | Tap the meter (Cut Away when being hit) | Space | Y + B |
| Technical Difficulties | Button that appears below 30% health | Block + Special | RB + RT |

### Input rules

- 8-frame input buffer; a special entered during a string's cancel window
  comes out on the first allowed frame.
- Touch buttons are 56 points or larger, inside the safe areas, and can be
  moved and resized in Settings. They hide while a gamepad plays player 1
  (SCREEN BUTTONS: NOT WITH A PAD, or ALWAYS); in VS PLAYER a single pad is
  player 2's, so player 1 keeps the screen.
- The touch buttons never hide the fight: while they're up the camera frames
  the fighters beside them, looking past the wall on the buttons' side by as
  much as they cover (so every set needs scenery a few metres past its walls,
  and foreground kit on that side gives way), and a button with a fighter
  behind it fades.
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

**Health is the balance between styles (0.50.0):** Dale 990, Gideon
970, Hollis 980, Gus 960, Margaret 820, Mumbles 740, Rox 660. The fast
fighters who convert hardest have the least to lose (Rox's routes reach
the design's 30% from a 6-frame jab). Combos are measured as a share of
1000 health whoever the dummy is, so health can change without moving
the ceilings.

**Balance is measured.** `npm run combos` holds every fighter's combos
between the floor and the ceilings above. `npm run matchups` plays the
CPU against itself over every pair (100 seeds each, studio rules, the
stages in turn) and writes `docs/MATCHUPS.md`: win rates, round length
and time-outs, damage by source, how often each mechanic is used and
each fighter's most damaging moves. It fails on a matchup worse than
30:70, rounds averaging under 25 or over 50 seconds, or more than 10% of
rounds timing out. The CPU isn't the truth about a matchup, but the
bench catches a fighter falling off a cliff after a change.

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
- **Performance overlay** (Settings → PERFORMANCE, or the ` key): frame
  rate, mean and worst frame time, simulation steps a second, draw calls
  against the budget, triangles, shaders and the drawing size.
- With only two fighters on screen the budget is easier than Curbside's:
  under 100 draw calls on the iPhone profile, a fixed light setup per
  segment, and every shader compiled during loading (hidden objects
  included). The picture's passes are about 9 draw calls; each fighter's
  outline, floor reflection and (on Burn) mirror reflection are one more
  per mesh, and the echoes only draw while they show.

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
      practice:** seven fighters (Margaret Okafor joined in 0.15.0, Chef Gus
      Lamarre in 0.18.0, Rev. Gideon Price in 0.19.0) and four
      stages are in.
- [x] Who makes the character art? **Blender**, scripted headless
      (docs/BLENDER-TODO.md), in a stylised low-poly look.
- [x] Should SIGN-OFF reference Curbside's city? **Yes, as news and a TV
      cameo:** Channel 0 broadcasts to Curbside's city, years before
      Curbside. The News stage's ticker carries its 1987 local news
      (Cobble Row, Glass Heights, Councillor Lull's first call for a quieter
      city), and Master Control's monitors will show Curbside footage. No
      guest fighter or stage.
