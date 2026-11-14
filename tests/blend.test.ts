// Cross-fades between clips (src/render/pose.ts, FighterModel.pose): state
// clips and a move's recovery blend; a move's own frames never do.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FighterModel, type FighterArt } from '../src/render/fighterModel';
import { BLEND_STEPS, crossFades, fadeWeight } from '../src/render/pose';
import { FIGHTERS } from '../src/sim';

const MOVE = 's.FP';
const mv = FIGHTERS.dale.moves[MOVE];

/** A stand-in GLB: one part whose x is the clip's frame (moves at 100 + frame, idle at −frame, walking at 50 + frame). */
function art(): FighterArt {
  const scene = new THREE.Group();
  const part = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  part.name = 'part';
  scene.add(part);
  const clip = (name: string, frames: number, x0: number) => {
    const times = Array.from({ length: frames }, (_, i) => i / 60);
    const values = times.flatMap((_, i) => [x0 + i, 0, 0]);
    return new THREE.AnimationClip(name, -1, [new THREE.VectorKeyframeTrack('part.position', times, values)]);
  };
  const clips = [clip('idle', 31, -1000), clip('walk_fwd', 31, 50), clip(MOVE, mv.total, 100)];
  // Loops last N/60 s; moves (N − 1)/60 s, as exported (fighterModel.ts, clipFrames).
  for (const c of clips) c.duration = c.name === MOVE ? (mv.total - 1) / 60 : 30 / 60;
  return { id: 'dale', scene, clips: new Map(clips.map((c) => [c.name, c])), fx: new Map() };
}

function x(model: FighterModel): number {
  return model.root.getObjectByName('part')!.position.x;
}

describe('blends between states', () => {
  it('the rules: state clips and a move’s recovery fade; into a move, or out of its active frames, never', () => {
    const move = (c: string) => FIGHTERS.dale.moves[c];
    expect(crossFades('idle', 10, 'walk_fwd', move)).toBe(true);
    expect(crossFades('getup', 20, 'idle', move)).toBe(true);
    expect(crossFades(MOVE, mv.total, 'idle', move)).toBe(true);
    expect(crossFades(MOVE, mv.lastActive, 'idle', move)).toBe(false);
    for (const c of Object.keys(FIGHTERS.dale.moves)) expect(crossFades('idle', 5, c, move)).toBe(false);
    expect(crossFades('idle', 5, 'hit_high', move)).toBe(false);
    expect([0, 1, 2, 3].map(fadeWeight)).toEqual([0.75, 0.5, 0.25, 0]);
  });

  it('on every frame of a move the pose is the clip’s alone, even straight after a blend', () => {
    const model = new FighterModel(art());
    model.pose('idle', 1, true);
    model.pose('walk_fwd', 1, true);
    // Mid-fade from idle to walking, a move starts: its first frame is its own.
    for (let f = 1; f <= mv.total; f++) {
      model.pose(MOVE, f, false);
      expect(x(model)).toBeCloseTo(100 + f - 1, 5);
    }
  });

  it('out of the move’s recovery, idle fades in over three steps', () => {
    const model = new FighterModel(art());
    for (let f = 1; f <= mv.total; f++) model.pose(MOVE, f, false);
    const last = 100 + mv.total - 1;
    const seen: number[] = [];
    for (let f = 1; f <= BLEND_STEPS + 1; f++) {
      model.pose('idle', f, true);
      seen.push(x(model));
    }
    expect(seen[0]).toBeCloseTo(0.75 * last + 0.25 * -1000, 3);
    expect(seen[2]).toBeCloseTo(0.25 * last + 0.75 * -998, 3);
    expect(seen[3]).toBeCloseTo(-997, 5);
  });

  it('cut out of a move before its recovery (a hit, a landing), the next clip shows at once', () => {
    const model = new FighterModel(art());
    for (let f = 1; f <= mv.lastActive; f++) model.pose(MOVE, f, false);
    model.pose('idle', 1, true);
    expect(x(model)).toBeCloseTo(-1000, 5);
  });
});
