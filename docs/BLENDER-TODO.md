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
  matters for gameplay, but the camera sits about 6.5 m in front (further
  as the fighters part, up to 16 m), slightly above, so the front
  three-quarters is what players see most, with a fighter about half the
  screen's height. On a KO it swings up to about 12° round to one side.

## Technical rules

| | |
| --- | --- |
| Format | glTF binary (`.glb`), one file per fighter, one for the stage |
| Units / axes | Metres. Blender defaults (Z up); export with glTF's +Y up. The character faces Blender −Y (front view); the game turns it to face its opponent |
| Origin | Between the feet, on the floor (z = 0) |
| Height | The fighting stance (`idle`) stands as tall as the standing hurtbox, so the straight-legged rest pose is a few per cent taller |
| Budget per fighter | About 20,000 triangles, 2 materials (body, and accessories/props) |
| File size | Each fighter's GLB under 5 MB (raised from 2 MB on Nov 9; `tests/assets.test.ts`). The game caches every fighter for offline play, so smaller is still better on a phone's first visit |
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
- Shape keys: parts may carry shape functions; the body gets `hurt`, `ko`
  and `win`, keyed by every clip in the same action (hits swap to `hurt`,
  KO closes the eyes, `win` grins).
- Hands and jaw (step 16 A): a pose's `shapes` also carries `fist_L/R`,
  `point_L/R`, `open_L/R` and `jaw`, which `rig.pose_hands_and_jaw` turns
  into the finger and jaw bones (strikes close the fist, hits splay the
  hands, specials shout, intros and wins talk). A curl is spread over each
  finger's three joints (`rig.SHARES`: 90°, 100° and 70° for a full fist;
  the thumb two); an opening turns only the base joint, halved (step 21 A).
- Secondary motion (`lib/spring.py`): a fighter's `xbones(b)` lists its own
  `x_*` bones; every frame of every clip is baked with a damped spring from
  the bone each hangs from.
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
  never leave the rest pose are dropped, a channel that holds still through
  a clip keeps only its first and last key, identical tracks are stored
  once, rotations are stored as normalised
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

Moves listed in `ART_PENDING` (`src/render/pose.ts`) get no clip: their art
is owed, the game plays a stand-in, and the generic fitter can't always
reach a new move's shape, which would otherwise stop the whole fighter
rebuilding. Take a move out of the list when its clip is made.

The build fails if a strike misses: for every hit in the data, the striking
limb's tip (or a held prop's) must be inside the hitbox (±4 cm) on every active frame (moves
whose hit is an effect, marked `prop`, only point at it). It also fails if
`launched`, from frame 6 on, leaves the juggle hurtbox (±5 cm) or fills
less than 80% of its length. The
**art viewer** loads a GLB the way the game will, with the hurtbox and each
move's hitboxes drawn on their active frames:
http://hive1:5174/tools/viewer/?f=dale on the dev server (`npm run dev`),
or `?clip=s.FP&frame=7` to open a frame, `&view=face` for a close-up of the
face, `&view=hand` for one that follows the lead hand, or `&view=fx` for the
effect meshes.

### What's in a fighter's GLB

- `<id>_body`: the skinned body (materials `body`, and `props` for
  accessories), each material with its PNG atlas, and morph targets
  `hurt`, `ko`, `win` and the held props (`umbrella` for Dale, `cuffs` for Hollis, `string` and
  `puppet` for Mumbles, `glasses` for Margaret, `pan` and `mallet` for Gus, `plate` for Gideon), whose weights every clip animates.
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
| `jaw` (hinged under the ears, its tail at the chin) | `head` |
| `shoulder.L` → `upper_arm.L` → `forearm.L` → `hand.L` (and `.R`) | `chest` |
| `thumb.L`, `index.L`, `fingers.L` (middle, ring and little together) (and `.R`) | `hand.L` (`hand.R`) |
| `thumb_2.L`; `index_2.L` → `index_3.L`; `fingers_2.L` → `fingers_3.L` (and `.R`): the groups split at the knuckles (step 21 A) | `thumb.L`, `index.L`, `fingers.L` |
| `thigh.L` → `shin.L` → `foot.L` → `toe.L` (and `.R`) | `hips` |

Each fighter may add its own `x_*` bones for secondary motion (hair, a tie,
a key ring), up to 48 bones in all: see step 16 A.

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

> **Start here (Nov 9).** Steps 1–16 B are done (11–13 in 0.13.0, 14–16 B on Nov 9); 17–22 are done; 23–25 are new.
> Work the open steps in this order; the game side is building the next
> fighters and stages, and will add their contracts here as their data lands.
>
> 1. ~~**Step 14, Feel the Burn at Dawn**~~ *done (Nov 9): `burn.glb` and `interact_throw` for the four built fighters.*
> 2. ~~**Step 16 A, the skeleton**~~ *done (Nov 9): hands, jaw and `x_*` bones on the four built fighters.*
> 3. ~~**Step 15, Margaret Okafor**~~ *done (Nov 9): `margaret.glb`, on the new skeleton.*
> 4. ~~**Step 16 B**~~ *done (Nov 9): the five juggle reactions.* Then **16 C–D**: hand-keyed poses and the shape pass.
> 5. ~~**Step 21 A, finger joints**~~ *done (Nov 9): the five built fighters rebuilt on the split fingers.*
> 6. ~~**Step 17, Chef Gus Lamarre** and **step 18, Rev. Gideon Price**~~ *done (Nov 9): `gus.glb` and `gideon.glb`.*
> 7. ~~**Step 19, The Eleven O'Clock News** and **step 20, Kitchen Live**~~ *done (Nov 9): `news.glb` and `kitchen.glb`.*
> 8. ~~**Step 21 B–C with 16 C–D**~~ *done (16 C finished Nov 10).* Was: **Step 21 B–C with 16 C–D**: the five built fighters rebuilt with the finger joints, the face and hand lessons and the shape detail.
> 9. ~~**Step 22, hit reactions**~~ *done (Nov 9): the nine clips for all seven fighters.*
> 10. **Step 23, baked light on the sets**: ~~ambient occlusion~~ *(A done, Nov 9)*, ~~the sets' own lamps~~ *(B done, Nov 9)*, ~~what glows~~ *(C done, Nov 9)*, for the four stages. The game side (0.34.0) is in and uses them as they land.
> 11. ~~**Step 24, depth**~~ *done (Nov 9): the foreground, the audience (and `sit_audience`) and the living room; the game side follows.*
> 12. ~~**Step 25, the fighting styles pilot**~~ *done (Nov 10): Rox's and Hollis's normals and their timing profiles; out of `ART_PENDING`.*
> 13. ~~**Step 26, air specials**~~ *done (Nov 10): all fourteen clips.*
> 14. ~~**Step 27, three boosts** and **step 28, the specials pass**~~ *done (Nov 10): all 41 clips.* Was: **Step 28, the specials pass** (Nov 10, game side): 38 new move clips: an air special on Down for everyone, a follow-up special for everyone, Gideon's Begone, and the new air strings' middle steps and spikes. Each has a stand-in until its clip lands.
> 15. ~~**Step 29, the impact pass**~~ *done (Nov 10); the game side can take up the smears, `fx_impact_ring`, `fx_crack` and the `shake_*`/`swing_*` nodes.* Was: **Step 29, the impact pass** (Nov 10, game side): smear frames, held wind-ups, overshoot, heavier hit reactions, two fx meshes and named set nodes that can shake.
> 16. ~~**Step 30, set dressing that gets knocked about**~~ *done (Nov 10): three `clutter_*` kinds on each of the four stages, game side in.*
>
> Do 17–20 before 16 C–D: they replace grey boxes people see in every match, where 16 C–D polish what's already there. Unless Derek says otherwise.
>
> Run `npm test` before committing: `tests/assets.test.ts` checks every GLB, `burn.glb` included.

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

*Done (Nov 9): `blender/stages/burn.py`, 1,324 triangles (0.64 MB), 8 draw calls with everything showing. Notes under* Feel the Burn at Dawn (Nov 9, art side) *in Feedback.*

- [x] `set`, `seg_warmup`, `seg_double`, `seg_burnout` and the light rigs. *The lights are the table above as given.*
- [x] `prop_boombox` at the size above. *0.6 × 0.39 × 0.2 m with the handle: silver, two woofers, twin cassette decks, a tuning dial.*
- [x] `fx_shard`, `fx_shatter`, `fx_mark`
- [x] `interact_throw` (22 frames) for every fighter, in the state clips table below: picking up the boombox and hurling it. *Bent over it with both hands low on 4–5, overhead on 6, arms thrown forward on 8, following through and back in stance by 22. The boombox isn't in the hands: the game moves it.*
- [x] Pass `tests/assets.test.ts`'s `burn.glb` checks (already written: objects, materials and atlas sizes, a rig per segment named as in `STAGES.burn`, the boombox's size and place, the shard's length)

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

- [x] **Model and textures**, in the approved style (step 8's budget and rules). A dark burgundy power suit with big square shoulder pads and a nipped waist, a cream blouse with a pussy-bow, a slim skirt to the knee with dark tights and low court shoes (she fights in them), pearl earrings and a single strand of pearls, a sharp chin-length bob with a side parting. **Signature expression:** composed, one eyebrow slightly raised, the faint professional smile of someone reading bad news well. Hands: a sheaf of script pages in the lead hand (`props`), held through most moves and used in some. *Done (Nov 9): 2,724 body triangles plus 40 in `fx_live_feed`, 1.56 MB. Burgundy pinstripe suit with square pads and a nipped waist, blouse and pussy-bow, a slim skirt (skirt-coloured thighs and a panel between them, so it stays put when she kicks), dark tights, court shoes, pearls, a bob parted on her left (side panels on `x_bob.L/R`), deep lipstick, her left brow 8 mm higher (`brow_lift`), and the script pages on `x_pages` in her lead hand.*
- [x] **Textures:** a fine pinstripe on the suit, the station's CH 0 logo as a lapel pin, typed lines on the script pages, pearl highlights, neat make-up (a deep lipstick). *Done.*
- [x] **State clips:** everything in the state clips table, including `dazed`, `interact_throw`, `tape_skip`, `win_2` and `intro_2`. `idle` is upright and still (she barely moves: a slow breath, the pages squared once a loop); walks are measured, heel-toe. Intros: straightens her pages and looks into the camera ("Good evening."); takes off her reading glasses. Wins: shuffles the pages and sets them down; a nod to camera, "Goodnight." *Done: the intros square the pages and look up into the camera, and take off her reading glasses (a held prop, `glasses`); the wins shuffle the pages and set them down, and nod "Goodnight." to the camera. Not yet: squaring the pages once an idle loop (the idle is the shared breath).*
- [x] **Move clips** (table below), each fitted to its hitbox like the others. Notes on the specials: *Done: Breaking with the rear hand (+ adds the lead); Teleprompter is a new `prompter` style held over the counter window; Teleprompter Read is a `prop` hit with the pages (the + aims high); Live Feed a new `live` style, pointing at the camera; Lead Story slams the pages overhead.*
  - `Breaking`, `Breaking+`: a sharp, fast straight (the pages rolled into a baton is a nice touch); the boosted one adds a second strike with the other hand.
  - `Teleprompter`, `Teleprompter+`: the counter stance. She stands tall, the lead hand raised palm out, eyes reading something just off screen; held through the window (frames 8–26, or 8–34 boosted). Readable from across the screen: it's what the opponent must learn not to hit.
  - `Teleprompter Read`, `Teleprompter Read+`: the answer, played the moment a strike is read: a fast, wide backhand with the pages, hitting on 3–5 out to 1.8 m (an effect-sized reach: mark it `prop` like the Isobar Lasso if the arm can't reach), the boosted one sweeping upward (it launches).
  - `Live Feed`, `Live Feed+`: she points two fingers at the camera, "We go live", and the feed spawns on frame 14 in front of her.
  - `Lead Story`: steps in over frames 4–14 and slams the pages down overhead on 20–21. The boosted one walks through a hit (armour, the game tints it orange).
  - `f.FK` Field Report: steps forward while kicking (frames 1–10), foot out at mid height on 12–14.
- [x] **`fx_live_feed`** (`props`): the projectile, a broadcast signal about 0.6 × 0.7 m standing on its box's bottom centre at 0.6 m high: a red "LIVE" bug in a frame of TV static, or a floating studio camera's tally light with a beam. The game blinks it while it waits on standby (the first 30 frames, 12 boosted), then sends it forward. *Done: TV static in blocks with a red LIVE bug and a tally light, 0.6 × 0.7 m on its bottom centre.*

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
lengths, and fails a GLB over 5 MB (2 MB until Nov 9).

**A. The skeleton** (first: Margaret should be built on it)

*Done (Nov 9). Notes under* The skeleton (Nov 9, art side) *in Feedback.*

- [x] New shared deform bones, the same in every human fighter (Mumbles too), added to `blender/lib/rig.py` DEFORM: `jaw` (child of `head`), and on each hand `thumb.L`, `index.L`, `fingers.L` (children of `hand.L`; `fingers` curls the middle, ring and little fingers together) and the same `.R`. The faceted mitts stay mitts: a bone curls a finger group, not single fingers. *(Superseded by step 21 A: each group's bone splits at the knuckles.)* Once all four fighters are rebuilt, tell the game side to move them into `RIG_BONES`. *Done: placed from each fighter's hand and head scale; `RIG_BONES` in `tests/assets.test.ts` now includes them (required).*
- [x] Hands posed by the bones in every clip, generated from the move data like the rest: a fist on strikes (replacing the `fist_L`/`fist_R` shape keys: drop them, it saves about a tenth of each GLB), open on blocks, `hit_*`, `launched` and `dazed` (fingers splayed), grabbing on throws and `Clocking In`/`Cuff 'Em`, pointing where it's in character (Dale at the map in `intro`, Margaret at the camera). *Done: the mitts are four pieces now (palm, index, three fingers, thumb); the fist keys are gone. Dale points back at the map (his left) through `intro`. Margaret's point comes with her.*
- [x] The jaw on its bone: gritted on strikes, a shout on specials, slack in `ko` and `dazed`, talking in intros and wins. Mumbles' `jaw` shape key becomes the bone (his clacking and `Knock-Knock` knocks). *Done: the chin and the mouth's lower half ride it, so the mouth opens; Mumbles' jaw slides straight down between its slots instead of hinging (`JAW_SLIDE`). Shouts run over a special's hits, spawns, grab or counter window; strikes keep it shut.*
- [x] Secondary motion on each fighter's own `x_*` bones, baked as a seeded spring (lag and overshoot) from the bone it hangs from, so every clip gets it without hand keys: Dale's tie (2 bones) and quiff, Rox's perm (2–3) and headband tails, Hollis's key ring and cap peak, Mumbles' bow tie and the slack of his strings, Margaret's pages and bob. Keep it small: nothing may push the mesh outside the hurtbox checks. *Done (`lib/spring.py`): Dale `x_tie`, `x_tie_end`, `x_quiff`; Rox `x_perm`, `x_perm.L/R`, `x_band` (new headband tails, tied at the back); Hollis `x_keys`, `x_peak`; Mumbles `x_bow` and an `x_string_*` per string, whose middle chases its end with a lag. Every build check still passes. Margaret's come with her.*

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

- [x] The five clips for Dale, Rox, Hollis and Mumbles (and Margaret with her model). *Done (Nov 9), all five fighters. `Stance.reaction_poses` in `lib/anim.py` holds the key poses; the build slides each one to the middle of the juggle box by measuring the mesh (`fit_reactions`), and if a pose is still too big for that fighter's box it's blended toward the held pose just enough to fit. The relaunch tumble is keyed every frame, so the ball turns about its own middle. Notes under* Juggle reactions (Nov 9, art side) *in Feedback.*

**C. Hand-keyed poses where they count**

Every clip today is generated from the move data as a few key poses (base,
chamber, strike, recover). That's right for most normals; the moves people
watch deserve more. Add per-move pose overrides (a file per fighter under
`blender/data/`, read by `lib/anim.py`), keeping the strike frames on the
hitbox (the build's check still applies):

- [x] *(Generated pass done, Nov 9: see* Showcase *in Feedback. Hand-keyed signatures done Nov 10: every special is now staged by its own keys or style except the ones whose generated showcase already reads (Hollis's three, Margaret's, Tenderise, Chop Chop, Pressure Drop, Count of Eight). New: Cold Front (both hands drawn to the rear hip, then shoved through the front), Isobar Lasso (twirled over his head, thrown, reeled in hand over hand), Flambé (the skillet jerked over the hob, then tossed up and out), Cleaver Toss (over the shoulder and down); each boosted version goes further.)* Each fighter's specials and their boosted versions: a clear anticipation on startup, a stretched, overshooting pose on the active frames, a longer follow-through in recovery. Boosted versions should look bigger than the plain ones (they glow already; the pose should sell it too).
- [x] *(Done, Nov 9, by the showcase pass.)* The launchers (`c.BP` for everyone) and the string enders: they start and end combos, and the camera is on them most.
- [x] `intro`, `intro_2`, `win`, `win_2`, using the new hands and jaw (talking to camera, pointing, waving). *Done (Nov 10): they all talk (the jaw works through them); the ones that only held a pose now play out, through new `Stance.win_keys` and `intro_keys`: Dale's win ends pointing down the lens, hand on hip ("back to you"); Rox's intro points at the camera, then two claps overhead, and her win pumps her arms on her toes before pointing at the camera; Hollis checks his watch and cracks his knuckles, and wins shaking his head over folded arms, then jerks a thumb over his shoulder.*
- [x] `dazed`: with the jaw slack and the hands open it can be much more pitiful. *Done (Nov 9): slumped, shoulders rolled forward, arms hanging limp, knock-kneed, the knees buckling and catching twice a sway with the eyes closing on each dip.*

**D. Shape detail**

*Done (Nov 9): all seven, 3,300–4,900 body triangles. Notes under* Shape detail (Nov 9, art side) *in Feedback.*

- [x] Up to about 8,000 body triangles each (the step 8 cap was 6,000), spent on silhouettes and on what the close-ups see: hands with the finger groups as separate pieces, faces (brow, cheek and jaw planes, the jaw as its own piece for the bone), hair clumps, clothing edges. Still faceted, still two materials, same atlas sizes.
- [x] Keep each GLB under 5 MB: drop the fist shape keys (A), keep to about four keys (`hurt`, `ko`, `win`, and one per fighter's signature: Dale's `umbrella`, Hollis's `cuffs`), and swap expressions by face texture region where you can.

### 17. Chef Gus Lamarre (Nov 9, game side)

The host of *Kitchen Live*, a cooking show filmed in one take, every night,
forever. Mid-range: the longest reach in the game (his `s.BK` cleaver hits
out to 1.85 m) and the slowest walk. His data is in
`src/sim/fighters/gus.ts` and `blender/data/fighters.json`; his move clips
are in the generated table below. Same contracts as Margaret (step 15): the
shared rig and step 16's skeleton, built a little bigger (1.85 m tall,
crouch 1.15 m, hurtbox 0.7 m wide: he's broad), `body` and `props`
materials, every state clip, a module `blender/fighters/gus.py` (add `gus`
to `TARGETS` in `blender/build.py`). The asset test checks his GLB once it
exists. Until then he plays as a white grey box.

*Done (Nov 9): `blender/fighters/gus.py`, 3,056 body triangles plus 292 in effects, 1.70 MB, 42 bones. Notes under* Chef Gus Lamarre (Nov 9, art side) *in Feedback.*

- [x] **Model and textures**, in the approved style. A big, round-shouldered
      chef in whites gone grey at the cuffs: a double-breasted jacket with two
      rows of buttons, a tall pleated toque that has seen things, a
      neckerchief, a striped apron tied high, check trousers and clogs. A
      waxed moustache and heavy brows. **Signature expression:** the warm,
      fixed grin of a man who has said "and now we let that rest" ten
      thousand times. Held props (`props`): a meat cleaver in the lead hand,
      a heavy frying pan in the rear hand for the pan moves (a held-prop
      shape key or `x_*` bone, like Dale's umbrella), a meat mallet for
      Tenderise. *Done: a round body (girth 1.25 and a belly) in whites with a
      double-breasted flap and two rows of buttons, greyed cuffs, a red
      neckerchief, a navy-striped apron tied high that wraps round the belly
      (its lower half follows the thighs), a striped towel in the apron
      string, black-and-white check trousers, clogs, a waxed moustache with
      curled tips, heavy brows, a grin with teeth, a tall pleated toque. The
      cleaver is always in his lead hand; the pan (`pan`) and the mallet
      (`mallet`) are held-prop shape keys in the rear hand. The toque costs
      him height: the rig is 1.76 m so the toque tops out at the 1.85 m box.*
- [x] **Textures:** grease spots and a scorch on the apron, the *Kitchen
      Live* logo embroidered on the breast, a towel tucked in the apron
      string, nicks on the cleaver's blade. *Done, but the nicks: the blade
      is a bright steel sheen (too fine to read at play size).*
- [x] **Secondary motion** (`x_*`, step 16 A's spring): the toque's tip, the
      apron's hem, the towel. *Done: `x_toque`, `x_apron`, `x_towel`.*
- [x] **State clips:** everything in the state clips table. `idle` is
      heavy and patient, weight on the back foot, the cleaver resting on the
      shoulder; walks are a slow, rolling waddle (0.036 m a frame, the
      slowest in the game). Intros: tastes from a spoon and nods ("Mm.
      Perfect."); sharpens the cleaver on a steel. Wins: wipes his hands on
      the towel and presents an invisible plate to camera; a chef's kiss.
      *Done: weight back, the cleaver over his lead shoulder. `intro` tastes
      from the rear fist and nods; `intro_2` draws the cleaver down his rear
      fist as the steel; `win` presents the plate on his rear palm, the
      cleaver lowered (no towel wipe); `win_2` is the chef's kiss.*
- [x] **Move clips** (table below), fitted to their hitboxes. *Done: the rear-hand normals (`s.BP`, `c.BP`, `f.BP`, `b.BP`, `j.BP`, `FP BP`, `FK FP BP`) swing the pan, its middle checked in the box; `s.BK`, `BP BK` and `FP FP BK` are cleaver swings (lead hand). Tenderise pounds overhand with the mallet and Chop Chop chops the cleaver down along the floor, both by a new `chop` override in `lib/anim.py`. Every hit reaches with the hand, so none is marked `prop`. Flambé and Mise en Place show the pan until the spawn frame.* Notes:
  - Normals swing the cleaver and the pan wide and late: big wind-ups
    (startups of 10–15 frames) and long reach. Mark the cleaver hits `prop`
    where the arm can't reach the box.
  - `b.BP` Back of the Pan: steps back over frames 1–8 while swinging the
    pan round, hitting on 13–15 at full stretch.
  - `Flambé`, `Flambé+`: a pan tossed forward on frame 16, the fire landing
    ahead of him. The game places `fx_flambe` on the floor at the
    projectile.
  - `Tenderise`, `Tenderise+`: steps in (frames 3–10) and pounds three times
    with the mallet, overhand, on 12–13, 20–21 and 30–31 (the boosted one
    faster: 12, 19, 26, and armoured on 3–11). The last blow is the big one:
    it breaks a guard, so it should look like it would.
  - `Mise en Place`, `Mise en Place+`: flips a pan high into the air on
    frame 14 (two on the boosted one, the second on 16) with a flick of the
    wrist, and watches it go. The game places `fx_pan` falling at the spot.
  - `Chop Chop`, `Chop Chop+`: a crouching, two-handed chop along the floor,
    the blade out to 2.0 m on 14–16 (the boosted one chops twice, 12–13 and
    20–22). Low and flat.
- [x] **`fx_flambe`** (`props`): a patch of fire on the floor, about 0.9 m
      across and 0.5 m high, standing on its bottom centre: low blue flames
      with orange tips, and a pan on its side in the middle.
- [x] **`fx_pan`** (`props`): a frying pan 0.6 m long with its handle,
      flat side down, origin at its bottom centre.

### 18. Rev. Gideon Price (Nov 9, game side)

The host of *The Hour of Power*, a late-night televangelist who promises
miracles for a donation. An all-rounder with a second resource: his
Collection Plate collects a donation each time it connects (up to five,
shown as coins on the HUD), and two of his specials spend them
automatically for a bigger version. His data is in
`src/sim/fighters/gideon.ts`; his clips are in the table below, including
the paid-for versions (`Laying On of Hands (healing)`, `Fire and Brimstone
(blessed)`). Same contracts as step 17: 1.8 m tall (crouch 1.1 m, hurtbox
0.64 m wide), module `blender/fighters/gideon.py`. Until his GLB exists he
plays as a violet grey box.

*Done (Nov 9): `blender/fighters/gideon.py`, 2,958 body triangles plus 644 in effects, 1.55 MB. Notes under* Rev. Gideon Price (Nov 9, art side) *in Feedback.*

- [x] **Model and textures**, in the approved style. A tall, lean preacher
      in a powder-blue three-piece suit with wide lapels, a white shirt and a
      long gold tie, two-tone shoes, a gold pinky ring and a big wristwatch.
      Silver hair swept into a high, lacquered pompadour. **Signature
      expression:** wide eyes and a wider smile, eyebrows up, mid-sermon.
      Held props (`props`): a big leather-bound Bible in the rear hand, a
      gold collection plate for the plate moves, a corded microphone.
      *Done: powder-blue three-piece with a sheen, wide lapels, a darker
      waistcoat with gold buttons, the long gold tie (lower half on
      `x_tie`) with a rhinestone clip, two-tone shoes (white, brown toe
      caps), a gold pinky ring and wristwatch on the lead hand, a lacquered
      silver pompadour (one smooth roll on `x_pomp`), wide eyes, raised
      brows and a big toothy grin. The Bible is always in his rear hand; the
      plate is a held prop (`plate`) in the lead hand. The microphone is a
      lapel mic whose cord loops to his hip on `x_cord`: a hand-held one
      would need a hand, and both are taken.*
- [x] **Textures:** a sheen on the suit, gold leaf on the Bible's edges, a
      *THE HOUR OF POWER* pin with a phone number, a rhinestone on the tie
      clip. *Done (the phone number reads "1-800", too small for more).*
- [x] **Secondary motion:** the tie, the pompadour's front, the
      microphone cord. *Done: `x_tie`, `x_pomp`, `x_cord`.*
- [x] **State clips:** everything in the state clips table. `idle` is a
      preacher's rock, heel to toe, the Bible held to his chest; walks are a
      confident stride. Intros: raises the Bible to the heavens; points at
      the camera ("Yes, YOU."). Wins: arms wide, eyes closed, basking; counts
      a fan of banknotes and tucks them in his jacket. *Done, but: `idle`
      holds the Bible to his chest with the shared breath (no heel-to-toe
      rock yet), and `win_2` counts and tucks invisible notes (no banknote
      prop, to keep to five shape keys).*
- [x] **Move clips** (table below). *Done: Collection Plate is a backhand frisbee throw with the lead hand (the Bible is in the rear), left held out; Laying On of Hands is an open lead palm (not the rear: the Bible again), and the healing version adds a rapture pose 20–31; Fire and Brimstone raises both arms and slams them down, the blessed one on his toes with a held beat at the top. These use two new per-move overrides in `lib/anim.py`: `palm` and `keys` (hand-keyed poses).* Notes:
  - `Collection Plate`, `Collection Plate+`: a sidearm frisbee throw of the
    plate on frame 14. It comes back: he doesn't need a catch pose (the
    move is over by then), but a hand held out at the end of the clip reads
    well.
  - `Laying On of Hands`: a palm to the forehead, rear hand, on 10–12. `(healing)`
    is the same strike (it's 46 frames, not 36), then he throws his head back,
    arms up, and glows on frame 24 (the game shows the heal there): give it a
    clear rapture pose from about 20 to 30.
  - `Fire and Brimstone`: he raises both arms on startup (1–17) and brings
    them down on 18–21; the blast hits all round him, front and back (the
    box runs from −1.2 to +1.2 m). The `(blessed)` version is bigger in every
    way (−2.2 to +2.2 m, up to 2.4 m high, armoured on 4–17): rising onto his
    toes, arms higher, a held beat at the top.
- [x] **`fx_plate`** (`props`): a gold collection plate 0.6 m across, a few
      bills and coins in it, flat, origin at its bottom centre. The game
      places it on the projectile, which flies flat at 0.95 m.
- [x] **`fx_brimstone`** (`props`): the blast, placed on him (like the
      Isobar Lasso's `fighter` placement) during the active frames: a ring of
      fire on the floor 2.4 m across rising to a column of light 2 m high,
      origin at its bottom centre. The game scales nothing, so make it to the
      plain move's size; the blessed one plays the same mesh.

### 19. The Eleven O'Clock News (stage, Nov 9, game side)

Margaret's show, the third stage: a 1987 local news studio. Built like
Feel the Burn (step 14): `blender/stages/news.py`, `npm run art -- --only
news`, writing `art/stage-news.blend`, `art/textures/stage-news_*.png` and
`public/assets/stages/news.glb`. Same stage space, materials and `lights`
node. The game side is in (0.18.0: `src/sim/stages.ts`,
`src/render/newsSet.ts`); until the GLB exists it plays on flat stand-ins in
these colours and places, and `tests/assets.test.ts` checks the GLB once it
does.

| Segment | The game | The set |
| --- | --- | --- |
| 1. Headlines | Arena ±6 m. The anchor desk at x = 0 that either fighter can shove along the floor into the other (Interact); it can be jumped | The news set: a dark blue back wall with a big globe graphic, the *CH 0 NEWS* header above it, a station clock; studio cameras on pedestals at x = ±5.6; the lighting grid overhead |
| 2. The Ticker | Arena ±6 m. A ticker crawls along the bottom of the screen (the HUD does it). Every 6 seconds the anchor desk rides up on its hydraulic riser in the middle of the floor (x = 0, ±1 m), throwing anyone standing there | The same set, now on a breaking story: a red band across the back wall, *BREAKING* on the backdrop; the riser's plate in the floor at the centre |
| 3. Lights Out | Arena ±6 m. The studio lights fail one by one and fall on marked spots (x = −5, −3, −1, 1, 3, 5); the game dims the lights a step with each | The backdrop dead and dark, cables hanging from the grid where lamps were, two fallen lamps at the sides; no desk |

| Object | What | The game |
| --- | --- | --- |
| `set` | The floor, the back wall, the lighting grid with its lamps, the cameras at the sides | Always shown |
| `seg_headlines` | The globe and header, the clock | Segments 1 and 2 |
| `seg_ticker` | Over `seg_headlines`: the red band and the *BREAKING* panel, the riser plate | Segment 2 |
| `seg_lightsout` | The dead backdrop in front of the wall (z = −4.05), the hanging cables, the fallen lamps | Segment 3 |
| `prop_desk` | The anchor desk, 1.2 × 0.8 × 0.7 m, curved front with the station logo; origin at its bottom centre, placed at x = 0, z = −0.4 | Segment 1: moved to the prop's x, turned a little once it stops. Segment 2: at x = 0, raised up to 0.9 m by the riser with each strike. Hidden in segment 3 |
| `fx_lamp` | A studio fresnel lamp on its yoke, about 0.5 m, hanging lens down; origin at its bottom | Drops from 6 m to the floor at the struck spot during the strike |
| `fx_wreck` | The lamp smashed on its side, glass around it, 1.1 m across | Left on the spot for a second and a half |
| `fx_mark` | Yellow gaffer tape in a cross, 1.0 m across | On the spot a lamp will hit, during the warning |
| `lights` (no mesh) | `extras.segments`, as for Weather | Set on each segment change |

| Segment | Background | Ambient | Key | Rim |
| --- | --- | --- | --- | --- |
| Headlines | `#06101e` | `#dfe8ff` × 1.3 | `#ffffff` × 2.2 from (0, 6, 8) | `#4a7aff` × 0.8 from (3, 4, −4) |
| The Ticker | `#081428` | `#d8e4ff` × 1.2 | `#fff4e0` × 2.2 from (−3, 6, 7) | `#ff3a3a` × 0.9 from (−3, 4, −4) |
| Lights Out | `#020308` | `#8090b0` × 0.8 | `#fff0d0` × 2.0 from (0, 8, 6); the game dims it with each lamp down | `#3050a0` × 0.5 from (0, 3, −6) |

*Done (Nov 9): `blender/stages/news.py`, 1,566 triangles (0.38 MB). Notes under* The two new stages (Nov 9, art side) *in Feedback.*

- [x] `set`, the three `seg_*` and the light rigs. *The lights are the table above as given. The lamps hang from the grid in `seg_headlines`, not `set`, so that in Lights Out only their cables are left.*
- [x] `prop_desk` at the size above. *Walnut, a curved front with a blue CH 0 NEWS panel, a dark top: 1.2 × 0.8 × 0.7 m.*
- [x] `fx_lamp`, `fx_wreck`, `fx_mark`
- [x] Pass `tests/assets.test.ts`'s `news.glb` checks (written: objects, materials and atlas sizes, a rig per segment named as in `STAGES.news`, the desk's size and place)

### 20. Kitchen Live (stage, Nov 9, game side)

Gus's show, the fourth stage: a daytime cooking-show kitchen gone very
wrong. `blender/stages/kitchen.py`, writing `public/assets/stages/kitchen.glb`
and the rest as above. The game side is in (0.22.0: `src/sim/stages.ts`,
`src/render/kitchenSet.ts`).

| Segment | The game | The set |
| --- | --- | --- |
| 1. Prep | Arena ±6 m. A stockpot (x = −3) and a knife block (x = +3) on the counter; either fighter can throw them (Interact): the pot at chest height, the knife block low | A long stainless counter behind the fighters (z = −1.6, top at 0.95 m), a tiled back wall, shelves of jars, the extractor hood, the *KITCHEN LIVE* sign, a chequered floor |
| 2. Grease Fire | The fire takes both ends of the kitchen: the walls close in to ±4.5 m, and the fire flares at one end (x = ±3.4) every 5½ seconds | The same kitchen, burning: walls of flame at x = ±4.8 (0.6 m deep, 3.2 m tall, z −3 … +1), smoke under the ceiling, the counter's ends scorched |
| 3. The Oven | Arena ±6 m. The heat makes meter fill 50% faster (no hazard) | The fire out, everything blackened; the big oven at the back with its door hanging open and an orange glow pouring out |

| Object | What | The game |
| --- | --- | --- |
| `set` | Floor, back wall, counter, hood | Always shown |
| `seg_prep` | Shelves, jars, the sign | Segment 1 |
| `seg_grease` | The two fire walls (at x = ±4.8), the smoke | Segment 2 |
| `seg_oven` | The scorching, the open oven and its glow | Segment 3 |
| `prop_pot` | A big stockpot, about 0.55 m across and 0.45 m tall, lid on; origin at its bottom centre | On the counter top (y = 0.95, z = −1.6) at x = −3 until thrown; flies at 0.85 m, then lies where it stopped |
| `prop_knives` | A wooden knife block with handles, about 0.3 × 0.5 × 0.2 m; origin at its bottom centre | On the counter at x = +3; flies at 0.15 m (low) |
| `fx_flare` | A gout of flame from the floor, 1.4 m across at the base, 2.2 m tall; origin at its bottom centre | At the struck end during the strike, flickering |
| `fx_mark` | Yellow tape cross, 1.2 m across | On the end about to flare, during the warning |
| `lights` (no mesh) | As above | |

| Segment | Background | Ambient | Key | Rim |
| --- | --- | --- | --- | --- |
| Prep | `#1a1208` | `#fff4e0` × 1.4 | `#fff0d8` × 2.2 from (−3, 6, 8) | `#80c0ff` × 0.6 from (3, 4, −4) |
| Grease Fire | `#1c0800` | `#ffc890` × 1.2 | `#ffb060` × 2.0 from (0, 6, 7) | `#ff5010` × 1.2 from (0, 3, −4); the game flickers it |
| The Oven | `#200400` | `#ff9a60` × 1.1; the game swells it slowly | `#ff8040` × 2.0 from (0, 5, 7) | `#ff3000` × 1.0 from (0, 2, −5) |

*Done (Nov 9): `blender/stages/kitchen.py`, 4,210 triangles (1.20 MB). Notes under* The two new stages (Nov 9, art side) *in Feedback.*

- [x] `set`, the three `seg_*` and the light rigs. *The lights are the table above as given. The hood sits over the hob at x = −1.2; the sign and the oven are to its right (x = 3.6 and 1.4).*
- [x] `prop_pot` and `prop_knives` at the sizes above. *Exported at their counter places (x = ∓3, fwd −1.6, up 0.95).*
- [x] `fx_flare`, `fx_mark`
- [x] Pass `tests/assets.test.ts`'s `kitchen.glb` checks

### 21. Low-poly plus: what to keep from the HD experiment (Nov 9, game side)

`art/dale-hd-experiment` rebuilt Dale as one detailed character: sculpted as
distance fields in code, 17,778 triangles, one mesh and material, PBR with
baked normal and roughness maps, three joints per finger. Reviewed on Nov 9
in the viewer and in a training match on the iPhone profile: up close it's a
big step (a real face, real hands), but at play size (a fighter is 200–300
pixels tall on the phone) the detail disappears, the game draws fighters
with Lambert (`src/render/fighterModel.ts`), so the normal and roughness maps
are dropped, and a smooth, semi-realistic Dale clashes with the faceted
roster. It also misses the GLB contract (4.8 MB, JPEG textures, no `fx_*`
meshes or shape keys, finger bones outside the rig).

**Decision (Derek, Nov 9): keep the stylised low-poly look and bring over
the experiment's best ideas.** Don't merge the branch; its code is the
reference: `git show origin/art/dale-hd-experiment:blender/experiments/dale_hd/<file>`.

| From the experiment | Keep? |
| --- | --- |
| Three joints per finger, curls spread over them (`build.py`: `split_fingers`, `spread_curls`) | **Yes** (A) |
| Hand proportions: phalanx lengths, knuckles, palm and thumb ball (`hands.py`: `FINGERS`) | **Yes**, faceted (A) |
| Faces closed with no tunnels, checked by genus (`topology.py`) | **Yes** (B) |
| Lips set into the face, painted from their outline (`head.py`, `paint.py`) | **Yes** (B) |
| More texel density on the face and hands than the body (`build.py`: `DENSITY`) | **Yes**, within today's atlas sizes (C) |
| Smooth shading, normal and roughness maps, JPEG textures, 18k triangles | **No** |

**A. Finger joints** (first: Gus and Gideon are built on it)

*Done (Nov 9): all five fighters rebuilt. Notes under* Finger joints (Nov 9, art side) *in Feedback.*

- [x] Split each finger group's bone at the knuckles: new shared deform bones `thumb_2`, `index_2`, `index_3`, `fingers_2`, `fingers_3` on each hand (`.L`, `.R`), each the child of the one before, in `blender/lib/rig.py` DEFORM. Bone counts stay under 48 (Mumbles, the most, goes from 35 to 45). *Done: placed by `rig.finger_joints` (`PHALANGES`: the fingers cut at 48% and 77% of their length, the thumb at 55%). Bones: Dale 42, Rox 43, Hollis 41, Mumbles 45, Margaret 42.*
- [x] Spread the curls: the rig's one-hinge curl (100°) becomes about 90°, 100° and 70° over the three knuckles, using each bone's bend sign; a splay or an open hand stays on the base joint, halved, so fingers never bend backwards. Port `spread_curls` into `lib/anim.py` so every generated clip gets it. *Done in `rig.pose_hands_and_jaw` instead (`SHARES`), so every pose is spread as it's keyed: no pass over the actions afterwards, and the build's checks see the final hands.*
- [x] Hands modelled to the joints, still faceted: each finger as separate tapering pieces (4–6 sides), knuckle bumps, a palm with the thumb's ball. About 400 triangles a hand. *Done (`body.hand`): four fingers of three five-sided pieces each, the thumb in two, a knuckle bump per finger, the palm and a thumb ball; about 300 triangles a hand. Body triangles: Dale 3,038, Rox 2,998, Hollis 3,114, Mumbles 2,654, Margaret 3,052.*
- [x] Mind the 2 MB: ten more bones in about 66 clips. Key the new joints only where they move (not every frame) and keep the spring off them. If a GLB still can't fit, note it in Feedback rather than raising the limit. *Done in `lib/glb.py`: a channel that holds still through a clip keeps two keys, identical tracks are stored once, and the default `LINEAR` is left out of the JSON (the per-channel JSON, not the key data, was most of the growth). GLBs: Dale 1.87 MB, Mumbles 1.74, Rox 1.68, Margaret 1.62, Hollis 1.56, about what they were before the ten bones.*
- [x] Once every GLB has them, move `FINGER_JOINTS` into `RIG_BONES`. *Done: they're in `RIG_BONES` in `tests/assets.test.ts` (required); `FINGER_JOINTS` is gone.*

**B. Faces** (with 16 D's shape pass)

*Done (Nov 9): all seven fighters (Mumbles' painted wooden face opts out of the planes and lips). Notes under* Faces (Nov 9, art side) *in Feedback.*

- [x] Planes that read at a distance: brow ridge, cheekbones, the nose as a wedge with nostrils, the jaw as its own piece on its bone.
- [x] No holes or tunnels: the experiment had one behind the nose bridge. Port `topology.py`'s genus check into the build checks (`lib/fighter.py`): the head and each hand must be genus 0.
- [x] Lips set into the face with tucked corners, painted from their outline with a soft edge instead of a flat shape.
- [x] Keep the stylised eyes (they read at play size); add a lid line. *Heavy lids (Hollis) are their own line.*

**C. Stay faceted, stay cheap**

- [x] Flat shading, one PNG atlas per material at today's sizes, Lambert-friendly colour (no normal, roughness or ORM maps). Give the face and hands more of the atlas than the body. *The hands joined the face's doubled texel density (`DENSE` in `lib/fighter.py`).*
- [x] Body up to about 8,000 triangles (16 D), effects as now. Keep every shape key and `fx_*` mesh, the heights against the hurtboxes, every strike in its hitbox and the juggle-box checks.
- [x] Dale first: compare him with the experiment in the viewer's FACE view, then the rest. *Compared with his old face (the experiment's GLB isn't one the viewer loads); Derek approved Dale, then the rest.* Gus and Gideon are built to this standard from the start.

### 22. Hit reactions (Nov 9, game side)

Today every hit on a standing fighter plays `hit_high` (or `hit_low` when
crouching or hit low): a jab to the face, a gut punch and a heavy Nightstick
all look the same. The game now knows where each hit lands and how hard
(hit weight, 0.31.0: light, medium, heavy, ender), so it can pick a
reaction that matches. Nine new state clips for **all seven fighters**,
generated in `lib/anim.py` next to `hit_high` and `hit_low` (keep those two:
the game falls back to them).

**How the game picks** (`src/render/pose.ts`, game side; until a clip is in
a GLB the game plays the fallback in the last column):

| Clip | Frames | When the game plays it | Falls back to |
| --- | --- | --- | --- |
| `hit_head` | 12 | A light or medium hit landing high (contact at 68% of the fighter's standing height or above: most punches) | `hit_high` |
| `hit_head_2` | 12 | The same, on the next hit of a combo: the game alternates the two, so a string doesn't replay one jolt | `hit_high` |
| `hit_head_heavy` | 18 | A heavy hit or a counter hit landing high | `hit_high` |
| `hit_body` | 12 | A light or medium hit to the body (between 35% and 68%: most kicks) | `hit_high` |
| `hit_body_2` | 12 | The alternate, as for `hit_head_2` | `hit_high` |
| `hit_body_heavy` | 18 | A heavy hit or a counter hit to the body | `hit_high` |
| `hit_legs` | 12 | A low hit (or contact below 35%) on a standing fighter | `hit_low` |
| `hit_crouch` | 12 | Any hit on a crouching fighter | `hit_low` |
| `stagger` | 30 | A long stun, 26 frames or more, whatever the height: a crushed guard (Tenderise), Margaret's Breaking (36), the Nightstick, the Flashlight, the Isobar Lasso | `hit_high` |

Launches, knockdowns and bounces don't use these (they're `launched`, the
juggle reactions, `down` and `ko`). A finisher's blows alternate
`hit_head_heavy` and `hit_body_heavy` (`hit_legs` for a low one), so those
two are seen most up close. *Game side done (0.33.0): the game picks these
already and plays the fallback until a GLB has the clip.*

**How they're played** (the same as `hit_high` today):

- The game restarts the clip on every hit and **holds the last frame** for
  the rest of the stun, which is 12 to 24 frames for most hits. In a string,
  the next hit often comes 8 to 14 frames later, so **the first 4 frames
  carry the read**: peak by frame 3 (light) or 4 (heavy), then ease.
- End each clip about halfway back toward `idle`, not all the way: it's
  held, and the fighter is still reeling until the stun ends (it cuts to
  `idle` or `block_*` then).
- **No `root` translation.** The game slides the body back by the hit's
  push. Feet stay planted: a heel may lift, and `hit_head_heavy` and
  `stagger` may shuffle the rear foot back a little, inside the idle
  stance's footprint.
- They follow the hit: the attacker is always in front (+x), so the head
  goes back and away (−x), never toward the attacker.
- Hands splay and the jaw knocks open with the `hurt` shape as `hit_high`
  does (the `jolt` dict). A prop in hand (Dale's pointer, Margaret's script,
  Gus's cleaver, Gideon's Bible, Hollis's keys) stays in that hand.

*Done (Nov 9): `Stance.hit_raw` / `hit_reactions` in `lib/anim.py`, per-fighter amounts, easing and `hit_flavour` in each fighter module. Notes under* Hit reactions (Nov 9, art side) *in Feedback.*

**Key poses** (angles as in `hit_high`: degrees, at the peak frame; scaled
by the fighter's stance `k` like the existing hits):

- [x] **`hit_head`**: the jab to the face. Head snapped back 35° and turned
  20° away from the camera, neck 15° back, chest back 10° and turned with
  it; the lead hand flies up and open, the rear hand drops. Peak frame 3,
  half back by 12.
- [x] **`hit_head_2`**: the mirror read: head snapped back 30° and turned
  20° *toward* the camera, the chest twisting the other way, the rear hand
  up. Same timing. The two should look like left and right hooks landing.
- [x] **`hit_head_heavy`**: the big one. Head whipped back 50° and turned
  30°, neck 25° back, chest 25° back and twisted 25°, the hips pushed
  forward and back arched, both arms flung back and wide; the rear foot
  slides back about 0.15 m and the lead heel lifts. Peak frame 4, hold to 8
  (the hit's freeze is 11 frames), eased to 60% by 18.
- [x] **`hit_body`**: a punch to the ribs. Chest knocked back 12° and
  folded 10° at the waist, head forward 10° (it follows the fold), a hand
  coming in to the ribs on the side that was hit (lead side), knees giving
  slightly (hips down 0.04 m). Peak frame 3.
- [x] **`hit_body_2`**: the other side: the twist reversed, the rear hand to
  the ribs, the shoulders dipping the other way. Same timing.
- [x] **`hit_body_heavy`**: doubled over. Folded 45° at the waist (spine 20°,
  chest 30°), head down 20°, both arms clutched in to the gut, knees bent
  (hips down 0.12 m), the jaw wide (`jaw` 0.9). Peak frame 4, held to 10,
  still bent 25° at 18.
- [x] **`hit_legs`**: a shin or a knee taken out. The lead knee buckles (the
  lead leg bent 35° more, its heel up), hips drop 0.08 m and tip toward the
  lead side, the torso pitches forward 15° and the arms swing out for
  balance. Peak frame 3.
- [x] **`hit_crouch`**: hit while crouched: stay crouched (inside the
  crouching hurtbox on every frame, as `crouch_idle` is checked), head and
  shoulders knocked back 20°, the rear hand dropping to the floor to catch
  the weight. Peak frame 3.
- [x] **`stagger`**: reeling. Frames 1–4 a heavy jolt (as `hit_head_heavy`'s
  peak, a bit less), then a stumble back: two short steps (rear foot, lead
  foot) by frame 20, arms loose and low, head lolling, torso half turned
  away; frames 20–30 wobbling on the spot, about to fall. The game holds
  frame 30 for stuns longer than 30 frames (Breaking is 36), so frame 30
  should hold well: off balance, arms down.

**Per fighter** (a multiplier on the angles above, and a touch of flavour):

| Fighter | Amount | Flavour |
| --- | --- | --- |
| Dale | 1.0 | The smile stays on under the `hurt` shape; the quiff and tie swing (they're `x_*` bones) |
| Rox | 1.1 | Springy: overshoots a little and snaps back faster (half back by frame 9) |
| Hollis | 0.7 | A big man: moves least, the head barely turns on light hits, the keys jangle |
| Mumbles | 1.4 | A puppet: floppy, limbs swing loose past the pose and settle; the head lolls on its neck; the jaw drops right open |
| Margaret | 0.9 | Composed: the script stays clutched to her chest, the head goes but the shoulders stay square |
| Gus | 0.85 | Heavy, the toque tips; the cleaver hand swings out wide |
| Gideon | 1.0 | The Bible goes up as if for protection on `hit_head` / `hit_head_heavy`; theatrical on `stagger` (an arm thrown out) |

**Checks and budget**

- [x] Exact frame counts (`tests/assets.test.ts` knows the nine names and
  their lengths) and no `root` translation.
- [x] `hit_crouch` inside the crouching hurtbox; the standing ones' heads no
  more than 0.1 m above the standing hurtbox (they lean back, not up).
- [x] **Under 5 MB a GLB** (Derek raised the limit from 2 MB for these
  clips, Nov 9). Dale is at 1.87 MB today, so there's room, but key the
  poses only (the build's key thinning keeps channels that hold still at
  two keys) and keep the spring bones as they are. Note each GLB's new
  size in Feedback.
- [x] Review in the art viewer (`/tools/viewer/?f=<id>`) at play size, and
  run `npx -y -p playwright@1.63.0 node tools/art-check.mjs`.

### 23. Baked light on the sets (Nov 9, game side)

The sets are lit only by the game's three lights per segment (an ambient, a
key and a rim), so every surface gets the same light: the corners where
walls meet floors aren't any darker, and no lamp in a set throws light
anywhere. Kitchen Live shows it most: white tiles, a white counter and a
white chef at one brightness. 0.34.0 (game side) brings tone mapping, a glow
on anything brighter than white, a sky-and-ground light in place of the flat
ambient, and reflections in the floors and Burn's mirrors. This step is the
art half: **bake the light that doesn't move into the sets**. It costs
nothing to draw (no new draw calls: it rides on the materials already there),
only some file size.

**A. Ambient occlusion (every stage)**

*Done (Nov 9): all four stages (`blender/lib/bake.py`). Notes under* Ambient occlusion (Nov 9, art side) *in Feedback.*

- [x] A second UV set (`TEXCOORD_1`) on `set`, every `seg_*` and every
  `prop_*`: a lightmap unwrap, no overlaps, a margin of 4 pixels or more.
  `fx_*` meshes don't need one.
- [x] Bake ambient occlusion (Cycles, distance about 1.5 m, denoised) into a
  greyscale atlas on that UV set: 1024² for the `set` material (`set` and
  every `seg_*`), 512² for `props`. Export it as the material's glTF
  occlusion texture (`occlusionTexture`, `texCoord: 1`).
- [x] Bake the `seg_*` pieces with segment 1's pieces in place (they're what
  is seen most), and each prop on its own (props move, so no floor in their
  bake: the game gives them their contact).
- [x] Soft, not black: the darkest corner about 35%. The game applies it to
  the sky-and-ground and ambient light only, never the key light, so it
  reads as corners and contact, not dirt.

**B. The set's own lamps**

*Done (Nov 9): all four stages (`LIGHTMAPS` in each stage module, `light_maps` in `blender/lib/bake.py`). Notes under* Light maps (Nov 9, art side) *in Feedback; read the one about the value's scale.*

The lamps you can see in a set should light it: pools on the floor under the
news studio's grid, the low dawn sun raking through Burn's windows, the hood
light over the hob, the oven pouring orange across the floor.

- [x] Bake only that light, the practical lamps in the set (not the game's
  ambient, key or rim, which it adds itself), as an RGB light map on the
  same `TEXCOORD_1` layout as the AO. glTF has no light-map slot, so it's
  its own file: `art/textures/stage-<id>_light.png`, exported to
  `public/assets/stages/<id>-light.png` (1024², PNG, sRGB), and named in
  the `lights` rig as `lightMapFile` (below): the game loads only the
  files the rig names.
- [x] Value: 1.0 in the light map lights a surface about as brightly as the
  key light does. Keep pools soft-edged; a hot spot under a lamp can go to
  about 1.5 (it will just begin to glow).
- [x] Per segment: one light map is the lamps that are on in segment 1. A
  segment whose lamps are very different can have its own,
  `<id>-light-<n>.png` (n is the segment, 1 to 3), named as that
  segment's `lightMapFile`; a segment that names none uses the first file
  the rig names: Kitchen's Oven (the glow from the oven door, the hood light dead),
  Burn's Burnout (the windows black, one top light), News' Lights Out (the
  grid lamps gone).
- [x] Add `lightMapFile` (the file name, e.g. `news-light.png`) and
  `lightMap` to each segment in the `lights` rig: which map and how
  strongly the game applies it, 0 to 2 (1 if it's left out). The game dims it
  further itself in Lights Out with each lamp that falls, and flickers it
  with Grease Fire's flames.

| Stage | Lamps to bake |
| --- | --- |
| Weather at Eleven | The lamp beyond the flats; the monitor cart's colour bars spilling on the floor; a soft wash down the weather map from above it |
| Feel the Burn at Dawn | The dawn sun through the windows, long warm bars across the floor and mats; the neon sign's pink spill on the mirrors and floor below it; (Double Time) the chase lights |
| The Eleven O'Clock News | The grid's fresnels: a pool on the floor under each, and a wash on the back wall; the globe's blue on the floor in front of it |
| Kitchen Live | The light under the hood on the hob and counter; strip lights under the shelves; (The Oven) the orange glow from the oven door across the floor |

**C. What glows**

*Done (Nov 9) for the four stages and the effect meshes; Hollis's lens waits on the game side. Notes under* What glows (Nov 9, art side) *in Feedback.*

The game's new glow (0.34.0) takes anything brighter than white and lets it
bloom, so whatever gives off light needs to say so: give it an emission in
Blender (the Principled BSDF's emission colour and strength export as glTF
`emissiveFactor`/`emissiveTexture` and `KHR_materials_emissive_strength`).

- [x] Paint emission into an emissive texture on the existing UVs (black
  everywhere that doesn't glow; it compresses to almost nothing), so there
  are still two materials. Strength 1.5 to 4: about 1.5 for a lit screen, 3
  for a neon tube or a lamp lens, 4 for lightning and flame.
- [x] Stages: Weather: the monitor's colour bars, the lamp's lens, the
  cameras' red tally lights, `fx_lightning` (4), `fx_spark` (3),
  `fx_puddle`'s rings (1.5; the game swells them on the warning). Burn: the
  neon sign (3), the chase lights (2), the dawn sky in the windows (1.2),
  the sun (3). News: the globe (1.5), the *CH 0 NEWS* header (2), the
  clock's face, the lamp lenses (3), the *BREAKING* panel (2), the tally
  lights. Kitchen: the *KITCHEN LIVE* sign (2.5), the hood light, the fire
  walls (3), `fx_flare` (4), the oven's mouth (3).
- [x] *(The effects; Hollis's lens is left: see Feedback.)* Fighters: only what really glows: Hollis's flashlight lens, and the
  `fx_*` meshes that are light or energy (Cold Front, Heat Lightning, Live
  Feed, Tape Skip's flash, Fire and Brimstone; 1.5 to 3). Bodies and
  clothes stay unlit.

**D. Burn's mirrors**

The game now reflects the fighters in Burn's mirrors (0.34.0, segments 1
and 2), drawn over the panes at z = −3.9 between x = −8 and 8, from the
floor to 3.0 m (where the chase lights start). Keep the panes there (or tell the game side where they
moved), and keep their painted room faint and a little darker than now so
the fighters' reflections read over it.

**Checks and budget**

- [x] `tests/assets.test.ts` (game side, written with 0.34.0) checks, once a
  stage has them: the occlusion on `texCoord` 1 and a `TEXCOORD_1` on every
  mesh that uses it, each named light map present and 1024² at most, and
  `lightMap` between 0 and 2.
- [x] Each stage's GLB plus its light maps under 5 MB in all (raised from 2 MB on Nov 10, when Kitchen and Burn sat at 1.99 and 1.98). *All four pass: Kitchen 1.99 MB, Burn 1.98, Weather 1.74, News 1.31.*
- [ ] Look at each segment in a match (Training, any segment) at the
  iPhone size and on desktop, with the performance overlay (` key): the
  draw calls mustn't change.

### 24. Depth: the studio round the fight, and the room at 3:33 a.m. (Nov 9, spec; game side in, 0.45.0)

0.34.0 gives each set haze, light beams and dust, and the title shows the
game on a CRT drawn by the shader. What's still flat is the space: every set
is a floor and a back wall, with nothing between the camera and the
fighters and nothing at the sides. This step adds three things to model. The
game side is in (0.45.0), built to these names; notes under *Depth (Nov 10,
game side)* in Feedback.

**A. Foreground silhouettes (every stage)**

*Done (Nov 9): all four stages (`blender/lib/foreground.py`). Notes under* Foreground (Nov 9, art side) *in Feedback.*

Studio kit between the camera and the fight, at the edges of the frame,
which the game draws as near-black shapes against the lit set. As the
camera tracks and pulls back, they slide past faster than the set does.

- [x] `fg_left`, `fg_right` in each stage GLB: a studio camera on its
  pedestal (Weather, News), a boom mic and its stand (Burn: a speaker stack
  and a mic stand; Kitchen: a second camera and a cue-card stand). Each at
  x = ∓6.2, z = +2.5 to +3.5, 1.6–2.2 m tall, in `props`. Keep them below
  half the screen's height when the camera is closest (6.4 m back, looking
  at 1.15 m): no higher than 2.2 m, and never between x = −4.5 and 4.5.
- [x] `fg_top`: something hanging into the top of the frame from the grid
  (a lamp on its yoke, a boom's tip, the hood's edge in Kitchen) at z = +2,
  y = 4.2 to 5.
- [x] Under 400 triangles each; one material (`props`).

**B. The audience in the dark**

*Done (Nov 9): every stage (`blender/lib/audience.py`) and every fighter's `sit_audience`. Notes under* Audience (Nov 9, art side) *in Feedback.*

Bleachers out past each side wall (x = ±8.5 to ±12, z = −2 to +2, rising
away from the floor), in near darkness, so the walls aren't the end of the
world when the camera pulls back. Losers become the studio audience
(DESIGN.md, the deal): in Arcade, the fighters you've beaten will sit
there, slumped and staring.

- [x] An object `audience` in each stage, shown in every segment: three rows of
  bench seats each side, a rail, a dim exit sign.
- [x] Empties `seat_1` … `seat_6` (three each side, front row) where the
  game will sit a fighter: origin on the seat, facing the fight.
- [x] A new state clip for every fighter, `sit_audience` (60 frames,
  looping): sitting, hands on knees, swaying very slightly, head turned to
  the fight. Same rules as the other state clips.

**C. The living room (the title)**

*Done (Nov 9): `room.glb` (`blender/stages/room.py`, `npm run art -- --only room`). Notes under* The living room (Nov 9, art side) *in Feedback.*

`public/assets/stages/room.glb`: where the viewer is at 3:33 a.m. The game
will draw the attract mode onto the TV's screen and push in through it on
START, in place of today's shader TV.

- [x] A 1987 living room, seen from a sofa: a wood-cabinet CRT on a stand
  (the screen 4:3, about 0.6 m across), a coffee table with an ashtray and a
  TV guide open at Channel 0, the sofa's arm in the foreground, a window
  with a streetlight's orange through the blinds, a standard lamp, off.
- [x] `screen`: the TV's glass as its own mesh, a curved quad with UVs 0–1
  across it, in a material `screen` (the game replaces it).
- [x] `camera_start` and `camera_end` empties: where the title's camera
  sits (on the sofa, about 2.5 m from the set) and where the push ends
  (just short of the glass, the screen filling the view).
- [x] The light: only the TV's glow (the game lights the room from the
  screen's colour) and the streetlight; bake the streetlight as in step 23.
- [x] Under 6,000 triangles, two materials plus `screen`, under 1.5 MB.

### 25. Fighting styles pilot: Rox and Hollis (Nov 9, game side)

Every normal is generated by one strike fitter that maps each button to one
limb (front punch the lead hand, back kick the rear foot) and aims it at the
hitbox, so all seven fighters' normals look alike. `docs/STYLES.md` sets out
what each fighter's style should be (shape, rhythm, space, properties,
strings); this step is the pilot's art: **Rox and Hollis only**.

*Done (Nov 10): both fighters, every clip below; `ART_PENDING` is empty. Notes under* Fighting styles pilot (Nov 10, art side) *in Feedback.*

The game
side is in (0.37.0): the moves below are in the data, and until a clip
lands the game plays the stand-in in brackets. `ART_PENDING` in
`src/render/pose.ts` lists what's owed; take each entry out as its clip
lands, and the asset tests then check it like any other.

**A. Rhythm: a timing profile per fighter** (`lib/anim.py`, `Stance`)

Today every generated strike eases the same way. Give `Stance` a timing
profile the fitter uses for every move clip, so each fighter moves like
themselves even in clips nobody hand-keys:

- `windup`: how far back the limb draws before the strike, and over what
  share of the startup (Rox: small, the last 30%; Hollis: big, the first
  60%, a visible load).
- `snap`: how sharply it reaches the strike pose (Rox: hard ease-out, there
  by the first active frame; Hollis: slower, still accelerating into it).
- `follow`: how far past the strike the body carries and how long it holds
  (Rox: little, already stepping to the next beat; Hollis: a big carry-
  through, weight onto the front foot, a held beat before he recovers).
- `settle`: the overshoot back into stance (Rox: a bounce, the springy
  `hit_ease` she already has; Hollis: none, he sinks back).

**B. Rox: the routine** (shape: claps, high kicks, splits; arms pump, legs do the damage)

- [x] `s.BP` **Clap Clap** (new shape, 22 frames; stand-in `FP FP`): two
  claps in front of the opponent's face, hands meeting at 1.15–1.5 m and
  0.2–0.8 m out on 8–9 and 12–13, elbows wide, bouncing on her toes.
  Hand-key it (`keys`): the claps are the point.
- [x] `s.FK` **High Kick** (retimed, 23 frames; stand-in `FK FK BP`): a
  straight-leg dance kick, the toe up to 2.1 m on 9–11, arms flung out for
  balance, the standing heel up. Nothing at waist height: it sails over a
  croucher.
- [x] `c.BK` **Splits Sweep** (same 34 frames, re-key): she drops into the
  splits and slides 0.05 m a frame on 2–10, the front foot along the floor
  out to 1.0 m on 10–12, arms up in a V.
- [x] String steps step in: `FP FP`, `FP FP FK`, `BP BP`, `BP BP FK`,
  `FK FK`, `FK FK BP` now carry her forward 0.03 m a frame before they land
  (the data's `motion`). Same lengths: re-key with a little step on each, on
  the beat.
- [x] `FP FP FK FK` **Grapevine Step** (new, 23 frames; stand-in `BP BP
  FK`): a grapevine across the front, the trailing foot kicking low
  (0–0.3 m, out to 1.15 m) on 8–9.
- [x] `FP FP FK FK BP` **Five, Six, Seven, Eight** (new, 33 frames;
  stand-in `FK FK BP`): a hop and a clap overhead, both fists coming down
  together on 14–15 at 1.0–1.6 m, landing in a pose (one arm up, hip out)
  through the recovery.

**C. Hollis: the night watch** (shape: a guard's body, collar grabs, knees, shoulders, the stick)

- [x] `s.FP` **Collar Grab** (same 20 frames, re-key; was Badge Flash): the
  lead hand shoots out open, closes on a collar at 1.2–1.55 m on 8–9 and
  yanks back to his chest by 14 (the game drags them in to 0.75 m).
- [x] `s.FK` **Knee** (retimed, 26 frames; stand-in `FK FK`): grabs the
  shoulders and drives a knee up into the gut, 0.8–1.35 m high and only
  0.85 m out, on 9–11; a heavy carry-through.
- [x] `FK FK` **Patrol** (same 29 frames, re-key): a second knee, walking in
  (0.03 m a frame on 2–10).
- [x] `c.BP` **Rising Clothesline** (same frames): armoured on 1–10 now, so
  braced on the way up (style `braced` for those frames).
- [x] `f.BP` **Shoulder Check** (same 41 frames, re-key): a barge, behind
  the shoulder, moving 0.05 m a frame on 4–20 and armoured on 1–16, the
  shoulder dropping onto them at 1.0–1.7 m on 22–23.
- [x] `f.FK` **Stiff Arm** (new, 42 frames; stand-in `f.BP`): a slow,
  locked-arm shove into the chest, palm at 0.9–1.6 m, 1.05 m out, on 20–22;
  a big wind-up (it's the slowest normal he has) and the weight thrown
  through it.
- [x] `BP FP FK` **Frisk** (new, 34 frames; stand-in `FP FP FK`): hands
  patting down, then grabbing a wrist and twisting it behind their back on
  8–9 (a reeling grab like Cuff 'Em; on a whiff, the hands close on air and
  he stumbles).
- [x] Retired: `FP BK` (Rounds) and `FK FK BP` (Clock Out) are gone from the
  data; drop their clips.

**Checks**

- [x] Exact frame counts (the clip table below is regenerated), strikes in
  their hitboxes, and no `root` translation beyond what the data's
  `motion` asks.
- [x] Rox's and Hollis's GLBs under 5 MB each.
- [x] Empty `ART_PENDING` of Rox's and Hollis's entries as their clips land.
- [ ] Review in the art viewer at play size, side by side with the old
  clips: could you name the fighter from the silhouette of each strike?

### 26. Air specials (Nov 9, game side)

*Done (Nov 10): all seven, both versions; out of `ART_PENDING`. Notes under* Air specials (Nov 10, art side) *in Feedback.*

Every fighter has a special in the air now (Special while jumping, once a
jump), with a boosted version, and air strings that chain one jumping
normal into another. The air strings reuse the jumping normals' clips; the
air specials are new, and until a clip lands the game plays the stand-in
in brackets (`STAND_INS`, `ART_PENDING` in `src/render/pose.ts`). The
boosted clip (`+`) can be the plain one with more on it, as elsewhere.
Frames, hitboxes, hovers and dives are in the clip table below.

- [x] `dale:Downpour`, `Downpour+` (34 frames; stand-in `j.BP`): the
  umbrella opens over his head and he hangs there (frames 1–16, 1–20
  boosted), the free arm hurling hail down and forward on 12 (and 15 and
  18 boosted).
- [x] `rox:Aerobic Dive`, `Aerobic Dive+` (40 frames; stand-in `j.FK`): a
  beat's pause (1–5), then down at 45° heel first from 6, the other leg
  tucked, arms swept back; it's cut short when she lands.
- [x] `mumbles:Cut the Strings`, `Cut the Strings+` (34 frames; stand-in
  `Strings Attached`): the strings snap and he's gone (off screen 5–15),
  back behind them at the same height on 12, hanging limp, then dropping
  feet first from 16.
- [x] `hollis:Searchlight`, `Searchlight+` (38 frames; stand-in
  `Flashlight`): he hangs in the air (1–22) and sweeps the flashlight
  down across the floor in front of him, 12–16. The beam effect
  (`fx_flashlight_beam`) can be reused, aimed down.
- [x] `margaret:On the Wire`, `On the Wire+` (32 frames; stand-in
  `Breaking`): she hangs at the height she's at and shoots straight across
  (6–16), the cue cards held out like a blade, hitting on 8–14 (two hits
  boosted, 8–10 and 13–15).
- [x] `gus:Cleaver Toss`, `Cleaver Toss+` (32 frames; stand-in `Mise en
  Place`): a cleaver thrown down and forward from the air on 10 (and 14
  boosted), hanging there 1–12.
- [x] `gideon:Rapture`, `Rapture+` (40 frames; stand-in `Fire and
  Brimstone`): arms out, head back, hanging (1–26), the light going off all
  round him on 14–20; armoured 1–13 boosted (glows).

**The sets in the Stage Sign-Offs.** Each stage's own finisher (close up,
the loser's back to a wall, → ↓ BLOCK) ends with the set coming down on
the loser where they lie, and it uses pieces the sets already have: the
lightning bolt and the cable sparks (Weather), `fx_shard` and `fx_shatter`
(Burn), `fx_lamp` and `fx_wreck` (News), `fx_flare` (Kitchen), placed at
the loser in any segment, not only the one whose hazard they belong to. No
new art is needed; if a piece looks wrong outside its own segment's
lighting, that's the thing to fix.

### 27. Competitive pass: boxes, ducking, three boosts (Nov 10, game side)

**Hitboxes moved, clips didn't.** Every mid and overhead now reaches the
lowest crouching head in the roster (Mumbles, 0.80 m), so about ninety
boxes start lower (0.75 m) than before; the clip table below has the new
boxes. No move's length changed, so every clip still plays. Where a
strike now plainly aims over a croucher's head, it's a *high* (the
standing jabs but Mumbles', the jab strings' second steps, Rox's claps and
High Kick, Hollis's Nightstick and Flashlight, Gideon's palm): those
should look high, and the others shouldn't look as if they'd miss someone
crouching. Worth a look in the viewer with a crouching opponent.

**A hit knocks a croucher upright.** `hit_crouch` plays for the first hit
on a crouching fighter only; the rest of the combo uses the standing
reactions.

**Three new boosted specials** play the plain move's clip until theirs
land (`STAND_INS` in `src/render/pose.ts`; same lengths):

- [x] `dale:Heat Lightning+` (40 frames; stand-in `Heat Lightning`): the
  same rising strike, but with the lightning crackling round him from the
  start (invulnerable 1–9), and higher. *Done (Nov 10, hand-keyed:
  `_heat_lightning_plus`): a deeper coil, the fist down by the knee, then a
  leap (root up to 0.28 m by 12, the feet hanging) that drives the fist out
  through the top of the box; he lands on 15 with the arm still up. The
  crackle is the game's `fx_heat_lightning`. Also fixed in the plain one:
  the coil on frame 4 left the rear guard at chin height as he sank, so the
  arm wrapped over his head.*
- [x] `gideon:Laying On of Hands+` and `Laying On of Hands (healing)+` (36
  and 46 frames; stand-ins the plain ones): both hands, a mid this time
  (y 0.75–1.8), lifting them off their feet on 10–12. *Done (`_laying_plus`):
  both palms drawn back to the hips, driven into the chest on 10 and up
  under the chin by 12, onto his toes; the healing one goes on into the
  plain one's rapture from 20.*
- [x] `gideon:Fire and Brimstone+` (50 frames; stand-in `Fire and
  Brimstone`): between the plain and the blessed one: a smaller column of
  fire (reach ±1.6 m, up to 2.0 m), armoured 4–17 (glows). *Done:
  `_brimstone` takes a level now (0 plain, 0.5 boosted, 1 blessed): arms
  halfway to the blessed height, heels up, and the blessed one's held beat
  at the top.*

### 28. The specials pass (Nov 10, game side)

Every fighter has more specials now, and air strings made for juggles.
Each new move plays a stand-in from the fighter's own clips until its clip
lands (`STAND_INS` in `src/render/pose.ts`, in brackets below); frames,
hitboxes, hovers and dives are in the clip table under *Move clips*. The
boosted clip (`+`) can be the plain one with more on it, as elsewhere.

*Done (Nov 10): all 38 clips, hand-keyed per fighter (`_low_pressure`,
`_splits_drop`, `_elbow_drop` and so on in `blender/fighters/`), every
strike in its box. Boosted versions share the plain move's keys (the `+`
falls back to the plain override). Notes:*

- *A new strike tip, `elbow.L/R` (the forearm's root), for Hollis's Elbow
  Drop; `Fitter.place` moves the body and that hand for it.*
- *Mumbles' Clackety-Clack is marked `prop`: the jaw makes the hit and the
  build can't check a jaw, so the head lunges into the box unchecked.*
- *Gus has no ladle: Ladle Hook is the cleaver hand hooking up. A ladle
  would be a fifth shape key (a full copy of the mesh); say if it's wanted.*
- *Air string spikes run from over the head to low in front on 6–9;
  the drops (Low Pressure, Elbow Drop, Belly Flop, Puppet Drop and the
  rest) hold their falling pose to the end, for the game to cut on landing.*

**Air specials on Down** (Down + Special in the air). Each hangs a beat,
then drops; they read best with a clear windup pose in the hang and a
committed, straight-line fall.

- [x] `dale:Low Pressure`, `Low Pressure+` (36 frames; stand-in `j.FK`):
  the umbrella snapped shut and pointed straight down like a spear, both
  hands on it; hang 1–5, straight down from 6; the tip leads (hit box
  under and just in front of him).
- [x] `rox:Splits Drop`, `Splits Drop+` (34 frames; stand-in `j.BK`):
  hang 1–4 knees tucked, then straight down into the full splits, a heel
  each side (box from 0.7 m behind to 0.8 m in front, at the feet).
- [x] `mumbles:Puppet Drop`, `Puppet Drop+` (32 frames; stand-in `Cut the
  Strings`): the strings go slack and he drops like dead weight, limbs
  loose, feet first, from 4; he lands first and is up quickly.
- [x] `hollis:Elbow Drop`, `Elbow Drop+` (36 frames; stand-in `j.BK`):
  hang 1–6 with the elbow raised high (armoured 1–10, 1–14 boosted:
  glows), then all of him down, elbow first, from 7.
- [x] `margaret:Cut to Commercial`, `Cut to Commercial+` (32 frames;
  stand-in `j.FK`): a quick tuck 1–4, then straight down heel first from
  5, the cue cards held out for balance.
- [x] `gus:Belly Flop`, `Belly Flop+` (38 frames; stand-in `j.BK`): arms
  and legs spread 1–6, then down belly first, a little forward, from 7;
  a big, flat landing (16 frames of landing lag; boosted armoured 1–10).
- [x] `gideon:Fall from Grace`, `Fall from Grace+` (38 frames; stand-in
  `Rapture`): hangs arms wide, head back 1–8 (armoured 1–8 boosted), then
  comes down on them, a little forward, from 9, the book raised in both
  hands.

**Follow-ups** (Special, then a button as it plays: the special's
`cancel` window). Each starts from the end pose of its special, so the
first frames should blend out of it.

- [x] `dale:Isobar Lasso BP` *Thunderclap* (31 frames; stand-in `c.BP`):
  from the lasso's reel-in, the umbrella brought up under their chin, a
  rising blow that puts them on the floor (hits 9–11, up to 2.0 m).
- [x] `rox:Star Jump BK` *And Down* (31 frames, crouching; stand-in
  `c.BK`): landing from the Star Jump straight into a low sweep.
- [x] `rox:Star Jump FP` *Reach for the Sky* (28 frames; stand-in `s.FK`):
  landing from the Star Jump straight into an uppercut, up on her toes,
  that puts them on the floor.
- [x] `mumbles:Strings Attached FP` *Boo!* (22 frames; stand-in `s.BP`):
  back on stage behind them, arms up, jaw dropped wide: a scare that hits
  (6–8).
- [x] `hollis:Key Ring BP` *Yank* (29 frames; stand-in `Key Ring`): the
  key ring's chain wrenched back with both hands, pulling them in and up
  (hits 9–11, from the floor to 1.5 m, out to 1.9 m).
- [x] `margaret:Breaking BK` *And Now This* (32 frames; stand-in `c.BP`):
  from the stagger strike into a rising kick, a launcher (hits 10–12).
- [x] `gus:Flambé BP` *Fan the Flames* (32 frames; stand-in `s.BP`): the
  skillet swept up through the fire, a launcher with long reach (out to
  1.6 m, 10–12). The fire effect can be reused on the skillet.
- [x] `gideon:Laying On of Hands BK` *Slain in the Spirit* (31 frames;
  stand-in `c.BP`): from the hand on their forehead, a push up and back, a
  launcher (10–12).

**Gideon's Begone** (back + Special):

- [x] `gideon:Begone`, `Begone+` (40 frames; stand-in `Laying On of
  Hands`): a palm thrust to the forehead with the whole body behind it,
  hits 13–15 (y 0.75–1.6, out to 1.25 m); boosted, he's armoured 1–12
  (glows) and the palm drives up.

**Air string steps.** Air strings now end in a spike that bounces the body
off the floor, with middle steps that reach high (to meet a body juggled
above). The attacker stops falling as each step chains and as it hits a
body in the air, so these play hanging in the air: they shouldn't drift
down in the clip.

- [x] `dale:j.FK FP` *Updraft*, `dale:j.BP BK` *Downburst* (15 and 18
  frames; stand-in `j.BP`): the umbrella hooked up under them, then
  swung down from overhead with both hands.
- [x] `rox:j.BP FP` *Air Clap*, `rox:j.FK BK` *Heel Drop* (stand-ins
  `j.FP`, `j.FK`): a clap overhead; an axe kick, heel straight down.
- [x] `mumbles:j.FK FP` *Clackety-Clack*, `mumbles:j.BP FK` *Pratfall*
  (stand-ins `j.FP`, `j.BK`): his jaw clacking at them; sitting down on
  them, hard.
- [x] `hollis:j.FK BP` *Baton Swing*, `hollis:j.BP BK` *Hammer Fist*
  (stand-in `j.BP`): the nightstick swung up; both fists brought down.
- [x] `margaret:j.BK FP` *Wire Copy*, `margaret:j.BP BK` *Headline Drop*
  (stand-ins `j.FP`, `j.BP`): cue cards flicked up; brought down edge
  first.
- [x] `gus:j.FK FP` *Ladle Hook*, `gus:j.BP BK` *Skillet Spike* (stand-ins
  `j.FP`, `j.BP`): a ladle hooked up; the skillet brought down flat.
- [x] `gideon:j.BP FP` *Benediction*, `gideon:j.BP BK` *Smite from Above*
  (stand-ins `j.FP`, `j.BP`): a blessing raised under them; the book
  brought down from on high.

A spike's hit box reaches from 0.3 m below the feet to 1.8 m above them,
so the swing starts high over the head and finishes low: the limb should
pass through both ends of that during the active frames (6–9).

### 29. Impact pass (Nov 10, game side)

The game now draws a swing arc over heavy strikes, a shockwave from the
contact, the light a blow throws, a jolt in the freeze and dust when a
body lands (`docs/VISUALS.md`). The art can make the same moments land
harder; none of this changes a clip's length or where its hits are.

- [x] **Smear frames on heavy attacks.** On the first active frame (or
  the frame before) of every heavy strike in the clip table (55 damage and
  up, launchers, knockdowns, bounces), stretch the striking limb along its
  path: a stretched forearm or shin mesh, or a smear shape keyed visible
  for one or two frames. The game's swing arc (`src/render/swoosh.ts`)
  stands in until then and can be turned down once the clips carry it.
  *Done (Nov 10): `anim.smear`, on every heavy hit (155 of 276: the data
  now marks them `heavy`, from `tests/blender-data.test.ts`) struck with a
  hand or foot: on the frame before the first active one, the forearm
  stretched 1.55× along its length (the shin 1.4×), a little thinner, its
  hand or foot with it, and back the next frame. It's bone scale, so the
  GLBs now carry scale tracks on `forearm.*` and `shin.*` (and the
  exporter's compensation on `hand.*` and `foot.*`); every other bone's
  scale is still 1. The active frames are untouched, so the hit checks
  stand. The swing arc can be turned down.*

- [x] **Hold the anticipation.** Heavy normals and specials with 12 or
  more frames of startup: reach the wind-up pose by about two-thirds of
  the startup and hold it (a slight drift, not a freeze), then snap
  through to the strike in two frames. The snap is what sells the hit.
  *Done: `anim.hold`, for generated heavy normals and specials with 12 or
  more frames of startup (hand-keyed moves and the styles pilot's rhythm
  already time their own): the wind-up at two-thirds of the startup, held
  creeping 6% further back, then through to the strike in two frames
  (the middle one is the smear).*

- [x] **Overshoot on contact.** On the first active frame, push the strike
  a few centimetres past the hitbox's far edge, then settle back: the
  pose at contact should be the most extended of the move.
  *Done: `anim.overshoot`: on a heavy hit's first active frame the hand
  or foot is pushed up to 8 cm further, to 2.5 cm past the box's far edge
  (inside the check's 4 cm), and settles back on the next. Not for chops,
  rising strikes, spins or held props.*

- [x] **Heavier hit reactions.** `hit_head_heavy`, `hit_body_heavy` and
  `stagger` (step 22): the head snapping a full 30–40° on frame 2, the
  spine following on 3–4. The freeze holds frame 1, so frame 2 is the one
  people see as the hit lands.
  *Done: `Stance.snapped`, a new frame 2 on `hit_head_heavy`,
  `hit_body_heavy` and `stagger`: the head and neck 85% of the way to the
  peak (40–45° back on the head hits), the body 20%, the face already
  hurt; the spine follows to the peak on 4.*

- [x] **Impact fx meshes** in Dale's GLB (shared, like `fx_tape_skip`):
  `fx_impact_ring` (a flat ring with a soft inner edge, 1 m radius, +y up)
  and `fx_crack` (a starburst floor crack, 1.5 m across, dark, for wall
  splats and ground bounces). The game draws its own rings and dust now;
  these would replace them with painted ones.
  *Done: in `dale.glb`: `fx_impact_ring` (1 m radius, the rim bright
  and fading to black inward, so it suits additive blending; it glows) and
  `fx_crack` (about 1.4 m across, a dark crater and nine jagged fissures),
  both flat, 1 cm and 6 mm thick, origin at the centre, +y up.*

- [x] **Named nodes on the sets that can move.** Per stage, a few nodes
  the game can shake or swing on big hits: `shake_*` (props near the walls:
  the weather map, the mirrors, the news monitors, the hanging pans) and
  `swing_*` (hanging lamps, pivot at the top). Origins at their pivots.
  *Done. Each is a child of its `set` or `seg_*` node (it shows and hides
  with it, shares its material and light map, and is baked with it), so
  find them with `getObjectByName`, not among the top-level objects; the
  origins are the pivots: Weather `shake_map` (map and header, under
  `set`), `shake_map_storm` and `shake_map_flood` (the overlays, under
  their segments: shake all three together), `shake_screen` (the green
  screen, pivot on the floor); Feel the Burn `shake_mirrors` (mirrors,
  frames and barre, pivot at the foot of the mirror wall),
  `shake_speakers_left` and `_right` (under `seg_warmup`, so gone in
  Burnout); News `swing_lamp0`–`5` (the fresnels, pivot on the grid at
  6.8 m, under `seg_headlines`); Kitchen Live `shake_shelves_left` and
  `_right` (the jar shelves, under `seg_prep`). Kitchen has no hanging
  pans yet: they'd be new set dressing (say if wanted).*

### 30. Set dressing that gets knocked about (Nov 10)

Loose odds and ends on each stage's floor that nobody can pick up or use:
feet kick them along, rolling props plough through them, low projectiles
push them, and hits, blocks, knockdowns, ground and wall bounces, hazards
and the Stage Sign-Off throw them about. The storm's wind drags the light
ones and the flood floats them. **Presentation only:** the simulation
never sees them (`src/render/clutter.ts`, physics in
`src/render/clutterPhysics.ts`, kinds and places in
`src/render/clutterData.ts`), so they can't change a fight. They go back
where they were at each round start.

Each kind is one object `clutter_<id>` in the stage's GLB, at the origin and
built round its middle, in the `props` material (`blender/lib/clutter.py`);
the game draws every piece of a kind as one instanced mesh (three draw
calls a stage) and shows a grey box of the same size until the GLB loads.
Pieces that roll lie with their axis along fwd (the game rolls them about
it). `tests/assets.test.ts` checks each object's size against
`clutterData.ts` (±15%), its middle at the origin and its material.

| Stage | Kinds (size side × up × fwd, m) | Pieces |
| --- | --- | --- |
| Weather | `clipboard` (0.3 × 0.03 × 0.4, flat), `mug` (0.15 × 0.14 × 0.11, *CH 0*), `tape` (gaffer roll, 0.2 × 0.2 × 0.07, rolls) | 2, 2, 1; all float on the flood |
| Burn | `dumbbell` (pink vinyl, 0.16 × 0.16 × 0.34, rolls), `bottle` (0.09 × 0.09 × 0.26, rolls), `towel` (0.5 × 0.04 × 0.32, flat) | 2, 2, 2 |
| News | `script` (0.22 × 0.025 × 0.3, flat), `mug` (navy, *NEWS*), `bin` (wastebasket with paper balls, 0.3 × 0.36 × 0.3) | 3, 1, 1 |
| Kitchen | `onion` (0.13 × 0.12 × 0.13, rolls), `lid` (0.32 × 0.05 × 0.32, flat), `spoon` (wooden, 0.36 × 0.03 × 0.07, flat) | 3, 1, 2 |

- [x] The objects above in each stage's GLB. *Done (Nov 10): 24 to 240 triangles each, about 0.03 MB a stage.*
- [x] Game side: physics, stand-ins, wired to the step's events (0.54.0).
- [ ] Look at them in a match at phone size: Kitchen's onions are small and brown on the checked floor and may want to be bigger or a brighter colour (tomatoes?).

### 31. Jumps by weight (Nov 14, game side)

Everyone used to jump the same arc (about 36 frames, 1.8 m up). Since
0.62.0 the jump carries the fighter's weight (`jumpVy`, `jumpVx` and
`jumpGravity` in each fighter's data): Mumbles floats, Hollis and Gus are
heavy, Rox is quick and low. `jump_up` and `jump_fall` are held clips, split
at the apex, so every clip still plays: the game holds the last frame of
`jump_up` until the fighter starts down, and of `jump_fall` until they
land. No stand-ins. A jump cancel's hop is now the same for everyone (15
frames up, about 1.2 m), whatever their own jump. Damage changed for Rox and
Mumbles but no clip's length or hitbox did, and every hit that was heavy
(step 29's smears) still is.

The new arcs, rise and fall in frames (the old one was 18 and 18):

| Fighter | Up | Down | Height | Notes |
| --- | --- | --- | --- | --- |
| Dale, Margaret, Gideon | 18 | 18 | 1.8 m | As before |
| Mumbles | 22 | 22 | 2.1 m | Floaty: drifts up, hangs, drifts down |
| Hollis | 15 | 15 | 1.4 m | Heavy: a short, low effort, down hard |
| Gus | 17 | 18 | 1.7 m | Heavy: a big man's jump that doesn't get far |
| Rox | 14 | 14 | 1.3 m | Quick and low: snappy, tucked |

- [ ] `mumbles:jump_up` (22 frames) and `mumbles:jump_fall` (22): the
  strings lift him slowly, limbs dangling a beat behind the body, a hang
  at the top (frames 18–22 of `jump_up` nearly still), and a slow,
  loose-limbed descent; feet only reach for the floor in the last 6.
- [ ] `hollis:jump_up` (15) and `hollis:jump_fall` (15): a heavy push off
  both feet, knees barely tucking, arms out for balance; the fall is a
  drop, shoulders hunched, the landing taken in the knees.
- [ ] `gus:jump_up` (17) and `gus:jump_fall` (18): the belly leads, the
  apron flaps up on the way down; little forward travel (1.5 m), so the
  legs cycle less than the others'.
- [ ] `rox:jump_up` (14) and `rox:jump_fall` (14): a quick tuck jump, knees
  high, arms pumping once; the fall straightens into a dancer's landing.
- [ ] `land` after the heavies' jumps: Hollis and Gus could sink a little
  deeper into the 2 frames (the game doesn't change its length).

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
| `jump_up`, `jump_fall` | hold | Split at the apex; the jump lasts about 36 frames (Mumbles 45, Gus 35, Hollis 30, Rox 28: step 31) |
| `land` | 2 | Exactly 2 frames (4 after an air attack: `land_attack`) |
| `dash` | Dale 16, Rox 14 | Exactly these |
| `tape_skip` | 10 | Exactly 10: the Tape Skip dash (0.11 m a frame), low and leaning |
| `backdash` | Dale 20, Rox 18 | Exactly these |
| `hit_high`, `hit_low` | 12 | Played and held for however long the stun lasts; the fallbacks for the reactions below |
| `hit_head`, `hit_head_2` | 12 | A light or medium hit to the head; the game alternates the two (step 22) |
| `hit_head_heavy` | 18 | A heavy or counter hit to the head (step 22) |
| `hit_body`, `hit_body_2` | 12 | A light or medium hit to the body; alternated (step 22) |
| `hit_body_heavy` | 18 | A heavy or counter hit to the body: doubled over (step 22) |
| `hit_legs` | 12 | A low hit on a standing fighter (step 22) |
| `hit_crouch` | 12 | Any hit on a crouching fighter (step 22) |
| `stagger` | 30 | A stun of 26 frames or more: reeling back (step 22) |
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

#### Dale Storm (`dale`): 40 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Clipboard Jab | normal | stand | 18 | 7–8: x 0.20…0.95, y 1.15…1.45 (high) |
| `s.BP` | Forecast Cross | normal | stand | 28 | 10–12: x 0.20…1.05, y 0.75…2.00 (mid) |
| `s.FK` | Front Kick | normal | stand | 26 | 11–13: x 0.20…1.50, y 0.60…0.95 (mid) |
| `s.BK` | Umbrella Jab | normal | stand | 35 | 14–16: x 0.20…1.75, y 0.75…1.40 (mid) |
| `c.FP` | Low Jab | normal | crouch | 17 | 7–8: x 0.20…0.90, y 0.70…0.95 (mid) |
| `c.BP` | Rising Umbrella | normal | crouch | 32 | 9–12: x 0.10…0.80, y 0.75…1.90 (mid) |
| `c.FK` | Shin Poke | normal | crouch | 23 | 8–9: x 0.20…1.25, y 0.00…0.30 (low) |
| `c.BK` | Ground Fog | normal | crouch | 38 | 12–14: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP` | Barometer Smash | normal | stand | 39 | 20–21: x 0.20…1.00, y 0.75…1.60 (overhead) |
| `b.FK` | Step Back Kick | normal | stand | 26 | 9–10: x 0.20…1.30, y 0.50…0.90 (mid) |
| `j.FP` | Jumping Jab | air | air | 16 | 5–10: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Hammer | air | air | 17 | 7–11: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Knee | air | air | 19 | 6–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Boot | air | air | 22 | 9–14: x 0.10…1.00, y 0.10…0.60 (overhead) |
| `j.FK FP` | Updraft | air | air | 15 | 5–8: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP BK` | Downburst | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Five-Day Outlook | normal | stand | 21 | 8–9: x 0.20…1.15, y 1.10…1.45 (high) |
| `FP FP BK` | Front Moves In | normal | stand | 34 | 12–14: x 0.20…1.35, y 0.70…1.20 (mid) |
| `FP BP` | Cloud Cover | normal | stand | 27 | 9–11: x 0.20…1.20, y 0.75…1.40 (mid) |
| `BP FK` | High Pressure | normal | stand | 30 | 10–12: x 0.20…1.30, y 0.50…0.90 (mid) |
| `BP FK FK` | Scattered Showers | normal | stand | 28 | 11–12: x 0.20…1.35, y 0.00…0.35 (low) |
| `FK BP` | Doppler | normal | stand | 33 | 16–17: x 0.20…1.20, y 0.75…1.60 (overhead) |
| `c.FP FK` | Ground Frost | normal | crouch | 30 | 9–10: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP BP` | Thunderhead | normal | stand | 32 | 12–14: x 0.20…1.25, y 0.75…1.40 (mid) |
| `Cold Front` | Cold Front | special | stand | 48 | 14: spawns projectile at x 0.50, y 0.00 |
| `Cold Front+` | Cold Front (boosted) | special | stand | 48 | 14: spawns projectile at x 0.50, y 0.00 |
| `Pressure Drop` | Pressure Drop | special | stand | 44 | 18: spawns projectile at x 2.20, y 3.00 |
| `Pressure Drop+` | Pressure Drop (boosted) | special | stand | 44 | 18: spawns projectile at x 1.60, y 3.00; 22: spawns projectile at x 2.40, y 3.00; 26: spawns projectile at x 3.20, y 3.00 |
| `Isobar Lasso` | Isobar Lasso | special | stand | 45 | 18–21: x 0.60…2.60, y 0.75…1.40 (mid) |
| `Isobar Lasso+` | Isobar Lasso (boosted) | special | stand | 45 | 18–21: x 0.60…2.60, y 0.75…1.40 (mid) |
| `Isobar Lasso BP` | Thunderclap | special | stand | 31 | 9–11: x 0.10…0.95, y 0.75…2.00 (mid) |
| `Heat Lightning` | Heat Lightning | special | stand | 40 | 6–9: x 0.10…0.90, y 0.75…2.20 (mid) |
| `Heat Lightning+` | Heat Lightning (boosted) | special | stand | 40 | 6–9: x 0.10…0.95, y 0.75…2.30 (mid) |
| `Downpour` | Downpour | special | air | 34 | 12: spawns projectile at x 0.40, y 0.40; 1–16: hangs in the air |
| `Downpour+` | Downpour (boosted) | special | air | 34 | 12: spawns projectile at x 0.40, y 0.40; 15: spawns projectile at x 0.40, y 0.40; … 4 hits to 18 |
| `Low Pressure` | Low Pressure | special | air | 36 | 7–34: x -0.20…0.75, y -0.20…0.70 (overhead); 1–5: hangs in the air; 6: dives (forward 0.02, down 0.17 m a frame) |
| `Low Pressure+` | Low Pressure (boosted) | special | air | 36 | 7–34: x -0.25…0.85, y -0.20…0.80 (overhead); 1–5: hangs in the air; 6: dives (forward 0.02, down 0.17 m a frame) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.60, y 0.30…1.60 (mid) |

#### Rox Vega (`rox`): 44 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wake-Up Jab | normal | stand | 15 | 6–7: x 0.20…0.85, y 1.15…1.45 (high) |
| `s.BP` | Clap Clap | normal | stand | 22 | 8–9: x 0.20…0.80, y 1.15…1.50 (high); 12–13: x 0.20…0.80, y 1.15…1.50 (high) |
| `s.FK` | High Kick | normal | stand | 23 | 9–11: x 0.15…0.95, y 1.20…2.15 (high) |
| `s.BK` | Roundhouse Rep | normal | stand | 31 | 11–12: x 0.20…1.15, y 0.75…1.20 (mid); 15–16: x 0.20…1.15, y 0.75…1.20 (mid) |
| `c.FP` | Crunch Jab | normal | crouch | 15 | 6–7: x 0.20…0.80, y 0.70…0.95 (mid) |
| `c.BP` | Star Jump Uppercut | normal | crouch | 28 | 8–10: x 0.10…0.75, y 0.75…1.80 (mid) |
| `c.FK` | Toe Tap | normal | crouch | 19 | 7–8: x 0.20…1.10, y 0.00…0.30 (low) |
| `c.BK` | Splits Sweep | normal | crouch | 34 | 10–12: x 0.20…1.00, y 0.00…0.30 (low) |
| `f.FK` | Step Touch | normal | stand | 31 | 16–17: x 0.20…1.00, y 0.75…1.50 (overhead) |
| `f.BP` | Lunge | normal | stand | 21 | 9–10: x 0.20…1.00, y 0.75…1.45 (mid) |
| `j.FP` | Jumping Jab | air | air | 14 | 4–9: x 0.10…0.75, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Elbow | air | air | 16 | 6–10: x 0.10…0.80, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Kick | air | air | 17 | 5–12: x 0.10…0.85, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Split | air | air | 19 | 7–12: x -0.60…0.95, y 0.10…0.60 (overhead) |
| `j.BP FP` | Air Clap | air | air | 15 | 5–8: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.FK BK` | Heel Drop | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Warm-Up | normal | stand | 17 | 6–7: x 0.20…1.00, y 1.10…1.45 (high) |
| `FP FP FK` | Reps | normal | stand | 24 | 8–10: x 0.20…1.15, y 0.55…0.90 (mid) |
| `FP FP FK FK` | Grapevine Step | normal | stand | 23 | 8–9: x 0.20…1.15, y 0.00…0.30 (low) |
| `FP FP FK FK BP` | Five, Six, Seven, Eight | normal | stand | 33 | 14–15: x 0.20…1.20, y 0.75…1.60 (overhead) |
| `FP FP FK BK` | Feel the Burn | normal | stand | 34 | 10–12: x 0.20…1.30, y 0.75…1.25 (mid) |
| `BP BP` | Jazzercise | normal | stand | 24 | 8–10: x 0.20…1.10, y 0.75…1.40 (mid) |
| `BP BP FK` | Low Impact | normal | stand | 26 | 9–10: x 0.20…1.25, y 0.00…0.35 (low) |
| `FK FK` | Kick Ball Change | normal | stand | 23 | 9–10: x 0.20…1.15, y 0.55…0.90 (mid) |
| `FK FK BP` | Step Up | normal | stand | 31 | 14–15: x 0.20…1.20, y 0.75…1.60 (overhead) |
| `c.FK FK` | Floor Work | normal | crouch | 22 | 7–8: x 0.20…1.20, y 0.00…0.30 (low) |
| `f.FK BK` | Cool-Down | normal | stand | 34 | 12–14: x 0.20…1.25, y 0.75…1.40 (mid) |
| `Grapevine` | Grapevine | special | stand | 28 | no hit |
| `Grapevine+` | Grapevine (boosted) | special | stand | 36 | 22–24: x -1.00…-0.10, y 0.50…1.30 (mid) |
| `Leg Warmer Lariat` | Leg Warmer Lariat | special | stand | 46 | 10–11: x -0.60…1.00, y 0.75…1.40 (mid); 16–17: x -0.60…1.00, y 0.75…1.40 (mid); 22–23: x -0.60…1.00, y 0.75…1.40 (mid) |
| `Leg Warmer Lariat+` | Leg Warmer Lariat (boosted) | special | stand | 46 | 10–11: x -0.60…1.00, y 0.75…1.40 (mid); 14–15: x -0.60…1.00, y 0.75…1.40 (mid); … 6 hits to 27 |
| `Count of Eight` | Count of Eight | special | stand | 47 | 9–10: x 0.20…1.10, y 0.40…0.90 (mid); 12–13: x 0.20…1.10, y 0.40…0.90 (mid); … 8 hits to 31 |
| `Count of Eight+` | Count of Eight (boosted) | special | stand | 47 | 9–10: x 0.20…1.10, y 0.40…0.90 (mid); 12–13: x 0.20…1.10, y 0.40…0.90 (mid); … 9 hits to 31 |
| `Star Jump` | Star Jump | special | stand | 34 | 16–18: x 0.20…1.00, y 0.75…1.60 (overhead) |
| `Star Jump+` | Star Jump (boosted) | special | stand | 34 | 16–18: x 0.20…1.00, y 0.75…1.60 (overhead); 1–15: armour (glows) |
| `Star Jump BK` | And Down | special | crouch | 31 | 9–11: x 0.20…1.10, y 0.00…0.30 (low) |
| `Star Jump FP` | Reach for the Sky | special | stand | 28 | 8–10: x 0.10…0.80, y 0.75…1.90 (mid) |
| `Aerobic Dive` | Aerobic Dive | special | air | 40 | 7–38: x 0.00…0.80, y -0.10…0.50 (overhead); 1–5: hangs in the air; 6: dives (forward 0.11, down 0.13 m a frame) |
| `Aerobic Dive+` | Aerobic Dive (boosted) | special | air | 40 | 7–38: x 0.00…0.80, y -0.10…0.50 (overhead); 1–5: hangs in the air; 6: dives (forward 0.11, down 0.13 m a frame) |
| `Splits Drop` | Splits Drop | special | air | 34 | 6–32: x -0.70…0.80, y -0.10…0.45 (overhead); 1–4: hangs in the air; 5: dives (forward 0.00, down 0.18 m a frame) |
| `Splits Drop+` | Splits Drop (boosted) | special | air | 34 | 6–32: x -0.80…0.90, y -0.10…0.50 (overhead); 1–4: hangs in the air; 5: dives (forward 0.00, down 0.18 m a frame) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.40, y 0.30…1.60 (mid) |

#### Hollis Bey (`hollis`): 40 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Collar Grab | normal | stand | 20 | 8–9: x 0.20…1.00, y 1.20…1.55 (high) |
| `s.BP` | Nightstick | normal | stand | 32 | 12–14: x 0.20…1.15, y 1.10…1.50 (high) |
| `s.FK` | Knee | normal | stand | 26 | 9–11: x 0.15…0.85, y 0.75…1.35 (mid) |
| `s.BK` | Door Kick | normal | stand | 39 | 15–17: x 0.20…1.35, y 0.75…1.30 (mid); 1–14: armour (glows) |
| `c.FP` | Low Jab | normal | crouch | 19 | 8–9: x 0.20…0.95, y 0.70…1.00 (mid) |
| `c.BP` | Rising Clothesline | normal | crouch | 36 | 11–14: x 0.10…0.85, y 0.75…2.00 (mid); 1–10: armour (glows) |
| `c.FK` | Toe Stomp | normal | crouch | 26 | 9–10: x 0.20…1.25, y 0.00…0.30 (low) |
| `c.BK` | Floor Sweep | normal | crouch | 42 | 14–16: x 0.20…1.40, y 0.00…0.30 (low) |
| `f.BP` | Shoulder Check | normal | stand | 41 | 22–23: x 0.20…1.05, y 0.75…1.70 (overhead); 1–16: armour (glows) |
| `f.FK` | Stiff Arm | normal | stand | 42 | 20–22: x 0.20…1.05, y 0.75…1.60 (mid) |
| `j.FP` | Jumping Chop | air | air | 17 | 6–11: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Hammer | air | air | 18 | 8–12: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Knee | air | air | 20 | 7–14: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Body Drop | air | air | 23 | 10–15: x -0.30…1.00, y 0.00…0.50 (overhead) |
| `j.FK BP` | Baton Swing | air | air | 16 | 6–9: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP BK` | Hammer Fist | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Pat Down | normal | stand | 23 | 9–10: x 0.20…1.10, y 1.10…1.50 (high) |
| `FP FP FK` | Cuff 'Em | normal | stand | 34 | 8–9: grab (reach 1.20) |
| `FP FP BP` | Lights Out | normal | stand | 38 | 14–16: x 0.20…1.30, y 0.75…1.40 (mid) |
| `BP FP` | Night Watch | normal | stand | 24 | 9–10: x 0.20…1.15, y 1.10…1.50 (high) |
| `BP FP FK` | Frisk | normal | stand | 34 | 8–9: grab (reach 1.20) |
| `BP FP BK` | Lockup | normal | stand | 40 | 16–18: x 0.20…1.40, y 0.00…0.35 (low) |
| `FK FK` | Patrol | normal | stand | 29 | 11–13: x 0.15…0.90, y 0.75…1.35 (mid) |
| `c.FP FK` | Sweep the Floor | normal | crouch | 33 | 10–11: x 0.20…1.35, y 0.00…0.30 (low) |
| `Clocking In` | Clocking In | special | stand | 50 | 10–12: grab (reach 1.10) |
| `Clocking In+` | Clocking In (boosted) | special | stand | 50 | 10–12: grab (reach 1.30) |
| `Flashlight` | Flashlight | special | stand | 37 | 14–17: x 0.40…2.20, y 1.20…1.70 (high) |
| `Flashlight+` | Flashlight (boosted) | special | stand | 37 | 14–17: x 0.40…2.60, y 0.75…1.80 (mid) |
| `Key Ring` | Key Ring | special | stand | 32 | 12–14: x 0.40…1.90, y 0.00…0.40 (low) |
| `Key Ring+` | Key Ring (boosted) | special | stand | 40 | 12–14: x 0.40…1.90, y 0.00…0.40 (low); 20–22: x 0.40…1.90, y 0.75…1.50 (mid) |
| `Key Ring BP` | Yank | special | stand | 29 | 9–11: x 0.30…1.90, y 0.00…1.50 (mid) |
| `Night Shift` | Night Shift | special | stand | 39 | 16–19: x 0.10…1.00, y 0.60…1.60 (mid); 1–18: armour (glows) |
| `Night Shift+` | Night Shift (boosted) | special | stand | 39 | 16–19: x 0.10…1.10, y 0.60…1.60 (mid); 1–22: armour (glows) |
| `Searchlight` | Searchlight | special | air | 38 | 12–16: x 0.20…2.00, y -1.60…0.40 (overhead); 1–22: hangs in the air |
| `Searchlight+` | Searchlight (boosted) | special | air | 38 | 12–16: x 0.20…2.50, y -1.90…0.50 (overhead); 1–22: hangs in the air |
| `Elbow Drop` | Elbow Drop | special | air | 36 | 8–34: x -0.20…0.80, y -0.20…0.60 (overhead); 1–6: hangs in the air; … 4 hits to 34 |
| `Elbow Drop+` | Elbow Drop (boosted) | special | air | 36 | 8–34: x -0.25…0.90, y -0.20…0.70 (overhead); 1–6: hangs in the air; … 4 hits to 34 |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.60, y 0.30…1.60 (mid) |

#### Mister Mumbles (`mumbles`): 39 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Wooden Jab | normal | stand | 16 | 6–7: x 0.15…0.90, y 0.75…1.10 (mid) |
| `s.BP` | Head Bonk | normal | stand | 24 | 9–10: x 0.15…0.95, y 0.75…1.35 (mid) |
| `s.FK` | Shin Kick | normal | crouch | 20 | 7–8: x 0.15…1.05, y 0.20…0.50 (mid) |
| `s.BK` | Spin Kick | normal | stand | 29 | 11–13: x -0.50…1.15, y 0.40…0.90 (mid) |
| `c.FP` | Knee Poke | normal | crouch | 16 | 6–7: x 0.15…0.85, y 0.40…0.65 (mid) |
| `c.BP` | Pop Up | normal | crouch | 28 | 8–10: x 0.10…0.80, y 0.75…1.80 (mid) |
| `c.FK` | Ankle Biter | normal | crouch | 20 | 7–8: x 0.15…1.15, y 0.00…0.25 (low) |
| `c.BK` | Leg Sweep | normal | crouch | 32 | 10–12: x 0.15…1.25, y 0.00…0.25 (low) |
| `b.BP` | Peekaboo | normal | stand | 33 | 18–19: x 0.15…1.00, y 0.70…1.40 (overhead) |
| `b.FP` | String Pull | normal | stand | 32 | 14–16: x 0.60…2.00, y 0.75…1.40 (mid) |
| `j.FP` | Jumping Bonk | air | air | 14 | 4–9: x 0.10…0.85, y 0.30…0.80 (overhead) |
| `j.BP` | Jumping Clap | air | air | 15 | 5–9: x 0.10…0.90, y 0.40…0.90 (overhead) |
| `j.FK` | Jumping Kick | air | air | 16 | 4–11: x 0.10…0.95, y 0.00…0.50 (overhead) |
| `j.BK` | Jumping Split | air | air | 18 | 6–11: x -0.50…1.00, y 0.00…0.45 (overhead) |
| `j.FK FP` | Clackety-Clack | air | air | 14 | 4–7: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP FK` | Pratfall | air | air | 17 | 5–8: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Ha-Ha | normal | stand | 18 | 7–8: x 0.15…1.00, y 0.75…1.15 (mid) |
| `FP FP FP` | Ha-Ha-Ha | normal | stand | 22 | 9–10: x 0.15…1.10, y 0.75…1.20 (mid) |
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
| `Strings Attached FP` | Boo! | special | stand | 22 | 6–8: x 0.15…1.00, y 0.60…1.30 (mid) |
| `Exit Stage Left` | Exit Stage Left | special | stand | 30 | 6–20: off screen; 12: reappears far back |
| `Knock-Knock` | Knock-Knock | special | stand | 55 | 30–33: x 0.15…1.20, y 0.00…0.90 (unblockable) |
| `Knock-Knock+` | Knock-Knock (boosted) | special | stand | 50 | 24–27: x 0.15…1.40, y 0.00…0.90 (unblockable) |
| `Cut the Strings` | Cut the Strings | special | air | 34 | 17–32: x -0.30…0.60, y -0.10…0.50 (overhead); 5–15: off screen; … 5 hits to 32 |
| `Cut the Strings+` | Cut the Strings (boosted) | special | air | 34 | 17–32: x -0.30…0.60, y -0.10…0.50 (overhead); 5–15: off screen; … 5 hits to 32 |
| `Puppet Drop` | Puppet Drop | special | air | 32 | 5–30: x -0.30…0.60, y -0.10…0.50 (overhead); 1–3: hangs in the air; 4: dives (forward 0.03, down 0.16 m a frame) |
| `Puppet Drop+` | Puppet Drop (boosted) | special | air | 32 | 5–30: x -0.35…0.70, y -0.10…0.55 (overhead); 1–3: hangs in the air; 4: dives (forward 0.03, down 0.16 m a frame) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.30, y 0.30…1.60 (mid) |

#### Margaret Okafor (`margaret`): 42 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Cue Card | normal | stand | 16 | 6–7: x 0.20…1.00, y 1.15…1.45 (high) |
| `s.BP` | Lead Paragraph | normal | stand | 25 | 9–11: x 0.20…1.15, y 0.75…1.50 (mid) |
| `s.FK` | Pointed Shoe | normal | stand | 24 | 9–11: x 0.20…1.40, y 0.55…0.90 (mid) |
| `s.BK` | Anchor Kick | normal | stand | 32 | 13–15: x 0.20…1.55, y 0.75…1.40 (mid) |
| `c.FP` | Footnote | normal | crouch | 17 | 7–8: x 0.20…0.95, y 0.60…0.90 (mid) |
| `c.BP` | Rising Headline | normal | crouch | 31 | 9–12: x 0.10…0.80, y 0.75…1.90 (mid) |
| `c.FK` | Low Bulletin | normal | crouch | 22 | 8–9: x 0.20…1.30, y 0.00…0.30 (low) |
| `c.BK` | Cut the Wires | normal | crouch | 36 | 12–14: x 0.20…1.40, y 0.00…0.30 (low) |
| `f.BP` | Paperweight | normal | stand | 37 | 19–20: x 0.20…1.00, y 0.75…1.60 (overhead) |
| `f.FK` | Field Report | normal | stand | 29 | 12–14: x 0.20…1.30, y 0.60…1.00 (mid) |
| `j.FP` | Jumping Cue | air | air | 16 | 5–10: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Headline | air | air | 17 | 7–11: x 0.10…0.90, y 0.80…1.30 (overhead) |
| `j.FK` | Jumping Heel | air | air | 19 | 6–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Kick | air | air | 22 | 9–14: x 0.10…1.00, y 0.10…0.60 (overhead) |
| `j.BK FP` | Wire Copy | air | air | 15 | 5–8: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP BK` | Headline Drop | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Top Story | normal | stand | 19 | 7–8: x 0.20…1.05, y 1.10…1.45 (high) |
| `FP FP BP` | And Finally | normal | stand | 31 | 11–13: x 0.20…1.25, y 0.75…1.40 (mid) |
| `FP FK` | Correspondent | normal | stand | 25 | 9–10: x 0.20…1.35, y 0.00…0.35 (low) |
| `BP BP` | Developing Story | normal | stand | 28 | 10–12: x 0.20…1.20, y 0.75…1.45 (mid) |
| `BP BP BK` | We Go Live | normal | stand | 33 | 12–14: x 0.20…1.30, y 0.75…1.60 (mid) |
| `FK BK` | Weather and Sport | normal | stand | 32 | 12–14: x 0.20…1.45, y 0.75…1.40 (mid) |
| `c.FP FK` | Small Print | normal | crouch | 28 | 9–10: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP BP` | Exclusive | normal | stand | 31 | 11–13: x 0.20…1.20, y 0.75…1.40 (mid) |
| `Breaking` | Breaking | special | stand | 32 | 8–9: x 0.20…1.15, y 0.75…1.40 (mid) |
| `Breaking+` | Breaking (boosted) | special | stand | 40 | 8–9: x 0.20…1.15, y 0.75…1.40 (mid); 16–17: x 0.20…1.20, y 0.75…1.40 (mid) |
| `Breaking BK` | And Now This | special | stand | 32 | 10–12: x 0.20…1.30, y 0.75…1.60 (mid) |
| `Teleprompter` | Teleprompter | special | stand | 44 | 8–26: counter stance; a strike read here plays `Teleprompter Read` |
| `Teleprompter+` | Teleprompter (boosted) | special | stand | 44 | 8–34: counter stance; a strike read here plays `Teleprompter Read+` |
| `Teleprompter Read` | Teleprompter: Read | special | stand | 30 | 3–5: x 0.10…1.80, y 0.30…1.80 (mid) |
| `Teleprompter Read+` | Teleprompter: Read (boosted) | special | stand | 34 | 3–5: x 0.10…1.80, y 0.30…1.80 (mid) |
| `Live Feed` | Live Feed | special | stand | 40 | 14: spawns projectile at x 0.70, y 0.00 (waits 30 frames) |
| `Live Feed+` | Live Feed (boosted) | special | stand | 40 | 14: spawns projectile at x 0.70, y 0.00 (waits 12 frames) |
| `Lead Story` | Lead Story | special | stand | 46 | 20–21: x 0.20…1.10, y 0.75…1.70 (overhead) |
| `Lead Story+` | Lead Story (boosted) | special | stand | 46 | 20–21: x 0.20…1.10, y 0.75…1.70 (overhead); 4–19: armour (glows) |
| `On the Wire` | On the Wire | special | air | 32 | 8–14: x 0.10…0.90, y 0.40…1.20 (overhead); 1–20: hangs in the air |
| `On the Wire+` | On the Wire (boosted) | special | air | 32 | 8–10: x 0.10…0.90, y 0.40…1.20 (overhead); 13–15: x 0.10…0.90, y 0.40…1.20 (overhead); 1–20: hangs in the air |
| `Cut to Commercial` | Cut to Commercial | special | air | 32 | 6–30: x -0.20…0.70, y -0.10…0.60 (overhead); 1–4: hangs in the air; 5: dives (forward 0.01, down 0.20 m a frame) |
| `Cut to Commercial+` | Cut to Commercial (boosted) | special | air | 32 | 6–30: x -0.25…0.80, y -0.10…0.70 (overhead); 1–4: hangs in the air; 5: dives (forward 0.01, down 0.20 m a frame) |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.50, y 0.30…1.60 (mid) |

#### Chef Gus Lamarre (`gus`): 39 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Taste Test | normal | stand | 20 | 8–9: x 0.20…1.10, y 1.15…1.50 (high) |
| `s.BP` | Skillet | normal | stand | 31 | 12–14: x 0.20…1.60, y 0.75…1.50 (mid) |
| `s.FK` | Oven Door | normal | stand | 26 | 10–12: x 0.20…1.45, y 0.50…0.90 (mid) |
| `s.BK` | Cleaver | normal | stand | 38 | 15–17: x 0.30…1.85, y 0.75…1.50 (mid) |
| `c.FP` | Paring Knife | normal | crouch | 19 | 8–9: x 0.20…1.00, y 0.60…0.90 (mid) |
| `c.BP` | Rising Ladle | normal | crouch | 33 | 10–13: x 0.10…0.90, y 0.75…2.00 (mid) |
| `c.FK` | Rolling Pin | normal | crouch | 25 | 9–11: x 0.20…1.50, y 0.00…0.30 (low) |
| `c.BK` | Sweep the Floor | normal | crouch | 39 | 13–15: x 0.20…1.70, y 0.00…0.30 (low) |
| `f.BP` | Meat Mallet | normal | stand | 40 | 21–22: x 0.20…1.25, y 0.75…1.70 (overhead) |
| `b.BP` | Back of the Pan | normal | stand | 34 | 13–15: x 0.30…1.70, y 0.75…1.40 (mid) |
| `j.FP` | Jumping Spoon | air | air | 17 | 6–11: x 0.10…0.85, y 0.60…1.10 (overhead) |
| `j.BP` | Jumping Skillet | air | air | 20 | 9–13: x 0.10…1.10, y 0.70…1.30 (overhead) |
| `j.FK` | Jumping Clog | air | air | 19 | 7–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Jumping Cleaver | air | air | 22 | 10–14: x 0.10…1.20, y 0.30…0.90 (overhead) |
| `j.FK FP` | Ladle Hook | air | air | 16 | 6–9: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP BK` | Skillet Spike | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Season | normal | stand | 21 | 8–9: x 0.20…1.15, y 1.10…1.50 (high) |
| `FP FP BK` | Chef's Kiss | normal | stand | 36 | 14–16: x 0.30…1.75, y 0.75…1.50 (mid) |
| `FP BP` | Sear | normal | stand | 32 | 12–14: x 0.20…1.50, y 0.75…1.50 (mid) |
| `BP BK` | Fillet | normal | stand | 37 | 15–17: x 0.30…1.80, y 0.75…1.50 (mid) |
| `FK FP` | Garnish | normal | stand | 22 | 9–10: x 0.20…1.20, y 1.10…1.50 (high) |
| `FK FP BP` | Plate Up | normal | stand | 34 | 13–15: x 0.20…1.40, y 0.75…1.70 (mid) |
| `c.FP BK` | Julienne | normal | crouch | 36 | 12–14: x 0.20…1.65, y 0.00…0.30 (low) |
| `Flambé` | Flambé | special | stand | 42 | 16: spawns projectile at x 1.60, y 0.00 |
| `Flambé+` | Flambé (boosted) | special | stand | 42 | 16: spawns projectile at x 1.90, y 0.00 |
| `Flambé BP` | Fan the Flames | special | stand | 32 | 10–12: x 0.20…1.60, y 0.40…1.60 (mid) |
| `Tenderise` | Tenderise | special | stand | 46 | 12–13: x 0.20…1.10, y 0.75…1.50 (mid); 20–21: x 0.20…1.10, y 0.75…1.50 (mid); 30–31: x 0.20…1.15, y 0.75…1.70 (mid) |
| `Tenderise+` | Tenderise (boosted) | special | stand | 42 | 12–13: x 0.20…1.15, y 0.75…1.50 (mid); 19–20: x 0.20…1.15, y 0.75…1.50 (mid); … 4 hits to 27 |
| `Mise en Place` | Mise en Place | special | stand | 40 | 14: spawns projectile at x 2.30, y 3.00 (waits 26 frames) |
| `Mise en Place+` | Mise en Place (boosted) | special | stand | 40 | 14: spawns projectile at x 1.60, y 3.00 (waits 18 frames); 16: spawns projectile at x 2.90, y 3.00 (waits 26 frames) |
| `Chop Chop` | Chop Chop | special | crouch | 48 | 14–16: x 0.20…2.00, y 0.00…0.35 (low) |
| `Chop Chop+` | Chop Chop (boosted) | special | crouch | 48 | 12–13: x 0.20…2.00, y 0.00…0.35 (low); 20–22: x 0.20…2.10, y 0.00…0.35 (low) |
| `Cleaver Toss` | Cleaver Toss | special | air | 32 | 10: spawns projectile at x 0.50, y 0.60; 1–12: hangs in the air |
| `Cleaver Toss+` | Cleaver Toss (boosted) | special | air | 32 | 10: spawns projectile at x 0.50, y 0.60; 14: spawns projectile at x 0.50, y 0.60; 1–16: hangs in the air |
| `Belly Flop` | Belly Flop | special | air | 38 | 8–36: x -0.40…0.90, y -0.20…0.70 (overhead); 1–6: hangs in the air; 7: dives (forward 0.05, down 0.15 m a frame) |
| `Belly Flop+` | Belly Flop (boosted) | special | air | 38 | 8–36: x -0.45…1.00, y -0.20…0.80 (overhead); 1–6: hangs in the air; … 4 hits to 36 |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.80, y 0.30…1.60 (mid) |

#### Rev. Gideon Price (`gideon`): 41 move clips

| Clip (= move id) | Name | Kind | Stance | Frames | Active frames and hitbox (metres, +x = forward, y = up from feet) |
| --- | --- | --- | --- | --- | --- |
| `s.FP` | Hand Raised | normal | stand | 18 | 7–8: x 0.20…1.00, y 1.20…1.50 (high) |
| `s.BP` | Good Book | normal | stand | 29 | 11–13: x 0.20…1.20, y 0.75…1.55 (mid) |
| `s.FK` | Testify | normal | stand | 24 | 9–11: x 0.20…1.30, y 0.50…0.90 (mid) |
| `s.BK` | Pulpit Kick | normal | stand | 34 | 13–15: x 0.20…1.45, y 0.75…1.35 (mid) |
| `c.FP` | Kneel | normal | crouch | 17 | 7–8: x 0.20…0.90, y 0.60…0.90 (mid) |
| `c.BP` | Rapture | normal | crouch | 31 | 9–12: x 0.10…0.80, y 0.75…2.00 (mid) |
| `c.FK` | Low Offering | normal | crouch | 22 | 8–9: x 0.20…1.20, y 0.00…0.30 (low) |
| `c.BK` | Bow Down | normal | crouch | 36 | 12–14: x 0.20…1.35, y 0.00…0.30 (low) |
| `f.BP` | Smite | normal | stand | 38 | 20–21: x 0.20…1.05, y 0.75…1.70 (overhead) |
| `j.FP` | Jumping Blessing | air | air | 16 | 5–10: x 0.10…0.80, y 0.60…1.10 (overhead) |
| `j.BP` | Descending Book | air | air | 19 | 8–12: x 0.10…0.95, y 0.60…1.20 (overhead) |
| `j.FK` | Jumping Heel | air | air | 19 | 6–13: x 0.10…0.90, y 0.10…0.60 (overhead) |
| `j.BK` | Ascension Kick | air | air | 22 | 9–14: x 0.10…1.00, y 0.10…0.60 (overhead) |
| `j.BP FP` | Benediction | air | air | 15 | 5–8: x 0.10…0.95, y 0.30…1.70 (overhead) |
| `j.BP BK` | Smite from Above | air | air | 18 | 6–9: x 0.00…1.00, y -0.30…1.80 (overhead) |
| `FP FP` | Amen | normal | stand | 19 | 7–8: x 0.20…1.05, y 1.15…1.50 (high) |
| `FP FP BP` | Hallelujah | normal | stand | 32 | 12–14: x 0.20…1.25, y 0.75…1.60 (mid) |
| `FP FK` | Sermon | normal | stand | 25 | 9–10: x 0.20…1.30, y 0.00…0.35 (low) |
| `BP BP` | Chapter and Verse | normal | stand | 29 | 11–13: x 0.20…1.25, y 0.75…1.50 (mid) |
| `BP BP BK` | Born Again | normal | stand | 34 | 13–15: x 0.20…1.35, y 0.75…1.60 (mid) |
| `FK BK` | Altar Call | normal | stand | 32 | 12–14: x 0.20…1.45, y 0.75…1.40 (mid) |
| `c.FP FK` | Humble Sweep | normal | crouch | 30 | 10–11: x 0.20…1.35, y 0.00…0.30 (low) |
| `Collection Plate` | Collection Plate | special | stand | 40 | 14: spawns projectile at x 0.60, y 0.95 (comes back after 26 frames; caught) |
| `Collection Plate+` | Collection Plate (boosted) | special | stand | 40 | 14: spawns projectile at x 0.60, y 0.95 (comes back after 24 frames; caught) |
| `Laying On of Hands` | Laying On of Hands | special | stand | 36 | 10–12: x 0.20…1.00, y 1.20…1.70 (high) |
| `Laying On of Hands (healing)` | Laying On of Hands (healing) | special | stand | 46 | 10–12: x 0.20…1.00, y 1.20…1.70 (high); 24: heals (glows) |
| `Laying On of Hands BK` | Slain in the Spirit | special | stand | 31 | 9–11: x 0.20…1.10, y 0.75…1.60 (mid) |
| `Laying On of Hands+` | Laying On of Hands (boosted) | special | stand | 36 | 10–12: x 0.20…1.05, y 0.75…1.80 (mid) |
| `Laying On of Hands (healing)+` | Laying On of Hands (healing, boosted) | special | stand | 46 | 10–12: x 0.20…1.05, y 0.75…1.80 (mid); 24: heals (glows) |
| `Fire and Brimstone` | Fire and Brimstone | special | stand | 50 | 18–21: x -1.20…1.20, y 0.00…1.80 (mid) |
| `Fire and Brimstone+` | Fire and Brimstone (boosted) | special | stand | 50 | 18–21: x -1.60…1.60, y 0.00…2.00 (mid); 4–17: armour (glows) |
| `Fire and Brimstone (blessed)` | Fire and Brimstone (blessed) | special | stand | 54 | 18–22: x -2.20…2.20, y 0.00…2.40 (mid); 4–17: armour (glows) |
| `Begone` | Begone | special | stand | 40 | 13–15: x 0.20…1.25, y 0.75…1.60 (mid) |
| `Begone+` | Begone (boosted) | special | stand | 40 | 13–15: x 0.20…1.30, y 0.75…1.70 (mid); 1–12: armour (glows) |
| `Rapture` | Rapture | special | air | 40 | 14–20: x -1.00…1.00, y -0.60…1.80 (mid); 1–26: hangs in the air |
| `Rapture+` | Rapture (boosted) | special | air | 40 | 14–20: x -1.50…1.50, y -1.00…2.20 (mid); 1–26: hangs in the air; 1–13: armour (glows) |
| `Fall from Grace` | Fall from Grace | special | air | 38 | 10–36: x -0.30…0.80, y -0.20…0.70 (overhead); 1–8: hangs in the air; 9: dives (forward 0.06, down 0.15 m a frame) |
| `Fall from Grace+` | Fall from Grace (boosted) | special | air | 38 | 10–36: x -0.35…0.90, y -0.20…0.80 (overhead); 1–8: hangs in the air; … 4 hits to 36 |
| `throw` | Throw | throw | stand | 28 | 5–6: grab (reach 1.00) |
| `interact` | Interact | interact | stand | 22 | 8: kicks the prop |
| `td` | Technical Difficulties | super | stand | 45 | 12–15: x 0.10…1.60, y 0.30…1.60 (mid) |

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
  - Each fighter has morph targets on `<id>_body` (`hurt`, `ko`, `win`; until step 16 A also `fist_L`, `fist_R` and Mumbles' `jaw`, now bones) and every clip animates all of them, so playing clips is enough; nothing needs setting by hand. Expressions: `hurt` in the hits, `launched`, `thrown`, `down` (part) and the start of `ko`; eyes closed at the end of `ko`; `win` grins (and shows Rox's sweat drop).
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
- **Feel the Burn at Dawn (Nov 9, art side).** Step 14 done; `npm run art -- --only burn`. Notes for the game side:
  - Everything is as the contract's tables say: object names, places and sizes, the light rigs, `set` 2048² and `props` 512² (no `water` material). `set` is 356 triangles, `seg_warmup` 378, `seg_double` 58, `seg_burnout` 336, the boombox 160 and the three effects 36.
  - The windows are separate panes per segment (dawn in `seg_warmup`, morning with the sun up in `seg_double`, a starry black in `seg_burnout`) in front of the frames painted on the wall in `set`, so they swap with the segments as the game already shows them.
  - Burnout has its own copy of the sign with every tube dead but BURN, the mirror frames with two posts knocked askew, jagged remnants in the panels' corners, bare concrete behind them, glass scattered along the wall and in front of the mats, and pleated drapes at ±8.4.
  - The floor carries a faded sunrise logo in front of the start marks and darkens past ±6.6, so in Burnout it runs off into the background colour without a hard edge.
  - `fx_shard` is two one-sided faces (front and back), point at the origin, 1.2 m tall; `fx_shatter` is 18 flat bits within 0.6 m, `fx_mark` two strips of tape, both a few millimetres off the floor.
- **The skeleton (Nov 9, art side).** Step 16 A done; all four GLBs rebuilt. Notes for the game side:
  - Every fighter has the 29 shared bones (`RIG_BONES`, now including `jaw`, `thumb`, `index` and `fingers`) plus its own: Dale 3, Rox 4, Hollis 2, Mumbles 6 (31 to 35 in all).
  - The fist and jaw shape keys are gone; the clips pose those bones instead, so playing a clip is still all the game does. Morph targets left: Dale `hurt`, `ko`, `umbrella`, `win`; Rox `hurt`, `ko`, `win`; Hollis `cuffs`, `hurt`, `ko`, `win`; Mumbles `hurt`, `ko`, `puppet`, `string`, `win`.
  - The `x_*` bones are keyed on every frame (the spring is baked). Loops wrap cleanly; one-shot clips start at rest and ease back to it over their last 8 frames, so switching clips doesn't make the tie or the hair jump.
  - GLBs: Dale 1.81 MB, Rox 1.64, Hollis 1.51, Mumbles 1.66. Dropping the fist keys saved less than the new channels cost (seven bones animated in every clip, the spring baked on every frame), so they grew 0.1–0.3 MB; step 16 D's shape pass should watch Dale's budget.
- **Margaret Okafor (Nov 9, art side).** Step 15 done; `npm run art -- --only margaret`. Notes for the game side:
  - 35 bones (the shared 29, `x_pages`, `x_bob.L/R`), morph targets `glasses`, `hurt`, `ko`, `win`; every strike and the juggle check pass, `idle` stands 1.748–1.754 m against her 1.75 m box.
  - `fx_live_feed` is in her GLB as the projectile (`src/render/arena.ts` already places it). Teleprompter Read reaches 1.8 m with the pages' sweep, so its hit is marked `prop` (the hand points the way, like the Isobar Lasso).
  - Two new move styles in `lib/anim.py`, for anyone's moves: `prompter` (a counter stance held over `counter.frames`) and `live` (pointing at the camera on a spawn). A counter window doesn't shout; the Read does.
- **Juggle reactions (Nov 9, art side).** Step 16 B done: `juggle_hit`, `relaunch`, `slam`, `floor_bounce` and `wall_splat` in all five GLBs, at their exact lengths, each starting and ending on `launched`'s held pose (frame 40), with no `root` translation. Notes for the game side:
  - **The tumble overflows the juggle box a little.** A body tucked into a ball is still 0.85–0.95 m across, and the juggle boxes are 0.65–0.8 m tall, so for the 4–6 frames of `relaunch` where the ball stands on end it pokes up to about 7 cm over the box's top and under its bottom (Rox's, the shortest box, the most). The build allows `relaunch` 15 cm of slack (`TUMBLE_SLACK` in `lib/fighter.py`) instead of 5. If that matters in play (a hit aimed at the top of a tumbling body), the box could grow during a relaunch, or the art could do a shorter turn.
  - Every other reaction frame stays inside the box with the usual 5 cm. On the smaller boxes some poses are toned down to fit (blended toward the held pose), so Rox's and Margaret's are a little less wild than Hollis's.
  - `wall_splat` happens lying down (the box is long and low, so the body can't stand against the wall): head first into it, arms flung back, then folding forward off it.
  - The viewer now draws the juggle box for the five reactions too.
  - GLBs grew by about 0.05 MB each: Dale 1.86 MB (of 2), Mumbles 1.72, Rox 1.69, Margaret 1.62, Hollis 1.57.
- **Finger joints (Nov 9, art side).** Step 21 A done; all five GLBs rebuilt, every build check and `tests/assets.test.ts` passing. Notes for the game side:
  - The ten new bones are in `RIG_BONES` now, so Gus and Gideon must have them (built on `lib/rig.py`, they will).
  - Nothing in the game reads finger bones, so no game change is needed. A fist reads clearly in close-ups (intros, wins, Sign-Offs); at play size it's the silhouette that changes.
  - Channels that hold still through a clip now have two keys (first and last) instead of one a frame. three.js plays them the same; anything else reading the GLB's animation data shouldn't assume one key per frame.
  - The viewer has a HAND view (`&view=hand`) that follows the lead hand.
- **Chef Gus Lamarre (Nov 9, art side).** Step 17 done; `npm run art -- --only gus`. Notes for the game side:
  - Every strike and height check passes; `tests/assets.test.ts` checks his GLB like the others (1.70 MB, 42 bones).
  - Two held props, `pan` and `mallet`: five shape keys in all (one over step 16's four), still well under 2 MB.
  - Mise en Place shows the generic "calling down from above" pose (hands up, watching), not a one-handed flick: worth a hand-keyed pose in 16 C.
  - `lib/anim.py` has a `chop` override: every hit of the move comes down from overhead like an overhead does, whatever its height. Gideon's Fire and Brimstone may want it.
- **Rev. Gideon Price (Nov 9, art side).** Step 18 done; `npm run art -- --only gideon`. Notes for the game side:
  - Every strike and height check passes; Fire and Brimstone is marked `prop` (the blast is the hit), so the hands aren't checked against its box.
  - `fx_brimstone`'s column of light is ten thin beams round him, not a solid column: placed on him, a solid one would hide him for the whole blast.
  - `lib/anim.py` has two new overrides: `palm` (an open hand on the strike) and `keys` (a function giving hand-keyed poses that replace the generated ones over their frames). `keys` is the way in for step 16 C's hand-keyed specials.
- **The two new stages (Nov 9, art side).** Steps 19 and 20 done; `npm run art -- --only news` / `--only kitchen`. Notes for the game side:
  - News: the riser is only its plate in the floor (`seg_ticker`). The desk rises 0.9 m over it with nothing underneath; a hydraulic column could be a separate object the game raises with it, if it wants one.
  - News: the lamps over the floor are in `seg_headlines`, so they're gone in Lights Out, where the cables they hung from are left.
  - Kitchen: `seg_prep` is the heaviest object (2,100 triangles, mostly jars); the whole stage is 4,210, about Feel the Burn's weight times three but well inside 20k. The flames are opaque cones in the `set` atlas, shaded root to tip; the game's flicker on the rim light sells them.
  - Neither stage has a stage viewer yet: I checked them with a throwaway page (the segment's lights from the `lights` node, from the game camera). A `?stage=` mode in the art viewer would make this easier next time.
- **Hit reactions (Nov 9, art side).** Step 22 done; every build check and `tests/assets.test.ts` passing. Notes for the game side:
  - GLBs: Dale 1.97 MB, Mumbles 1.84, Gus 1.79, Rox 1.77, Margaret 1.71, Hollis 1.64, Gideon 1.64: about 0.09 MB each for the nine clips, so they'd have fitted under the old 2 MB too.
  - The camera looks along the fighter's side axis, so an arm thrown out sideways goes into the screen and disappears behind the body. "Arms flung back and wide" (`hit_head_heavy`), Gus's cleaver and Gideon's arm on `stagger` are flung back (away from the attacker) and up instead, which reads from the camera.
  - The build checks the standing reactions' **heads** (the vertices on `head` and the bones under it) against the hurtbox plus 0.1 m, not the whole body: Mumbles' flung hand and Gideon's raised Bible go over it, and they're hands, not heads. `hit_crouch` checks the whole body against the crouching box; each fighter sinks it 6–12 cm deeper than `crouch_idle` (solved per build, `fit_hit_crouch`) so the lean back stays inside.
  - Flavour: Dale keeps `win` at 0.6 under `hurt`; Rox 1.1 and half back by 9; Hollis 0.7 with the head turning a third as far on light hits; Mumbles 1.4, swinging past the pose and back (an overshoot on frame 5) with the jaw wide; Margaret 0.9, the script to her chest and the shoulders square; Gus 0.85, the cleaver hand flung back; Gideon raises the Bible on the head hits and throws his lead arm out on `stagger`. The quiff, tie, keys, toque and the rest swing on their springs.
  - `hit_body` and `hit_body_2` are subtle at play size (the spec's 10–12° fold); worth a look in the game before 16 C.
- **Faces (Nov 9, art side).** Step 21 B, and 21 C's atlas item, done for all seven; every build check and `tests/assets.test.ts` passing. Notes for the game side:
  - The shared head (`lib/body.py`) has a wedge nose with two nostrils, a cheekbone plane under each eye and a lid line over each eye that squints with it. `mouth(…, lips=, skin=)` rolls lips along a grin or a closed mouth, upper on `head`, lower on `jaw`, painted from their outline and fading into the skin, with a dark tuck at each corner. Dale, Rox, Gus, Gideon and Margaret have lips; Hollis's mouth is under his moustache and Mumbles' is painted on.
  - The build fails if any piece on the head, a hand or a bone under them isn't genus 0 (`check_genus`); every piece is closed today, so it guards future modelling.
  - Body triangles: Dale 3,458, Rox 3,418, Margaret 3,448, Gus 3,476, Gideon 3,378, Hollis 3,182, Mumbles 2,760. GLBs: Dale 2.05 MB, Gus 1.89, Rox 1.87, Mumbles 1.85, Margaret 1.80, Gideon 1.74, Hollis 1.66.
- **Shape detail (Nov 9, art side).** Step 16 D done for all seven; every build check and `tests/assets.test.ts` passing. Notes for the game side:
  - Body triangles: Rox 4,894, Gus 4,792, Dale 4,642, Hollis 4,322, Gideon 4,322, Margaret 4,280, Mumbles 3,288. That's well under 8,000: the extra went where it changes the silhouette or a close-up, and more would mostly be smoothing, which the style rules out.
  - Shared (`lib/body.py`): more sides on the torso (18), arms and legs (12) and neck (10), still faceted; a bowl in each ear; a heel block under every shoe (`heel: False` for Gus's clogs, `heel_h` for Margaret's court shoes); and `hair_cover`, which lays chunky locks over a hair blob in rows, so smooth hair breaks up into a silhouette.
  - Per fighter: Dale's helmet hair in locks swept to his right, collar points and a blazer hem; Rox's perm in curls; Hollis's crop under a rounder cap, a bristled moustache, belt loops, collar points and boot laces; Mumbles' lapels, pocket hanky, jacket hem and shoe straps; Margaret's layered bob, jacket hem, pocket flaps and heels; Gus's toque pleats as ribs with a lobed puff, the neckerchief's tails, moustache strands and hair locks; Gideon's sides swept back into a ducktail, and a jacket hem.
  - Shape keys unchanged (`hurt`, `ko`, `win` and each fighter's held props). GLBs: Dale 2.31 MB, Rox 2.21, Gus 2.16, Margaret 1.96, Gideon 1.94, Mumbles 1.92, Hollis 1.88, all under 5.
- **Showcase (Nov 9, art side).** Step 16 C, first half: a generated pass (`showcase` in `lib/anim.py`) over every special and super (not `td`), the launcher `c.BP` and every string ender (a string id that no longer string starts with), except the moves already fully staged (teleports, spins, hops, Knock-Knock). Notes for the game side:
  - Anticipation: the key before the business coils further back, lower, twisted away from the striking side. The stretch over the business: the free arm thrown back (both arms for a kick), the rear heel up, the head driving in. Then an overshoot two frames after it (the striking hand or foot 7 cm further, the hips in), held into a longer follow-through. Only the limbs that hit in the move are left where the fit put them, so every strike check still passes.
  - Boosted versions (`+`, and Gideon's alternates) go 1.6 times as far and sink lower and further in over the business, so they look bigger as well as glowing.
  - `dazed` is slumped and knock-kneed, the arms hanging, the knees buckling twice a sway with the eyes closing on each dip.
  - GLBs grew 0.03–0.05 MB: Dale 2.36 MB, Rox 2.24, Gus 2.19, Margaret 2.00, Gideon 1.97, Mumbles 1.94, Hollis 1.91.
- **Ambient occlusion (Nov 9, art side).** Step 23 A done for all four stages; `npm test` passing. Notes for the game side:
  - Every object in a stage GLB has `TEXCOORD_1`, and `set` and `props` carry the AO as `occlusionTexture` on `texCoord` 1 (1024² and 512², greyscale PNG). `set`, the `seg_*` pieces and the `prop_*` objects are unwrapped onto it without overlaps (8 texels between islands); the `fx_*` meshes share those materials, so their `TEXCOORD_1` all sits on a white corner of the atlas: no AO on effects. `water` has none.
  - The exporter only writes occlusion from a glTF node group, so `lib/glb.py`'s `add_occlusion` adds it to the GLB after export. The atlases are also in `art/textures/stage-<id>_<material>_ao.png` for review.
  - Passes: `set` with segment 1's pieces in place (a stage's `FIRST`; Weather has none), each later segment's pieces with the set and segment 1's around them, each prop on its own. Cycles on the CPU (the P1000 isn't picked up), 256 samples, distance 1.5 m, a 3×3 smoothing inside the islands in place of a denoiser.
  - The curve: raw AO is taken to the 4th power, then lifted so 0 lands at 35%. Raw AO in the corners players see is only 0.75–0.9 (a few texels a metre, and the contact line is thin), so without the power it barely showed; faces hidden in contact reach the 35%, open floor stays white. Under the game's key light it reads as soft corners (the side walls' feet, under the hood, the mirrors' base), not dirt. Seen on a throwaway page from about the game camera, not yet in a match.
  - GLBs: Kitchen 1.60 MB, Weather 1.11, Burn 0.98, News 0.74 (all under 2 MB; Kitchen leaves about 0.4 MB for 23 B's light map).
  - The light maps (23 B) can use the same `TEXCOORD_1` layout as is.
- **What glows (Nov 9, art side).** Step 23 C done for the four stages and the fighters' effects; `npm test` passing. Notes for the game side:
  - Each stage and fighter module has an `EMISSION` table (part name pattern → strength, or a rule on the painted texels: `bright()` for letters, tubes and bulbs on a dark or red ground; Burn's windows glow sky and sun but not the muntins or rooftops). `lib/texture.py` paints it into an emission atlas per material on the existing UVs, each texel's colour scaled by its strength over the material's strongest; the material's emission strength is that strongest. glTF: `emissiveTexture`, `emissiveFactor` [1, 1, 1], `KHR_materials_emissive_strength`. The atlas is at most 1024² (Kitchen's 2048² of flames was half a megabyte), in `art/textures/*_glow.png` for review.
  - Strengths as the table above, but two came down after a look with a bloom: Burn's morning sky (Double Time) 0.7, since it's pale and washed the panes out at 1.2, and the News clock face 1.0, since a white face at 1.5 blooms into a ball. The cameras' tally lights (Weather, News) and Margaret's feed tally 2; the kitchen sign's letters and bulbs 2.5 on an unlit red ground; Kitchen has a new `hood_light` panel under the hood (2), and `oven_halo` 1.5 round the oven's mouth (3).
  - `glowFallback` in `src/render/look.ts` steps aside on its own now: `fx_lightning`, `fx_spark` and `fx_flare` carry their emission.
  - `fx_puddle`'s rings glow at 1.5 in the file, but `weatherSet.ts` sets the puddles' `emissive` colour (0 at rest), and with an emissive map that colour multiplies the map: at rest the rings don't glow, on the shock they glow in its colour. Probably what you want; say if not.
  - **Fighters:** emission is only on the effect meshes (Cold Front, Heat Lightning, Tape Skip's streaks, Live Feed and its tally, Fire and Brimstone's fire and glory). The `props` material is shared with the body's accessories, and `setTint` sets the body's `emissive` colour, which with an emissive map would only flash the glowing texels. So `fighterModel.ts` now clears the body materials' emission (the fx meshes keep theirs: they get their own materials). **Hollis's lens is not lit** for the same reason: it needs `setTint` to add its tint on top of the glow (a uniform in `addRim`'s shader, say) rather than replace `emissive`. Once that's in, add `"lens": 3` to Hollis's `EMISSION`.
  - GLBs: Kitchen 1.90 MB, which leaves about 0.1 MB for its 23 B light map (one 1024² PNG is more): 23 B may need the set atlas's flames or the light map at 512² there.
- **Light maps (Nov 9, art side).** Step 23 B done for all four stages; `npm test` passing. Notes for the game side:
  - Files and rigs: Weather `weather-light.png`; Burn `burn-light.png`, `burn-light-2.png` (Double Time: the sun higher and whiter, the cyan panel, the chase lights) and `burn-light-3.png` (Burnout: one work light overhead, the BURN tube's spill); News `news-light.png` (The Ticker and Lights Out use it too, so the game's dimming per fallen lamp has something to dim); Kitchen `kitchen-light.png` (Grease Fire uses it, for the game's flicker) and `kitchen-light-3.png` (The Oven: the oven's orange, the hood light dead). Segment 1 names map 1, a segment with its own map names that, and every segment has `lightMap`.
  - **The scale: please check.** The map holds light ÷ 1.5 (so a hot spot can reach 1.5 in an 8-bit PNG), and every rig's `lightMap` is 1.5 to undo that, so the game reads the values as they were baked. Map 1's 95th percentile of lit texels is 1.0 (every map of a stage shares map 1's scale), the brightest is clipped at 1.5. But `applyLightMap` uses the value as raw irradiance, the same units as a light's intensity, while the spec says 1.0 should light a surface about as brightly as the key light does, and the relit keys are 2 or more. In my renders the pools only read when I multiplied `lightMapIntensity` by the segment's key intensity, which is what the spec's wording implies. So either the game multiplies by the key (my suggestion: the art stays in key units), or tell me and I'll bake a fixed multiple in (it'd have to fit under `lightMap` ≤ 2).
  - How: Cycles' diffuse light (direct and indirect, no colour), on the AO's `TEXCOORD_1` layout of the `set` material, with a black world and every material's emission switched off, so only the lamps listed in `LIGHTMAPS` count. Like the AO, map 1 is baked in passes so the later segments' pieces are covered too; a segment's own map covers only the pieces shown in it. Smoothed 7×7 inside the islands (512 samples still leave noise, and noise doesn't compress).
  - Burn's sunlight has no window to come through (the wall is solid behind the panes), so it's a narrow beam (8° spread) from each quarter pane, angled down into the room: warm bars across the floor and the side walls at dawn, steeper and whiter in Double Time.
  - The Oven's orange mostly lands on the counter top and the wall: the counter is between the oven and the floor, so it doesn't pour across the floor the way the spec describes. A lamp low in front of the counter could fake it; say if it's wanted.
  - Weather's map header is the brightest thing the wash hits (it's nearest the lamp).
  - Budget: the light maps are big for their content (noisy gradients), so Kitchen's are 512² in steps of 4 (of 255) and Burn's in steps of 2 (`LIGHT_SIZE`, `LIGHT_STEP` in the stage modules). With them: Weather 1.65 MB, Burn 1.87, News 1.19, Kitchen 2.08 (of 2 MiB; the test counts 2,097,152 bytes). Kitchen has no room left: anything new there will need its set atlas trimmed.
- **Foreground (Nov 9, art side).** Step 24 A done for all four stages; `npm test` passing. Notes for the game side:
  - Weather: `fg_left` a pedestal camera, `fg_right` a boom mic on its stand, `fg_top` a boom's tip reaching in from the right. News: the camera, the boom, a Fresnel on its yoke. Burn: a PA speaker stack, a vocal mic stand, a Fresnel. Kitchen: the camera, a cue-card easel, the edge of a second hood.
  - Origins: `fg_left`/`fg_right` on the floor under their middle at x = ∓6.2, z = +3.0; `fg_top` at its pipe, y = 5.0, z = +2.0 (Weather x = 4.4, News −2.5, Burn 2.5, Kitchen −3.0), hanging down to 4.2. Nothing of `fg_left`/`fg_right` comes inside |x| = 4.7.
  - 24–240 triangles each, in `props`. The cameras' tally lights glow (`fg_cam_tally`, 2): if the game draws these as flat near-black, that's lost; worth keeping as the one lit point on the silhouette.
  - With the game's 30° lens they're out of frame until the camera pulls back past about 13 m; at 16 m they sit at the frame's edges, the cameras about a third of the height. Checked from about the game camera with them drawn black, not in a match.
  - They're in the props AO layout's white corner like the effects (no AO): they move with nothing, and the game draws them dark anyway.
  - Game side (Nov 10, 0.42.0): with touch buttons up, the camera now looks past the wall on the buttons' side (src/render/camera.ts, `buttons`): close up it can sit at x ≈ ±4.8, and then the `fg_` piece on that side would stand mid-screen in front of a fighter at that wall. When the foreground comes in, the game hides (or fades) the piece on the buttons' side while the camera is past its wall; the art needn't change.
  - Kitchen's glow atlas went to 512² (`GLOW_SIZE`) to make room under 2 MB; every stage atlas is now saved at PNG's strongest compression (lossless).
- **Audience (Nov 9, art side).** Step 24 B done; `npm test` passing. Notes for the game side:
  - `audience` in every stage GLB (the same on all four, built by `lib/stage.py`): three stepped rows each side from x = ±8.5 out to ±12, z = −2 to 2, each step 0.42 m higher, a bench on each, a rail along the front, a red EXIT sign on a post at the back whose panel glows dimly (1.2). 512 triangles, in `props`, in near-black colours. Like the foreground, it has no AO.
  - `seat_1`…`seat_3` on the left (z = −1.3, 0, 1.3), `seat_4`…`seat_6` on the right, at x = ±9.05, y = 0.54 (the front bench's top). Each empty's +Z (glTF), a fighter's front, points at the fight: place the fighter's root at the empty with its rotation (don't mirror them).
  - `sit_audience` (60, loop) in all seven GLBs, in the test's state clips: the root on the seat under the pelvis, the feet reaching down to the step 0.42 m below (Mumbles' dangle), hands on the knees, shoulders rolled forward, the head up at the fight, a very slight sway. Generated (`Stance.sit_audience` in `lib/anim.py`), so a fighter's own version can override it.
  - The build now skips moves in `ART_PENDING` (see *The pipeline*): Rox's and Hollis's step 25 moves and every fighter's air special (step 26) are owed, and Rox's and Hollis's new moves made the build fail outright. Those clips are now absent from all seven GLBs, where Dale's, Mumbles', Margaret's, Gus's and Gideon's air specials had generated ones; the game plays the stand-ins either way.
- **The living room (Nov 9, art side).** Step 24 C done: `public/assets/stages/room.glb` (0.68 MB) and `room-light.png` (0.59 MB), 890 triangles. Notes for the game side:
  - Objects: `set` (everything static: one material, `set`, 1024²) and `screen` (the glass, 96 triangles, material `screen`, UVs 0–1, u to the right and v up as the sofa sees it, bulging 2.5 cm toward the viewer). So it's one material plus `screen`: the props material is left out because the game puts the light map on every material of `set`, and props have their own UV layout.
  - `camera_start` (on the sofa, 2.6 m from the glass, eye height 1.05) and `camera_end` (0.84 m from the glass): empties whose −Z (glTF) looks at the screen's middle, as a glTF camera would. Each carries `fov` in its extras: 50 at the start (at the game's 30° the sofa sees only the TV) and 30 at the end, where the 0.45 m screen fills the height.
  - The streetlight is a small spot in the window's reveal (in front of the painted street, which would shadow one further out), shining down through the blinds: bars across the coffee table, the rug and the floor, in `room-light.png`, named in a one-segment `lights` rig (`lightMapFile`, `lightMap` 1.5) like the stages. The street outside glows (0.8, the lamp 3), and so does the VCR's clock (1.5), at 3:33.
  - Light from the screen is left to the game, as the spec says. In my renders a dim blue point light at the screen with the light map doubled read right; the scale question from *Light maps* applies here too.
  - The font in `lib/paint.py` gained `X` and `:` (EXIT, 3:33).
- **Depth (Nov 10, game side).** Step 24 is in the game (0.45.0); `tests/assets.test.ts` checks the names, the side pieces' reach and the seats. Notes for the art side:
  - Foreground (`src/render/depth.ts`): drawn in the near-black `0x0b0b10` with the atlas dropped, so only the emission (the tally lights) shows on them. A side piece hides while its inner edge (taken as |x| = 4.7, z = 3) would fall in front of a fighter, seen from the camera: close in past a wall with the touch buttons up, or a KO's swing. Keep `fg_left` and `fg_right` outside that (the test checks).
  - Audience: in Arcade the fighters beaten so far sit on the seats in the order `seat_2`, `seat_5`, `seat_1`, `seat_4`, `seat_3`, `seat_6`, each root at the empty with its turn, playing `sit_audience` (now a loop in `LOOPS`) a little out of step with each other. They're drawn without rim, outline or reflections, their colour scaled to 0.12 and lit like the set (its falloff), so they read as shapes in the dark; and only while the camera can see their seat.
  - The living room (`src/render/room.ts`): the fight is drawn at 4:3 (512 × 384) onto `screen`, the room lit by a point light 0.3 m in front of the glass in the picture's colour (the segment's key and ambient), flickering a little and flaring on hits, plus `room-light.png` at the rig's 1.5. The title rests 45% of the way from `camera_start` to `camera_end` (position, turn and lens), as at the sofa the TV sits small behind the menu; START pushes on to `camera_end`, then narrows the lens until the screen fills the width and cuts to the fight through a tear. The shader TV stands in until the room loads.
- **Air specials (Nov 10, art side).** Step 26 done: all fourteen clips at their exact lengths, every strike in its box, `npm test` passing; the fourteen entries are out of `ART_PENDING` in `src/render/pose.ts`. Notes for the game side:
  - Dale, Downpour: hand-keyed (`_downpour`); the umbrella (the `umbrella` key, shown 1–16, 1–20 boosted) held straight up over his head, the free hand winding up and hurling down and forward on 12 (and 15 and 18 boosted). The umbrella is the closed one from s.BK: it doesn't open.
  - Rox, Aerobic Dive: hand-keyed (`_dive`); arms up for the beat's pause (1–5), then heel first from 7 (the lead foot makes the hit), the other leg tucked, the arms swept back, held to the end.
  - Mumbles, Cut the Strings: the teleport style with the lead foot: hidden 5–15, dropping feet first on the hits.
  - Hollis, Searchlight: hand-keyed (`_searchlight`), `prop` (the beam is the hit): the flashlight raised, then the arm thrown down and forward on 12 and lifted toward the far end by 16 (a sweep from near to far). The arm is at full stretch: the hand can't get as low as the beam's start, so the beam should come from the hand, aimed down, as `fx_flashlight_beam` already does.
  - Margaret, On the Wire: generated with the rear hand (both hands taking turns, boosted); the script pages stay in the lead hand.
  - Gus, Cleaver Toss: generated (the spawn shape): the cleaver hand out on 10.
  - Gideon, Rapture: hand-keyed (`_rapture_air`), `prop`: the head back and the arms up and back, not out to the sides (the camera looks along his side, so arms out would vanish behind him), Bible high.
- **Fighting styles pilot (Nov 10, art side).** Step 25 done for Rox and Hollis; every strike check and `npm test` passing; `ART_PENDING` is empty. Notes for the game side:
  - A, rhythm: `Stance.windup`, `snap`, `follow` and `settle` (`lib/anim.py`, `rhythm()`), applied to every plain strike (no `style`, no throw or spawn); unset on the other five, so their clips are unchanged. Rox: a half-size draw over 70–90% of the startup, 81% of the way to the strike a frame early, a small carry, a 15% bounce back past the stance. Hollis: a 1.5× draw with the body loaded behind it by 60% of the startup and held, still accelerating over the last four frames, a full carry held four frames, sinking into the stance. Overheads (`chop`) keep their raised wind-up. The `Stance.windup()` pose for Technical Difficulties is now `td_windup()`.
  - New tools in `lib/anim.py`: hand-keyed `keys` functions can take the `Fitter` as a fourth argument and call `Fitter.place(pose, limb, (fwd, up))` to land a tip exactly; limbs can be `knee.L/R` and `shoulder.L/R` (the joint is what's checked against the hitbox); overrides `step: "beat"` (one step-together per window instead of walking) and `glide` (travels without stepping).
  - Rox: Clap Clap, High Kick, Splits Sweep and Five, Six, Seven, Eight are hand-keyed; the six strings take a step on the beat; Grapevine Step uses the `grapevine` style with the rear foot. **High Kick's toe peaks at 1.94 m, not 2.1**: that's a straight leg from a 1.75 m body with the standing heel up. It's inside the box (1.2–2.15); the box could come down to match if you like.
  - Hollis: Collar Grab, Knee, Patrol (the rear knee, walking in), Shoulder Check, Stiff Arm and Frisk's pat-down and wrist twist are hand-keyed; Rising Clothesline is `braced`. Shoulder Check turns his chest toward the camera to lead with the shoulder, so from the game camera it reads front-on rather than from behind the shoulder. Rounds and Clock Out are gone from his GLB.
  - Stand-ins in `STAND_INS` are left in place (harmless: only used when a clip is missing), as step 26 did.
  - GLBs: Rox 2.34 MB, Hollis 1.99 MB.
  - Still open: the silhouette review at play size with Derek.
