# SIGN-OFF — Competitive play: a plan

Nov 10, 2026 · a plan only: nothing here is built yet.

Five features that would make the fight deeper to play against people and
more fun to play alone, measured against Mortal Kombat 1. Each lists what is
there now, what to build, where it goes, how it is tested and what it costs.

## Where the game stands against MK1

| MK1 | SIGN-OFF today | Gap |
| --- | --- | --- |
| Kameo assists | Living arenas; Tape Skip does the assist's job (extend, make safe) | None, by design |
| Enhanced specials, 3 bars | Boosted specials, Signal meter | None |
| Breaker (full meter) | Cut Away | None |
| Fatal Blow under 30% | Technical Difficulties | None |
| Flawless Block, delayed wakeup | Flawless block, delayed getup, reversals, punish bonus | None |
| Air combos | Air strings, air specials, jump cancel | None |
| Fatalities, Brutalities, stage finishers, Friendship-style mercy | Sign-Offs, Cancellations, Stage Sign-Offs, Rerun | None |
| Highs that go over a croucher; throws that can be ducked | No `high` height: it happens by box size and differs by matchup | **Feature 1** |
| Dash cancelling (the wavedash) | A dash is 12 to 18 frames with no way out | **Feature 1** |
| Practice mode with recording, reversal settings; combo trials; tutorial | Stand, block, crouch or CPU dummy; boxes; advantage; WATCH for combos | **Feature 2** |
| A CPU that combos and punishes | It rarely combos (measured below) | **Feature 3** |
| Balance kept by data | Combo ceilings only (`npm run combos`) | **Feature 4** |
| Rollback online play | Local versus only | **Feature 5** |

The combat systems are already at MK1's level. What is missing is the
close-range guessing game, the tools to learn it, an opponent worth
learning it for (CPU first, then people), and a way to keep seven fighters
fair.

## What was measured

All from this checkout (0.45.0), in the simulation.

- **Heights by accident.** Standing jabs' boxes start 1.15 to 1.20 m up
  (Mumbles: 0.80 m); crouching fighters are 0.80 m (Mumbles) to 1.20 m
  (Hollis) tall. So Dale's jab goes over six crouchers and hits crouching
  Hollis; Mumbles' jab hits every croucher but himself; Hollis's goes over
  everyone. The move list calls all of them "mid".
- **Combos that depend on how the first hit landed.** A body hit while
  crouching stays in its crouching box as it reels. Played against a
  dummy holding Down, 2 of the 33 combo guides that don't open with a jab
  come apart: Gideon's "From a low" (the special goes over them) and Gus's
  "From your overhead" (it breaks into two combos).
- **Throws** start in 5 frames, reach 1.0 m, do 85 to 130, grab crouchers,
  and are broken by Throw within 10 frames of the grab.
- **Dashes** cover 1.26 to 1.40 m in 12 to 18 frames. `control()` has no
  case for `dash`, so nothing can be done until it ends.
- **The CPU, hard against hard:** 588 matches (every ordered pair, 12 seeds,
  studio rules), 1,459 rounds. 68% of its combos are one hit and 19% two;
  1.1% do 250 or more; the average is 78 damage, where the combo guides
  show 23 to 30% with no meter. It never used Tape Skip or a jump cancel
  and used Cut Away 0.03 times a round. Rounds average 39 seconds and 2%
  time out.
- **Matchups in that run** (small sample, and only as good as the CPU):
  Margaret lost all 24 matches against Gus and all 24 against Gideon (30%
  overall); Rox beat Hollis in 21 of 24; Rox and Gideon won 63% overall.
- **What a bar buys** (`docs/COMBOS.md`, human routes, 0 / 1 / 3 bars): Rox
  30.5 / 38.2 / 46.2%, Hollis 23.4 / 37.4 / 47.1, Mumbles 26.0 / 33.7 /
  49.6, Margaret 30.1 / 39.4 / 45.5, Gus 23.6 / 34.5 / 41.4, Dale 23.6 /
  38.7 / 38.8, Gideon 30.1 / 30.4 / 30.4. Dale's second and third bars and
  all of Gideon's add nothing to a combo.
- **Speed.** Those 588 matches, both CPUs included, ran in about 5 seconds:
  under 2 µs a step on this machine. Re-simulating 8 frames for rollback is
  cheap; the snapshot (`structuredClone`) is the cost.

## Order

1. The duck and the dash (small, simulation only; everything after is tuned on it).
2. Rehearsal: training tools, trials, lessons.
3. A CPU that plays the real game.
4. The balance bench (needs 3 for its numbers to mean much).
5. Online rooms with rollback (largest; needs a decision on a server).

Each ships as its own minor version from a `play/…` branch, with a
changelog entry, and can be played at its branch preview first.

---

## 1. The duck and the dash

*The close-range guessing game MK is built on, and the movement to get there.*

### 1a. Highs, mids and ducking

**Rule.** A new height, `high`. A high passes over any fighter who is
crouching: standing in a crouch, crouch-blocking, in crouching blockstun or
in a crouching move. A fighter reeling from a hit always counts as
standing, so a combo no longer depends on how its first hit landed (the two
guides above are fixed by this). A normal throw is a high too, but only a *neutral*
duck (crouching, Block not held) goes under it; crouch-blocking is still
thrown. Command grabs (Clocking In) and string grabs (Cuff 'Em, Frisk) are
not highs: that is the grappler's edge.

What it gives: the standing jab starts the strings and is the most plus,
but can be ducked and punished with the `c.BP` launcher; the crouching jab
can't be ducked but pays less. A ducked throw (28 frames) eats a launcher
with the punish bonus. Ducking loses to mids, lows and overheads, as the
ducker isn't blocking.

**Simulation.**
- `src/sim/types.ts`: `Height` gains `'high'`.
- `src/sim/combat.ts`: in `resolveHits`, a `high` hit is skipped when the
  defender is crouching (`d.crouching`); `blocks()` treats `high` as `mid`
  for a standing guard, and `hurtBox()` gives a fighter in hitstun the
  standing box. `throwable()` takes the throw data and returns false for a
  crouching fighter not holding Block unless the throw is marked
  `grabsCrouching` (command and string grabs).
- `src/sim/events.ts`: `{ type: 'ducked'; player; move }`, once a move, when
  a high or throw passes over them in its active frames. The HUD calls it
  out beside FLAWLESS, PUNISH and REVERSAL.
- Data (`src/sim/fighters/*.ts`): mark as `high` each fighter's standing jab
  and its string's first step, plus any move meant to sail over crouchers
  (Rox's High Kick). About 3 to 5 moves a fighter. Mumbles is the
  exception: his jab is thrown at 0.80 m and can't look like it goes over
  anyone, so it stays a mid, the small fighter's edge. No frame changes, so
  no clip changes and no art debt.

**Tests** (`tests/fighter-data.test.ts`, `tests/mechanics.test.ts`):
- Every `mid` touches every fighter's crouching box at point blank, and
  every `high` touches every standing fighter, Mumbles (1.30 m) included:
  no accidental highs are left. A high's box starts at 1.0 m or above, so
  it looks like it goes over.
- Every fighter has a mid of 8 frames or less (ducking is never free;
  today every crouching jab is one), and every fighter but Mumbles has a
  high jab.
- Every combo guide lands the same hits whether the dummy was standing or
  crouching when the opener hit (openers that are highs aside).
- A high whiffs on a crouch-blocker; a throw whiffs on a neutral duck and
  grabs a crouch-blocker; Clocking In grabs both.
- A ducked throw punished with `c.BP` raises `ducked` then `punish`.

**Presentation.** `src/game/moveList.ts`: `HEIGHT` gains `high`; strings
show it per hit. Training gets a DUCK dummy (Down, no Block).

**CPU.** Ducks when it reads throw range after a blocked jab (by level),
and checks a ducker with a mid.

**Tune after playing.** Throw damage may need to rise 10 to 15% now that
throws can be ducked.

### 1b. Dash cancelling

**Rule.** After `DASH_COMMIT` frames (start at 6) a forward dash can be
cancelled into Block (stops dead, guarding), a normal, a throw or a
special. Not into a jump or another dash: dash, Block, dash is the
wavedash. Backdashes stay committed. Tape Skip's dash is unchanged.

**Simulation.**
- `src/sim/constants.ts`: `DASH_COMMIT`.
- `src/sim/state.ts`: `dashFree: number` on `FighterState`, the frames until
  the dash can be cancelled. Tape Skip sets it past its own length, so
  combos are untouched.
- `src/sim/fighter.ts`: `control()` gets a `dash` case that runs
  `groundControl` without footwork once `dashFree` reaches 0.

**Tests.** Nothing cancels before the commit; Block on the first free frame
blocks a hit on the next; Tape Skip's dash can't be cancelled early;
`npm run combos` and `npm run combos:guides` give the same routes as
before.

**CPU.** Hard dashes in and blocks when it sees a wind-up.

**Cost.** Small. Both parts are a few dozen lines of simulation plus data
and tests. `docs/DESIGN.md` (Movement and defence, Attacks) is updated.

---

## 2. Rehearsal: training tools, trials and lessons

*A player who can practise a situation gets good; a player who gets good stays.*

### 2a. A dummy that does what an opponent does

New `src/game/dummy.ts` (pure, no DOM), replacing `Session.dummyInput()`:

- **Guard:** none, all, after the first hit, random (seeded), flawless.
  **Stance:** stand, crouch, duck.
- **Answer** after blocking, after being hit, and on getting up: nothing,
  jab, throw, reversal special, boosted special, jump, backdash, delayed
  getup. This is how a player finds out whether a string is really safe.
- **Meter and Cut Away:** the dummy's meter at 0, 1, 3 bars or refilling;
  it breaks combos when it can.
- **Record and play back:** take control of the dummy, record up to 10
  seconds into one of 3 slots (the replay's run-length format, directions
  stored relative to facing), then play it on a loop, on reset, or as its
  answer.
- **Save state:** Reset returns to a saved moment (one `saveMatch`), with
  presets: round start, midscreen, either wall.

### 2b. The frame meter

`src/game/frameMeter.ts` (pure): a strip of the last 80 steps for each
fighter, coloured startup, active, recovery, hitstun, blockstun, built
from `mode`, `moveFrame`, `startup` and `lastActive`. Drawn by the HUD in
Training only. It shows why a number is what it is, next to the advantage
readout that is there now.

### 2c. Trials

Every combo guide (five or six a fighter, about 40) becomes a challenge:
TRY beside WATCH in the move list.

- `src/game/trials.ts` (pure): a `TrialTracker` reads hit events and ticks a
  step when the guide's next move connects in the same combo; a drop
  resets. It reports the step that dropped and whether the press was early
  or late against the guide's timing.
- Trials regenerate with `npm run combos:guides`, so they never go stale
  after a move changes.
- Cleared trials are kept in `signoff.trials`, shown as ticks in the move
  list and a count on the fighter select.

### 2d. Lessons

About twelve drills, each a start state, a dummy script and a success test
over events, as data in `src/game/lessons.ts`: block high then low; anti-air;
punish a blocked sweep; flawless block; break a throw; duck a throw and
launch; delayed getup; boost a special; Tape Skip; Cut Away; Technical
Difficulties; a Sign-Off.

**Tests.** Every lesson ships with the inputs that solve it, and a test
plays them: a lesson that can't be completed fails the build, as a string
marked safe must measure safe. Dummy, tracker and frame meter are unit
tested without a DOM.

**Cost.** Medium. Mostly `src/game/` and `src/ui/`; the simulation is
untouched. No new art.

---

## 3. A CPU that plays the real game

*On a phone most fights are against the CPU. Today it pokes; it should fight.*

- **Confirm into a route.** New `src/ai/routes.ts`: when its opener hits
  (its own `contact`, which it may know), the CPU carries on with the
  matching combo guide from `COMBO_ROUTES` (from a jab, a low, an overhead,
  a punish, with a bar), press by press, and drops it if a step misses.
  Chance by level: easy never, normal about a third, hard most of the time.
- **Punish to scale.** Seeing a move recover, it picks the punish route if
  the frames left allow the launcher, else a jab string, else nothing.
- **Use the systems.** Tape Skip to make an unsafe ender safe or extend;
  Cut Away by judgement (a long combo, health at stake) not a dice roll a
  frame; jump cancels where the guide has them; ducking and dash-blocking
  from Feature 1; timed attacks on a getup, and respect for a delayed one.
- **Learn the player, from what it can see.** A few counters per match:
  what the player does after a blocked string (throw, press, block), on
  getting up, how often they jump or throw projectiles. The CPU shifts its
  odds towards the answer. Seeded, so replays still match, and nothing a
  player couldn't see is read: the rule holds.
- **A fourth level,** DIRECTOR: hard's reactions, nearly always converts,
  adapts fastest. The last Arcade fight uses it (`src/game/arcade.ts`).

**Tests** (`tests/cpu.test.ts`, new): over seeded matches, hard converts at
least half its opened hits into three or more; easy never does; a match
replays identically from its seed; the CPU's input is unchanged when only
hidden state differs.

**Cost.** Medium. `src/ai/` only. Guides are timed against a standing Rox,
so some routes will drop on other bodies; that reads as human, and Feature
4 reports how often.

---

## 4. The balance bench

*`npm run combos` keeps damage honest. This does the same for matchups.*

- **`npm run matchups`** (`tests/matchups.test.ts`, behind `MATCHUPS=1` like
  the combo search): every ordered pair, 100 seeds, hard and DIRECTOR,
  studio rules; about a minute. Writes `docs/MATCHUPS.md`: the win table,
  each fighter's overall rate, round length and time-outs, damage by source
  (normals, specials, projectiles, throws, chip, super), how often each
  mechanic is used, each move's share of use and damage (to spot a move
  that is the whole character), and how often the first hit wins the round.
- **Alarms, not law.** The run fails on a matchup worse than 30:70, an
  average round outside 25 to 50 seconds, or time-outs over 10%. CPU
  results aren't the truth about a matchup, but they catch a fighter
  falling off a cliff after a data change.
- **A floor for meter** in the combo search, beside the ceilings: each bar
  must add at least 4% to a fighter's best human route, or the fighter is
  listed as exempt with the reason. Today Dale and Gideon fail it. Likely
  fixes: a boosted special of Gideon's that relaunches (his big moves are
  paid in donations, so bars do nothing), and a second juggle-capable boost
  for Dale.
- **First pass with it:** Margaret (0 from 48 against Gus and Gideon in the
  sample), Rox against Hollis, and throw damage after Feature 1.

**Cost.** Small: one gated test file and a doc, plus the tuning it prompts.
`CLAUDE.md` gains the command.

---

## 5. Online rooms with rollback

*Competitive means people. The simulation was built for this; nothing in it has to change.*

### 5a. The rollback core (pure, testable, no network)

New `src/net/rollback.ts`:

- Input delay (2 frames by default, 1 to 4 in Settings), prediction (the
  last input repeats), rollback of up to 8 frames, and stalling a frame
  when one side runs ahead.
- **Snapshots without garbage.** `copyMatch(dst, src)` into a ring of
  preallocated states replaces `structuredClone` on this path (the
  codebase's rule: no allocation per frame in hot paths). `comboMoves`,
  `hazards` and `props` get fixed-capacity copies.
- **Desyncs are loud.** A checksum of the confirmed state every 30 frames
  is exchanged; a mismatch ends the match with SIGNAL LOST, never silently.
  The handshake compares game version and a hash of the fighter data.
- **Events under rollback.** Sparks and sounds fire on predicted frames (a
  mispredicted one just fades). Anything that can't be taken back (K.O.
  slow motion, round over, commercial break, finisher start, the censor
  cut) waits for the frame to be confirmed, usually 2 to 4 frames.

**Tests** (`tests/rollback.test.ts`): `copyMatch` equals `structuredClone`
across thousands of states from CPU matches; two rollback sessions joined
by a fake channel with seeded lag (0 to 200 ms), jitter, 5% loss and
reordering, driven by two CPUs, end with identical confirmed states and
checksums; confirmed-only events arrive once.

### 5b. Transport and rooms

- WebRTC data channel, unordered and unreliable; each packet carries the
  last 10 frames of input, the acknowledged frame and the checksum (about
  30 bytes, 60 a second).
- A room code: `deeek.org/signoff/?room=ABCD`. A tiny relay at
  play.deeek.org (as `docs/DESIGN.md` already expects) passes the handshake
  only, never game data, and hands out TURN credentials for phone networks
  that can't connect directly.

### 5c. The match around it

- Both pick at once, unseen; stage at random with **studio rules forced**
  (the design's rule for ranked play); first to two games, one-press
  rematch; ping and rollback frames in the performance overlay.
- A hidden tab on iOS is a suspended game: 3 seconds' grace, then a forfeit.
- Both sides keep the replay (confirmed inputs through the recorder that
  exists).
- Local VS PLAYER gets the same set flow: first to two or three, a running
  score, the loser may re-pick.

**Not in this plan:** matchmaking, a ranked ladder, spectating. Rooms first;
those only matter once people are playing.

**Cost.** Large. 5a is the bulk and needs no server, so it can be built and
proven in tests before any hosting decision. 5b needs the relay.

---

## Considered and left out

- **Kameo-style assists.** MK1's signature, but the design replaced them
  with living arenas on purpose, a third rigged body breaks the draw-call
  budget, the touch layout has no room for another button, and Tape Skip
  already does an assist's two jobs.
- **Up Block, directional throw breaks.** More to learn for little gain
  once ducking exists; one Throw button suits a touchscreen.
- **The eighth fighter (Test Pattern).** Good for variety, but it is art and
  content, not a system, and it is easier to balance with the bench built.
- **Stage tie-ins and live interruptions.** Fun and in the design, but
  studio rules turn them off, so they add nothing to competitive play.

## Decisions needed

1. **A relay server for online rooms** (play.deeek.org, with TURN): yes, and
   hosted where? 5a doesn't depend on the answer.
2. **Throws:** ducked only by a neutral duck (recommended), or by
   crouch-blocking too (weaker throws, stronger turtling)?
3. **Dale's and Gideon's meter:** is it meant to be worth nothing in a
   combo (they spend it in neutral), or should the floor apply to them?
4. **DIRECTOR** as a selectable level, or only the last Arcade fight?
