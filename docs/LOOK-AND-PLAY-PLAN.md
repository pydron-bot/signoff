# SIGN-OFF — Look and play: a plan

Nov 14, 2026 · releases A to F approved (G and H not); the rest of this
page is the proposal as reviewed.

**Status.** A, Clear Picture: built, 0.61.0 on `look/clear-picture`.
B, Fair Fights: built, 0.62.0 on `play/fair-fights` (which holds A too).
C to F: in progress. Nothing is on `main` yet. Where the build differs
from the proposal: the openings-to-win band is 8 to 11.5 as the bench
counts openings (not 3.5 to 5) and is reported, not an alarm; the round
clock stays at 60 seconds; counter hits were left alone (they were never
rare: the old figure counted something else); E and F do need a little
Blender after all (BLENDER-TODO steps 33 and 34).

How to make the game better to look at and better to play, in the order
worth doing. It sits beside `docs/VISUALS.md` (the impact pass, mostly
done) and `docs/COMPETITIVE-PLAN.md` (features 1 to 4 done, online open)
and doesn't repeat them: it picks up what they left open and adds what
they didn't cover. Decisions already taken stay taken: the faceted
low-poly style (BLENDER-TODO step 21), living arenas instead of assists,
the tape look, the iPhone budget.

## The short version

The fight underneath is in good shape: the systems are complete, the
tests and both benches pass, and the sets and the cast have a look of
their own. Three things hold it back.

1. **The picture buries the fighters.** The models read well in the art
   viewer and worse in the game, where the tape, the echoes and the signal
   damage all land on them at once. The worst case is the game's biggest
   moment: Technical Difficulties cuts to a close-up of a face that is
   mostly snow.
2. **There is no game round the fight.** Fighters are picked from a text
   row in a fourteen-row menu; there is no fighter select, versus card,
   stage select or results screen, one typeface (the system's monospace)
   and no portraits.
3. **The balance leans on health, and the arenas and five of the seven
   fighters haven't had their depth pass.** Health runs from 660 to 990;
   only Rox and Hollis have a style of their own; nothing a player can use
   exists after a stage's first segment.

Eight releases, alternating look and play, each from its own branch with
a preview, as the last passes shipped:

| | Release (branch) | What the player gets | Size | Blender |
| --- | --- | --- | --- | --- |
| A | Clear Picture (`look/clear-picture`) | Fighters read through the tape; effects take turns; the TD close-up shows a face | Small to medium | No |
| B | Fair Fights (`play/fair-fights`) | Health in a narrower band, a bench that measures what a hit is worth, jumps by weight | Medium | Jump clips only |
| C | Tonight's Line-Up (`look/line-up`) | Fighter select, versus card, stage select, results; type, portraits and a HUD that shows the meter | Large | No |
| D | The Rest of the Cast (`play/styles-2`, three parts) | Styles for Dale, Margaret, Gus, Gideon and Mumbles | Large | Yes |
| E | The Set Answers (`look/set-answers`) | Sets shake, lamps swing, floors crack; the fighters look alive | Small to medium | No |
| F | Home Advantage (`play/home-advantage`) | Something to use in every segment, fighter tie-ins, live interruptions | Medium to large | A few props |
| G | Stay Tuned (`play/stay-tuned`) | A first-run path, a boss, Telethon, tonight's listings, colours to earn | Large | No |
| H | Later | Test Pattern, two stages, the Programme Director, story, online | | Yes |

A and B are the two I'd start with whatever else changes: A is the most
look for the least work and fixes a real fault, and B builds the
measurements every later gameplay change is judged by.

## What I looked at, and what I couldn't

- Every doc in `docs/`, the bench reports as they stand at 0.60.1
  (`MATCHUPS.md`, `COMBOS.md`), and the code under `src/render`, `src/ui`,
  `src/sim`, `src/ai` and `blender/`.
- Fresh captures of the built game: four CPU VS CPU matches at DIRECTOR,
  one a stage, about twenty frames each; the title on the desktop and
  iPhone 15 Pro profiles (`smoke-out/`); all seven models in the viewer,
  three-quarter and face views.
- The tests: 1,126 pass at HEAD (34 skipped: the gated benches).

**Limits.** The captures ran in headless Chromium on software GL at about
four frames a second, so I judged stills, not motion. I heard nothing and
nothing ran on a phone. Everything below about *feel* (timing, weight,
sound) comes from the data and the code and needs a play test; I say so
where it matters. Blender isn't in this environment either (see
*Decisions*).

## Findings: look

**L1. The fighters are better than the game shows them.** In the viewer
(plain light, no tape) all seven have clear silhouettes, readable faces
and costume detail: Dale's check jacket, Rox's headband lettering,
Margaret's pinstripe. In a fight they are 200 to 300 pixels tall and the
tape's colour smear, the scanlines and the grain take most of that
detail off. The set suffers less, because it is big flat shapes.

**L2. Effects stack; they don't take turns.** Signal damage, echoes, the
tape's colour split and the hit flash each make sense alone. Together, on
a fighter below a third of their health, there is more effect than
fighter. Two of the four captured matches reached Technical Difficulties,
and both times the cut-in's close-up was unreadable: a band of static
with cyan and magenta ghosts where the face should be. That isn't bad
luck: TD is only available under 30% health, which is exactly when signal
damage is heaviest. The cut-in also sits over the CH 0 bug and the end of
the health bar.

**L3. Echoes are tied to the display, not the simulation.**
`src/render/echo.ts` keeps its history and lags (3 and 6) in *rendered*
frames, so the trail is half as long at 120 Hz and longer whenever frames
drop. (My captures exaggerate it for that reason.) They also show for the
whole of every special, moving or not, in additive colour past white.

**L4. No screens between the title and the fight.** The title is fourteen
rows in one list (fifteen once a replay is kept): seven modes, the move list, settings, then both
fighters, the stage, the CPU level and the rules as `‹ value ›` rows. At
1280×720 the logo is cut off at the top and the last rows run off the
bottom; on the phone the two columns cover the TV the title is built
round. A match ends on a menu headed `DALE STORM WINS`. There is no
fighter select, no versus card, no stage preview, no results.

**L5. One typeface.** Everything is `ui-monospace`: the logo, the HUD,
the menus, the captions. It reads as a debug overlay more than as a 1987
broadcast, and it is the cheapest thing on this list to change.

**L6. The HUD hides the meter.** Signal is the game's main resource and
its smallest element: three 46×9 pixel cells in the bottom corner, dim
when empty. On touch, tapping the meter is Tape Skip and Cut Away, and
its target is about 150×21 points against the design's own rule of 56.
The combo counter is plain yellow text. Nothing on the HUD shows a face.

**L7. Art is delivered that the game doesn't use.** BLENDER-TODO step 29
shipped `shake_*` and `swing_*` nodes on every set, and `fx_crack` and
`fx_impact_ring` in Dale's GLB. Nothing in `src/` refers to any of them.
`VISUALS.md` sections 5 to 7 (the set answers, per-stage dressing, the
hit-side rim) are still proposals.

**L8. Clips cut, they never blend.** `FighterModel.pose` stops one action
and starts the next. That is right for moves (the pose must match the
boxes) but it also means idle to walk, landing, and getting up all pop.
There is also no life on top of the clips: no head turned to the
opponent, no blink, no change of face as a round goes badly.

**L9. A mirror match is two identical fighters.** There is one colour
per fighter (`src/core/fighterLook.ts`) and no second costume.

**L10. Grounding.** Each fighter has a soft blob for a shadow. The floor
is the lower third of the frame and on Weather and the News it is bare.
On Kitchen Live, Gus's whites and Gideon's pale suit sit on cream tile
and a white counter; the outline does most of the work there.

## Findings: play

Numbers are from `docs/MATCHUPS.md` (the CPU against itself, 12,456
rounds at hard, studio rules) unless said otherwise. They are the CPU's
results, not people's.

**P1. Health carries the balance.** Dale 990, Hollis 980, Gus 940,
Gideon 940, Margaret 820, Mumbles 740, Rox 660: a 50% spread, where most
fighters of this kind keep within 10 to 15%. It was 0.50.0's way through
the bench and it works on paper, but it makes Rox and Mumbles fights
short and swingy: a one-bar combo (35 to 42% of 1000) is 53 to 63% of
Rox's bar and 35 to 42% of Dale's. Rox loses a round in two openings and
Dale in three or four. (`DESIGN.md` still says Gus 960 and Gideon 970.)

**P2. Several matchups sit at the alarm.** At DIRECTOR: Margaret 70:31
over Rox, Margaret 68 over Mumbles, Gideon 68 over Mumbles, Dale 67 over
Margaret, Gus 67 over Gideon, Gus 66 over Margaret. The bench's limit is
30:70, so one data change tips them over.

**P3. The first hit is worth a lot.** It wins the round 61% of the time
and pays a whole bar. Some of that 61% is natural (a lead is a lead);
how much is the bonus isn't measured.

**P4. Some systems hardly happen.** Per round: counter hits 0.12, Cut
Away 0.08, reversals 0.04, guard crushes 0.02. A counter hit has its own
freeze, flash, light and callout and shows up once in eight rounds. This
may be the CPU not fishing for them; the bench doesn't say, and there is
no human data.

**P5. Two of seven fighters have a style.** `docs/STYLES.md` piloted Rox
and Hollis in 0.37.0 and wrote notes for the rest. Dale, Margaret, Gus,
Gideon and Mumbles still share the same button grid with the numbers
nudged, which is what `docs/ROSTER-REVIEW.md` found.

**P6. The arena stops giving after segment 1.** The pillar is "every
round is a new broadcast". There are six interactables in the game and
all six are in a first segment. Segments 2 and 3 each bring a hazard, a
rule or both, to be avoided rather than used. Fighter tie-ins and live
interruptions, both in the design, aren't built. The bench only runs
studio rules, so nothing measures what hazards do to a matchup.

**P7. Jumps are nearly the same for everyone** (jump speed 0.18 to 0.22),
the roster review's open item. Walk and dash speeds do differ.

**P8. Solo play is one ladder.** Arcade is six fights and an ending. The
last fight is the DIRECTOR's CPU in an ordinary fighter; there is no
boss. What can be earned is trial ticks and the hidden Cancellations.
There are no records, no second mode and nothing that changes from one
night to the next.

**P9. Nothing meets a new player.** Twelve lessons and a combo school
exist and are good, but the first screen is fourteen rows and nothing
points at LESSONS. After a loss the game offers REMATCH.

**P10. Time-outs are at 8%** with a 60-second clock, near the bench's
10% alarm. The report doesn't say which matchups they come from.

## A. Clear Picture

*The fighter always wins the frame. No new art.*

1. **Effects take turns.** A small pure module (`src/render/legible.ts`)
   reads what is active each step (cut-in, TD's cinematic, a finisher,
   each fighter's wear, the echo amount, an impact frame) and returns a
   scale for each effect. Rules to start from: no echoes during a cut-in
   or a finisher; echoes halved once a fighter's wear passes 0.5; a
   fighter who is attacking, in a cut-in or in a finisher has the snow
   bands held back (the dulling stays). The cut-in's second camera draws
   its fighter with wear capped and no echoes, so the close-up is a face.
   Move the cut-in band clear of the station bug. Tests in
   `tests/legible.test.ts`: the table, and that TD's cut-in always gets a
   readable fighter whatever the health.
2. **Echoes step with the simulation.** History pushed in `Arena.step`,
   lags in sim frames: the same trail at 60, 120 and 144 Hz and when
   frames drop. Shown while the fighter is actually moving fast and for
   the first few frames of a special, not all of it. Test: the same
   inputs give the same echo poses at any render rate.
3. **The tape spares the fighters a little.** The fighters' shader writes
   a mask into the scene buffer's alpha (the set writes 0); the composite
   scales the colour smear and the grain down where the mask is set,
   start at 40% less. No extra pass and no extra draw call. The tears,
   the split on big hits and the scanlines stay over everything, so it
   still looks like one tape. VHS LOOK works as now.
4. **Fighters against the set, measured.** A tool (`tools/readability.mjs`,
   like `art-check.mjs`) stands every fighter in every segment and
   reports the difference in brightness between the fighter and the band
   of set behind them. Fix what fails with what exists: `setDim`, the
   falloff behind the fight, the rim's strength per segment. Kitchen
   Live's first segment with Gus and Gideon, and Weather with Dale, are
   the ones I expect to fail.
5. **Hit-side rim and a fresnel glow on armour and boosts** (`VISUALS.md`
   section 5, as written there).
6. **A real shadow.** Replace the blob with the fighter's silhouette
   flattened onto the floor away from the key light, built like the
   floor reflection (`meshCopies.ts`): one more draw call a mesh, 3 to 7
   a fighter. Keep it only if the perf overlay stays under 100 on the
   worst segment (Burn, with mirrors); otherwise sharpen the blob into
   two foot shadows.
7. **Blends between states.** A three-frame cross-fade when the clip
   changes between state clips (idle, walks, crouch, landing, getup to
   idle) and out of a move's last recovery frames. Never across startup
   or active frames: a test checks that on those the pose is the clip's
   alone, so boxes and pose still match.
8. **The launcher tilt-up** (`VISUALS.md` section 3, the one camera item
   left).

**Budget.** Items 1 to 5, 7 and 8: no draw calls. Item 6: up to 14,
gated. **Cost.** Small to medium; `src/render/` only.

## B. Fair Fights

*Find out what a hit is worth, then stop leaning on health.*

1. **The bench learns more** (`tests/matchups.test.ts`, the report):
   - *Openings to win a round*, per fighter and per pair: health over the
     average damage of an opening that hits. The aim is a band (say 3.5
     to 5) that every pair sits in.
   - *Comebacks:* rounds won from under 30% health; matches won after
     losing round 1.
   - *The first hit's worth:* the same seeds with the bonus at a bar, half
     a bar and nothing.
   - *Time-outs by matchup*, and time spent at each range.
   - *A second pass under LIVE BROADCAST rules:* the share of damage that
     comes from hazards and props, and how far a matchup moves from its
     studio result.
   - Counters, reversals and guard crushes by CPU level, to tell "the CPU
     doesn't try" from "it doesn't happen".
2. **Health into a band.** Bring everyone inside about 850 to 1050
   (Rox and Mumbles up most, the heavies up a little or left), and pay
   for it where each fighter is strong: route damage, plus frames, the
   one or two moves that carry them (Rox's Leg Warmer Lariat is 21% of
   her damage). Combos are measured against 1000 whoever the dummy is, so
   the ceilings in `npm run combos` don't move. Accept when the bench
   passes and openings-to-win is inside the band for every pair; then
   tighten the bench's alarm from 30:70 to 35:65.
3. **The first-hit bonus** set from the measurement in 1: the smallest
   bonus that keeps the average round inside 25 to 50 seconds.
4. **Jumps by weight.** Mumbles floaty, Hollis and Gus heavy, Rox quick
   and low. Sim data and tests; the jump clips are state clips, so this
   is the one piece of art in B (stand-ins until they land, as
   `ART_PENDING` works now).
5. **Counter hits, if the numbers say so.** Only after 1: if people and
   the CPU both rarely see one, make the heavy counter matter (a longer
   stagger that allows a link, as Hollis's knee does) rather than
   dressing up something that never happens.

**Tests.** The bench's new columns each have a unit test over a fixed
seed. **Cost.** Medium. No presentation changes but the jump clips.

## C. Tonight's Line-Up

*The game round the fight, in the channel's own graphics.*

1. **Type.** Three faces, bundled as subset woff2 (about 50 KB in all,
   precached): a heavy condensed sans for names and round calls, the kind
   a 1987 caption generator had; a rounded display face for the logo and
   show titles; a pixel face for the set's own displays (the clock, CH 0,
   REW). See *Decisions* for bundling open-licence faces against drawing
   our own.
2. **The title.** Five rows beside the TV, not over it: FIGHT (Arcade,
   VS CPU, VS Player), LEARN (Lessons, Combo School, Training, Move
   List), WATCH (CPU VS CPU, the last replay), SETTINGS. Fighters, stage,
   level and rules leave the title for the screens below. The logo fits
   16:9 at 720 lines. `main.ts` is 1,222 lines against its own rule; the
   screens move to `src/ui/screens/` and `main.ts` goes back to wiring.
3. **Fighter select: the dial.** Seven channels on the living-room TV.
   Turning the dial changes channel with the static and click the endless
   mode already has, and each channel is that fighter live on their own
   set, playing their intro. Beside it: the name and show on a caption
   plate, the style in a line, bars for health, speed, reach and
   difficulty worked out from the move data (a test keeps them honest),
   trials cleared. Both players pick, each with their own device. The
   stage (a still of each segment, rendered by a tool), the CPU level and
   the rules follow on the same screen.
4. **Portraits.** `tools/portraits.mjs` renders each fighter's face from
   the viewer (neutral, hurt, winning) to small webp files. Used on the
   HUD plates, the select screen, the versus card and the arcade
   schedule.
5. **The versus card.** Two seconds before the cold open: both faces
   split across the screen in colour bars, "TONIGHT ON CHANNEL 0", the
   show's name. Any button skips.
6. **Results.** The winner's pose in close-up with their line, then the
   night's figures from the match's events: damage, best combo, first
   hits, flawless blocks, punishes, time. REMATCH, CHANGE FIGHTERS,
   WATCH REPLAY, TITLE.
7. **The HUD.**
   - The meter moves up under each health bar, three times the size,
     with a tag when a spend is ready (BOOST, SKIP, CUT AWAY).
   - On touch, a METER button of its own at 56 points; the bar stays
     tappable.
   - The combo counter grows with the hits and takes the weight of the
     last one; the callouts (FLAWLESS, PUNISH, COUNTER, DUCKED, REVERSAL)
     get one slot a side and queue.
   - The clock turns urgent under ten seconds; round pips become ON AIR
     lamps.
8. **Touch buttons** drawn as the keys of a TV remote, with a fist or a
   foot beside the letters, and a clear pressed state (iOS Safari has no
   vibration, so the picture has to say "pressed").

**Budget.** All HTML and CSS but the dial, which reuses the title's room
and the arena. **Tests.** The stat bars, the results' figures and the
screen flow are pure and unit tested; the smoke test walks title, select,
versus, fight, results. **Cost.** Large; 2 and 3 can ship before 5 to 8.

## D. The Rest of the Cast

*Finish what `docs/STYLES.md` started.* Five fighters, in three parts,
each a release: **Dale and Margaret** (the keep-away and the precise:
furthest apart of the five), **Gus and Gideon**, then **Mumbles** (the
one that needs the most new shapes). For each, exactly the pilot's method
and rules: shape, rhythm, space, properties, strings; data the engine
already supports; the fastest normal stays six frames; ceilings and the
meter floor hold; guides regenerated; changed clips tracked in
`ART_PENDING` and asked for in BLENDER-TODO.

Done after B so the new moves are tuned against health in its band and
judged by openings-to-win. Each part ends with the bench inside 35:65.

**Cost.** Large, and the only release here that can't ship complete
without Blender: until the clips land, changed moves play stand-ins.

## E. The Set Answers

*`VISUALS.md` sections 6 and 7, with the art that is already in the
GLBs, and some life in the fighters.*

1. **Sets shake and lamps swing.** Heavy hits and wall splats near a
   wall shake the `shake_*` nodes on that side; enders and splats set
   the `swing_*` lamps going, and the beams in `atmosphere.ts` follow. A
   damped spring a node, stepped with the sim, pure and tested
   (`src/render/setMotion.ts`). Off with Reduce Motion.
2. **Cracks, rings and scuffs.** `fx_crack` where a body meets the wall
   or bounces off the floor, fading over the round; `fx_impact_ring` in
   place of the generated ring; a dark scuff where a body lands. One
   pooled instanced mesh each.
3. **Per-stage answers:** rain across the lens in Weather's second
   segment, the mirrors flashing white on enders, the ticker glitching,
   sparks off the burners.
4. **The studio is working.** A tally light on whichever camera is
   "live"; crew silhouettes at the kit that turn to follow the fight;
   marks and cables on the bare floors of Weather and the News. The
   audience in Arcade leans in on enders.
5. **The fighters look alive.** After the clip is posed: the head turns
   a few degrees to keep the opponent in view (not during moves that own
   the head), a blink every few seconds, and the face follows the round
   (the `hurt` shape creeping in as health falls, `win` on a long combo).
   Presentation only, a few bone and shape writes a fighter.

**Budget.** About 4 draw calls while decals show, none at rest.
**Cost.** Small to medium. No Blender: every node and mesh exists.

## F. Home Advantage

*Make the arena something to play with, not only something to dodge.*

1. **Something to use in every segment.** Six more interactables, one
   for each second and third segment, from the existing `PropData`: a
   fire extinguisher in Grease Fire that puts the flare out for a cycle,
   a loose lamp to kick in Lights Out, a floating crate in the flood, the
   teleprompter cart in The Ticker, a shard to throw in Burnout, the
   wind-sock stand in the storm. Each does something the first segment's
   prop doesn't.
2. **Tie-ins.** The design asks for one per fighter per segment: 84.
   Start with one per fighter per stage, 28, as data: a marked spot,
   Interact, and one effect from a short list (call the hazard early at a
   place of your choosing, a prop only you can use, a little meter, your
   chip damage back). Dale in front of the green screen calls the
   lightning. The home stages first (Dale, Rox, Margaret, Gus), so
   Arcade's "on the opponent's own show" means something.
3. **Live interruptions** (LIVE BROADCAST only, as designed): once a
   round at a time shown on the clock: the Breaking News banner, the
   laugh track that slows both fighters for a second, the power cut.
   Deterministic and in the segment's data, so replays hold.
4. **The bench runs LIVE rules too** (from B): no hazard, prop or tie-in
   may be more than a set share of a matchup's damage, and no matchup may
   move more than ten points from its studio result.

**Cost.** Medium to large. Sim, data, the CPU (it should use and respect
the new props) and a few prop meshes; the loose set dressing
(`clutterData.ts`) can stand in for those.

## G. Stay Tuned

*A reason to open it tomorrow.*

1. **The first night.** On a first launch the title offers one thing:
   a three-minute guided fight that chains four lessons (move, hit,
   block, a special) into a round against the easy CPU. After any loss
   the results screen names one lesson from what happened ("thrown six
   times: BREAK A THROW"), counted from the match's events the way the
   CPU counts habits.
2. **A boss.** Arcade's last fight becomes *yourself, off air*: your own
   fighter in test-pattern colours with full signal damage, DIRECTOR's
   CPU, on a set with every segment's hazard running. It needs a palette
   and no new art, and it holds the slot until the Programme Director
   exists (H). A rival fight mid-ladder uses the pairings the cold open
   already has lines for.
3. **Colours.** Three palettes a fighter. The GLBs keep each part's flat
   colour as `COLOR_0`, so a palette can be a remap in the fighter shader
   with no second texture; if that looks wrong on the painted detail, the
   atlas is repainted in Blender. Player 2 in a mirror match gets the
   second one. The others are earned.
4. **Telethon** (survival): one health bar, opponents until it runs out,
   a little back between fights, a score to beat.
5. **Tonight's listings:** one fight a day from the date's seed: a
   pairing, a stage and a twist from the segment rules, the same for
   everyone, best result kept on the device. No server.
6. **A record** (`signoff.profile`): wins by fighter, best combo, arcade
   clears by level, what has been earned.
7. **Sets for VS PLAYER** (`COMPETITIVE-PLAN.md` 5c's local half): first
   to two or three, a running score, the loser may re-pick.

**Cost.** Large; each item ships alone.

## H. Later

In the design and still right, but content more than polish, and all of
it needs the art pipeline: **Test Pattern** (the eighth fighter), the
last two stages (**Mumbles' Toybox**, **Master Control**) and the
**Programme Director** as a real boss; then **story mode** and **online
rooms** (`COMPETITIVE-PLAN.md` feature 5, unchanged). Hollis and Gideon
have shows (*The Night Watch*, *The Hour of Power*) and no stage, and
the design's six doesn't include either: worth deciding before Toybox.

## How each release is judged

- `npm test`, `npm run build`, the smoke test; `npm run combos` and
  `npm run matchups` for anything that touches the sim.
- **A before-and-after sheet.** The capture script I used becomes
  `tools/shots.mjs`: fixed seeds, the same moments (a round start, a
  heavy hit, TD at low health, a KO) on every stage, on both profiles.
  Each look release attaches the two sheets.
- **The budget.** The smoke test reads the draw calls in its worst
  scripted frame and fails over 100, so effects can't creep.
- **A play test on the phone** from the branch preview, by you: I can't
  judge feel, sound or 60 frames a second from here. Each release lists
  the three things to try.

## Left out, and why

- **More detailed or smooth-shaded fighters.** Decided in step 21; A
  gets more from the models that exist.
- **Shadow maps, depth of field, screen-space anything.** The budget,
  and the tape hides them.
- **A simpler control scheme or auto-combos.** Specials are already a
  direction and a button; the gap for new players is knowing what to do
  (G1), not pressing it.
- **Assists, a second meter, new universal mechanics.** The systems are
  at Mortal Kombat 1's level already (`COMPETITIVE-PLAN.md`); what is
  missing is variety between fighters and between rounds.
- **More impact effects.** `VISUALS.md` did this, and L2 says the
  picture now needs fewer at once, not more.

## Decisions needed

1. **The order.** As above (A, B, C, D, E, F, G), or look first, or play
   first? A and B don't depend on each other.
2. **Health.** Narrow the band (my recommendation), or is 660 to 990
   meant as part of the styles? It was a deliberate choice in 0.50.0.
3. **The tape on the fighters.** Is sparing them part of the smear and
   grain acceptable, or must the whole picture be one tape?
4. **Type.** Bundle three open-licence faces (quick; I'd bring options
   to choose from), or draw our own pixel and caption faces (slower,
   nothing to license, fully in keeping)?
5. **Blender.** Releases B (jump clips), D and H need `npm run art`.
   This environment has no Blender; `bpy` 5.2 is on PyPI and may run the
   scripts headless, untested. Should I try that, or do the art builds
   stay on your machine?
6. **Tie-ins:** 28 (one per fighter per stage) to start, or hold out for
   the design's 84?
7. **The stand-in boss** ("yourself, off air"): wanted, or wait for the
   Programme Director?
8. **The first-hit bonus and the round clock** may change after B's
   measurements. Fine to tune, or are a full bar and 60 seconds fixed?
