// The clip and frame each fighter shows (src/render/pose.ts): moves by their
// move frame, other states by steps since entering them, and every clip the
// game asks for is one the fighter's GLB has.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Cpu } from '../src/ai/cpu';
import { HELD_STAND_INS, PoseTracker, STAGGER_STUN, hitReaction, standIn, type Pose } from '../src/render/pose';
import { BAR, FIGHTERS, INTRO_FRAMES, Input, createMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { place, ready } from './sim-helpers';

const { RIGHT, DOWN, UP, FP, FK, BLOCK, METER } = Input;

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
    // The other fighter plays the second intro, and the next round swaps them.
    expect(t.pose(m, 1, { clip: '', frame: 0, loop: false }).clip).toBe('intro_2');
    m.round = 2;
    expect(t.pose(m, 0, { clip: '', frame: 0, loop: false }).clip).toBe('intro_2');
    m.round = 1;
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

  it('reacts to a hit by where it lands, restarting on each hit and freezing in hitstop', () => {
    const m = ready();
    place(m, -0.5, 0.5);
    const t = new PoseTracker();
    drive(m, t, 1);
    // A standing jab lands on a standing P2.
    let p = drive(m, t, 9, (k) => (k === 0 ? FP : 0), 0, 1);
    expect(p.clip).toBe('hit_head');
    const frozen = p.frame;
    expect(m.fighters[1].hitstop).toBeGreaterThan(0);
    p = drive(m, t, 1, 0, 0, 1);
    expect(p.frame).toBe(frozen);
    drive(m, t, 40);
    // A crouching low (c.FK) on a crouching P2.
    p = drive(m, t, 12, (k) => (k === 0 ? DOWN | FK : DOWN), DOWN, 1);
    expect(p.clip).toBe('hit_crouch');
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

  it('plays the tape_skip clip for a Tape Skip, not the dash', () => {
    const m = ready();
    place(m, -2, 2);
    m.fighters[0].meter = 3000;
    const t = new PoseTracker();
    drive(m, t, 1);
    // A jab, then Tape Skip once it's past startup.
    const p = drive(m, t, 12, (k) => (k === 0 ? FP : k === 9 ? METER : 0));
    expect(m.fighters[0].mode).toBe('dash');
    expect(p.clip).toBe('tape_skip');
    // A plain dash is still a dash.
    drive(m, t, 40);
    expect(drive(m, t, 6, (k) => (k === 0 || k === 2 ? RIGHT : 0)).clip).toBe('dash');
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
          const has = (c: string) => clips[i]!.has(c);
          if (clips[i] && !has(pose.clip) && !(standIn(m.fighters[i].fighter, pose.clip) && has(standIn(m.fighters[i].fighter, pose.clip)!))) missing.add(`${m.fighters[i].fighter}:${pose.clip}`);
        }
      }
      expect([...missing]).toEqual([]);
      // The match got as far as a winner's pose.
      expect(used).toContain('win');
      expect(used).toContain('intro_2');
      expect(used).toContain('win_2');
      expect(used).toContain('ko');
    }
  });
});

describe('juggle reactions (step 16)', () => {
  const { LEFT, SPECIAL, BK } = Input;
  /** Plays P1's script (as tests/combos.test.ts does) and returns every clip P2 showed, in order, without repeats. */
  function clipsSeen(script: readonly (readonly [string, number])[], meter = 0, x = 0.4, off = 0): string[] {
    const m = ready('rox', 'dale');
    place(m, off - x, off + x);
    m.fighters[0].meter = meter;
    const t = new PoseTracker();
    const ev: SimEvent[] = [];
    const seen: string[] = [];
    let k = 0;
    for (let n = 0; n < 300; n++) {
      const a = m.fighters[0];
      let in0 = 0;
      if (k < script.length) {
        const [when, bits] = script[k];
        const free = a.mode === 'idle' || a.mode === 'walk' || a.mode === 'crouch';
        if (when === 'now' || (when === 'free' && free) || (a.mode === 'move' && `${a.move}@${a.moveFrame}` === when)) {
          in0 = bits;
          k++;
        }
      }
      ev.length = 0;
      step(m, in0, 0, ev);
      t.step(m, ev);
      const c = t.pose(m, 1, { clip: '', frame: 0, loop: false }).clip;
      if (seen.at(-1) !== c) seen.push(c);
    }
    return seen;
  }
  const launcher = [['now', DOWN | Input.BP], ['c.BP@11', FP]] as const;

  it('a hit on a juggled body plays juggle_hit; a launch from the ground is still launched', () => {
    const seen = clipsSeen(launcher);
    expect(seen).toContain('launched');
    expect(seen.indexOf('juggle_hit')).toBeGreaterThan(seen.indexOf('launched'));
  });

  it('the Lariat slams them (slam), then floor_bounce off the floor', () => {
    const seen = clipsSeen([...launcher, ['s.FP@8', LEFT | SPECIAL]]);
    expect(seen.indexOf('floor_bounce')).toBeGreaterThan(seen.indexOf('slam'));
    expect(seen.indexOf('slam')).toBeGreaterThan(0);
  });

  it('a boosted special plays relaunch; Feel the Burn by the wall plays wall_splat', () => {
    expect(clipsSeen([...launcher, ['s.FP@8', DOWN | SPECIAL], ['Count of Eight@2', SPECIAL]], BAR)).toContain('relaunch');
    expect(clipsSeen([...launcher, ['s.FP@8', FP], ['FP FP@9', FK], ['FP FP FK@11', BK]], 0, 0.4, 4.2)).toContain('wall_splat');
  });

  it('until the art has them, they hold the end of launched', () => {
    for (const c of ['juggle_hit', 'relaunch', 'slam', 'floor_bounce', 'wall_splat']) {
      expect(standIn('rox', c)).toBe('launched');
      expect(HELD_STAND_INS.has(c)).toBe(true);
    }
  });
});

describe('hit reactions (step 22)', () => {
  type Hit = Extract<SimEvent, { type: 'hit' }>;
  /** A hit on a standing Dale (1.8 m tall) at `y` metres. */
  const hit = (y: number, over: Partial<Hit> = {}): Hit => ({ type: 'hit', attacker: 0, defender: 1, move: 's.FP', damage: 30, height: 'mid', counter: false, combo: 1, weight: 0, dir: 1, x: 0, y: fx(y), ...over });
  const dale = () => {
    const m = ready('rox', 'dale');
    const d = m.fighters[1];
    d.mode = 'hitstun';
    d.timer = 14;
    return d;
  };

  it('picks the head, the body or the legs by where it lands', () => {
    expect(hitReaction(hit(1.4), dale(), false)).toBe('hit_head');
    expect(hitReaction(hit(1.0), dale(), false)).toBe('hit_body');
    expect(hitReaction(hit(0.4), dale(), false)).toBe('hit_legs');
    expect(hitReaction(hit(1.0, { height: 'low' }), dale(), false)).toBe('hit_legs');
  });

  it('heavy and counter hits get the heavy reaction; light ones alternate down a combo', () => {
    expect(hitReaction(hit(1.4, { weight: 2 }), dale(), false)).toBe('hit_head_heavy');
    expect(hitReaction(hit(1.0, { counter: true }), dale(), false)).toBe('hit_body_heavy');
    expect(hitReaction(hit(1.4, { combo: 2 }), dale(), false)).toBe('hit_head_2');
    expect(hitReaction(hit(1.0, { combo: 3 }), dale(), false)).toBe('hit_body');
  });

  it('crouching takes its own; a long stun staggers', () => {
    const c = dale();
    c.crouching = true;
    expect(hitReaction(hit(0.6), c, false)).toBe('hit_crouch');
    const s = dale();
    s.timer = STAGGER_STUN;
    expect(hitReaction(hit(1.4), s, false)).toBe('stagger');
  });

  it("a finisher's blows are heavy, head and body in turn", () => {
    expect(hitReaction(hit(0, { combo: 1 }), dale(), true)).toBe('hit_head_heavy');
    expect(hitReaction(hit(0, { combo: 2 }), dale(), true)).toBe('hit_body_heavy');
  });

  it("Margaret's Breaking staggers, and so does a crushed guard", () => {
    const seen = (attacker: string, script: (k: number) => number, block: number) => {
      const m = ready(attacker, 'dale');
      place(m, -0.5, 0.5);
      const t = new PoseTracker();
      const out = new Set<string>();
      const ev: SimEvent[] = [];
      for (let k = 0; k < 90; k++) {
        ev.length = 0;
        step(m, script(k), block, ev);
        t.step(m, ev);
        out.add(t.pose(m, 1, { clip: '', frame: 0, loop: false }).clip);
      }
      return out;
    };
    const { SPECIAL } = Input;
    expect(seen('margaret', (k) => (k === 0 ? SPECIAL : 0), 0)).toContain('stagger');
    // Tenderise's last blow breaks the guard.
    expect(seen('gus', (k) => (k === 0 ? SPECIAL : 0), BLOCK)).toContain('stagger');
  });

  it('every new reaction falls back to hit_high or hit_low until the art has it', () => {
    for (const c of ['hit_head', 'hit_head_2', 'hit_head_heavy', 'hit_body', 'hit_body_2', 'hit_body_heavy', 'stagger']) expect(standIn('dale', c)).toBe('hit_high');
    for (const c of ['hit_legs', 'hit_crouch']) expect(standIn('dale', c)).toBe('hit_low');
  });
});
