# SIGN-OFF — Impact and visuals plan

Nov 10, 2026 · game side

How to make every hit land harder and the picture more striking, in the
order worth doing. What exists already is in `docs/DESIGN.md` (*Hits and
the camera*, *The broadcast look*): freeze by hit weight, sparks, the
signal spray, shake, lean and push-ins, impact frames, KO slow motion,
echoes, rim light, signal damage, the tape look. This plan builds on that.
**Done** items are in the game (next release); the rest are proposals.

Every item is costed against the iPhone 15 Pro budget (`CLAUDE.md`):
under 100 draw calls, fixed lights per segment, every shader compiled
during loading, nothing allocated per frame in hot paths. The fight
currently draws about 19 calls plus 3 to 7 a fighter model, the post
chain about 9: there's room, but every effect below either reuses a pass
or costs one or two calls only while it shows.

## What makes a hit feel big

A blow reads in three beats, and each one wants something different:

1. **Anticipation**: the wind-up tells you something big is coming (a
   pose held a moment, a gather of light, the camera easing in).
2. **Contact**: the frame it lands should be the loudest thing on screen:
   freeze, flash, light thrown on everything nearby, the picture itself
   bent by it.
3. **Follow-through**: the world answers: the body jolts, flies, hits the
   floor or the wall, and the set shows it (dust, a ring across the floor,
   a light swinging).

The contrast matters as much as the size: a jab stays small so a heavy
reads heavy. Everything below scales by the sim's hit weight (light,
medium, heavy, ender) and counter hits, as the freeze and shake already do.

## 1. Contact (done)

- **Shockwave** (done, `src/render/impact.ts`, `src/render/post.ts`). Heavy
  hits and enders (and counters) send a ring out from the contact that
  bends the picture as it passes; ground and wall bounces and a Stage
  Sign-Off's cue too. Done in the post pass's last shader from four
  numbers: no extra pass, no extra draw call. Stepped with the sim, so the
  freeze holds it and slow motion slows it. Off with Reduce Motion.
- **Zoom blur on enders** (done, same place). For seven steps after an
  ender the picture smears in toward the contact (four extra taps in the
  composite while it shows). Off with Reduce Motion.
- **The light a blow throws** (done, `ImpactLight` in `impact.ts`). A soft
  glow at the contact, past white so the bloom catches it, and a pool of
  warm light on the floor beneath that fades as the contact rises: the
  hit lights the fighters' feet and the floor for a moment. Counter hits
  burn amber. Two additive quads (two draw calls while lit), so the
  segment's fixed light rig and every compiled shader stay as they are.
- **The body jolts in the freeze** (done, `src/render/arena.ts`). While
  frozen in a hit's freeze the defender shakes side to side, step by step,
  by the hit's weight, dying away: the classic fighting-game hit shake.
  Blocks jolt a little. No cost. Off with Reduce Motion.
- **Counter-hit flash** (done, `arena.ts`). A counter hit flashes the body
  warm and two steps longer; enders flash brighter than before.

## 2. Anticipation and follow-through (done)

- **Swing arcs** (done, `src/render/swoosh.ts`). Heavy strikes (55 damage
  and up, or anything that launches, knocks down or bounces) draw a bright
  crescent in the fighter's colour over the hitbox from two frames before
  it goes active to five after, opening out as it goes: the blur of the
  swing a smear frame gives. Placed from the move data, so it's always
  where the sim checks. One mesh a fighter, a draw call only while shown.
  The art can replace it with smear frames in the clips (BLENDER-TODO
  step 29); until then this reads well at play size.
- **Dust and shock rings** (done, `src/render/dust.ts`). A knockdown, a
  ground bounce or a wall splat sends a bright ring across the floor (or
  up the wall) and kicks dust out low along it, drifting and fading in
  the studio light; a wall splat knocks plaster off. Two instanced meshes,
  two draw calls while anything's in the air.
- **Meter spotlight** (done, `impact.ts`, `post.ts`). A boost, Cut Away or
  Technical Difficulties drops the set into shadow round the fighter
  spending it, draining the colour from the dark, for a third of a second
  (half a second for TD): the "super flash" every fighting game uses to
  say *this costs something*. Done in the composite (no extra pass). It
  doesn't move the picture, so it stays with Reduce Motion.

## 3. Camera (done in 0.58.0, but for the launcher tilt-up)

- **Directional kick** (done). On enders the camera is knocked 0.16 m
  *against* the blow for 3 steps before it leans with it, then springs
  back. Pure maths in `camera.ts`. Off with Reduce Motion.
- **Launcher tilt-up** (small). On a launch, the look target rises ahead
  of the body for 10 frames so the juggle is framed before it happens.
- **Ender FOV punch** (done). 2.5° narrower on enders, wall splats and a
  super's hit, easing back over 12 steps (`CameraRig.fov`). One
  `updateProjectionMatrix` a frame while it runs.
- **Super cut-in** (done, `src/render/cutIn.ts`). On Technical
  Difficulties (32 steps) and boosts (16), a band across the top slides in
  from the fighter's side with a close-up of their face from a second
  camera, framed in colour bars. The close-up is drawn into the post pass's
  buffer through the target's viewport and scissor, so the tape look covers
  it; the composite draws the bars. The whole scene again, scissored: a
  dozen or so draw calls while it shows.

## 4. Screen-space (done in 0.58.0)

- **Speed lines** (done). Thin rays out from the action toward the
  screen's edges, new each tape frame, in the composite: on wall splats,
  Tape Skip, teleports and jump cancels (not dashes: the CPU dashes too
  often for them to mean anything). Off with Reduce Motion.
- **Hit-pause desaturation** (done). An ender's freeze drains the colour
  from everything but a circle round the contact (`uDrain`); a counter's a
  little longer. Stays with Reduce Motion (it doesn't move).
- **KO "last frame" hold** (done). The KO's frame is drawn with a full
  tracking tear, then held for four frames (nothing drawn keeps it up)
  before the slow motion rolls: the tape catching. Off with Reduce Motion.
- **Chromatic flash on counters** (done in part: the colour split exists;
  could key on counters only).

## 4b. Light from the fight (done in 0.58.0)

- **The fight lights the set** (`src/render/setFlash.ts`). Blows flash at
  the contact (bigger the heavier, amber on a counter), blocks give a cool
  blink, a lightning strike lights the whole studio, and projectiles and
  burning specials carry their light with them: Flambé, Fan the Flames and
  Fire and Brimstone burn orange and flicker, Heat Lightning crackles, the
  flashlight and Searchlight throw a cool beam, Cold Front and the hail
  glow icy, Live Feed flickers like a screen, the collection plate glints.
  The four brightest at any moment are point lights in a few lines of the
  set's and fighters' Lambert shaders (shared uniforms, so nothing
  recompiles); the fighters take 60% of it. Fixed cost, every frame.

## 5. Character shading (proposed)

- **Hit-side light** (medium). Flash the rim on the side the hit came
  from (the rim's direction is a shared uniform; swing it toward the
  attacker for a few steps). No recompile.
- **Fresnel glow on armour and boosts** (small). The armour glow is a flat
  emissive; a rim term scaled by a per-fighter uniform would read as an
  aura. A few lines in the fighter shader's existing rim chunk.
- **Squash and stretch on enders** (small, art-sensitive). Scale the
  defender 5% along the blow for two frames on enders. Test it in the
  viewer first: on faceted models it can look rubbery.

## 6. The set answers (proposed)

- **Set shake** (medium). Heavy hits near a wall shake the props nearest
  it (the weather map, the mirrors, the news desk's monitor): a small
  offset on a few named nodes in each stage GLB. Needs those nodes named
  (art side, step 29).
- **Lights swing** (medium). Enders and wall splats set the hanging studio
  lamps swinging (the beams in `atmosphere.ts` follow). Needs pivots on
  the lamps (art side).
- **Floor scorch / scuff decals** (medium). Where a body lands, a dark
  scuff that fades over the round. One instanced mesh, pooled.
- **Audience reacts** (small). Arcade's beaten fighters in the bleachers
  lean forward on enders (a clip offset), and the laugh track lands at the
  wrong moment as it already does.

## 7. Per-stage dressing (proposed)

- **Weather**: rain streaks across the camera in segment 2 (a scrolling
  texture on a quad in front of the camera; one draw call).
- **Burn**: the mirrors' reflections flash white on enders.
- **News**: the ticker glitches on enders (it's HTML already: a CSS class).
- **Kitchen**: sparks off the burners on a ground bounce near them.

## 8. Art-side asks

In `docs/BLENDER-TODO.md`, step 29 (*Impact pass*): smear frames on
heavy attacks, held anticipation poses, heavier hit reactions, impact
decals and a few named nodes on each set that can shake or swing.

## Budget check (done items)

| Effect | Draw calls while shown | Extra passes | New shaders (compiled at load) |
| --- | --- | --- | --- |
| Shockwave, zoom blur, spotlight | 0 | 0 | 0 (the composite gained a few branches on uniforms) |
| Contact glow and floor pool | 2 | 0 | 1 (additive textured basic) |
| Swing arcs | 1 a fighter | 0 | 1 (additive vertex-colour basic) |
| Dust and rings | 2 | 0 | 2 (instanced, additive) |
| Body jolt, counter flash | 0 | 0 | 0 |

At most 7 more draw calls in the busiest frame (an ender into a wall
splat with both fighters swinging), none at rest. All the meshes are in
the scene from the start (hidden), so `Post.compileScene` compiles their
shaders during loading; everything is pooled and stepped with the
simulation, and nothing allocates per frame.
