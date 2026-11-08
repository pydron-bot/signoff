import { describe, expect, it } from 'vitest';
import { Cpu } from '../src/ai/cpu';
import { ReplayPlayer, SNAPSHOT_EVERY, parseReplay, type Replay } from '../src/game/replay';
import { Session } from '../src/game/session';
import { saveMatch, type MatchState, type SimEvent } from '../src/sim';

/** A whole CPU match, with player 1's inputs from a second CPU standing in for a person. */
function record(p1: string, p2: string, seed: number, studio = false, stage = 'weather'): { replay: Replay; match: MatchState; ev: SimEvent[] } {
  const s = new Session({ mode: 'cpu', p1, p2, stage, level: 'hard', seed, studio, version: 'test' });
  const player = new Cpu(0, 'normal', seed * 3 + 1);
  const ev: SimEvent[] = [];
  for (let t = 0; t < 40000 && s.match.phase !== 'over'; t++) s.tick(player.next(s.match), 0, ev);
  expect(s.match.phase).toBe('over');
  return { replay: s.recording()!, match: s.match, ev };
}

function playAll(r: Replay): { match: MatchState; ev: SimEvent[] } {
  const p = new ReplayPlayer(r);
  const ev: SimEvent[] = [];
  while (!p.done) p.step(ev);
  return { match: p.match, ev };
}

describe('replays', () => {
  it('play a recorded match back exactly: the same state and the same events', () => {
    for (const [a, b, seed, studio, stage] of [['dale', 'rox', 7, false, 'weather'], ['hollis', 'mumbles', 11, false, 'burn'], ['mumbles', 'dale', 3, true, 'burn']] as const) {
      const rec = record(a, b, seed, studio, stage);
      expect(rec.replay.options.stage).toBe(stage);
      const back = playAll(rec.replay);
      expect(back.match).toEqual(rec.match);
      expect(back.ev).toEqual(rec.ev);
      expect(rec.ev.some((e) => e.type === 'matchOver')).toBe(true);
    }
  });

  it('are small: a few kilobytes as JSON', () => {
    const { replay } = record('rox', 'hollis', 5);
    expect(replay.frames).toBeGreaterThan(3000);
    expect(JSON.stringify(replay).length).toBeLessThan(40_000);
  });

  it('seek back and forth to the same state as playing straight through', () => {
    const { replay } = record('dale', 'mumbles', 9);
    const straight = new ReplayPlayer(replay);
    const at = new Map<number, MatchState>();
    const targets = [0, 1, 299, 300, 301, 1234, 2000, replay.frames - 1, replay.frames];
    const ev: SimEvent[] = [];
    for (;;) {
      if (targets.includes(straight.frame)) at.set(straight.frame, saveMatch(straight.match));
      if (straight.done) break;
      straight.step(ev);
    }
    const p = new ReplayPlayer(replay);
    // Forward a long way, back, back again, forward a little, then the ends.
    for (const f of [2000, 301, 0, 299, 300, 1234, replay.frames, 1, replay.frames - 1, 2000]) {
      p.seek(f);
      expect(p.frame).toBe(f);
      expect(p.match).toEqual(at.get(f));
    }
    // Out of range clamps.
    p.seek(-50);
    expect(p.frame).toBe(0);
    p.seek(replay.frames + SNAPSHOT_EVERY * 3);
    expect(p.frame).toBe(replay.frames);
  });

  it('record CPU and versus matches only', () => {
    const opts = { p1: 'dale', p2: 'rox', level: 'normal', seed: 1 } as const;
    expect(new Session({ ...opts, mode: 'cpu' }).recording()).not.toBeNull();
    expect(new Session({ ...opts, mode: 'versus' }).recording()).not.toBeNull();
    expect(new Session({ ...opts, mode: 'training' }).recording()).toBeNull();
    expect(new Session({ ...opts, mode: 'demo' }).recording()).toBeNull();
  });

  it('versus records both players\' inputs', () => {
    const s = new Session({ mode: 'versus', p1: 'rox', p2: 'dale', level: 'normal', seed: 4, version: 'test' });
    const a = new Cpu(0, 'hard', 1);
    const b = new Cpu(1, 'hard', 2);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 2000; t++) s.tick(a.next(s.match), b.next(s.match), ev);
    expect(playAll(s.recording()!).match).toEqual(s.match);
  });

  it('read back from storage, and refuse what isn\'t one', () => {
    const { replay } = record('rox', 'dale', 2);
    expect(parseReplay(JSON.parse(JSON.stringify(replay)))).toEqual(replay);
    // Recordings from before stages could be picked were all on Weather at Eleven.
    const { stage: _, ...old } = replay.options;
    expect(parseReplay({ ...replay, options: old })?.options.stage).toBe('weather');
    expect(parseReplay(null)).toBeNull();
    expect(parseReplay({})).toBeNull();
    expect(parseReplay({ ...replay, frames: replay.frames + 1 })).toBeNull();
    expect(parseReplay({ ...replay, runs: [...replay.runs, 5] })).toBeNull();
    expect(parseReplay({ ...replay, runs: replay.runs.map((n, i) => (i === 0 ? -1 : n)) })).toBeNull();
  });

  it('a replay session plays like the match it recorded', () => {
    const rec = record('hollis', 'rox', 13);
    const s = new Session({ mode: 'replay', p1: 'hollis', p2: 'rox', level: 'normal', seed: 13, replay: rec.replay });
    const ev: SimEvent[] = [];
    // Inputs given to a replay session are ignored.
    while (s.replayFrame < s.replayFrames) s.tick(0xfff, 0xfff, ev);
    expect(s.match).toEqual(rec.match);
    expect(s.recording()).toBeNull();
  });
});
