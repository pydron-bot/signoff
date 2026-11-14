import { describe, expect, it } from 'vitest';
import { CUT_IN_WEAR, ECHO_WORN, Legibility, cutInWear, turns, type Moment, type Turns } from '../src/render/legible';
import { EchoTrail, LAGS, type Past } from '../src/render/echo';
import { CutIn } from '../src/render/cutIn';
import { PoseTracker, type Pose } from '../src/render/pose';
import { WearTracker } from '../src/render/wear';
import { FixedStep, STEP_MS } from '../src/game/loop';
import { createMatch, step, type MatchState, type SimEvent } from '../src/sim';
import { toFloat } from '../src/sim/fixed';
import { BLOCK, RIGHT, SPECIAL } from '../src/sim/input';
import { place, ready } from './sim-helpers';

const calm = (o: Partial<Moment> = {}): Moment => ({ cutIn: -1, star: -1, cinematic: false, impact: false, wear: [0, 0], attacking: [false, false], ...o });
const out = (): Turns => ({ echo: [0, 0], snow: [0, 0] });

describe('effects take turns', () => {
  it('the table: echoes and snow in full when nothing else is on', () => {
    expect(turns(calm(), out())).toEqual({ echo: [1, 1], snow: [1, 1] });
  });

  it('no echoes during a cut-in, a cinematic or an impact frame', () => {
    for (const o of [{ cutIn: 0 }, { cutIn: 1 }, { cinematic: true, star: 1 }, { impact: true }]) expect(turns(calm(o), out()).echo).toEqual([0, 0]);
  });

  it('echoes halve past ECHO_WORN wear', () => {
    expect(turns(calm({ wear: [ECHO_WORN + 0.01, ECHO_WORN] }), out()).echo).toEqual([0.5, 1]);
  });

  it('snow is held back on a fighter attacking, in the cut-in or starring in a finisher; the other keeps theirs', () => {
    expect(turns(calm({ attacking: [true, false] }), out()).snow).toEqual([0, 1]);
    expect(turns(calm({ cutIn: 1 }), out()).snow).toEqual([1, 0]);
    expect(turns(calm({ cinematic: true, star: 0 }), out()).snow).toEqual([0, 1]);
  });

  it('the snow eases out and back in over a few steps, not at once', () => {
    const m = ready('dale', 'rox');
    const l = new Legibility();
    m.fighters[0].mode = 'move';
    l.step(m, [], -1, [0.8, 0.8]);
    expect(l.snow[0]).toBeGreaterThan(0);
    expect(l.snow[0]).toBeLessThan(1);
    for (let i = 0; i < 4; i++) l.step(m, [], -1, [0.8, 0.8]);
    expect(l.snow[0]).toBe(0);
    expect(l.snow[1]).toBe(1);
    expect(l.echo).toEqual([0.5, 0.5]);
  });

  it('an ender or a KO lands on impact frames without echoes', () => {
    const m = ready('dale', 'rox');
    const l = new Legibility();
    l.step(m, [{ type: 'ko', player: 1 } as SimEvent], -1, [0, 0]);
    expect(l.echo).toEqual([0, 0]);
    for (let i = 0; i < 3; i++) l.step(m, [], -1, [0, 0]);
    expect(l.echo).toEqual([1, 1]);
  });

  it('TD’s cut-in always gets a readable fighter, whatever their health', () => {
    for (const health of [0.29, 0.15, 0.05, 0.01]) {
      const m = ready('gus', 'gideon');
      const a = m.fighters[0];
      a.health = Math.floor(a.maxHealth * health);
      const wear = new WearTracker();
      wear.step(m, []);
      const cut = new CutIn();
      cut.onEvents([{ type: 'superStart', player: 0 }]);
      const l = new Legibility();
      l.step(m, [], cut.who, wear.wear);
      for (let i = 0; i < 4; i++) l.step(m, [], cut.who, wear.wear);
      // The close-up: dulling capped, no snow, no echoes; the fight's view holds its snow back too.
      expect(wear.wear[0]).toBeGreaterThan(CUT_IN_WEAR);
      expect(cutInWear(wear.wear[0])).toBeLessThanOrEqual(CUT_IN_WEAR);
      expect(l.snow[0]).toBe(0);
      expect(l.echo[0]).toBe(0);
    }
  });

  it('the cut-in band sits below the HUD on a phone and on a desktop', () => {
    const m = ready('rox', 'dale');
    place(m, -1, 1);
    for (const [h, aspect] of [[393, 852 / 393], [720, 16 / 9]]) {
      const c = new CutIn();
      c.hudClear = 112 / h;
      c.onEvents([{ type: 'superStart', player: 1 }]);
      const r = c.place(m, aspect);
      expect(1 - r.y1).toBeGreaterThanOrEqual(112 / h);
      expect(r.y0).toBeGreaterThan(0.3);
    }
  });
});

/** A match played with the same inputs, drawn as `frameMs` says: the echoes' poses at every step that was drawn. */
function echoesAt(frameMs: (k: number) => number): Map<number, string> {
  const m: MatchState = createMatch({ p1: 'rox', p2: 'dale', seed: 7 });
  const poses = new PoseTracker();
  const trail = new EchoTrail();
  const ev: SimEvent[] = [];
  const pose: Pose = { clip: '', frame: 1, loop: false };
  const clock = new FixedStep();
  const seen = new Map<number, string>();
  let now = 0;
  let k = 0;
  let t = 0;
  clock.advance(now);
  while (t < 360) {
    now += frameMs(k++);
    const n = clock.advance(now);
    for (let i = 0; i < n; i++, t++) {
      ev.length = 0;
      // Walk in, a special, a dash: things that trail.
      const in0 = t % 90 === 40 ? SPECIAL : t % 90 < 30 ? RIGHT : t % 90 === 70 || t % 90 === 73 ? RIGHT : 0;
      step(m, in0, t % 50 === 10 ? BLOCK : 0, ev);
      poses.step(m, ev);
      const f = m.fighters[0];
      trail.step(f, poses.pose(m, 0, pose), toFloat(f.x), toFloat(f.y), true, true);
    }
    // What a drawn frame reads.
    const read = (p: Past | null) => (p ? `${p.clip}@${p.frame}:${p.x.toFixed(3)}` : '-');
    seen.set(t, `${trail.amount.toFixed(2)} ${LAGS.map((l) => read(trail.at(l))).join(' ')}`);
  }
  return seen;
}

describe('echoes step with the simulation', () => {
  it('the same inputs give the same echo poses at 60, 120 and 144 Hz and when frames drop', () => {
    const at60 = echoesAt(() => STEP_MS);
    const others = [echoesAt(() => 1000 / 120), echoesAt(() => 1000 / 144), echoesAt((k) => (k % 7 === 3 ? 50 : STEP_MS))];
    let compared = 0;
    for (const o of others)
      for (const [t, v] of o)
        if (at60.has(t)) {
          expect(v).toBe(at60.get(t));
          compared++;
        }
    expect(compared).toBeGreaterThan(300);
    // And something trailed.
    expect([...at60.values()].some((v) => !v.startsWith('0.00'))).toBe(true);
  });

  it('a special trails for its first steps only, standing still', () => {
    const trail = new EchoTrail();
    const m = ready('gideon', 'rox');
    const f = m.fighters[0];
    const pose: Pose = { clip: 'idle', frame: 1, loop: true };
    for (let i = 0; i < 8; i++) trail.step(f, pose, 0, 0, true, true);
    f.mode = 'move';
    f.move = 'Fire and Brimstone';
    let peak = 0;
    for (f.moveFrame = 1; f.moveFrame <= 40; f.moveFrame++) {
      trail.step(f, pose, 0, 0, true, true);
      peak = Math.max(peak, trail.amount);
    }
    expect(peak).toBe(1);
    expect(trail.amount).toBe(0);
  });
});

describe('the cut-in and the touch buttons', () => {
  it('with buttons up on one side, the band comes in from the other', () => {
    const m = ready('rox', 'dale');
    place(m, -1, 1);
    for (const [buttons, left] of [[0.3, true], [-0.3, false]] as const) {
      const c = new CutIn();
      c.buttons = buttons;
      // Player 1 stands on the right, but the buttons decide.
      c.onEvents([{ type: 'superStart', player: 1 }]);
      for (let i = 0; i < 6; i++) c.step();
      const r = c.place(m, 852 / 393);
      expect(r.x0 < 0.5).toBe(left);
    }
  });
});
