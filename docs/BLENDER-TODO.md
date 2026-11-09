# SIGN-OFF — Blender TODO

Nov 8, 2026 · for a Claude instance (or person) working in Blender

This is the art hand-off for SIGN-OFF, a 2.5D fighting game in the browser
(three.js). The fights use these models (0.5.0; FIGHTERS on the title switches to grey boxes); this file lists the
models, rig and animation clips it needs, and the rules they must follow to
drop in. Read `docs/DESIGN.md` first for the game, the cast and the tone.
`CLAUDE.md` has the codebase rules; nothing here asks you to touch game code.

> **Style: decided (Nov 8).** Derek likes the stylised low-poly look of
> 0.4.2 (flat colours, faceted, blended joints) and wants **more detail** in
> it, **including textures**: see step 8. Keep the look; add shape and
> painted surface detail, not realism.

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
| Height | The fighting stance (`idle`) stands as tall as the standing hurtbox, so the straight-legged rest pose is a few per cent taller |
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
| Hollis Bey (`hollis`) | 1.90 m | 1.20 m | Night security guard of the transmitter building: broad, heavy, uniform, cap, flashlight and key ring on the belt. Hurtbox 0.7 m wide |
| Mister Mumbles (`mumbles`) | 1.30 m | 0.80 m | A ventriloquist's dummy with no ventriloquist: painted wooden head with a hinged jaw, little suit, visible puppet strings that go up out of frame. Hurtbox 0.5 m wide |
| Margaret Okafor (`margaret`) | 1.75 m | 1.05 m | The evening news anchor, 1987: a power suit with shoulder pads, a blouse with a pussy-bow, pearl earrings, a sharp bob, a sheaf of script pages. Step 15 |

The broadcast look censors gore with static and stand-by cards, so no gore
assets are needed.

## The pipeline

The art is built by Python scripts run in headless Blender (5.2), like
Curbside's: `blender/build.py` drives `blender/lib/` and one module per
fighter in `blender/fighters/` (body, stance, per-move tuning, effects).

- `lib/rig.py`: the shared skeleton and posing in fighter space.
- `lib/body.py`: the shared body, scaled to each fighter's height and
  girth; fighters add their costume parts. **Stylised low-poly** (flat
  colours, faceted): the torso (pelvis to shoulders), neck, arms (shoulder
  to wrist) and legs (hip to ankle) are continuous meshes whose skin weights
  blend across each joint, so elbows, knees, hips, waist and neck bend
  instead of hinging; hands, heads, shoes and costume pieces are rigid
  parts on one bone. About 1,500 triangles a fighter.
- `lib/anim.py`: **every clip is generated.** State clips come from the
  fighter's stance. Move clips come from the move data
  (`blender/data/fighters.json`, written from `src/sim` by
  `npm run docs:clips` and checked by a test): base pose, a chamber, the
  strike held over the active frames, the recovery. The limb is the move's
  last button (FP lead hand, BP rear hand, FK lead foot, BK rear foot) unless
  the fighter's `OVERRIDES` say otherwise, and each strike is fitted (lunge
  and target nudged, the pose evaluated) until the tip lands in the hitbox.
  Throws, prop kicks, projectile spawns, teleports (`hidden` frames), hops,
  spins and Knock-Knock's wind-up have their own shapes.
- `lib/fighter.py`: builds a fighter end to end. The rig's height is
  solved so the head in `idle` tops out at the standing hurtbox, and the
  crouch depth so it tops out at the crouching one; both are checked on
  every frame of the standing and crouching clips.
- `lib/texture.py` and `lib/paint.py`: the atlases. Every mesh is unwrapped
  per material (smart project, even texel density, the face and chest at
  twice it), then each texel is painted from the point on the surface it
  shows (rest pose, fighter space): the part's flat colour run through its
  paint function (stripes, checks, stitching, ribbing, wood grain, a 5×7
  pixel font for lettering, painted faces), a soft painted light and a
  warm, slightly desaturated 1987 grade. Seeded, so a rebuild gives the same
  pixels. The PNGs are written to `art/textures/<id>_body.png` and
  `<id>_props.png` for review.
- Shape keys: parts may carry shape functions; the body gets `fist_L`,
  `fist_R`, `hurt`, `ko`, `win` (and `jaw` for Mumbles), keyed by every
  clip in the same action (strikes close the fist, hits swap to `hurt`, KO
  closes the eyes, `win` grins).
- Held props (`Parts.held`): a prop taken out for one move (Dale's
  umbrella, Hollis's handcuffs, Mumbles' string and glove puppet) is built
  and painted full size along the hand, then collapsed into the fist in
  every shape key but its own, so that key shows it. The move's `held`
  override says which frames; a prop that makes the hit has its tip
  (`reach` metres past the fingertips) checked against the hitbox instead
  of the hand's.
- `lib/stage.py` and `blender/stages/weather.py`: the stage, built the same
  way without a rig: plain meshes merged per object, painted atlases (`set`
  2048², `props` 512², written to `art/textures/stage-weather_*.png`), a
  translucent `water` material, and the light rig per segment in the
  `lights` node's extras. See *What's in the stage's GLB*.
- `lib/glb.py`: compacts each export without changing it: channels that
  never leave the rest pose are dropped, rotations are stored as normalised
  16-bit integers, all animation data shares one bufferView. It also writes
  every clip's morph weights (sampled from the shape-key curves: Blender's
  exporter only writes them for the action assigned at export), so each
  clip sets every weight and no expression carries over. About 1.2–1.5 MB
  per fighter with 55+ clips and both atlases.

```sh
npm run art                  # all: art/*.blend, public/assets/fighters/*.glb
npm run art -- --only dale   # one target (rig, a fighter, or weather for the stage)
npx -y -p playwright@1.63.0 node tools/art-check.mjs   # measures each GLB in three.js, screenshots to art-out/
npm test                     # tests/assets.test.ts checks every GLB against this file
```

**The scripts are the source for now:** a rebuild overwrites `art/*.blend`.
If the style moves to hand modelling, the `.blend` files become the source
and the scripts stop writing them (say which in this file).

The build fails if a strike misses: for every hit in the data, the striking
limb's tip (or a held prop's) must be inside the hitbox (±4 cm) on every active frame (moves
whose hit is an effect, marked `prop`, only point at it). It also fails if
`launched`, from frame 6 on, leaves the juggle hurtbox (±5 cm) or fills
less than 80% of its length. The
**art viewer** loads a GLB the way the game will, with the hurtbox and each
move's hitboxes drawn on their active frames:
http://hive1:5174/tools/viewer/?f=dale on the dev server (`npm run dev`),
or `?clip=s.FP&frame=7` to open a frame, `&view=face` for a close-up of the
face or `&view=fx` for the effect meshes.

### What's in a fighter's GLB

- `<id>_body`: the skinned body (materials `body`, and `props` for
  accessories), each material with its PNG atlas, and morph targets
  `fist_L`, `fist_R`, `hurt`, `jaw` (Mumbles only), `ko`, `win`, and the
  held props (`umbrella` for Dale, `cuffs` for Hollis, `string` and
  `puppet` for Mumbles), whose weights every clip animates.
- `<id>_<part>`: other skinned parts that shouldn't count toward the
  fighter's size (Mumbles' strings, `mumbles_strings`).
- `fx_*`: effect meshes (projectiles, beams, decoys) at the origin, not
  skinned, in the `props` material. **The game should detach and hide them**
  and place copies itself; the viewer lines them up beside the fighter.

### What's in the stage's GLB

`public/assets/stages/weather.glb` (2,856 triangles, 0.74 MB). Stage space:
x along the stage, y up, z toward the camera; the origin is the arena's
centre on the floor. The fighters fight on z = 0; the walls (studio flats)
stand at x = ±6.4 and the weather-map wall at z = −4.

| Object | What | The game |
| --- | --- | --- |
| `set` | The studio, every static piece in one mesh (`set`): floor with tape marks, the cyclorama wall, the weather map and its header, the green screen on its stand, the flats, and beyond them a monitor cart with colour bars, a spare camera, a lamp, apple boxes and a coil of cable | Always shown |
| `seg_storm` | The storm map over the weather map, papers on the floor | Shown in segments 2 and 3 |
| `seg_flood` | The flood map in front of that; junction boxes and cables snaking from the wall to the puddles, bare wires at x = ±3.0, z = −0.6 | Shown in segment 3 |
| `prop_dolly_left`, `prop_dolly_right` | TV cameras on pedestal dollies, 0.9 × 1.0 × 0.7 m, lens toward the centre; origin on the floor under the middle, placed at x = ∓4.6, z = −0.2 | Moved to the prop's x; spun while rolling |
| `fx_lightning` | An 8 m bolt with two branches and a ground flash, foot at the origin | At the struck spot during the strike, every other frame |
| `fx_scorch` | A scorch mark 1.2 m across | Left on each struck spot for the rest of the round |
| `fx_paper` | One sheet of forecast paper | Instanced, blowing with the wind |
| `fx_water` | The flood: a 28 × 15 m plane at 0.22 m, in `water` (45% opaque) | Segment 3 |
| `fx_puddle` | A live puddle, 1.6 m across, painted with rings | At the hazard's spots in segment 3; glows on the warning and the shock |
| `fx_spark` | A crackle about 0.5 m across | At the bare wires: now and then, flickering on the warning, constant on the shock |
| `lights` (no mesh) | `extras.segments`: one light rig per segment, JSON (below) | Set on each segment change |

The light rig per segment (three.js space; positions are directions for
directional lights):

| Segment | Background | Ambient | Key | Rim |
| --- | --- | --- | --- | --- |
| The Studio | `#07070c` | `#ffffff` × 1.4 | `#fff1e0` × 2.2 from (−3, 6, 8) | `#9fb4ff` × 0.6 from (2, 5, −4) |
| The Forecast Comes True | `#04050a` | `#a8b4d8` × 0.85, + 3.5 `#e8f0ff` with each bolt | `#c8d4ff` × 1.5 from (4, 7, 6) | `#7a88c8` × 0.8 from (−2, 6, −4) |
| Flood Warning | `#03080a` | `#9cc8d0` × 1.0 | `#d8f0f4` × 1.7 from (−2, 6, 7) | `#4fa8c8` × 0.7 from (0, −1, 4), the water's bounce |

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

Step 16 adds shared bones for the hands and jaw, and lets each fighter
have its own `x_*` bones for secondary motion (hair, a tie): see step 16 A.

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

> **Start here (Nov 9).** Steps 1–13 are done (11–13 in 0.13.0).
> Work the open steps in this order; the game side is building the next
> fighters and stages, and will add their contracts here as their data lands.
>
> 1. **Step 14, Feel the Burn at Dawn**, the second stage (its game side is in: 0.14.0), and `interact_throw` for the four built fighters.
> 2. **Step 16 A, the skeleton** (hands, jaw, secondary bones) on the four built fighters, so Margaret is built once, on the new rig.
> 3. **Step 15, Margaret Okafor**, the fifth fighter (her game side is in: 0.15.0; she plays as a grey box until her GLB exists).
> 4. **Step 16 B–D**: the juggle reactions for the new combo system (the game side is in: 0.16.0), then hand-keyed poses and the shape pass.
>
> Run `npm test` before committing: `tests/assets.test.ts` checks every GLB, and will check `burn.glb` once it exists.

### 1. Rig and blockout (first)

- [x] Shared humanoid skeleton (`art/rig.blend`), with IK for feet and hands; bone names under *The rig* below
- [x] Dale Storm blockout at the sizes above, skinned to the rig (1,040 triangles, rigid parts in flat colours)
- [x] Test export of Dale as `public/assets/fighters/dale.glb` with the `idle` clip, plus `s.FP` to prove the hitbox check; checked in three.js at the right size and facing (`tools/viewer/`, below)
- [x] Agree the style with Derek before detailing: the stylised low-poly look, with more detail (step 8)

### 2. Dale Storm

- [x] Model and textures (≤ 20k triangles, 2 materials). *Detail pass done (step 8): 2,398 body triangles, plus 1,932 in effects; 2,574 with the umbrella (step 13).*
- [x] State clips (table below)
- [x] Move clips (generated table below), each matched to its active frames and hitbox
- [x] Projectile visuals as separate small meshes in the same file: `fx_cold_front` (a rolling wall of wind, about 0.7 × 1.4 m) and `fx_hail` (a hailstone, about 0.6 × 0.5 m)

### 3. Rox Vega

- [x] Model and textures. *Detail pass done (step 8): 2,474 body triangles, plus 240 in `fx_lariat_trail`.*
- [x] State clips
- [x] Move clips

### 4. Hollis Bey

- [x] Model and textures; the flashlight and key ring as props in the `props` material. *Detail pass done (step 8): 2,386 body triangles, plus 364 in effects; 2,666 with the handcuffs (step 13).*
- [x] State clips, and move clips (generated table below). `Clocking In` is a command grab: frames 10–12 reach for the opponent; the throw itself plays as the thrower's `throw` hold (the victim plays `thrown`)
- [x] `fx_flashlight_beam` (a cone about 1.8 m long at head height) for Flashlight

### 5. Mister Mumbles

- [x] Model and textures. He uses the shared rig scaled to 1.30 m (same bone names, so the contract test still applies); the jaw can be a shape key or a `props` part. *Detail pass done (step 8): 2,042 body triangles (2,282 with the strings, the pulled string and the glove puppet, step 13); rig at 1.29 m with a head 1.43× larger; the jaw is a shape key (`jaw`); strings and control bar in `mumbles_strings`.*
- [x] State clips, and move clips. `Strings Attached` and `Exit Stage Left` are teleports: he is off screen for the listed frames (yanked up on his strings, then lowered back in); `Knock-Knock` is a slow, obvious wind-up (it can't be blocked, so it must read clearly)
- [x] `fx_hand_puppet`: the decoy, a hand puppet on a little stand, about 0.5 × 1.2 m

### 6. Weather at Eleven (stage)

The arena runs from −6 m to +6 m; fighters start at ±1.5 m. Three segments,
one per round (DESIGN.md has the details):

*Done (Nov 8): `blender/stages/weather.py`, in the game in 0.7.0. Contents under* What's in the stage's GLB.

- [x] Segment 1, The Studio: studio floor, the weather-map wall behind (about 40 × 10 m at 4 m back), a green screen (4 × 3 m), studio flats at the walls (±6.4 m)
- [x] Two camera dollies (0.9 × 1.0 × 0.7 m) at x = ±4.6 m: they get kicked and roll along the floor, so model them as separate objects (`prop_dolly_left`, `prop_dolly_right`)
- [x] Segment 2, The Forecast Comes True: the same set in a storm (a darker light rig, papers blowing); a lightning bolt mesh (`fx_lightning`, about 8 m tall) and a floor scorch decal
- [x] Segment 3, Flood Warning: knee-deep water plane (`fx_water`) at about 0.22 m, and two live puddles (1.6 m wide) at x = ±3 m with sparking cables
- [x] Studio lighting suggestion per segment (the game uses a fixed light setup per segment; note the colours and angles you used)

### 7. Fixes from the first review (Nov 8, game side)

Do these first: they're quick, and the detail pass builds on them. Found by playing every clip in the viewer and measuring it; details under
*Review, Nov 8* in Feedback. In priority order:

- [x] **`ko` ends standing up.** *It didn't, in Blender or the GLB: the viewer's height readout lagged a frame behind (the skin wasn't updated before measuring), so stepping showed the previous frame. Fixed in the viewer.* All four fighters fall (0.5 m tall at frame 60) but frames 89–90 are back at idle height (Dale 1.72 m). The game holds the last frame of `ko` for the rest of the round, so it must end lying down, like `down`.
- [x] **`getup` ends lying down.** *Same readout lag; frame 20 now also equals `idle` frame 1 exactly (bob included).* Frame 20 is still 0.45–0.60 m tall; the game goes straight to `idle` after it, so it pops. It should rise and finish in the idle pose (frame 20 = `idle` frame 1).
- [x] **Stand as tall as the hurtbox.** *The build scales each rig until `idle` tops out at the hurtbox (the straight-legged rest pose is 4–7% taller), solves the crouch against the mesh, not the head bone, and fails if any frame of `idle`, the walks, `block_stand` or `crouch_idle` is more than 3 cm under or 1 cm over its box.* `idle` frame 1 is 3–13 cm under the standing hurtbox (Dale 1.72/1.80, Rox 1.62/1.75, Hollis 1.78/1.90, Mumbles 1.24/1.30), so hits that connect look like they pass over the head. Aim for the head top within 3 cm of the box top in `idle`, `walk_*` and `block_stand` (scale the rest pose up or bend the knees less). Mumbles' `crouch_idle` is 6 cm over its box (0.86/0.80). Add this to the build's checks, like the hitbox check.
- [x] **Overheads must read as overheads.** *Every ground overhead raises the hand above the head (Rox's `f.FK` is an axe kick, the foot raised high), holds it high and forward 2 frames before, then chops down: the tip is at the top of the box on the first active frame and lower on the last. `Star Jump` claps the hands over the head in the air first.* Blocking high or low is the core guessing game, so an overhead needs a clear high-to-low arc: hand or foot raised above the head during startup, chopping down into the hitbox on the active frames. Today `f.BP` (Dale) keeps the fist at chest height through all 39 frames, and Rox's `f.FK` is a front kick. The overheads: Dale `f.BP`, `FK BP`; Rox `f.FK`, `FK FK BP`, `Star Jump`; Hollis `f.BP`, `FK FK BP`; Mumbles `b.BP`, `BP FK BP`. Lows should likewise drop and sweep (they mostly do).
- [x] **Moves that travel need feet that travel.** *Every frame of a `motion` window (and `dash`, `backdash`, and a new `tape_skip` clip) is keyed with the feet stepping at the move's speed: planted feet slide back at that speed so they stay put on the floor. Kicking feet and feet off the floor are left alone. The Grapevine steps out and crosses behind.* `Grapevine` covers 2.6 m in 20 frames with the feet planted (frames 3–22 are the same pose). The same applies to `Leg Warmer Lariat`, `Night Shift`, `Star Jump`, `dash`, `backdash` and Tape Skip's dash. Step at the move's speed (the `motion` windows and speeds are in `blender/data/fighters.json`), as the walks already do. A grapevine is the aerobics side-step: step out, cross behind, step out.
- [x] **Knock-Knock's wind-up must be impossible to miss.** It's unblockable; the only defence is to see it and jump. Frames 1–29 barely change today. Make it big: a lean back, an arm raised to knock on an invisible door, two knocks on frames 4 and 16 (the game plays the knock sounds then), then the swing low on 30. The game also tints him purple during the wind-up.
- [x] **Heat Lightning should rise.** It's an invulnerable uppercut reversal with a hitbox from 0.8 to 2.2 m, but frames 3–14 hold the guard pose. Rising uppercut: crouch on 1–5, fist driving up through the box on 6–9 with the body lifting onto the toes (a little `root` lift is fine), arm high through recovery.
- [x] **Clocking In should reach.** It's a command grab with a range of 1.1 m on frames 10–12: both hands reaching forward at chest height, then (on a whiff, 13–50) an over-reach and a slow recovery so the miss is punishable and looks it. Today the hand rises to the head.
- [x] **Bigger hit reactions.** *Head 40°, chest 30° back (or doubled over for `hit_low`) by frame 3, easing to about half by 12.* `hit_high` moves the head a few degrees; `hit_low` similarly. Snap the head and torso back 15–25° in the first 3 frames and ease back, so a hit reads at phone size. The game holds the clip for as long as the stun lasts.
- [x] **Teleports land on time.** `Strings Attached` is still above the floor at frame 24 (hidden ends at 20). Be on the floor, in stance, by the last hidden frame + 2.
- [x] **The hand puppet should look like a puppet.** *A little Mumbles glove puppet: red felt jacket, white shirt and bow tie, pale painted head with black hair, glossy eyes and rosy cheeks, on a wooden pole and base.* `fx_hand_puppet` reads as a green desk lamp on a stand. It's a decoy, meant to be mistaken for Mumbles for a moment: a small puppet in his colours (red jacket, pale face) on a stand.

### 8. Detail pass (the style is approved; it wants more detail and textures)

Two halves: **shape** and **texture**. The fighters use about 1,500 of their
20,000 triangles: spend up to about 6,000 each on shape detail in the same
faceted style (more pieces and silhouettes, not smoothing or realism), and
give each fighter **painted textures** for surface detail that shapes can't
carry: fabric, faces, logos, wear. Detail must read at game
distance (a fighter is about a fifth of the screen height on a phone), so
favour big, high-contrast shapes over small ones. Faces matter most: they're
what the camera sees at round start, in `win` and in `intro`.

Budget and rules for the pass:

- Up to about 6,000 triangles a fighter; still at most two materials (`body`, `props`).
- **Textures:** one atlas per material: `body` up to 1024², `props` up to 512² (the technical rules allow 2048², but four fighters' worth must load on a phone). PNG in the GLB; the game side converts to KTX2. Base colour only for now: the game uses a fixed, simple light setup, so no normal or roughness maps yet.
- **Texture style:** painted and flat, matching the faceted shapes: big readable areas of colour with drawn detail on top (seams, stitching, a pinstripe, weave, wood grain, printed logos, lettering), slightly desaturated and warm like 1987 video. No photographic textures, no fine noise (it shimmers at phone size). Faces are painted (eyes, brows, mouth, blush, stubble) over the face shapes, so expressions can swap by texture region or by swapping the face piece.
- **Headless:** the build is scripted, so textures are too: paint them in Python (Blender's `numpy` into an image, or procedural shader nodes baked to the atlas), seeded so a rebuild gives the same pixels. Commit the generated PNGs next to the `.blend` files in `art/textures/` so they can be reviewed.
- UVs: unwrap each piece into its own island; keep texel density about even across the body, with the face and chest getting about twice the density (they're seen most).
- Keep the joints' blended skinning; new pieces are rigid on one bone unless they must bend (sleeves, trousers).
- The asset test's height and hitbox checks still apply; update `docs/BLENDER-TODO.md` with each fighter's new triangle count.

**Everyone**

- [x] Faces: brow ridge, nose, eye sockets with eyes (whites and pupils as separate flat-coloured pieces), mouth shape; enough to read an expression. Each fighter gets a signature expression (below), and the `hit_*`, `ko` and `win` clips swap it (shape keys or swapped rigid pieces)
- [x] Hands: mitts with a separate thumb, and a fist shape for strikes (swap or shape key), so punches read as punches
- [x] Shoes with soles and a toe cap; trouser and sleeve cuffs as separate rims
- [x] Hair as chunky faceted clumps with a parting, not one block, painted with a few strand lines and a highlight
- [x] UVs and the `body` / `props` atlases for every fighter; the asset test checks that textures stay within 1024² and 512²

**Dale Storm**: the smiling weatherman, smile fixed through every forecast
- [x] A huge, too-white smile and permanent raised eyebrows; side-parted hair with a quiff
- [x] Suit: lapels, a wide 1987 tie with a stripe, pocket square, two buttons; sleeves with cuffs
- [x] A clicker in the lead hand (`props`), and a little "CH 0" lapel pin
- [x] Textures: a faint 1980s check or pinstripe on the suit, a tie pattern (diagonal stripes), the station logo on the pin, a painted tan and too-white teeth

**Rox Vega**: aerobics host who hasn't stopped since 1983
- [x] Big permed hair with a headband (two colours), sweatbands on both wrists
- [x] Leotard with a high-cut leg and a contrasting stripe or lightning flash; belt, tights, slouchy ribbed leg warmers (rings), high-tops with laces
- [x] A determined grin; a sweat drop on the brow (`props`) for `win`
- [x] Textures: neon gradient or zigzag on the leotard, "FEEL THE BURN" lettering on the headband, ribbing on the leg warmers, a shine on the tights, bright eye shadow

**Hollis Bey**: night security guard, broad and tired
- [x] Peaked cap with a badge and a visor; a heavy moustache; a stubbled jaw (darker flat colour); tired, heavy-lidded eyes
- [x] Uniform: shoulder epaulettes, chest badge, two shirt pockets, a tie, a duty belt with pouches, the flashlight and the key ring (already props)
- [x] Heavy boots; a slight gut; bigger hands than the others
- [x] Textures: a "SECURITY" patch on the shoulder, "TRANSMITTER SITE" on the badge, a name tag ("BEY"), creased and slightly faded uniform fabric, a coffee stain, stubble

**Mister Mumbles**: a ventriloquist's dummy with nobody's hand in him
- [x] The dummy face: painted round eyes, rosy cheek circles, a black painted hairline, and the hinged jaw with its two slot lines down the chin (the jaw drops in `idle` as if talking, and on the knocks in `Knock-Knock`)
- [x] Little suit with a bow tie and big buttons; wooden hands with visible finger lines; visible wooden joints (balls) at elbows and knees
- [x] The strings: a wooden control bar at the top of the frame they hang from (`mumbles_strings`)
- [x] Textures: wood grain on the hands and visible joints, chipped paint and a few cracks on the face (it's old), glossy painted eyes and cheeks, a tiny felt texture on the suit

### 9. Effects (for the moves whose effect is the hit)

Effect meshes go in the fighter's GLB as `fx_*` in the `props` material, as now; the game places and animates copies.

- [x] `fx_isobar_lasso` (Dale): a curling isobar line with pressure numbers, reaching from the hand to 2.6 m at 0.8–1.4 m high
- [x] `fx_key_ring` (Hollis): the chain and keys, sweeping low to 1.9 m
- [x] `fx_heat_lightning` (Dale): a crackle around the rising fist
- [x] `fx_lariat_trail` (Rox): a pink ribbon arc for the spin
- [x] `fx_tape_skip`: a VHS-smear afterimage (one shared mesh, used for every fighter's Tape Skip dash; put it in `dale.glb` for now)
- [x] `fx_cold_front` reads as stacked ice; fine for a cold front, but give it a swirl so it reads as wind moving forward

### 10. Next

- [x] Weather at Eleven (step 6 above) after the fixes and the detail pass: it's the only stage, and every match is played on it.
- [x] Clip variety: a second `win` and `intro` per fighter. *Done (Nov 8): `win_2` and `intro_2` (rows below); the game alternates them by round.*

### 11. Finishers (game side is in, Nov 8)

Finishers play on the clips you've already made: a Sign-Off is a script of
the winner's own moves and the loser's hit reactions (data in each fighter's
file under `finishers`), then the picture cuts to static, colour bars or the
stand-by card. Two things would make them land harder:

- [x] **`dazed`** (60, loop) for every fighter: *Done: guard down, swaying side to side with the head lolling the other way, eyes half shut (Mumbles' jaw hangs open). The game loops it (`LOOPS` in `src/render/pose.ts`); the stand-in is gone.* the loser on their feet after the deciding round, swaying, guard down, head lolling, waiting to be finished. Until it exists the game holds `hit_high`.
- [ ] Later: a bespoke clip for each Sign-Off's last blow (the one the picture cuts away on), and a `rerun_wake` for the Rerun card (the loser waking on a sofa). Not needed yet.

### 12. `launched` lies in its box (Nov 8, game side)

A body thrown up or knocked down now has its own hurtbox, `hurt.juggle` in
`blender/data/fighters.json`: long and low, lying mostly behind the fighter
(they fall backwards), raised a little off their feet. It's used through
`launched` (and, flat on the floor, `down`, `ko` and `getup`, though nothing
can hit those). Today `launched` stays fairly upright and its `root` drifts,
so hits land on empty air above the body and miss the body itself. Juggles
depend on this matching.

| Fighter | `juggle` box: x (behind … in front), y (above the feet), metres |
| --- | --- |
| Dale | −0.80 … 0.60, 0.20 … 0.90 |
| Rox | −0.80 … 0.55, 0.20 … 0.85 |
| Hollis | −0.85 … 0.65, 0.20 … 1.00 |
| Mumbles | −0.60 … 0.45, 0.15 … 0.70 |

- [x] Re-pose `launched` flat on the back, head behind (−x), body along the box, by about frame 6 (a quick tip-back from the hit pose), held from there with a slight spin; no `root` translation. Rotating `root` is fine as long as the mesh stays in the box. *Done: 40 frames, curled on the back with the knees up (`Stance.aloft`), turning 14° toward the camera by frame 40, where the game holds it. The build slides each fighter's pose to the middle of its box (`fit_juggle`). From frame 6: Dale x −0.78…0.58, y 0.25…0.85; Rox −0.80…0.55, 0.24…0.81; Hollis −0.85…0.65, 0.26…0.94; Mumbles −0.57…0.42, 0.21…0.64.*
- [x] Add it to the build's checks, like the hurtbox-height check: from frame 6 on, the mesh's extent along x and y must sit within the `juggle` box (a few cm of slack), and the box should be mostly filled (body length at least 80% of the box width).
- [x] The first frames of `ko` (the fall) should pass through the same flat pose, since a K.O.'d body falls through `launched` space. *Done: `ko` is the `launched` pose on frames 6–14, on the floor by 24, a bounce on 29, out cold from 34.*

### 13. New and changed moves from the combat pass (Nov 8, game side)

The normals were made more distinct (docs/ROSTER-REVIEW.md). Frame counts of
existing moves didn't change, but some hitboxes did, and there are four new
moves; the clip table below is regenerated. Until a new clip exists the game
shows a stand-in (in brackets).

- [x] **Dale `b.FK` Step Back Kick** (new, 26 frames; stand-in `s.FK`): steps back 0.05 m a frame on 1–8 while kicking, foot out at mid height on 9–10. *Done: generated from the data: the feet step back at 0.05 m a frame on 1–8 and the lead foot chambers on 8.*
- [x] **Dale `s.BK` Umbrella Jab** (was Isotherm Kick): the umbrella held out at arm's length, tip to 1.75 m at chest height on 14–16. The longest poke in the game. *Done: his furled navy umbrella (crook handle, yellow strap, steel tip) comes out of the rear fist on frame 5 and goes away on 30; its tip is checked in the box at 1.6 m.*
- [x] **Dale `s.FK`**: now reaches 1.5 m (11–13), a long front kick. *Done: the strike fit lunges into the longer box.*
- [x] **Dale `s.BP` Forecast Cross**: angled up, the fist from 1.0 to 2.0 m high on 10–12 (his anti-air). *Done: aimed at 1.75 m, the fist driving up through the top of the box.*
- [x] **Rox `f.BP` Lunge** (new, 21 frames; stand-in `s.BP`): lunges forward 0.08 m a frame on 2–9, punch at head height on 9–10. *Done: generated: she steps in at the move's speed and punches at head height.*
- [x] **Rox `s.BK` Roundhouse Rep**: now two kicks, one each leg: 11–12 and 15–16. *Done: the rear leg kicks on 11–12, the lead on 15–16 (`alt`).*
- [x] **Hollis `FP FP FK` Cuff 'Em** (new, 34 frames; stand-in `Clocking In`): both hands grab forward at chest height on 8–9 (a pair of handcuffs is a nice `props` touch); on a whiff, an over-reach and a slow recovery. *Done: the command grab's reach, with a pair of handcuffs out of the lead hand from frame 3 to 28.*
- [x] **Hollis `s.BK` Door Kick**: has armour on 1–14 (the game tints it orange); a braced, heavy wind-up. *Done: squared up and dug in behind both forearms through the armour (style `braced`), the kick chambering on 12.*
- [x] **Mumbles `b.FP` String Pull** (new, 32 frames; stand-in `s.FP`): yanks a string from his control bar, reaching 0.6–2.0 m at 0.8–1.4 m on 14–16. *Done: he reaches up the strings on 4, grabs one on 7, yanks it down to his shoulder by 10, then whips it out: a 1.1 m string from the fist, its tip checked in the box (frames 4–19).*
- [x] **Mumbles `s.FK` Shin Kick**: he now ducks as he kicks (crouching hurtbox), so lower the body. *Done: it plays from the crouch now that the data marks it crouching.*
- [x] **Mumbles `Hand Puppet`**: the puppet jabs out first (a hit on 8–10), then is set down as the decoy on 12. *Done: a glove puppet of him sits up on his rear fist from frame 2 and jabs on 8–10; on 12 he bends to set it down and it vanishes as the decoy appears.*

### 14. Feel the Burn at Dawn (stage, Nov 8, game side)

Rox's show, the second stage: a 1987 aerobics studio at sunrise. Built like
Weather at Eleven: `blender/stages/burn.py`, `npm run art -- --only burn`,
writing `art/stage-burn.blend`, `art/textures/stage-burn_*.png` and
`public/assets/stages/burn.glb`. Same stage space (x along the stage, y up,
z toward the camera, origin at the arena's centre on the floor; fighters on
z = 0), the same materials (`set` 2048², `props` 512²; no `water` needed) and
a `lights` node with one rig per segment, named exactly as below. The game
side is in (0.14.0: `src/sim/stages.ts`, `src/render/burnSet.ts`); until
the GLB exists it plays on flat stand-ins in these colours and places.

| Segment | The game | The set |
| --- | --- | --- |
| 1. Warm-Up | Arena ±6 m. One boombox at x = 0 that either fighter can pick up and throw (Interact) | Sprung wooden floor with a row of blue exercise mats; a mirror wall behind (z = −3.9, about 16 × 3 m in panels with frames, a ballet barre in front at 1 m); a dawn sky in tall windows above it; a neon *FEEL THE BURN AT DAWN* sign; side walls at ±6.4 m with big speaker stacks |
| 2. Double Time | The tape runs fast: the whole game is 10% quicker. No hazards | The same set, louder: the sun fully up, a strip of chase lights along the top of the mirrors, the sign switched to *DOUBLE TIME* |
| 3. Burnout | The mirrors shatter and the arena opens to ±8 m into the dark; mirror shards fall on marked spots on the beat | Mirror frames empty and jagged, glass on the floor, the windows black; the side walls gone, the floor running on into darkness to black drapes at ±8.4 m |

Mirrors are painted, not reflective (no render-to-texture on a phone): a
pale blue-grey with a soft painted streak and a faint, dark suggestion of the
room. Keep it a fifth of the triangles of a fighter or so per piece; the
whole stage about as heavy as Weather (under 4,000 triangles, about 10 draw
calls with everything showing).

| Object | What | The game |
| --- | --- | --- |
| `set` | Everything that stays all three segments: the floor (running out to ±9 m), the mats, the window wall above the mirrors, the ceiling rig | Always shown |
| `seg_warmup` | The intact mirrors and barre, the side walls with speakers at ±6.4, the neon sign (*FEEL THE BURN AT DAWN*), the dawn in the windows | Segments 1 and 2 |
| `seg_double` | Over `seg_warmup`: the chase lights, the sign's *DOUBLE TIME* panel in front of the old lettering, the risen sun | Segment 2 |
| `seg_burnout` | The broken mirror frames, glass across the floor, black windows, black drapes at ±8.4 m (3 m tall, z −4 … +1) | Segment 3 (`seg_warmup` is hidden) |
| `prop_boombox` | A big 1980s twin-deck boombox, 0.6 × 0.35 × 0.2 m, handle on top, speakers to the camera; origin at the bottom centre, placed at x = 0, z = −0.3 | Moved to the prop's x and height; spun end over end while thrown |
| `fx_shard` | A falling mirror shard, a long jagged triangle about 0.4 × 1.2 m, point down; origin at the point | Drops from 6 m to the floor at the struck spot during the strike |
| `fx_shatter` | Broken glass on the floor, 1.2 m across, flat | Left on each struck spot for a second |
| `fx_mark` | A strip of white gaffer tape in a cross, 1.0 m across, on the floor | On the spot a shard will hit, during the warning |
| `lights` (no mesh) | `extras.segments`, as for Weather | Set on each segment change |

The light rig per segment (suggested; tune by eye):

| Segment | Background | Ambient | Key | Rim |
| --- | --- | --- | --- | --- |
| Warm-Up | `#1a0c14` | `#ffe6d8` × 1.3 | `#ffc890` × 2.0 from (−4, 5, 8), a low sun | `#ff7ab0` × 0.7 from (3, 4, −4) |
| Double Time | `#140a10` | `#fff0e0` × 1.5 | `#ffffff` × 2.4 from (3, 7, 7) | `#40e0ff` × 0.9 from (−3, 5, −4); the game pulses it on the beat |
| Burnout | `#020206` | `#6a5a9a` × 0.6 | `#c8b8ff` × 1.4 from (0, 8, 6), a single top light | `#ff4a8a` × 0.6 from (0, 3, −6) |

- [ ] `set`, `seg_warmup`, `seg_double`, `seg_burnout` and the light rigs
- [ ] `prop_boombox` at the size above
- [ ] `fx_shard`, `fx_shatter`, `fx_mark`
- [ ] `interact_throw` (22 frames) for every fighter, in the state clips table below: picking up the boombox and hurling it
- [ ] Pass `tests/assets.test.ts`'s `burn.glb` checks (already written: objects, materials and atlas sizes, a rig per segment named as in `STAGES.burn`, the boombox's size and place, the shard's length)

### 15. Margaret Okafor (Nov 8, game side)

The evening news anchor of *The Eleven O'Clock News*: calm, precise, never
off-script. Footsies: the best all-round normals in the game. Her data is
in `src/sim/fighters/margaret.ts` and `blender/data/fighters.json`; her
move clips are in the generated table below. New fighter, same contracts as
the others: the shared rig at 1.75 m (crouch 1.05 m, hurtbox 0.6 m wide),
`body` and `props` materials, every state clip, and a module
`blender/fighters/margaret.py` (add `margaret` to `TARGETS` in
`blender/build.py`). The asset test checks her GLB like the others once it
exists.

- [ ] **Model and textures**, in the approved style (step 8's budget and rules). A dark burgundy power suit with big square shoulder pads and a nipped waist, a cream blouse with a pussy-bow, a slim skirt to the knee with dark tights and low court shoes (she fights in them), pearl earrings and a single strand of pearls, a sharp chin-length bob with a side parting. **Signature expression:** composed, one eyebrow slightly raised, the faint professional smile of someone reading bad news well. Hands: a sheaf of script pages in the lead hand (`props`), held through most moves and used in some.
- [ ] **Textures:** a fine pinstripe on the suit, the station's CH 0 logo as a lapel pin, typed lines on the script pages, pearl highlights, neat make-up (a deep lipstick).
- [ ] **State clips:** everything in the state clips table, including `dazed`, `interact_throw`, `tape_skip`, `win_2` and `intro_2`. `idle` is upright and still (she barely moves: a slow breath, the pages squared once a loop); walks are measured, heel-toe. Intros: straightens her pages and looks into the camera ("Good evening."); takes off her reading glasses. Wins: shuffles the pages and sets them down; a nod to camera, "Goodnight."
- [ ] **Move clips** (table below), each fitted to its hitbox like the others. Notes on the specials:
  - `Breaking`, `Breaking+`: a sharp, fast straight (the pages rolled into a baton is a nice touch); the boosted one adds a second strike with the other hand.
  - `Teleprompter`, `Teleprompter+`: the counter stance. She stands tall, the lead hand raised palm out, eyes reading something just off screen; held through the window (frames 8–26, or 8–34 boosted). Readable from across the screen: it's what the opponent must learn not to hit.
  - `Teleprompter Read`, `Teleprompter Read+`: the answer, played the moment a strike is read: a fast, wide backhand with the pages, hitting on 3–5 out to 1.8 m (an effect-sized reach: mark it `prop` like the Isobar Lasso if the arm can't reach), the boosted one sweeping upward (it launches).
  - `Live Feed`, `Live Feed+`: she points two fingers at the camera, "We go live", and the feed spawns on frame 14 in front of her.
  - `Lead Story`: steps in over frames 4–14 and slams the pages down overhead on 20–21. The boosted one walks through a hit (armour, the game tints it orange).
  - `f.FK` Field Report: steps forward while kicking (frames 1–10), foot out at mid height on 12–14.
- [ ] **`fx_live_feed`** (`props`): the projectile, a broadcast signal about 0.6 × 0.7 m standing on its box's bottom centre at 0.6 m high: a red "LIVE" bug in a frame of TV static, or a floating studio camera's tally light with a beam. The game blinks it while it waits on standby (the first 30 frames, 12 boosted), then sends it forward.

### 16. More detail, better poses (Nov 9, game side)

Measured on Nov 9 (0.16.0): the four fighters are well inside every budget
except the skeleton, which is what limits their poses.

| | Dale | Rox | Hollis | Mumbles | Budget |
| --- | --- | --- | --- | --- | --- |
| Body triangles | 2,574 | 2,474 | 2,666 | 2,206 | 20,000 (this step: about 8,000) |
| Effect triangles | 1,932 | 240 | 364 | 428 | — |
| Bones | 22 | 22 | 22 | 22 | 48 (asset test) |
| Shape keys | 6 | 5 | 6 | 8 | keep to about 4 (below) |
| Clips | 60 | 62 | 61 | 60 | — |
| GLB | 1.59 MB | 1.37 MB | 1.30 MB | 1.36 MB | 2 MB (asset test) |

In a match on the iPhone profile the whole scene draws 6 to 13 draw calls and
at most about 6,700 triangles a frame (limits: 100 calls, and the phone could
draw many times the triangles). A fighter is about a quarter of the screen
height in play, roughly 300 pixels on the phone, so extra triangles show in
silhouettes and close-ups (intros, wins, Sign-Offs), not in surface detail.
Each GLB is about a quarter animation (about 6 KB a clip), a fifth
textures, a quarter to a third shape keys and the rest geometry. **Each
shape key is a full copy of the mesh's vertices** (the two fist keys alone
are 8–10% of a GLB), so more detail times more keys grows fast. Prefer bones (fists,
the jaw) and texture swaps (faces) over new shape keys.

Game side, done: the new reaction clips are picked by `src/render/pose.ts`
(until a GLB has them they hold the last frame of `launched`, so nothing
jumps); `tests/assets.test.ts` accepts the step 16 bones (all or none), any
number of `x_*` bones up to 48 in all, the five new clips at their exact
lengths, and fails a GLB over 2 MB.

**A. The skeleton** (first: Margaret should be built on it)

- [ ] New shared deform bones, the same in every human fighter (Mumbles too), added to `blender/lib/rig.py` DEFORM: `jaw` (child of `head`), and on each hand `thumb.L`, `index.L`, `fingers.L` (children of `hand.L`; `fingers` curls the middle, ring and little fingers together) and the same `.R`. The faceted mitts stay mitts: a bone curls a finger group, not single fingers. Once all four fighters are rebuilt, tell the game side to move them into `RIG_BONES`.
- [ ] Hands posed by the bones in every clip, generated from the move data like the rest: a fist on strikes (replacing the `fist_L`/`fist_R` shape keys: drop them, it saves about a tenth of each GLB), open on blocks, `hit_*`, `launched` and `dazed` (fingers splayed), grabbing on throws and `Clocking In`/`Cuff 'Em`, pointing where it's in character (Dale at the map in `intro`, Margaret at the camera).
- [ ] The jaw on its bone: gritted on strikes, a shout on specials, slack in `ko` and `dazed`, talking in intros and wins. Mumbles' `jaw` shape key becomes the bone (his clacking and `Knock-Knock` knocks).
- [ ] Secondary motion on each fighter's own `x_*` bones, baked as a seeded spring (lag and overshoot) from the bone it hangs from, so every clip gets it without hand keys: Dale's tie (2 bones) and quiff, Rox's perm (2–3) and headband tails, Hollis's key ring and cap peak, Mumbles' bow tie and the slack of his strings, Margaret's pages and bob. Keep it small: nothing may push the mesh outside the hurtbox checks.

**B. Juggle reactions** (the combo system, 0.16.0)

Juggles are long now (a launcher, strings and specials on a falling body,
relaunches for a bar, a bounce off the floor or the wall), and every one of
those beats shows the same held `launched` pose. Five new state clips, for
every fighter. Each starts from and ends on `launched`'s held pose (its last
frame), keeps the mesh in the `juggle` box like step 12 (the same build
check), and has no `root` translation (the game moves the body). The game
holds the last frame when the clip ends.

| Clip | Frames | When the game plays it, and what it shows |
| --- | --- | --- |
| `juggle_hit` | 12 | Each hit on a body already in the air. A jolt: snapped further back and folded at the waist by frame 3, limbs flung, easing back to the held pose by 12. The most-seen clip in a long combo, so it should read at phone size |
| `relaunch` | 20 | A boosted special (1 bar) pops them back up in front of the attacker. A full backward tumble (one turn in the screen plane) by frame 14, then settling into the held pose |
| `slam` | 8 | A ground-bounce hit drives them into the floor (Rox's Lariat). Spread flat, back arched, falling fast; they hit the floor around frame 8–10 |
| `floor_bounce` | 16 | Off the floor: crumpled on impact (frame 1–2), then bent up off it, knees and arms up, back into the held pose by 16 |
| `wall_splat` | 20 | Off the wall (Feel the Burn near a wall): flattened against it on 1–4 (back to the wall, arms out), peeling forward off it by 10, into the held pose by 20 |

- [ ] The five clips for Dale, Rox, Hollis and Mumbles (and Margaret with her model).

**C. Hand-keyed poses where they count**

Every clip today is generated from the move data as a few key poses (base,
chamber, strike, recover). That's right for most normals; the moves people
watch deserve more. Add per-move pose overrides (a file per fighter under
`blender/data/`, read by `lib/anim.py`), keeping the strike frames on the
hitbox (the build's check still applies):

- [ ] Each fighter's specials and their boosted versions: a clear anticipation on startup, a stretched, overshooting pose on the active frames, a longer follow-through in recovery. Boosted versions should look bigger than the plain ones (they glow already; the pose should sell it too).
- [ ] The launchers (`c.BP` for everyone) and the string enders: they start and end combos, and the camera is on them most.
- [ ] `intro`, `intro_2`, `win`, `win_2`, using the new hands and jaw (talking to camera, pointing, waving).
- [ ] `dazed`: with the jaw slack and the hands open it can be much more pitiful.

**D. Shape detail**

- [ ] Up to about 8,000 body triangles each (the step 8 cap was 6,000), spent on silhouettes and on what the close-ups see: hands with the finger groups as separate pieces, faces (brow, cheek and jaw planes, the jaw as its own piece for the bone), hair clumps, clothing edges. Still faceted, still two materials, same atlas sizes.
- [ ] Keep each GLB under 2 MB: drop the fist shape keys (A), keep to about four keys (`hurt`, `ko`, `win`, and one per fighter's signature: Dale's `umbrella`, Hollis's `cuffs`), and swap expressions by face texture region where you can.

### State clips (every fighter)

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
| `tape_skip` | 10 | Exactly 10: the Tape Skip dash (0.11 m a frame), low and leaning |
| `backdash` | Dale 20, Rox 18 | Exactly these |
| `hit_high`, `hit_low` | 12 | Played and held for however long the stun lasts |
| `launched` | 40, hold | Flat on the back in the juggle box from frame 6, turning slightly (step 12) |
| `down` | 30 | Lying on the floor; exactly 30 |
| `getup` | 20 | Exactly 20 |
| `thrown` | 24 | Being thrown (pairs with the thrower's `throw` hold) |
| `ko` | 90 | Falling and staying down |
| `dazed` | 60, loop | Out on their feet after the deciding round, before a finisher (step 11) |
| `win` | 120 | Victory pose |
| `intro` | 90 | Round intro |
| `win_2`, `intro_2` | 120, 90 | Second versions. Dale: "…and that's the forecast", clicking the map / straightens the tie and the quiff. Rox: hands on hips, high knees / an overhead side stretch. Hollis: checks his watch and yawns / touches his cap, cracks his knuckles. Mumbles: laughs, jaw clacking / slumped until the strings snap him up |
| `interact_throw` | 22 | Picking up the stage's prop and hurling it forward (Feel the Burn's boombox, step 14): crouch and grab low on 1–5, lift it overhead by 6, release forward on frame 8 (when the game launches it), follow through. Until it exists the game plays `interact` (the kick) |
| `juggle_hit` | 12 | Hit again in the air: a jolt, ending on `launched`'s held pose (step 16 B) |
| `relaunch` | 20 | Relaunched by a boosted special: a backward tumble into the held pose (step 16 B) |
| `slam` | 8 | Driven into the floor by a ground-bounce hit (step 16 B) |
| `floor_bounce` | 16 | Off the floor into the held pose (step 16 B) |
| `wall_splat` | 20 | Against the wall, then off it into the held pose (step 16 B) |
| `td_cinematic` | 150 | Technical Difficulties: plays under a "PLEASE STAND BY" card, so only the first and last 20 frames are really seen |

### Move clips

One clip per move, named by its id. **Frames** is exact. During each
listed window of active frames, the striking limb should reach the hitbox:
x is forward from the fighter's centre, y is up from their feet. "Kind"
`air` clips are jump attacks (the game keeps the jump's motion), `special`
are the specials (`+` is the boosted version, which can share most of the
plain one), `interact` is kicking a stage prop.
<!-- clips:start (generated by `npm run docs:clips`; do not edit by hand) -->

#### Dale Storm (`dale`): 32 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Clipboard Jab | normal | stand | 18 | 7–8: x 0.20…0.95, y 1.15…1.45 (mid) |
| `s.BP` | Forecast Cross | normal | stand | 28 | 10–12: x 0.20…1.05, y 1.00…2.00 (mid) |
| `s.FK` | Front Kick | normal | stand | 26 | 11–13: x 0.20…1.50, y 0.60…0.95 (mid) |
| `s.BK` | Umbrella Jab | normal | stand | 35 | 14–16: x 0.20…1.75, y 1.00…1.40 (mid) |
| `c.FP` | Low Jab | normal | crouch | 17 | 7–8: x 0.20…0.90, y 0.70…0.95 (mid) |
| `c.BP` | Rising Umbrella | normal | crouch | 32 | 9–12: x 0.10…0.80, y 1.00…1.90 (mid) |
| `c.FK` | Shin Poke | normal | crouch | 23 | 8–9: x 0.20…1.25, y 0.00…0.30 (low) |
| `c.BK` | Ground Fog | normal | crouch | 38 | 12–14: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP` | Barometer Smash | normal | stand | 39 | 20–21: x 0.20…1.00, y 1.00…1.60 (overhead) |
| `b.FK` | Step Back Kick | normal | stand | 26 | 9–10: x 0.20…1.30, y 0.50…0.90 (mid) |
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

#### Rox Vega (`rox`): 34 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wake-Up Jab | normal | stand | 15 | 6–7: x 0.20…0.85, y 1.15…1.45 (mid) |
| `s.BP` | Power Punch | normal | stand | 21 | 8–9: x 0.20…0.95, y 1.05…1.40 (mid) |
| `s.FK` | Leg Lift | normal | stand | 21 | 7–9: x 0.20…1.05, y 0.55…0.90 (mid) |
| `s.BK` | Roundhouse Rep | normal | stand | 31 | 11–12: x 0.20…1.15, y 0.80…1.20 (mid); 15–16: x 0.20…1.15, y 0.80…1.20 (mid) |
| `c.FP` | Crunch Jab | normal | crouch | 15 | 6–7: x 0.20…0.80, y 0.70…0.95 (mid) |
| `c.BP` | Star Jump Uppercut | normal | crouch | 28 | 8–10: x 0.10…0.75, y 1.00…1.80 (mid) |
| `c.FK` | Toe Tap | normal | crouch | 19 | 7–8: x 0.20…1.10, y 0.00…0.30 (low) |
| `c.BK` | Splits Sweep | normal | crouch | 34 | 10–12: x 0.20…1.20, y 0.00…0.30 (low) |
| `f.FK` | Step Touch | normal | stand | 31 | 16–17: x 0.20…1.00, y 1.00…1.50 (overhead) |
| `f.BP` | Lunge | normal | stand | 21 | 9–10: x 0.20…1.00, y 1.00…1.45 (mid) |
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

#### Hollis Bey (`hollis`): 33 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Badge Flash | normal | stand | 20 | 8–9: x 0.20…1.00, y 1.20…1.55 (mid) |
| `s.BP` | Nightstick | normal | stand | 32 | 12–14: x 0.20…1.15, y 1.10…1.50 (mid) |
| `s.FK` | Boot | normal | stand | 28 | 10–12: x 0.20…1.20, y 0.50…0.90 (mid) |
| `s.BK` | Door Kick | normal | stand | 39 | 15–17: x 0.20…1.35, y 0.80…1.30 (mid); 1–14: armour (glows) |
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
| `FP FP FK` | Cuff 'Em | normal | stand | 34 | 8–9: grab (reach 1.20) |
| `FP FP BP` | Lights Out | normal | stand | 38 | 14–16: x 0.20…1.30, y 0.90…1.40 (mid) |
| `FP BK` | Rounds | normal | stand | 33 | 13–15: x 0.20…1.35, y 0.70…1.20 (mid) |
| `BP FP` | Night Watch | normal | stand | 24 | 9–10: x 0.20…1.15, y 1.10…1.50 (mid) |
| `BP FP BK` | Lockup | normal | stand | 40 | 16–18: x 0.20…1.40, y 0.00…0.35 (low) |
| `FK FK` | Patrol | normal | stand | 29 | 11–13: x 0.20…1.30, y 0.50…0.90 (mid) |
| `FK FK BP` | Clock Out | normal | stand | 37 | 17–18: x 0.20…1.20, y 1.00…1.70 (overhead) |
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

#### Mister Mumbles (`mumbles`): 32 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wooden Jab | normal | stand | 16 | 6–7: x 0.15…0.90, y 0.80…1.10 (mid) |
| `s.BP` | Head Bonk | normal | stand | 24 | 9–10: x 0.15…0.95, y 0.90…1.35 (mid) |
| `s.FK` | Shin Kick | normal | crouch | 20 | 7–8: x 0.15…1.05, y 0.20…0.50 (mid) |
| `s.BK` | Spin Kick | normal | stand | 29 | 11–13: x -0.50…1.15, y 0.40…0.90 (mid) |
| `c.FP` | Knee Poke | normal | crouch | 16 | 6–7: x 0.15…0.85, y 0.40…0.65 (mid) |
| `c.BP` | Pop Up | normal | crouch | 28 | 8–10: x 0.10…0.80, y 0.80…1.80 (mid) |
| `c.FK` | Ankle Biter | normal | crouch | 20 | 7–8: x 0.15…1.15, y 0.00…0.25 (low) |
| `c.BK` | Leg Sweep | normal | crouch | 32 | 10–12: x 0.15…1.25, y 0.00…0.25 (low) |
| `b.BP` | Peekaboo | normal | stand | 33 | 18–19: x 0.15…1.00, y 0.70…1.40 (overhead) |
| `b.FP` | String Pull | normal | stand | 32 | 14–16: x 0.60…2.00, y 0.80…1.40 (mid) |
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
| `Hand Puppet` | Hand Puppet | special | stand | 30 | 8–10: x 0.15…1.10, y 0.60…1.30 (mid); 12: spawns projectile at x 0.90, y 0.00 |
| `Hand Puppet+` | Hand Puppet (boosted) | special | stand | 30 | 8–10: x 0.15…1.20, y 0.60…1.30 (mid); 12: spawns projectile at x 0.90, y 0.00 |
| `Strings Attached` | Strings Attached | special | stand | 27 | 6–20: off screen; 14: reappears behind the opponent |
| `Strings Attached+` | Strings Attached (boosted) | special | stand | 40 | 24–26: x 0.15…1.00, y 0.60…1.30 (mid); 6–22: off screen; 14: reappears behind the opponent |
| `Exit Stage Left` | Exit Stage Left | special | stand | 30 | 6–20: off screen; 12: reappears far back |
| `Knock-Knock` | Knock-Knock | special | stand | 55 | 30–33: x 0.15…1.20, y 0.00…0.90 (unblockable) |
| `Knock-Knock+` | Knock-Knock (boosted) | special | stand | 50 | 24–27: x 0.15…1.40, y 0.00…0.90 (unblockable) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.30, y 0.30…1.60 (mid) |

#### Margaret Okafor (`margaret`): 35 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Cue Card | normal | stand | 16 | 6–7: x 0.20…1.00, y 1.15…1.45 (mid) |
| `s.BP` | Lead Paragraph | normal | stand | 25 | 9–11: x 0.20…1.15, y 1.00…1.50 (mid) |
| `s.FK` | Pointed Shoe | normal | stand | 24 | 9–11: x 0.20…1.40, y 0.55…0.90 (mid) |
| `s.BK` | Anchor Kick | normal | stand | 32 | 13–15: x 0.20…1.55, y 0.90…1.40 (mid) |
| `c.FP` | Footnote | normal | crouch | 17 | 7–8: x 0.20…0.95, y 0.60…0.90 (mid) |
| `c.BP` | Rising Headline | normal | crouch | 31 | 9–12: x 0.10…0.80, y 1.00…1.90 (mid) |
| `c.FK` | Low Bulletin | normal | crouch | 22 | 8–9: x 0.20…1.30, y 0.00…0.30 (low) |
| `c.BK` | Cut the Wires | normal | crouch | 36 | 12–14: x 0.20…1.40, y 0.00…0.30 (low) |
| `f.BP` | Paperweight | normal | stand | 37 | 19–20: x 0.20…1.00, y 1.00…1.60 (overhead) |
| `f.FK` | Field Report | normal | stand | 29 | 12–14: x 0.20…1.30, y 0.60…1.00 (mid) |
| `j.FP` | Jumping Cue | air | air | 16 | 5–10: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Headline | air | air | 17 | 7–11: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Heel | air | air | 19 | 6–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Kick | air | air | 22 | 9–14: x 0.10…1.00, y 0.10…0.60 (overhead) |
| `FP FP` | Top Story | normal | stand | 19 | 7–8: x 0.20…1.05, y 1.10…1.45 (mid) |
| `FP FP BP` | And Finally | normal | stand | 31 | 11–13: x 0.20…1.25, y 0.90…1.40 (mid) |
| `FP FK` | Correspondent | normal | stand | 25 | 9–10: x 0.20…1.35, y 0.00…0.35 (low) |
| `BP BP` | Developing Story | normal | stand | 28 | 10–12: x 0.20…1.20, y 1.00…1.45 (mid) |
| `BP BP BK` | We Go Live | normal | stand | 33 | 12–14: x 0.20…1.30, y 0.80…1.60 (mid) |
| `FK BK` | Weather and Sport | normal | stand | 32 | 12–14: x 0.20…1.45, y 0.90…1.40 (mid) |
| `c.FP FK` | Small Print | normal | crouch | 28 | 9–10: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP BP` | Exclusive | normal | stand | 31 | 11–13: x 0.20…1.20, y 0.90…1.40 (mid) |
| `Breaking` | Breaking | special | stand | 32 | 8–9: x 0.20…1.15, y 0.90…1.40 (mid) |
| `Breaking+` | Breaking (boosted) | special | stand | 40 | 8–9: x 0.20…1.15, y 0.90…1.40 (mid); 16–17: x 0.20…1.20, y 0.90…1.40 (mid) |
| `Teleprompter` | Teleprompter | special | stand | 44 | 8–26: counter stance; a strike read here plays `Teleprompter Read` |
| `Teleprompter+` | Teleprompter (boosted) | special | stand | 44 | 8–34: counter stance; a strike read here plays `Teleprompter Read+` |
| `Teleprompter Read` | Teleprompter: Read | special | stand | 30 | 3–5: x 0.10…1.80, y 0.30…1.80 (mid) |
| `Teleprompter Read+` | Teleprompter: Read (boosted) | special | stand | 34 | 3–5: x 0.10…1.80, y 0.30…1.80 (mid) |
| `Live Feed` | Live Feed | special | stand | 40 | 14: spawns projectile at x 0.70, y 0.00 (waits 30 frames) |
| `Live Feed+` | Live Feed (boosted) | special | stand | 40 | 14: spawns projectile at x 0.70, y 0.00 (waits 12 frames) |
| `Lead Story` | Lead Story | special | stand | 46 | 20–21: x 0.20…1.10, y 0.90…1.70 (overhead) |
| `Lead Story+` | Lead Story (boosted) | special | stand | 46 | 20–21: x 0.20…1.10, y 0.90…1.70 (overhead); 4–19: armour (glows) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.50, y 0.30…1.60 (mid) |

<!-- clips:end -->

## Feedback

Notes from the art side go here: timings that are hard to animate, a move
that would read better with a different hitbox, questions. They'll be
worked into the move data, and the table above updates itself.

- **Mirroring (game side):** face left by mirroring the model, not turning it (see *Facing*).
- **Walk loops are shorter than 40 frames** (forward: Dale 16, Rox 12, Hollis 22, Mumbles 12): at these walk speeds a 40-frame cycle would need a stride far wider than a fighting stance, so the loop length follows the stride (0.36 m per foot, scaled) and the feet don't skate. The asset test accepts any loop of 12 frames or more for walks.
- **Root motion in a few clips (game side):** `down`, `getup`, `thrown`, `ko` and `launched` move and turn `root` (lying down, being thrown; since Nov 8 only its offset and yaw, see *Combat-pass art*); Mumbles' teleports lift `root` 4 m up off screen over their hidden frames and lower him back in; Rox's `Star Jump` hops 0.35 m. Gameplay moves otherwise keep `root` still. The game should let these play as they are, not cancel `root`.
- **Effect hits:** Isobar Lasso, Flashlight and Key Ring reach further than any limb (up to 2.6 m), so the effect is the hit and the hand only points the way; those moves skip the limb check.
- **Review, Nov 8 (game side).** Checked all four GLBs in the viewer: every clip frame-exact, every strike inside its hitbox, 1,468 to 1,684 triangles, 3 to 7 draw calls a fighter, 0.73 MB each. The stylised low-poly look reads well at game distance and the four silhouettes are distinct (Hollis's bulk, Rox's hair and leg warmers, Mumbles' size and strings): a good base. What needs work is *readability in play*, listed as step 7 under TODO. Measured with the viewer's height readout:

  | | Dale | Rox | Hollis | Mumbles |
  | --- | --- | --- | --- | --- |
  | `idle` / standing hurtbox | 1.72 / 1.80 | 1.62 / 1.75 | 1.78 / 1.90 | 1.24 / 1.30 |
  | `crouch_idle` / crouching hurtbox | 1.11 / 1.10 | 1.04 / 1.05 | 1.19 / 1.20 | 0.86 / 0.80 |
  | `ko` frame 60 → 90 | 0.51 → 1.72 | 0.49 → 1.62 | 0.55 → 1.77 | 0.35 → 1.24 |
  | `getup` frame 20 (should be idle height) | 0.60 | 0.55 | 0.53 | 0.45 |

- **Clip ends (game side, Nov 8):** play one-shot clips with `LoopOnce` and `clampWhenFinished`, and update the skeleton (`skeleton.update()`) before measuring a skinned mesh, or the measurement shows the last rendered frame. `ko` and `getup` were right in the GLB; the viewer's readout lagged.
- **`tape_skip` (game side):** a new 10-frame state clip for the Tape Skip dash; play it (with `fx_tape_skip`, when it exists) instead of `dash`.
- **Detail pass (Nov 8, art side).** Step 8 and 9 done. Notes for the game side:
  - The bodies use 2,042–2,474 triangles of the ~6,000 allowed, so there's room for more shape where review asks for it. Each GLB is 1.2–1.5 MB with both atlases (PNG; the KTX2 conversion should shrink that).
  - Each fighter has morph targets on `<id>_body` (`fist_L`, `fist_R`, `hurt`, `jaw`, `ko`, `win`) and every clip animates all of them, so playing clips is enough; nothing needs setting by hand. Expressions: `hurt` in the hits, `launched`, `thrown`, `down` (part) and the start of `ko`; eyes closed at the end of `ko`; `win` grins (and shows Rox's sweat drop).
  - Mumbles' strings now hang from a control bar 3.3 m up, on `root`, so they stay straight whatever he does; strings to his head, hands and knees.
  - Rox now has a `props` material (her sweat drop and `fx_lariat_trail`).
  - Effects are modelled where they're used: `fx_isobar_lasso` from the hand (0.6 m) to 2.6 m at 0.8–1.4 m; `fx_key_ring` from 0.4 m out and 0.45 m up to the keys at 1.9 m; `fx_heat_lightning` and `fx_hand_puppet`'s base centred on the origin; `fx_lariat_trail` round the origin at hand height; `fx_tape_skip` (in `dale.glb`, for every fighter) trails back from the origin (−x).
  - The viewer has two new views: FACE (a close-up, for expressions) and EFFECTS.
- **Answers to the notes above (game side):** mirroring to face left, the shorter walk loops, the root motion in `down`, `getup`, `thrown`, `ko`, `launched`, the teleports and `Star Jump`, and effect-only hits are all fine; the game will follow them when it loads the GLBs (next on the game side, with the clips played by simulation frame). Rox having one material is fine (the contract is body plus *at most* props).
- **Blockout (Nov 8):** Dale's `idle` stands 1.72 m with knees bent (1.80 at rest). `s.FP`'s fist reaches x 0.90, y 1.34 on frames 7–8, so the hitbox fits the pose as it is; no timing changes needed yet.
- **In the game (0.5.0, game side).** The fights play the GLBs, posed by sim frame (`src/render/pose.ts` picks clip and frame from the state; `src/render/fighterModel.ts` loads and samples them). One-shot clips clamp on their last frame (`LoopOnce`, `clampWhenFinished`); `tape_skip` plays for Tape Skip with `fx_tape_skip` from `dale.glb`; morph targets play from the clips as they are. Materials are switched to Lambert (same colour, atlas and vertex colours) to light like the set and cost less on a phone. Effects: projectiles stand on their box's bottom centre (`fx_cold_front`, `fx_hail`, `fx_hand_puppet`); `fx_flashlight_beam` is stretched over its hitbox; `fx_isobar_lasso`, `fx_key_ring`, `fx_lariat_trail` and `fx_tape_skip` sit on the fighter as modelled; `fx_heat_lightning` follows the raised hand. Move effects show from the first hit to 4 frames after the last. `tests/pose.test.ts` plays CPU matches with every fighter and fails if the game asks for a clip a GLB doesn't have.
- **Weather at Eleven (Nov 8, art and game side).** The stage is built like the fighters (`npm run art -- --only weather`) and checked by `tests/assets.test.ts` (objects, materials, atlas sizes, a light rig per segment, the dollies' places and size, the hazards' sizes). In the game (0.7.0) `src/render/stageView.ts` swaps the flat stand-in panels for it once loaded and sets the segment's lights; the stand-ins stay if the GLB can't load. Three passes for the whole set: `set`, `seg_storm`, `seg_flood`, plus the props and effects, about 10 draw calls with everything on show.
- **Second win and intro (Nov 8, art and game side).** Each fighter's `STANCE` has `win_2` and `intro_2` (keys over the clip; a generic version in `lib/anim.py` for any fighter that doesn't override them); `intro_2` is in stance by frame 80, like `intro`. In the game (0.8.0) `src/render/pose.ts` picks them: the round winner plays `win` in odd rounds and `win_2` in even ones; in the intro, player 1 plays `intro` in odd rounds and `intro_2` in even ones, and player 2 the other, so the two never match.
- **Vertex colours (game side, Nov 8).** The GLBs keep each part's flat colour as `COLOR_0`, and three.js multiplies a material's atlas by its vertex colours, so the fighters were drawn with their atlases tinted twice (skin about a quarter darker and oranger than painted). Fixed in 0.7.0: materials with an atlas ignore vertex colours, in the game and the viewer. The art is unchanged; it now shows as painted.
- **Combat-pass art (Nov 8, art side).** Steps 11–13 done; all four GLBs rebuilt, every strike and the new juggle check passing. Notes for the game side:
  - `dazed` is in every GLB (60, loop); `src/render/pose.ts` loops it and `STAND_INS` is empty now that every new move has its clip.
  - `launched` is 40 frames and lies in `hurt.juggle` from frame 6; the build checks it (`check_juggle` in `blender/lib/fighter.py`). `ko` falls through the same pose.
  - Held props are morph targets on `<id>_body` (`umbrella`, `cuffs`, `string`, `puppet`): the clips show and hide them, so there's nothing to place. They're collapsed inside the fist otherwise, so they don't change any bounds.
  - `root` is never pitched or rolled now: a pose that tips it (lying down, thrown) has the tip baked into the other bones (`upright_root` in `blender/lib/rig.py`), so the body is where it was but `root` keeps only its offset and yaw. Mumbles' strings (on `root`) now hang straight up to him when he's knocked down, instead of swinging sideways across the stage.
  - The art viewer draws the juggle hurtbox for `launched`, `down`, `ko` and `getup`, as `src/sim/combat.ts` uses it.
