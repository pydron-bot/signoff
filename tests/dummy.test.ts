// The training dummy (src/game/dummy.ts), played out in a training session
// against Dale: how it guards, its stances, its answers, meter and Cut Away,
// recording and playback, and where Reset puts everyone.
import { describe, expect, it } from 'vitest';
import { RECORD_FRAMES, TrainingDummy, boostSpecial, relative, reversalSpecial, type DummySettings } from '../src/game/dummy';
import { Session } from '../src/game/session';
import { BAR, FIGHTERS, METER_MAX, Input, fighterData, type SimEvent } from '../src/sim';
import { backToWall } from '../src/sim/finisher';
import { fx } from '../src/sim/fixed';
import { count, place } from './sim-helpers';

const { DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK } = Input;

function training(set: Partial<DummySettings> = {}, p1 = 'dale'): Session {
  const s = new Session({ mode: 'training', p1, p2: 'rox', level: 'normal', seed: 7 });
  Object.assign(s.dummy.settings, set);
  place(s.match, -0.4, 0.4);
  return s;
}

/** Runs n steps with P1 pressing `at[t]` (held one step, or `hold` throughout); the events. */
function play(s: Session, n: number, at: Record<number, number> = {}, hold = 0): SimEvent[] {
  const ev: SimEvent[] = [];
  for (let t = 0; t < n; t++) s.tick(hold | (at[t] ?? 0), 0, ev);
  return ev;
}

const blocked = (ev: SimEvent[]) => ev.filter((e) => e.type === 'block' && e.defender === 1).length;
const hits = (ev: SimEvent[]) => ev.filter((e) => e.type === 'hit' && e.defender === 1).length;

describe('training dummy: guard and stance', () => {
  it('none: everything hits', () => {
    const ev = play(training(), 60, { 0: FK });
    expect(hits(ev)).toBe(1);
    expect(blocked(ev)).toBe(0);
  });

  it('all, standing: blocks a mid, a low (crouching for it) and an overhead (standing for it)', () => {
    for (const [press, hold] of [[FK, 0], [FK, DOWN], [BP, RIGHT]] as const) {
      const s = training({ guard: 'all' });
      const ev = play(s, 70, { 0: press }, hold);
      expect(hits(ev), `${press}/${hold}`).toBe(0);
      expect(blocked(ev), `${press}/${hold}`).toBe(1);
    }
  });

  it('all, crouching: lows are blocked, overheads hit, highs go over', () => {
    expect(blocked(play(training({ guard: 'all', stance: 'crouch' }), 60, { 0: FK }, DOWN))).toBe(1);
    expect(hits(play(training({ guard: 'all', stance: 'crouch' }), 70, { 0: BP }, RIGHT))).toBe(1);
    const ev = play(training({ guard: 'all', stance: 'crouch' }), 60, { 0: FP });
    expect(count(ev, 'ducked')).toBe(1);
  });

  it('duck: a high goes over, a mid hits, and it never blocks', () => {
    expect(count(play(training({ stance: 'duck', guard: 'all' }), 60, { 0: FP }), 'ducked')).toBe(1);
    const ev = play(training({ stance: 'duck', guard: 'all' }), 60, { 0: FK });
    expect(hits(ev)).toBe(1);
    expect(blocked(ev)).toBe(0);
  });

  it('after the first hit: the first lands, the next (with a gap) is blocked, and later it lowers its guard again', () => {
    const s = training({ guard: 'after' });
    const ev = play(s, 80, { 0: FK, 45: FK });
    expect(hits(ev)).toBe(1);
    expect(blocked(ev)).toBe(1);
    play(s, 120);
    place(s.match, -0.4, 0.4);
    expect(hits(play(s, 40, { 0: FK }))).toBe(1);
  });

  it('random: some blocked and some not, the same way every time from a seed', () => {
    const run = () => {
      const s = training({ guard: 'random' });
      const at: Record<number, number> = {};
      for (let k = 0; k < 16; k++) at[k * 45] = FK;
      const out: number[] = [];
      for (let k = 0; k < 16; k++) {
        place(s.match, -0.4, 0.4);
        const ev = play(s, 45, { 0: FK });
        out.push(hits(ev) ? 1 : blocked(ev) ? 2 : 0);
      }
      return out;
    };
    const a = run();
    expect(a.filter((x) => x === 1).length).toBeGreaterThan(2);
    expect(a.filter((x) => x === 2).length).toBeGreaterThan(2);
    expect(run()).toEqual(a);
  });

  it('flawless: every hit of a string blocked flawlessly', () => {
    const s = training({ guard: 'flawless' });
    // Clipboard Jab, Five-Day Outlook, Front Moves In: three hits.
    const ev = play(s, 90, { 0: FP, 10: FP, 24: BK });
    const n = blocked(ev);
    expect(n).toBeGreaterThanOrEqual(2);
    expect(ev.filter((e) => e.type === 'flawless' && e.player === 1).length).toBe(n);
    expect(hits(ev)).toBe(0);
  });

  it('flawless: a projectile too', () => {
    const s = training({ guard: 'flawless' });
    place(s.match, -2, 1);
    // Cold Front: forward + Special.
    const ev = play(s, 120, { 0: RIGHT | Input.SPECIAL });
    expect(blocked(ev)).toBe(1);
    expect(count(ev, 'flawless')).toBe(1);
  });
});

describe('training dummy: answers', () => {
  /** After the dummy blocks (or takes) Dale's kick, what it does the first step it can act. */
  function answer(set: Partial<DummySettings>, p1 = 'dale') {
    const s = training({ guard: set.guard ?? 'all', ...set }, p1);
    const d = s.match.fighters[1];
    const ev: SimEvent[] = [];
    let was = '';
    for (let t = 0; t < 90; t++) {
      const stun = d.mode === 'blockstun' || d.mode === 'hitstun';
      s.tick(t === 0 ? FK : 0, 0, ev);
      if (stun && d.mode !== 'blockstun' && d.mode !== 'hitstun') {
        was = d.mode === 'move' ? d.move : d.mode;
        break;
      }
    }
    return { s, ev, was };
  }

  it('after blocking: jab, throw, reversal, jump, backdash', () => {
    expect(answer({ afterBlock: 'jab' }).was).toBe('s.FP');
    expect(answer({ afterBlock: 'throw' }).was).toBe(fighterData('rox').throwMove);
    expect(answer({ afterBlock: 'reversal' }).was).toBe(reversalSpecial('rox').id);
    expect(answer({ afterBlock: 'jump' }).was).toBe('prejump');
    expect(answer({ afterBlock: 'backdash' }).was).toBe('backdash');
    expect(answer({ afterBlock: 'none' }).was).toBe('guard');
  });

  it('a boosted special, when there is a bar for it', () => {
    const s = training({ guard: 'all', afterBlock: 'boost', meter: 'one' });
    const ev = play(s, 80, { 0: FK });
    expect(ev.filter((e) => e.type === 'boost' && e.player === 1).map((e) => e.type === 'boost' && e.move)).toEqual([fighterData('rox').moves[boostSpecial('rox').id].boost]);
  });

  it('after being hit: the answer comes once the combo is over', () => {
    expect(answer({ guard: 'none', afterHit: 'jab' }).was).toBe('s.FP');
  });

  it('on getting up: a reversal on the first frame, or staying down', () => {
    const s = training({ wakeup: 'reversal' });
    const d = s.match.fighters[1];
    // Ground Fog: Dale's sweep knocks down.
    const ev: SimEvent[] = [];
    let after = '';
    for (let t = 0; t < 150 && !after; t++) {
      const up = d.mode === 'getup';
      s.tick(t === 0 ? BK | DOWN : 0, 0, ev);
      if (up && d.mode !== 'getup') after = d.mode === 'move' ? d.move : d.mode;
    }
    expect(after).toBe(reversalSpecial('rox').id);
    expect(d.reversal).toBe(true);
    const st = training({ wakeup: 'stayDown' });
    expect(count(play(st, 150, { 0: BK | DOWN }), 'delayedGetup')).toBe(1);
  });

  it('every fighter has a reversal special and a special to boost', () => {
    for (const f of Object.keys(FIGHTERS)) {
      const d = fighterData(f);
      expect(Object.values(d.specials)).toContain(reversalSpecial(f).id);
      expect(d.moves[boostSpecial(f).id].startup).toBeGreaterThan(0);
    }
  });
});

describe('training dummy: meter and Cut Away', () => {
  it('holds its meter where it is set', () => {
    for (const [meter, want] of [['empty', 0], ['one', BAR], ['full', METER_MAX]] as const) {
      const s = training({ meter });
      play(s, 30, { 0: FK });
      expect(s.match.fighters[1].meter).toBe(want);
    }
  });

  it('refill: full again at rest', () => {
    const s = training({ meter: 'refill' });
    s.match.fighters[1].meter = 0;
    play(s, 100);
    expect(s.match.fighters[1].meter).toBe(METER_MAX);
  });

  it('breaks a combo with Cut Away once it has a full meter', () => {
    const s = training({ meter: 'full', cutAway: true });
    const ev = play(s, 60, { 0: FP, 10: FP, 24: BK });
    expect(ev.filter((e) => e.type === 'cutAway' && e.player === 1).length).toBe(1);
    expect(count(play(training({ meter: 'full' }), 60, { 0: FP, 10: FP, 24: BK }), 'cutAway')).toBe(0);
  });
});

describe('training dummy: recording and playback', () => {
  it('directions are kept relative to facing', () => {
    expect(relative(RIGHT | FP, 1)).toBe(RIGHT | FP);
    expect(relative(RIGHT | FP, -1)).toBe(LEFT | FP);
    expect(relative(relative(LEFT | DOWN, -1), -1)).toBe(LEFT | DOWN);
  });

  it('records from the first input, up to ten seconds, and plays it from either side', () => {
    const s = training();
    s.dummy.startRecording(1);
    expect(s.dummy.recording).toBe(true);
    // The player walks the dummy forward (left, as it faces left) for a second, then jabs.
    const ev: SimEvent[] = [];
    for (let t = 0; t < 70; t++) s.tick(t >= 5 && t < 60 ? LEFT : t === 62 ? FP : 0, 0, ev);
    s.dummy.stopRecording();
    const rec = s.dummy.slots[1]!;
    expect(rec.frames).toBe(65);
    // Stored as forward (right, relative to facing).
    expect(rec.runs[0] & RIGHT).toBe(RIGHT);
    // Played on a loop from the other side: it walks right, towards the player.
    s.dummy.settings.slot = 1;
    s.dummy.settings.playback = 'loop';
    place(s.match, 0.5, -1.5);
    const x0 = s.match.fighters[1].x;
    play(s, 40);
    expect(s.match.fighters[1].x).toBeGreaterThan(x0 + fx(0.3));
    // And again once it has ended.
    place(s.match, 0.5, -1.5);
    play(s, 30);
    expect(s.match.fighters[1].x).toBeGreaterThan(x0 + fx(0.3));
  });

  it('stops by itself after ten seconds', () => {
    const d = new TrainingDummy();
    d.startRecording(0);
    let done = false;
    for (let t = 0; t < RECORD_FRAMES + 50 && !done; t++) done = d.record(t & 8 ? FP : 0, 1);
    expect(done).toBe(true);
    d.stopRecording();
    expect(d.slots[0]!.frames).toBe(RECORD_FRAMES);
  });

  it('plays once from every reset, or as its answer', () => {
    const s = training({ slot: 2, playback: 'reset' });
    s.dummy.store(2, { frames: 3, runs: [0, 2, FP, 1] });
    s.setPosition('middle');
    expect(count(play(s, 30), 'hit')).toBe(1);
    expect(count(play(s, 30), 'hit')).toBe(0);
    const a = training({ guard: 'all', slot: 0, afterBlock: 'recording' });
    a.dummy.store(0, { frames: 2, runs: [FP, 1, 0, 1] });
    place(a.match, -0.4, 0.4);
    const ev = play(a, 60, { 0: FK });
    expect(ev.some((e) => e.type === 'block' && e.defender === 1)).toBe(true);
    expect(a.match.fighters[1].move === 's.FP' || ev.some((e) => e.type === 'hit' && e.attacker === 1)).toBe(true);
  });

  it('while recording, the player moves the dummy and player 1 stands still', () => {
    const s = training();
    s.dummy.startRecording(0);
    play(s, 10, {}, BLOCK);
    expect(s.match.fighters[1].mode).toBe('guard');
    expect(s.match.fighters[0].mode).toBe('idle');
  });
});

describe('training: where Reset goes', () => {
  it('round start, the middle, either wall, or a saved moment', () => {
    const s = new Session({ mode: 'training', p1: 'dale', p2: 'rox', level: 'normal', seed: 1 });
    // Reset puts a fresh copy in place: read the fighters again each time.
    const a = () => s.match.fighters[0];
    const d = () => s.match.fighters[1];
    s.setPosition('middle');
    expect(d().x - a().x).toBe(fx(0.8));
    s.setPosition('right');
    expect(backToWall(s.match, 0)).toBe(true);
    expect(a().facing).toBe(1);
    s.setPosition('left');
    expect(backToWall(s.match, 0)).toBe(true);
    expect(a().facing).toBe(-1);
    expect(d().x).toBeLessThan(a().x);
    s.setPosition('start');
    expect(a().x).toBeLessThan(0);
    // A saved moment, health and all.
    place(s.match, 0.2, 1.4);
    d().health = 321;
    s.saveMoment();
    expect(s.position).toBe('saved');
    play(s, 20, {}, LEFT);
    s.reset();
    expect(d().health).toBe(321);
    expect(a().x).toBe(fx(0.2));
  });
});
