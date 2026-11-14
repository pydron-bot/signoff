# SIGN-OFF — Fighting styles

Nov 9, 2026 · Derek Ward

Every fighter's normals should look and play like nobody else's, as each
Mortal Kombat 1 character's do. Today they don't: all seven fill the same
button grid with the same jobs (`c.BP` an uppercut launcher, `c.BK` a sweep,
`f.BP` a slow overhead), the numbers only move about ±20%, and the art
builds every normal from one strike generator that maps each button to one
limb (front punch is always a lead-hand jab, aimed at the hitbox). See
`docs/ROSTER-REVIEW.md` for the audit.

**Pilot (0.37.0): Rox and Hollis**, the two furthest apart. The rest follow
in three parts (`docs/LOOK-AND-PLAY-PLAN.md`, D): **Dale and Margaret**
(0.63.0, art in `docs/BLENDER-TODO.md` step 35), **Gus and Gideon** (0.64.0,
step 36), then Mumbles.

## What makes a style

A fighter's style is five things, and each must differ from the others':

1. **Shape.** What their body does: the limbs and props they hit with, the
   silhouette of each strike, their stance and walk. A player should be
   able to name the fighter from a strike's silhouette alone.
2. **Rhythm.** How they move through a strike: wind-up, snap, follow
   through, settle. Hollis winds up long and follows through heavy; Rox
   snaps and is already moving to the next beat.
3. **Range and space.** Where they want to be and which way their normals
   carry them: forward, back, in place, pulling the opponent in.
4. **Properties.** What their normals do besides damage: multi-hit, armour,
   pull, guard crush, launch, low profile, plus or minus on block. Each
   fighter gets two or three of these on their *normals*, not only on
   specials.
5. **Strings.** How many, how long, and how they end: Rox's are long
   routines that branch; Hollis's are short and end in a grab.

## Rules (so it stays fair)

- **No new engine features for the pilot.** Everything below is data the
  simulation already supports (multi-hit, motion, armour, pull,
  guard crush, launch).
- **The tests still hold:** every move recovers; every string chains; a
  string marked safe measures safe; 8 to 12 strings each.
- **Damage ceilings still hold:** 33% with no meter, 42% with a bar, 52%
  with three (`npm run combos`). Guides are regenerated
  (`npm run combos:guides`).
- **The fastest normal stays 6 frames.** "Safe on block" is measured
  against it.
- **Changed clips are art debt, tracked.** A move whose timing changes
  plays a stand-in until its new clip lands (the game ignores a clip whose
  length no longer matches); `ART_PENDING` in `src/render/pose.ts` lists
  them, and `docs/BLENDER-TODO.md` step 25 asks for them.

## Rox Vega: the routine

*Closest range, most plus, always moving forward, legs before arms, many
small hits, the longest strings.*

| | Before | Now |
| --- | --- | --- |
| Shape | Generic jab, cross, front kick | Dance moves: claps, high kicks, splits; arms pump, legs do the damage |
| Rhythm | Same as everyone | Snappy: short wind-ups, quick recoveries, string steps on the beat |
| Space | Two moves carry her forward | Every string step steps in |
| Properties | One double kick | Two-hit claps (`s.BP`), a high kick that's an anti-air but whiffs on crouchers (`s.FK`), a sliding splits sweep (`c.BK`), jab +3 |
| Strings | 9, longest 4 hits | 11, longest 5: the **Full Routine** branches at the fourth hit into a low or an overhead |

## Hollis Bey: the night watch

*Close, slow and crushing: short reach, the most damage and stun per hit,
armour on his heavies, normals that pull you in, strings that end in a
grab, and links.*

| | Before | Now |
| --- | --- | --- |
| Shape | Generic jab, cross, front kick | A guard's body: collar grabs, knees, shoulder barges, the nightstick, a stiff arm |
| Rhythm | Same as everyone | Long wind-ups, heavy follow-through, settles slowly |
| Space | Stands and pokes | Pulls you in (the jab drags you to grab range), barges forward |
| Properties | Armour on Door Kick | Collar Grab pulls in (`s.FP`), a close Knee that links (`s.FK`), armoured Rising Clothesline (`c.BP`) and Shoulder Check (`f.BP`, which also barges forward), a Stiff Arm that crushes a guard (`f.FK`, slow) |
| Strings | 9, generic shapes, one grab | 8, short; two end in a grab (**Cuff 'Em**, **Frisk**) |

## Dale Storm: the forecast (0.63.0)

*Keep-away: the presenter at the map, unhurried, pointer and umbrella held
out at arm's length; the longest pokes, steps back, and strings that set
up the Cold Front.*

| | Before | Now |
| --- | --- | --- |
| Shape | Generic jab, cross, front kick, an umbrella jab | The presenter: a telescopic pointer, the umbrella held out like a pointer and thrust like a foil, a sweeping arm across the map |
| Rhythm | Same as everyone | Unhurried and smooth: small early wind-ups, the limb held out at full stretch through the active frames, a turn back to camera to settle |
| Space | One step-back kick | Backwards: a second step-back normal (`b.BP` Pointer), pokes that push them out (`s.FK`, `s.BK`), the longest reach in the game out of the step back |
| Properties | The longest poke | Disjointed reach: on `s.BK` (1.75 m) and `b.FK BK` (1.85 m) only his arm can be hit; long stun and little push on every string's second hit, so it holds them for the Cold Front |
| Strings | 8, two of them three hits | 8, all two hits: **Long-Range Forecast** (`b.FK BK`) new, **Front Moves In** now straight off the jab (`FP BK`); Scattered Showers and the old three-hit Front Moves In retired |

## Margaret Okafor: precision (0.63.0)

*Footsies: the least movement of anyone, perfect posture, strikes that
start and stop dead, the best frame data.*

| | Before | Now |
| --- | --- | --- |
| Shape | Generic jab, cross, front kick, a step-in kick | The anchor: shoulders level and still, a rolled script slashed at chest height, a pointed shoe, a side kick from a dead stop |
| Rhythm | Same as everyone | No wind-up, a hard snap, no follow-through, a straight line back to stance |
| Space | Steps in (Field Report) | In place: the step-in kick is gone; she holds her ground at the tip of her pokes |
| Properties | Fast, safe normals | The best frame data: her pokes are level or near it on block (`s.BP`, `s.FK` 0; `c.FK` −1; `s.BK` −1 at 1.55 m), all her strings safe; the fastest long poke (`s.BK` Anchor Kick, 12 frames); a disjointed Script Slash (`f.FK`, 1.55 m, only the arm can be hit) |
| Strings | 8, one unsafe low | 8, Small Print now safe too |

## Chef Gus Lamarre: the kitchen (0.64.0)

*Mid-range: a utensil in every normal, wide arcs, long recoveries, and the
longest disjointed reach in the game.*

| | Before | Now |
| --- | --- | --- |
| Shape | Cleaver and pans, but swung like fists | A utensil in every normal, held long: skillet, cleaver, rolling pin, broom, whisk |
| Rhythm | Same as everyone | Wide and heavy: a big late wind-up, every swing an arc, carried right through |
| Space | The longest reach | Holds the tip of the cleaver: his reach is the utensil's, so whatever reaches for him meets the pan |
| Properties | Long, slow normals | Disjointed: on `s.BP`, `s.BK`, `c.FK`, `c.BK` and `b.BP` only his arm can be hit, never the utensil; a three-hit Whisk (`f.FK`, new) |
| Strings | 8 | 8, unchanged: recipes that end on a cleaver or a launch |

## Rev. Gideon Price: the sermon (0.64.0)

*All-rounder: theatrical, arms flung wide, call and response, laying on
hands.*

| | Before | Now |
| --- | --- | --- |
| Shape | Generic jab, cross, front kick | A preacher: the Good Book raised and brought down, palms, arms flung out to both sides |
| Rhythm | Same as everyone | Theatrical: the arm raised and held a beat (the call), then down (the response) |
| Space | Middle of the road | Draws them in: Come Forward (`f.FK`, new) pulls them to his sermon's range |
| Properties | None of his own | A two-beat Good Book (`s.BP`, two hits a beat apart); a Rapture flung wide (`c.BP` hits 0.5 m behind him too, an anti-air for a cross-up); a palm that pulls |
| Strings | 8 | 8, unchanged |

## The rest (after the pilot)

Short notes to build from, from the roster review:

- **Mister Mumbles (trickster):** wrong. Limbs bend the wrong way, he
  ducks under highs, hops over lows, switches sides mid-string, jerks on his
  strings; floppy follow-through.
