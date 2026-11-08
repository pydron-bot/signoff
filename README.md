# SIGN-OFF

A 2.5D one-on-one fighting game set inside a haunted 1987 UHF channel. Every
stage is a TV show, and the show changes between rounds.

Play: https://deeek.org/signoff/ (iPhone landscape or desktop)

Design: [docs/DESIGN.md](docs/DESIGN.md) · Art hand-off: [docs/BLENDER-TODO.md](docs/BLENDER-TODO.md) · Notes for contributors: [CLAUDE.md](CLAUDE.md)

## Controls

| | Keyboard | Gamepad (Xbox) | Touch |
| --- | --- | --- | --- |
| Move, jump, crouch | W A S D (double-tap to dash) | Stick / D-pad | Left half of the screen |
| Front / Back Punch | U / I | X / Y | FP / BP |
| Front / Back Kick | J / K | A / B | FK / BK |
| Block | L | RB | BLOCK |
| Special (direction + Special; again to boost) | O | RT | SP |
| Throw | U + J | LB | THR |
| Tape Skip / Cut Away | Space | Y + B | Tap your meter |
| Technical Difficulties (below 30%) | L + O | RB + RT | Appears when ready |
| Pause | Esc | Start | II |

Training: R resets positions, B shows hurtboxes; the pause menu sets the dummy.

```sh
npm ci
npm run dev    # http://localhost:5174
npm test
```
