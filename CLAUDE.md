# SIGN-OFF — notes for Claude

2.5D one-on-one fighting game set inside a haunted 1987 UHF channel:
three.js 0.186, TypeScript (strict), Vite 8, vite-plugin-pwa, Vitest. Targets
Safari on an iPhone 15 Pro (landscape, touch) and desktop (keyboard,
gamepad). Served from https://deeek.org/signoff/.

Read first: `docs/DESIGN.md` (the game design: systems, roster, stages,
controls, technical rules). Art work: `docs/BLENDER-TODO.md`.

## Commands

```sh
npm ci                 # Node ≥ 22.12 (.nvmrc: 24); unset NODE_ENV on hive1
npm run dev            # vite --host, port 5174 (Curbside has 5173)
npm test               # vitest
npm run docs:clips     # rewrite the clip table in docs/BLENDER-TODO.md after changing moves
npm run build          # tsc --noEmit && vite build
SIGNOFF_BASE=/signoff/ npx vite build   # what the Pages deploy builds
npx -y -p playwright@1.63.0 node tools/smoke.mjs      # smoke test
npx -y -p playwright@1.63.0 node tools/make-icons.mjs # PWA icons
```

## Rules of the codebase

- **The simulation is pure and deterministic.** Everything under `src/sim/`
  runs at exactly 60 steps a second, knows nothing about three.js, the DOM
  or the clock, and uses fixed-point maths (`src/sim/fixed.ts`) and the
  seeded RNG (`src/sim/rng.ts`): never floats for gameplay state, never
  `Math.random`, `Date` or `performance.now`. The whole match state must be
  plain data that saves and restores in one call (training resets, replays,
  rollback later).
- **Simulation emits, presentation subscribes.** The sim raises typed
  events (hit, block, knockdown, round over, segment change, finisher
  start); renderer, camera, audio, HUD and VHS effects listen. Rendering
  reads the latest step and never changes it.
- **Inputs are the only way in.** Players and the CPU send the same input
  frames; the CPU never reads state a player can't see.
- **Moves are data.** Frames, boxes, damage, stun and cancel windows live in
  each fighter's data file, with tests that check it (every move recovers;
  a string marked safe on block is safe).
- **main.ts is wiring.** Logic goes in modules; pure logic gets unit tests
  in `tests/`.
- **Never hard-code `/assets/...`.** Use `publicUrl('assets/…')`
  (`src/core/paths.ts`). Storage keys start with `signoff.`.
- Budget on the iPhone profile: under 100 draw calls, fixed lights per
  segment, shaders compiled during loading, no per-frame allocation in hot
  paths.
- Comments are short and explain why; match the surrounding style.

## Shipping

Every release to `main` gets a version: add an entry at the top of
`src/core/changelog.ts` (Major.Minor.Patch: minor for features, patch for
fixes; player-facing notes) and set `package.json`'s version to match (a
test checks).

Pushing to `main` deploys to https://deeek.org/signoff/ via
`.github/workflows/pages.yml` (it runs the tests first); other branches and
pull requests run `ci.yml` (types, tests, smoke test). Run the smoke test
before pushing to main.
