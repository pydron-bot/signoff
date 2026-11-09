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
once the pilot plays well.

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

## The rest (after the pilot)

Short notes to build from, from the roster review:

- **Dale (zoner):** keep-away. The longest pokes, step-backs, an angled
  anti-air instead of a launcher, fewer strings that cancel into Cold Front.
- **Mister Mumbles (trickster):** wrong. Limbs bend the wrong way, he
  ducks under highs, hops over lows, switches sides mid-string, jerks on his
  strings; floppy follow-through.
- **Margaret (footsies):** precise. The least movement of anyone, perfect
  posture, the best frame data, a disjointed script slash; strikes start
  and stop dead.
- **Gus (mid-range):** the kitchen. Every normal a utensil, wide arcs, long
  recovery, the longest disjointed reach.
- **Gideon (all-rounder):** the sermon. Theatrical, two-beat call and
  response hits, laying on hands, arms flung wide.
