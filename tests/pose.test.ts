// The clip and frame each fighter shows (src/render/pose.ts): moves by their
// move frame, other states by steps since entering them, and every clip the
// game asks for is one the fighter's GLB has.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Cpu } from '../src/ai/cpu';
import { PoseTracker, type Pose } from '../src/render/pose';
import { FIGHTERS, INTRO_FRAMES, Input, createMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { place, ready } from './sim-helpers';

const { RIGHT, DOWN, UP, FP, FK, BLOCK } = Input;

/** Runs the match with a tracker, as the arena does; returns P1's (or `who`'s) pose after. */
function drive(m: MatchState, t: PoseTracker, n: number, in0: number | ((k: number) => number) = 0, in1 = 0, who = 0): Pose {
  const ev: SimEvent[] = [];
  for (let k = 0; k < n; k++) {
    ev.length = 0;
    step(m, typeof in0 === 'function' ? in0(k) : in0, in1, ev);
    t.step(m, ev);
  }
  return { ...t.pose(m, who, { clip: '', frame: 0, loop: false }) };
}

function glbClips(id: string): Set<string> | null {
  const path = `public/assets/fighters/${id}.glb`;
  if (!existsSync(path)) return null;
  const b = readFileSync(path);
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as { animations: { name: string }[] };
  return new Set(json.animations.map((a) => a.name));
}

describe('poses', () => {
  it('plays the intro by the intro timer, then idles in a loop', () => {
    const m = createMatch({ p1: 'dale', p2: 'rox' });
    const t = new PoseTracker();
    expect(t.pose(m, 0, { clip: '', frame: 0, loop: false })).toEqual({ clip: 'intro', frame: 1, loop: false });
    expect(drive(m, t, 10)).toEqual({ clip: 'intro', frame: 11, loop: false });
    const p = drive(m, t, INTRO_FRAMES + 5);
    expect(p.clip).toBe('idle');
    expect(p.loop).toBe(true);
  });

  it('plays a move by its move frame, and walks forward and back by facing', () => {
    const m = ready();
    place(m, -1, 1);
    const t = new PoseTracker();
    drive(m, t, 1);
    expect(drive(m, t, 1, FP)).toMatchObject({ clip: 's.FP', frame: m.fighters[0].moveFrame });
    drive(m, t, 30);
    expect(drive(m, t, 5, RIGHT).clip).toBe('walk_fwd');
    // Player 2 faces left: holding right walks them back.
    expect(drive(m, t, 5, 0, RIGHT, 1).clip).toBe('walk_back');
  });

  it('crouches in, then holds the crouch loop; a crouching move goes straight back to it', () => {
    const m = ready();
    place(m, -2, 2);
    const t = new PoseTracker();
    drive(m, t, 1);
    expect(drive(m, t, 3, DOWN)).toMatchObject({ clip: 'crouch', frame: 3 });
    expect(drive(m, t, 10, DOWN)).toMatchObject({ clip: 'crouch_idle', loop: true });
    // c.FP, held down throughout.
    drive(m, t, 1, DOWN | FP);
    expect(t.pose(m, 0, { clip: '', frame: 0, loop: false }).clip).toBe('c.FP');
    expect(drive(m, t, 40, DOWN)).toMatchObject({ clip: 'crouch_idle' });
  });

  it('reacts high or low to a hit, restarting on each hit and freezing in hitstop', () => {
    const m = ready();
    place(m, -0.5, 0.5);
    const t = new PoseTracker();
    drive(m, t, 1);
    // A standing jab lands on a standing P2.
    let p = drive(m, t, 9, (k) => (k === 0 ? FP : 0), 0, 1);
    expect(p.clip).toBe('hit_high');
    const frozen = p.frame;
    expect(m.fighters[1].hitstop).toBeGreaterThan(0);
    p = drive(m, t, 1, 0, 0, 1);
    expect(p.frame).toBe(frozen);
    drive(m, t, 40);
    // A crouching low (c.FK) on a crouching P2.
    p = drive(m, t, 12, (k) => (k === 0 ? DOWN | FK : DOWN), DOWN, 1);
    expect(p.clip).toBe('hit_low');
  });

  it('blocks standing or crouching', () => {
    const m = ready();
    place(m, -0.5, 0.5);
    const t = new PoseTracker();
    drive(m, t, 1);
    expect(drive(m, t, 9, (k) => (k === 0 ? FP : 0), BLOCK, 1).clip).toBe('block_stand');
    drive(m, t, 30);
    expect(drive(m, t, 9, (k) => (k === 0 ? FP : 0), BLOCK | DOWN, 1).clip).toBe('block_crouch');
  });

  it('jumps up, falls, and lands; landing from an air attack takes the longer clip', () => {
    const m = ready();
    place(m, -2, 2);
    const t = new PoseTracker();
    drive(m, t, 1);
    expect(drive(m, t, 2, UP).clip).toBe('prejump');
    expect(drive(m, t, 5).clip).toBe('jump_up');
    expect(drive(m, t, 20).clip).toBe('jump_fall');
    const seen = new Set<string>();
    for (let k = 0; k < 20; k++) seen.add(drive(m, t, 1).clip);
    expect(seen).toContain('land');
    drive(m, t, 20);
    // Late in the jump, so the kick is still out when they land.
    drive(m, t, 4, UP);
    drive(m, t, 22);
    drive(m, t, 1, FK);
    seen.clear();
    for (let k = 0; k < 60; k++) seen.add(drive(m, t, 1).clip);
    expect(seen).toContain('land_attack');
  });

  it('every clip asked for in CPU matches is in the fighter\'s GLB, at a frame from 1', () => {
    const ids = Object.keys(FIGHTERS);
    for (let k = 0; k < ids.length; k++) {
      const a = ids[k];
      const b = ids[(k + 1) % ids.length];
      const clips = [glbClips(a), glbClips(b)];
      const m = createMatch({ p1: a, p2: b, seed: k + 5 });
      const cpus = [new Cpu(0, 'hard', k + 1), new Cpu(1, 'normal', k + 9)];
      const t = new PoseTracker();
      const ev: SimEvent[] = [];
      const pose: Pose = { clip: '', frame: 0, loop: false };
      const missing = new Set<string>();
      const used = new Set<string>();
      for (let s = 0; s < 30000 && m.phase !== 'over'; s++) {
        ev.length = 0;
        step(m, cpus[0].next(m), cpus[1].next(m), ev);
        t.step(m, ev);
        for (let i = 0; i < 2; i++) {
          t.pose(m, i, pose);
          expect(pose.frame).toBeGreaterThanOrEqual(1);
          used.add(pose.clip);
          if (clips[i] && !clips[i]!.has(pose.clip)) missing.add(`${m.fighters[i].fighter}:${pose.clip}`);
        }
      }
      expect([...missing]).toEqual([]);
      // The match got as far as a winner's pose.
      expect(used).toContain('win');
      expect(used).toContain('ko');
    }
  });
});
