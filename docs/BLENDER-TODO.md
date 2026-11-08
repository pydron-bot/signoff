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
- `lib/glb.py`: compacts each export without changing it: channels that
  never leave the rest pose are dropped, rotations are stored as normalised
  16-bit integers, all animation data shares one bufferView. It also writes
  every clip's morph weights (sampled from the shape-key curves: Blender's
  exporter only writes them for the action assigned at export), so each
  clip sets every weight and no expression carries over. About 1.2–1.5 MB
  per fighter with 55+ clips and both atlases.

```sh
npm run art                  # all: art/*.blend, public/assets/fighters/*.glb
npm run art -- --only dale   # one target
npx -y -p playwright@1.63.0 node tools/art-check.mjs   # measures each GLB in three.js, screenshots to art-out/
npm test                     # tests/assets.test.ts checks every GLB against this file
```

**The scripts are the source for now:** a rebuild overwrites `art/*.blend`.
If the style moves to hand modelling, the `.blend` files become the source
and the scripts stop writing them (say which in this file).

The build fails if a strike misses: for every hit in the data, the striking
limb's tip must be inside the hitbox (±4 cm) on every active frame (moves
whose hit is an effect, marked `prop`, only point at it). The
**art viewer** loads a GLB the way the game will, with the hurtbox and each
move's hitboxes drawn on their active frames:
http://hive1:5174/tools/viewer/?f=dale on the dev server (`npm run dev`),
or `?clip=s.FP&frame=7` to open a frame, `&view=face` for a close-up of the
face or `&view=fx` for the effect meshes.

### What's in a fighter's GLB

- `<id>_body`: the skinned body (materials `body`, and `props` for
  accessories), each material with its PNG atlas, and morph targets
  `fist_L`, `fist_R`, `hurt`, `jaw` (Mumbles only), `ko`, `win`, whose
  weights every clip animates.
- `<id>_<part>`: other skinned parts that shouldn't count toward the
  fighter's size (Mumbles' strings, `mumbles_strings`).
- `fx_*`: effect meshes (projectiles, beams, decoys) at the origin, not
  skinned, in the `props` material. **The game should detach and hide them**
  and place copies itself; the viewer lines them up beside the fighter.

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
- [x] Agree the style with Derek before detailing: the stylised low-poly look, with more detail (step 8)

### 2. Dale Storm

- [x] Model and textures (≤ 20k triangles, 2 materials). *Detail pass done (step 8): 2,398 body triangles, plus 1,932 in effects.*
- [x] State clips (table below)
- [x] Move clips (generated table below), each matched to its active frames and hitbox
- [x] Projectile visuals as separate small meshes in the same file: `fx_cold_front` (a rolling wall of wind, about 0.7 × 1.4 m) and `fx_hail` (a hailstone, about 0.6 × 0.5 m)

### 3. Rox Vega

- [x] Model and textures. *Detail pass done (step 8): 2,474 body triangles, plus 240 in `fx_lariat_trail`.*
- [x] State clips
- [x] Move clips

### 4. Hollis Bey

- [x] Model and textures; the flashlight and key ring as props in the `props` material. *Detail pass done (step 8): 2,386 body triangles, plus 364 in effects.*
- [x] State clips, and move clips (generated table below). `Clocking In` is a command grab: frames 10–12 reach for the opponent; the throw itself plays as the thrower's `throw` hold (the victim plays `thrown`)
- [x] `fx_flashlight_beam` (a cone about 1.8 m long at head height) for Flashlight

### 5. Mister Mumbles

- [x] Model and textures. He uses the shared rig scaled to 1.30 m (same bone names, so the contract test still applies); the jaw can be a shape key or a `props` part. *Detail pass done (step 8): 2,042 body triangles; rig at 1.29 m with a head 1.43× larger; the jaw is a shape key (`jaw`); strings and control bar in `mumbles_strings`.*
- [x] State clips, and move clips. `Strings Attached` and `Exit Stage Left` are teleports: he is off screen for the listed frames (yanked up on his strings, then lowered back in); `Knock-Knock` is a slow, obvious wind-up (it can't be blocked, so it must read clearly)
- [x] `fx_hand_puppet`: the decoy, a hand puppet on a little stand, about 0.5 × 1.2 m

### 6. Weather at Eleven (stage)

The arena runs from −6 m to +6 m; fighters start at ±1.5 m. Three segments,
one per round (DESIGN.md has the details):

- [ ] Segment 1, The Studio: studio floor, the weather-map wall behind (about 40 × 10 m at 4 m back), a green screen (4 × 3 m), studio flats at the walls (±6.4 m)
- [ ] Two camera dollies (0.9 × 1.0 × 0.7 m) at x = ±4.6 m: they get kicked and roll along the floor, so model them as separate objects (`prop_dolly_left`, `prop_dolly_right`)
- [ ] Segment 2, The Forecast Comes True: the same set in a storm (a darker light rig, papers blowing); a lightning bolt mesh (`fx_lightning`, about 8 m tall) and a floor scorch decal
- [ ] Segment 3, Flood Warning: knee-deep water plane (`fx_water`) at about 0.22 m, and two live puddles (1.6 m wide) at x = ±3 m with sparking cables
- [ ] Studio lighting suggestion per segment (the game uses a fixed light setup per segment; note the colours and angles you used)

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

- [ ] Weather at Eleven (step 6 above) after the fixes and the detail pass: it's the only stage, and every match is played on it.
- [ ] Clip variety (later): a second `win` and `intro` per fighter.

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
- **Walk loops are shorter than 40 frames** (forward: Dale 16, Rox 12, Hollis 22, Mumbles 12): at these walk speeds a 40-frame cycle would need a stride far wider than a fighting stance, so the loop length follows the stride (0.36 m per foot, scaled) and the feet don't skate. The asset test accepts any loop of 12 frames or more for walks.
- **Root motion in a few clips (game side):** `down`, `getup`, `thrown`, `ko` and `launched` move and turn `root` (lying down, being thrown); Mumbles' teleports lift `root` 4 m up off screen over their hidden frames and lower him back in; Rox's `Star Jump` hops 0.35 m. Gameplay moves otherwise keep `root` still. The game should let these play as they are, not cancel `root`.
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
