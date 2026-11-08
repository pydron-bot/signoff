# SIGN-OFF — Roster and combo review

Nov 8, 2026 · game side. A review of the four fighters (Dale, Rox, Hollis,
Mumbles): are they different enough, normals included, and what are the
rules for strings, cancels and advantage? The frame data comes from the move
data. The combo results were measured in the simulation (each string and
cancel played point blank against a standing opponent), not worked out on
paper.

## Verdict

**Looks and specials: distinct.** Each fighter has their own silhouette,
and the specials do different jobs: Dale zones with projectiles, Rox rushes
in with multi-hit moves, Hollis grabs and has armour, Mumbles teleports and
has an unblockable. The CPU plays each to their style.

**Normals: not distinct.** All four use the same normals with the frame
numbers nudged: the same slots, the same jobs in each slot, the same string
shapes, and ranges and damage that don't follow the style. With the specials
taken away, the four play almost the same.

## Where the normals are the same

| | Dale (zoner) | Rox (rushdown) | Hollis (grappler) | Mumbles (trickster) |
| --- | --- | --- | --- | --- |
| Health | 830 | 1000 | 1050 | 1000 |
| Jab `s.FP`: startup, on block | 7f, +1 | 6f, +2 | 8f, +1 | 6f, +1 |
| Longest ground normal | `c.BK` 1.35 m, 12f | `c.BK` 1.20 m, 10f | `c.BK` 1.40 m, 14f | `c.BK` 1.25 m, 10f |
| `c.BP` | launcher, 9f | launcher, 8f | launcher, 11f | launcher, 8f |
| `c.BK` | low sweep, knockdown | low sweep, knockdown | low sweep, knockdown | low sweep, knockdown |
| Command normal | `f.BP` overhead, 20f | `f.FK` overhead, 16f | `f.BP` overhead, 22f | `b.BP` overhead, 18f |
| Hardest standing normal | `s.BK` 80 | `s.BK` 94 | `s.BK` 95 | `s.BK` **98** |
| Strings | 8 | 9 | 8 | 8 |

- **The same slots, the same jobs.** Every fighter has a 6–8f jab that's
  plus on block, an uppercut launcher on `c.BP`, a sweep on `c.BK`, a low
  poke on `c.FK`, one slow command overhead, and four jumping attacks that
  are all overheads with near-identical frames (startup 4–10, 5–8 active).
- **The same string shapes.** Each fighter has a jab string that ends in a
  knockdown, a string that ends on an overhead after two hits (Dale `FK BP`,
  Rox `FK FK BP`, Hollis `FK FK BP`, Mumbles `BP FK BP`), and a two-hit low
  string from `c.FP` or `c.FK`.
- **Range doesn't follow the style.** Every fighter's ground normals reach
  0.80–1.40 m. Dale, the zoner, reaches 1.35 m at most; Hollis, the
  grappler, reaches further at 1.40 m.
- **Damage doesn't follow the style.** The trickster has the hardest
  standing normal (Mumbles `s.BK` 98). The rushdown fighter, meant to do
  "low damage per hit", hits as hard as the grappler (Rox `s.BK` 94 vs
  Hollis 95; her sweep does 87, his 85). Mumbles is small and light but has
  as much health as Rox.
- **No normal uses the engine's special properties.** The engine supports
  armour, invulnerability, forward motion, multiple hits, pulls and armour
  break, but only specials use them. The only normals with anything extra
  are Rox's `j.BK` and Mumbles' `s.BK`, which also hit behind.
- **Plus frames don't follow the style.** Everyone's jab is +1 or +2 and
  every other normal is −2 to −7. Rox, the rushdown fighter, is no more plus
  than anyone else.

## Ideas to give each fighter's normals their own job

These are suggestions, not decisions. Each one is a data change plus tests;
the engine already supports all of them.

**Dale (zoner): reach and keep-away.**
- The longest pokes in the game: `s.BK` as an umbrella jab reaching about
  1.7 m (slow, around 14f, −6), and `s.FK` reaching 1.5 m.
- An anti-air normal angled up at 45° on `s.BP` instead of the `c.BP`
  launcher: zoners don't juggle. Make `c.BP` knock down.
- A `b.FK` step-back kick (backward motion) that makes space.
- Fewer, shorter strings (5 instead of 8), all two hits and all special
  cancellable into Cold Front. Lower damage up close.

**Rox (rushdown): short reach, always plus.**
- The shortest reach (0.75–1.0 m) but the most plus on block: jab +3,
  `s.FK` +1, and one string ender at +2 so her pressure keeps going.
- Normals that move forward: an `f.BP` lunge punch.
- Multi-hit normals: `s.BK` as a double kick.
- The longest string, a 5-hit "Full Routine" that branches low or overhead
  at hit 3.
- Lower damage per hit, as her design says: `s.BK` about 70, sweep about 70.

**Hollis (grappler): armour, links and grabs.**
- One-hit armour on `s.BK` Door Kick (frames 1–12), so it beats pokes.
- A string that ends in a grab (`FP FP` then Throw: "Cuff 'Em"). Today his
  command grab can't follow anything, because a fighter in hit or block
  stun can't be grabbed.
- More hitstun on his heavy normals (`s.BP` +6 on hit), so he's the one
  fighter with links: slow, but each confirm pays.
- The highest damage per hit and the most pushback on block, so he can't be
  jabbed out after every hit.

**Mumbles (trickster): odd heights and switching sides.**
- Normals that duck: `s.FP` and `s.FK` with low hurtboxes, so they go under
  high attacks.
- An `f.FK` cartwheel hop that's airborne (low attacks miss it).
- A string that switches sides partway through on his strings ("Now You See
  Me"), using the existing teleport.
- A long, weak `b.FP` string pull (the lasso's `pull` property) that drags
  them in.
- Lower damage per hit (`s.BK` 98 → about 70) and about 900 health, paid for
  with movement.

**Vary the shared slots too:** not everyone needs a `c.BP` launcher. Jumps
could differ (Mumbles floaty, Hollis heavy), and the air normals could too:
Dale's `j.BK` angled down, Mumbles' `j.FP` a pogo bounce.

## Combo strings and the rules for linking them

How it works today (`src/sim/fighter.ts` and `src/sim/combat.ts`, checked in
the simulation):

- **Strings are fixed chains.** Each move lists the button for the next step
  (`chain`). The next press is read from the frame after the last active
  frame for 7 frames (the cancel window); the 8-frame buffer means it can be
  pressed up to 8 frames early.
- **On hit, strings are true combos.** Played in the simulation, all 34
  strings connect without a gap on hit, except **Hollis's Clock Out** (`FK
  FK BP`): the defender is free for about 3 frames before the overhead. If
  that's meant as a mix-up, keep it and mark it; if not, cut 3 frames from
  the overhead's startup.
- **On block, advantage is checked.** A move is safe if it's −5 or better
  (the fastest punish is 6f). Strings marked safe are tested by playing them
  out.
- **Special cancels.** Inside the same window, any ground normal or string
  step can cancel into any special. Measured from `s.FP`, `c.FP` and `s.BP`:

  | Fighter | Combos from a normal | Doesn't |
  | --- | --- | --- |
  | Dale | Heat Lightning, Cold Front; Isobar Lasso from `s.BP` | Pressure Drop (too slow) |
  | Rox | Leg Warmer Lariat, Count of Eight; Star Jump from `s.BP` | Grapevine (doesn't hit) |
  | Hollis | Flashlight, Key Ring; Night Shift from `s.FP` / `s.BP` | Clocking In (stunned fighters can't be grabbed) |
  | Mumbles | **nothing** | Knock-Knock (too slow), the rest don't hit |

  Mumbles has no special that ends a combo, so his damage comes only from
  string enders and Tape Skip.
- **Cancels work on a whiff too.** Neither chains nor special cancels check
  that the move connected. For strings that's normal for this kind of
  fighter (a string is a commitment). For special cancels it means there's
  no reward for checking the hit first, and a whiffed normal can be cancelled
  into a safe special.
- **Specials don't cancel**, except into Tape Skip.
- **Tape Skip links strings together.** For 1 bar, any move can be cancelled
  into a 10-frame dash once its first active frame has passed (on hit, block
  or whiff). After `s.BP`, `s.BK` or `c.BP` it combos into a jab for every
  fighter, so string, Tape Skip, string is the way to put strings together,
  and it costs meter.
- **No links.** The best a ground normal gives on hit is +5 (jabs), and the
  fastest normal starts on frame 6, so nothing links on the ground. Jump-ins
  are +7 to +9 on hit and link into a jab.
- **Juggles.** Launchers (every `c.BP`, plus some string enders) open a
  juggle: up to 4 hits, each popping them a little; a knockdown ends it.
- **Scaling and counter hits.** Each further hit in a combo does 10% less,
  down to 30%. A counter hit adds 4 frames of hitstun and 4 of hitstop.

### Gaps worth deciding

1. **Special cancels on whiff:** allow them only when the move hit or was
   blocked (recommended), so checking the hit before cancelling is a skill.
   Strings can keep going on a whiff.
2. **Putting strings together:** keep Tape Skip as the paid way to do it
   (recommended). For a free way, give each fighter one or two normals with
   enough hitstun to link (Hollis first, as above).
3. **Mumbles' combo ender:** give him one special that combos from a normal,
   e.g. let the boosted Hand Puppet pop up and hit.
4. **Hollis's grab:** a string ending in a grab, or a move that leaves a
   1–2 frame gap built for a grab after it.
5. **Hollis's Clock Out gap:** intended or not?
6. **A move list in the game.** Players can't see strings, specials, frame
   data or finisher inputs anywhere in the game. Now that finishers exist,
   this matters most: a pause-menu page built from the fighter data.
