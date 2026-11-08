# SIGN-OFF — Blender TODO

Nov 8, 2026 · for a Claude instance (or person) working in Blender

This is the art hand-off for SIGN-OFF, a 2.5D fighting game in the browser
(three.js). The game is playable today with grey boxes; this file lists the
models, rig and animation clips it needs, and the rules they must follow to
drop in. Read `docs/DESIGN.md` first for the game, the cast and the tone.
`CLAUDE.md` has the codebase rules; nothing here asks you to touch game code.

> **Open decision:** the design doc hasn't settled the art style (hand-made
> Blender models as for Curbside, or a simpler stylised look to start).
> Start with **step 1** below (a blockout of one fighter and the rig), which
> is useful either way, and check with Derek before going to full detail.

## How the game uses the art

- **The simulation decides; art follows.** Every move is data: frame counts,
  hitboxes and hurtboxes live in `src/sim/fighters/*.ts`. The game plays
  each animation clip **by simulation frame number** (60 per second), not
  by clock time, so the pose on screen always matches the hitbox. A clip
  must have exactly the frame count listed below, and the striking limb
  must be where the hitbox is during the listed active frames.
- **Never change timing in Blender to suit the animation.** If a move needs
  different timing, note it in the Feedback section at the bottom; timing
  changes go through the move data and its tests.
- Fighters stand on a 2D plane: the 3D is for looks. Only the side view
  matters for gameplay, but the camera sits about 12 m in front, slightly
  above, so the front three-quarters is what players see most.

## Technical rules

| | |
| --- | --- |
| Format | glTF binary (`.glb`), one file per fighter, one for the stage |
| Units / axes | Metres. Blender defaults (Z up); export with glTF's +Y up. The character faces Blender −Y (front view); the game turns it to face its opponent |
| Origin | Between the feet, on the floor (z = 0) |
| Budget per fighter | About 20,000 triangles, 2 materials (body, and accessories/props) |
| Textures | Up to 2048² per material; we'll convert to KTX2 on our side. Keep texture count low |
| Skeleton | **One shared humanoid skeleton for all human fighters** (bone names identical) so clips can be retargeted. Mister Mumbles and Test Pattern may need their own later |
| Animation | 60 fps, one Action per clip, named exactly as the clip names below; no root motion baked into the hips for gameplay moves (the game moves the fighter); in-place clips |
| Files | `.blend` sources in `art/` (one per fighter, plus `art/rig.blend` and `art/stage-weather.blend`); exports to `public/assets/fighters/<id>.glb` and `public/assets/stages/weather.glb`. If a `.blend` grows past about 50 MB, say so before committing (we'd move them to Git LFS) |
| Draw calls | The whole scene must stay under 100 on iPhone: keep each fighter to its 2 materials and merge static set pieces by material |

Size each fighter to their hurtboxes, the grey boxes you see in the game
(width 0.6 m):

| Fighter | Standing height | Crouching height | Look (see DESIGN.md) |
| --- | --- | --- | --- |
| Dale Storm (`dale`) | 1.80 m | 1.10 m | Channel 0's weatherman, 1987: suit, wide tie, big smile, clicker or pointer |
| Rox Vega (`rox`) | 1.75 m | 1.05 m | Aerobics host, 1983 forever: leotard, leg warmers, headband, sweatband |

The broadcast look censors gore with static and stand-by cards, so no gore
assets are needed.

## The pipeline

The art is built by Python scripts run in headless Blender (5.2), like
Curbside's: `blender/build.py` drives `blender/lib/` (helpers, the rig) and
one module per fighter in `blender/fighters/`.

```sh
npm run art                  # all: art/rig.blend, art/dale.blend, public/assets/fighters/dale.glb
npm run art -- --only dale   # one target
npx -y -p playwright@1.63.0 node tools/art-check.mjs   # measures each GLB in three.js, screenshots to art-out/
npm test                     # tests/assets.test.ts checks every GLB against this file
```

**The scripts are the source for now:** a rebuild overwrites `art/*.blend`.
If the style moves to hand modelling, the `.blend` files become the source
and the scripts stop writing them (say which in this file).

The build fails if a strike misses: for each move it animates, the striking
limb's tip must be inside the hitbox (±4 cm) on every active frame. The
**art viewer** loads a GLB the way the game will, with the hurtbox and each
move's hitboxes drawn on their active frames:
http://hive1:5174/tools/viewer/?f=dale on the dev server (`npm run dev`),
or `?clip=s.FP&frame=7` to open a frame.

### The rig

Deform bones, the same in every human fighter (`blender/lib/rig.py`,
checked by `tests/assets.test.ts`). `.L` is the character's left (Blender
+X, as the character faces −Y):

| Bones | Parent |
| --- | --- |
| `root` (at the floor, between the feet) | — |
| `hips` → `spine` → `chest` → `neck` → `head` | `root` |
| `shoulder.L` → `upper_arm.L` → `forearm.L` → `hand.L` (and `.R`) | `chest` |
| `thigh.L` → `shin.L` → `foot.L` → `toe.L` (and `.R`) | `hips` |

Controls, not exported (the exporter bakes what they do into the bones
above): `ik_hand.L/R` and `ik_foot.L/R` (IK targets; the hand and foot copy
their rotation), `pole_elbow.L/R` and `pole_knee.L/R`. Rest pose is an A-pose
for 1.80 m; joints scale with each fighter's height. Keep `root` still in
gameplay clips (the game moves the fighter); it's there for knockdowns and
cinematics.

### Frames and clip lengths

- **Blender frame n is move frame n**, starting at 1, exactly as the table
  numbers them: `s.FP`'s active frames 7–8 are Blender frames 7 and 8. The
  export slides every clip to start at 0 s, so the game samples move frame
  n at (n − 1) / 60 s. A move of N frames is keyed 1…N (lasting (N − 1)/60 s).
- **A loop of N frames is keyed 1…N+1**, with frame N+1 equal to frame 1, so
  it lasts exactly N/60 s and wraps without a stutter.
- Each clip's Action has its manual frame range set to those frames.

### Facing

The game should **mirror** a fighter to face left (scale −1 along the
stage), not turn them round: stances are open toward the camera, so a turn
would show the camera their back. The viewer's FACING button does this. Clips
are authored facing right with the left foot and left hand leading.

## TODO

### 1. Rig and blockout (first)

- [x] Shared humanoid skeleton (`art/rig.blend`), with IK for feet and hands; bone names under *The rig* below
- [x] Dale Storm blockout at the sizes above, skinned to the rig (1,040 triangles, rigid parts in flat colours)
- [x] Test export of Dale as `public/assets/fighters/dale.glb` with the `idle` clip, plus `s.FP` to prove the hitbox check; checked in three.js at the right size and facing (`tools/viewer/`, below)
- [ ] Agree the style with Derek before detailing

### 2. Dale Storm

- [ ] Model and textures (≤ 20k triangles, 2 materials)
- [ ] State clips (table below)
- [ ] Move clips (generated table below), each matched to its active frames and hitbox
- [ ] Projectile visuals as separate small meshes in the same file: `fx_cold_front` (a rolling wall of wind, about 0.7 × 1.4 m) and `fx_hail` (a hailstone, about 0.6 × 0.5 m)

### 3. Rox Vega

- [ ] Model and textures
- [ ] State clips
- [ ] Move clips

### 4. Weather at Eleven (stage)

The arena runs from −6 m to +6 m; fighters start at ±1.5 m. Three segments,
one per round (DESIGN.md has the details):

- [ ] Segment 1, The Studio: studio floor, the weather-map wall behind (about 40 × 10 m at 4 m back), a green screen (4 × 3 m), studio flats at the walls (±6.4 m)
- [ ] Two camera dollies (0.9 × 1.0 × 0.7 m) at x = ±4.6 m: they get kicked and roll along the floor, so model them as separate objects (`prop_dolly_left`, `prop_dolly_right`)
- [ ] Segment 2, The Forecast Comes True: the same set in a storm (a darker light rig, papers blowing); a lightning bolt mesh (`fx_lightning`, about 8 m tall) and a floor scorch decal
- [ ] Segment 3, Flood Warning: knee-deep water plane (`fx_water`) at about 0.22 m, and two live puddles (1.6 m wide) at x = ±3 m with sparking cables
- [ ] Studio lighting suggestion per segment (the game uses a fixed light setup per segment; note the colours and angles you used)

### State clips (both fighters)

These aren't moves in the data; the game picks them from the fighter's state.
Loop where noted; lengths are suggestions unless given.

| Clip | Frames | Notes |
| --- | --- | --- |
| `idle` | 60, loop | Fighting stance |
| `walk_fwd`, `walk_back` | 40, loop | Dale walks 2.4 m/s forward, Rox 3.6 m/s: match foot speed |
| `crouch` | 6 | Into crouch; then `crouch_idle` (40, loop) |
| `block_stand`, `block_crouch` | 4, then hold | Guard up |
| `prejump` | 3 | Exactly 3 frames |
| `jump_up`, `jump_fall` | hold | Split at the apex; the jump lasts about 36 frames |
| `land` | 2 | Exactly 2 frames (4 after an air attack: `land_attack`) |
| `dash` | Dale 16, Rox 14 | Exactly these |
| `backdash` | Dale 20, Rox 18 | Exactly these |
| `hit_high`, `hit_low` | 12 | Played and held for however long the stun lasts |
| `launched` | hold | Airborne, spinning slightly |
| `down` | 30 | Lying on the floor; exactly 30 |
| `getup` | 20 | Exactly 20 |
| `thrown` | 24 | Being thrown (pairs with the thrower's `throw` hold) |
| `ko` | 90 | Falling and staying down |
| `win` | 120 | Victory pose |
| `intro` | 90 | Round intro |
| `td_cinematic` | 150 | Technical Difficulties: plays under a "PLEASE STAND BY" card, so only the first and last 20 frames are really seen |

### Move clips

One clip per move, named by its id. **Frames** is exact. During each
listed window of active frames, the striking limb should reach the hitbox:
x is forward from the fighter's centre, y is up from their feet. "Kind"
`air` clips are jump attacks (the game keeps the jump's motion), `special`
are the specials (`+` is the boosted version, which can share most of the
plain one), `interact` is kicking a stage prop.
<!-- clips:start (generated by `npm run docs:clips`; do not edit by hand) -->

#### Dale Storm (`dale`): 31 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Clipboard Jab | normal | stand | 18 | 7–8: x 0.20…0.95, y 1.15…1.45 (mid) |
| `s.BP` | Forecast Cross | normal | stand | 28 | 10–12: x 0.20…1.05, y 1.10…1.45 (mid) |
| `s.FK` | Front Kick | normal | stand | 26 | 9–11: x 0.20…1.20, y 0.60…0.95 (mid) |
| `s.BK` | Isotherm Kick | normal | stand | 35 | 13–15: x 0.20…1.30, y 0.90…1.30 (mid) |
| `c.FP` | Low Jab | normal | crouch | 17 | 7–8: x 0.20…0.90, y 0.70…0.95 (mid) |
| `c.BP` | Rising Umbrella | normal | crouch | 32 | 9–12: x 0.10…0.80, y 1.00…1.90 (mid) |
| `c.FK` | Shin Poke | normal | crouch | 23 | 8–9: x 0.20…1.25, y 0.00…0.30 (low) |
| `c.BK` | Ground Fog | normal | crouch | 38 | 12–14: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP` | Barometer Smash | normal | stand | 39 | 20–21: x 0.20…1.00, y 1.00…1.60 (overhead) |
| `j.FP` | Jumping Jab | air | air | 16 | 5–10: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Hammer | air | air | 17 | 7–11: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Knee | air | air | 19 | 6–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Boot | air | air | 22 | 9–14: x 0.10…1.00, y 0.10…0.60 (overhead) |
| `FP FP` | Five-Day Outlook | normal | stand | 21 | 8–9: x 0.20…1.15, y 1.10…1.45 (mid) |
| `FP FP BK` | Front Moves In | normal | stand | 34 | 12–14: x 0.20…1.35, y 0.70…1.20 (mid) |
| `FP BP` | Cloud Cover | normal | stand | 27 | 9–11: x 0.20…1.20, y 1.00…1.40 (mid) |
| `BP FK` | High Pressure | normal | stand | 30 | 10–12: x 0.20…1.30, y 0.50…0.90 (mid) |
| `BP FK FK` | Scattered Showers | normal | stand | 28 | 11–12: x 0.20…1.35, y 0.00…0.35 (low) |
| `FK BP` | Doppler | normal | stand | 33 | 16–17: x 0.20…1.20, y 1.00…1.60 (overhead) |
| `c.FP FK` | Ground Frost | normal | crouch | 30 | 9–10: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP BP` | Thunderhead | normal | stand | 32 | 12–14: x 0.20…1.25, y 0.90…1.40 (mid) |
| `Cold Front` | Cold Front | special | stand | 48 | 14: spawns projectile at x 0.50, y 0.00 |
| `Cold Front+` | Cold Front (boosted) | special | stand | 48 | 14: spawns projectile at x 0.50, y 0.00 |
| `Pressure Drop` | Pressure Drop | special | stand | 44 | 18: spawns projectile at x 2.20, y 3.00 |
| `Pressure Drop+` | Pressure Drop (boosted) | special | stand | 44 | 18: spawns projectile at x 1.60, y 3.00; 22: spawns projectile at x 2.40, y 3.00; 26: spawns projectile at x 3.20, y 3.00 |
| `Isobar Lasso` | Isobar Lasso | special | stand | 45 | 18–21: x 0.60…2.60, y 0.80…1.40 (mid) |
| `Isobar Lasso+` | Isobar Lasso (boosted) | special | stand | 45 | 18–21: x 0.60…2.60, y 0.80…1.40 (mid) |
| `Heat Lightning` | Heat Lightning | special | stand | 40 | 6–9: x 0.10…0.90, y 0.80…2.20 (mid) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.60, y 0.30…1.60 (mid) |

#### Rox Vega (`rox`): 33 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wake-Up Jab | normal | stand | 15 | 6–7: x 0.20…0.85, y 1.15…1.45 (mid) |
| `s.BP` | Power Punch | normal | stand | 21 | 8–9: x 0.20…0.95, y 1.05…1.40 (mid) |
| `s.FK` | Leg Lift | normal | stand | 21 | 7–9: x 0.20…1.05, y 0.55…0.90 (mid) |
| `s.BK` | Roundhouse Rep | normal | stand | 31 | 11–13: x 0.20…1.15, y 0.80…1.20 (mid) |
| `c.FP` | Crunch Jab | normal | crouch | 15 | 6–7: x 0.20…0.80, y 0.70…0.95 (mid) |
| `c.BP` | Star Jump Uppercut | normal | crouch | 28 | 8–10: x 0.10…0.75, y 1.00…1.80 (mid) |
| `c.FK` | Toe Tap | normal | crouch | 19 | 7–8: x 0.20…1.10, y 0.00…0.30 (low) |
| `c.BK` | Splits Sweep | normal | crouch | 34 | 10–12: x 0.20…1.20, y 0.00…0.30 (low) |
| `f.FK` | Step Touch | normal | stand | 31 | 16–17: x 0.20…1.00, y 1.00…1.50 (overhead) |
| `j.FP` | Jumping Jab | air | air | 14 | 4–9: x 0.10…0.75, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Elbow | air | air | 16 | 6–10: x 0.10…0.80, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Kick | air | air | 17 | 5–12: x 0.10…0.85, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Split | air | air | 19 | 7–12: x -0.60…0.95, y 0.10…0.60 (overhead) |
| `FP FP` | Warm-Up | normal | stand | 17 | 6–7: x 0.20…1.00, y 1.10…1.45 (mid) |
| `FP FP FK` | Reps | normal | stand | 24 | 8–10: x 0.20…1.15, y 0.55…0.90 (mid) |
| `FP FP FK BK` | Feel the Burn | normal | stand | 34 | 10–12: x 0.20…1.30, y 0.80…1.25 (mid) |
| `BP BP` | Jazzercise | normal | stand | 24 | 8–10: x 0.20…1.10, y 1.00…1.40 (mid) |
| `BP BP FK` | Low Impact | normal | stand | 26 | 9–10: x 0.20…1.25, y 0.00…0.35 (low) |
| `FK FK` | Kick Ball Change | normal | stand | 23 | 9–10: x 0.20…1.15, y 0.55…0.90 (mid) |
| `FK FK BP` | Step Up | normal | stand | 31 | 14–15: x 0.20…1.20, y 1.00…1.60 (overhead) |
| `c.FK FK` | Floor Work | normal | crouch | 22 | 7–8: x 0.20…1.20, y 0.00…0.30 (low) |
| `f.FK BK` | Cool-Down | normal | stand | 34 | 12–14: x 0.20…1.25, y 0.90…1.40 (mid) |
| `Grapevine` | Grapevine | special | stand | 28 | no hit |
| `Grapevine+` | Grapevine (boosted) | special | stand | 36 | 22–24: x -1.00…-0.10, y 0.50…1.30 (mid) |
| `Leg Warmer Lariat` | Leg Warmer Lariat | special | stand | 46 | 10–11: x -0.60…1.00, y 0.80…1.40 (mid); 16–17: x -0.60…1.00, y 0.80…1.40 (mid); 22–23: x -0.60…1.00, y 0.80…1.40 (mid) |
| `Leg Warmer Lariat+` | Leg Warmer Lariat (boosted) | special | stand | 46 | 10–11: x -0.60…1.00, y 0.80…1.40 (mid); 14–15: x -0.60…1.00, y 0.80…1.40 (mid); … 6 hits to 27 |
| `Count of Eight` | Count of Eight | special | stand | 47 | 9–10: x 0.20…1.10, y 0.40…0.90 (mid); 12–13: x 0.20…1.10, y 0.40…0.90 (mid); … 8 hits to 31 |
| `Count of Eight+` | Count of Eight (boosted) | special | stand | 47 | 9–10: x 0.20…1.10, y 0.40…0.90 (mid); 12–13: x 0.20…1.10, y 0.40…0.90 (mid); … 9 hits to 31 |
| `Star Jump` | Star Jump | special | stand | 34 | 16–18: x 0.20…1.00, y 0.90…1.60 (overhead) |
| `Star Jump+` | Star Jump (boosted) | special | stand | 34 | 16–18: x 0.20…1.00, y 0.90…1.60 (overhead); 1–15: armour (glows) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.40, y 0.30…1.60 (mid) |

#### Hollis Bey (`hollis`): 32 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Badge Flash | normal | stand | 20 | 8–9: x 0.20…1.00, y 1.20…1.55 (mid) |
| `s.BP` | Nightstick | normal | stand | 32 | 12–14: x 0.20…1.15, y 1.10…1.50 (mid) |
| `s.FK` | Boot | normal | stand | 28 | 10–12: x 0.20…1.20, y 0.50…0.90 (mid) |
| `s.BK` | Door Kick | normal | stand | 39 | 15–17: x 0.20…1.35, y 0.80…1.30 (mid) |
| `c.FP` | Low Jab | normal | crouch | 19 | 8–9: x 0.20…0.95, y 0.70…1.00 (mid) |
| `c.BP` | Rising Clothesline | normal | crouch | 36 | 11–14: x 0.10…0.85, y 1.00…2.00 (mid) |
| `c.FK` | Toe Stomp | normal | crouch | 26 | 9–10: x 0.20…1.25, y 0.00…0.30 (low) |
| `c.BK` | Floor Sweep | normal | crouch | 42 | 14–16: x 0.20…1.40, y 0.00…0.30 (low) |
| `f.BP` | Shoulder Check | normal | stand | 41 | 22–23: x 0.20…1.05, y 1.00…1.70 (overhead) |
| `j.FP` | Jumping Chop | air | air | 17 | 6–11: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Hammer | air | air | 18 | 8–12: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Knee | air | air | 20 | 7–14: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Body Drop | air | air | 23 | 10–15: x -0.30…1.00, y 0.00…0.50 (overhead) |
| `FP FP` | Pat Down | normal | stand | 23 | 9–10: x 0.20…1.10, y 1.10…1.50 (mid) |
| `FP FP BP` | Lights Out | normal | stand | 38 | 14–16: x 0.20…1.30, y 0.90…1.40 (mid) |
| `FP BK` | Rounds | normal | stand | 33 | 13–15: x 0.20…1.35, y 0.70…1.20 (mid) |
| `BP FP` | Night Watch | normal | stand | 24 | 9–10: x 0.20…1.15, y 1.10…1.50 (mid) |
| `BP FP BK` | Lockup | normal | stand | 40 | 16–18: x 0.20…1.40, y 0.00…0.35 (low) |
| `FK FK` | Patrol | normal | stand | 29 | 11–13: x 0.20…1.30, y 0.50…0.90 (mid) |
| `FK FK BP` | Clock Out | normal | stand | 37 | 20–21: x 0.20…1.20, y 1.00…1.70 (overhead) |
| `c.FP FK` | Sweep the Floor | normal | crouch | 33 | 10–11: x 0.20…1.35, y 0.00…0.30 (low) |
| `Clocking In` | Clocking In | special | stand | 50 | 10–12: grab (reach 1.10) |
| `Clocking In+` | Clocking In (boosted) | special | stand | 50 | 10–12: grab (reach 1.30) |
| `Flashlight` | Flashlight | special | stand | 37 | 14–17: x 0.40…2.20, y 1.20…1.70 (mid) |
| `Flashlight+` | Flashlight (boosted) | special | stand | 37 | 14–17: x 0.40…2.60, y 0.90…1.80 (mid) |
| `Key Ring` | Key Ring | special | stand | 32 | 12–14: x 0.40…1.90, y 0.00…0.40 (low) |
| `Key Ring+` | Key Ring (boosted) | special | stand | 40 | 12–14: x 0.40…1.90, y 0.00…0.40 (low); 20–22: x 0.40…1.90, y 0.80…1.50 (mid) |
| `Night Shift` | Night Shift | special | stand | 39 | 16–19: x 0.10…1.00, y 0.60…1.60 (mid); 1–18: armour (glows) |
| `Night Shift+` | Night Shift (boosted) | special | stand | 39 | 16–19: x 0.10…1.10, y 0.60…1.60 (mid); 1–22: armour (glows) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.60, y 0.30…1.60 (mid) |

#### Mister Mumbles (`mumbles`): 31 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wooden Jab | normal | stand | 16 | 6–7: x 0.15…0.90, y 0.80…1.10 (mid) |
| `s.BP` | Head Bonk | normal | stand | 24 | 9–10: x 0.15…0.95, y 0.90…1.35 (mid) |
| `s.FK` | Shin Kick | normal | stand | 20 | 7–8: x 0.15…1.05, y 0.20…0.50 (mid) |
| `s.BK` | Spin Kick | normal | stand | 29 | 11–13: x -0.50…1.15, y 0.40…0.90 (mid) |
| `c.FP` | Knee Poke | normal | crouch | 16 | 6–7: x 0.15…0.85, y 0.40…0.65 (mid) |
| `c.BP` | Pop Up | normal | crouch | 28 | 8–10: x 0.10…0.80, y 0.80…1.80 (mid) |
| `c.FK` | Ankle Biter | normal | crouch | 20 | 7–8: x 0.15…1.15, y 0.00…0.25 (low) |
| `c.BK` | Leg Sweep | normal | crouch | 32 | 10–12: x 0.15…1.25, y 0.00…0.25 (low) |
| `b.BP` | Peekaboo | normal | stand | 33 | 18–19: x 0.15…1.00, y 0.70…1.40 (overhead) |
| `j.FP` | Jumping Bonk | air | air | 14 | 4–9: x 0.10…0.85, y 0.30…0.80 (overhead) |
| `j.BP` | Jumping Clap | air | air | 15 | 5–9: x 0.10…0.90, y 0.40…0.90 (overhead) |
| `j.FK` | Jumping Kick | air | air | 16 | 4–11: x 0.10…0.95, y 0.00…0.50 (overhead) |
| `j.BK` | Jumping Split | air | air | 18 | 6–11: x -0.50…1.00, y 0.00…0.45 (overhead) |
| `FP FP` | Ha-Ha | normal | stand | 18 | 7–8: x 0.15…1.00, y 0.80…1.15 (mid) |
| `FP FP FP` | Ha-Ha-Ha | normal | stand | 22 | 9–10: x 0.15…1.10, y 0.80…1.20 (mid) |
| `FP FP FP BK` | Punchline | normal | stand | 36 | 12–14: x -0.50…1.25, y 0.40…1.00 (mid) |
| `BP FK` | Clatter | normal | stand | 23 | 8–9: x 0.15…1.15, y 0.20…0.50 (mid) |
| `BP FK BP` | Curtain Call | normal | stand | 33 | 16–17: x 0.15…1.10, y 0.70…1.40 (overhead) |
| `FK FK` | Tap Dance | normal | stand | 21 | 8–9: x 0.15…1.15, y 0.00…0.30 (low) |
| `FK FK FK` | Encore | normal | stand | 32 | 10–12: x 0.15…1.25, y 0.00…0.30 (low) |
| `c.FK BK` | Under the Bed | normal | crouch | 27 | 9–11: x 0.15…1.30, y 0.00…0.30 (low) |
| `Hand Puppet` | Hand Puppet | special | stand | 30 | 10: spawns projectile at x 0.90, y 0.00 |
| `Hand Puppet+` | Hand Puppet (boosted) | special | stand | 30 | 10: spawns projectile at x 0.90, y 0.00 |
| `Strings Attached` | Strings Attached | special | stand | 27 | 6–20: off screen; 14: reappears behind the opponent |
| `Strings Attached+` | Strings Attached (boosted) | special | stand | 40 | 24–26: x 0.15…1.00, y 0.60…1.30 (mid); 6–22: off screen; 14: reappears behind the opponent |
| `Exit Stage Left` | Exit Stage Left | special | stand | 30 | 6–20: off screen; 12: reappears far back |
| `Knock-Knock` | Knock-Knock | special | stand | 55 | 30–33: x 0.15…1.20, y 0.00…0.90 (unblockable) |
| `Knock-Knock+` | Knock-Knock (boosted) | special | stand | 50 | 24–27: x 0.15…1.40, y 0.00…0.90 (unblockable) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.30, y 0.30…1.60 (mid) |

<!-- clips:end -->

## Feedback

Notes from the art side go here: timings that are hard to animate, a move
that would read better with a different hitbox, questions. They'll be
worked into the move data, and the table above updates itself.

- **Mirroring (game side):** face left by mirroring the model, not turning it (see *Facing*).
- **Blockout (Nov 8):** Dale's `idle` stands 1.72 m with knees bent (1.80 at rest). `s.FP`'s fist reaches x 0.90, y 1.34 on frames 7–8, so the hitbox fits the pose as it is; no timing changes needed yet.
