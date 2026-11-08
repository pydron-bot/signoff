// Moves are data, so the data gets checked: every move recovers, every
// reference resolves, and a string marked safe on block really is safe,
// measured by playing it out in the simulation, not just by arithmetic.
import { describe, expect, it } from 'vitest';
import { BOOST_WINDOW, FIGHTERS, Input, PUNISH_STARTUP, frameData, isSafe, step, stringMoves, type FighterData, type MatchState, type MoveData, type SimEvent } from '../src/sim';
import { place, ready } from './sim-helpers';

const { BLOCK, DOWN, LEFT, RIGHT, SPECIAL } = Input;
const roster = Object.values(FIGHTERS);

/** The input that starts a ground move by its id, for a fighter facing right. */
function startBits(f: FighterData, id: string): number {
  const n = f.normals;
  for (const [atk, mid] of Object.entries(n.s)) if (mid === id) return Input.ATTACK_BITS[atk as keyof typeof n.s];
  for (const [atk, mid] of Object.entries(n.c)) if (mid === id) return DOWN | Input.ATTACK_BITS[atk as keyof typeof n.c];
  for (const [atk, mid] of Object.entries(n.f)) if (mid === id) return RIGHT | Input.ATTACK_BITS[atk as keyof typeof n.f];
  const dirs = { f: RIGHT, b: LEFT, d: DOWN, n: 0 } as const;
  for (const [dir, mid] of Object.entries(f.specials)) if (mid === id) return dirs[dir as keyof typeof dirs] | SPECIAL;
  throw new Error(`no input for ${f.id}/${id}`);
}

interface Measured {
  blocks: number;
  hits: number;
  advantage: number | null;
  moves: string[];
}

/**
 * Plays a sequence of moves (a string, or one move and its boost) point
 * blank into an opponent who holds the right block, and measures frame
 * advantage: the step the defender can act minus the step the attacker can.
 */
function measure(f: FighterData, seq: string[], next: number[], boost = false): Measured {
  const m: MatchState = ready(f.id, f.id === 'dale' ? 'rox' : 'dale');
  place(m, -0.3, 0.3);
  if (boost) m.fighters[0].meter = 1000;
  const ev: SimEvent[] = [];
  const pressedFor = new Set<number>();
  let lastBlockStep = -1;
  let attackerFree = -1;
  let defenderFree = -1;
  const seen: string[] = [];
  for (let t = 0; t < 240; t++) {
    const a = m.fighters[0];
    let in0 = t === 0 ? startBits(f, seq[0]) : 0;
    if (a.mode === 'move') {
      if (seen[seen.length - 1] !== a.move) seen.push(a.move);
      const k = seq.indexOf(a.move);
      const mv = f.moves[a.move];
      const at = Math.max(2, (mv.cancel?.[0] ?? 2) - 3);
      if (k >= 0 && k < next.length && a.moveFrame === at && !pressedFor.has(k)) {
        pressedFor.add(k);
        in0 = next[k];
      }
      if (boost && a.moveFrame === 2 && !pressedFor.has(99)) {
        pressedFor.add(99);
        in0 = SPECIAL;
      }
    }
    const cur = a.mode === 'move' ? f.moves[a.move] : undefined;
    const in1 = BLOCK | (cur?.hits.some((h) => h.height === 'low') ? DOWN : 0);
    const before = ev.length;
    step(m, in0, in1, ev);
    for (let e = before; e < ev.length; e++) {
      if (ev[e].type !== 'block') continue;
      // A gap between hits can free the defender for a moment: only the last block counts.
      lastBlockStep = t;
      attackerFree = defenderFree = -1;
    }
    if (lastBlockStep >= 0 && t > lastBlockStep) {
      if (attackerFree < 0 && m.fighters[0].mode !== 'move') attackerFree = t;
      if (defenderFree < 0 && m.fighters[1].mode !== 'blockstun') defenderFree = t;
    }
    if (attackerFree >= 0 && defenderFree >= 0) break;
  }
  return {
    blocks: ev.filter((e) => e.type === 'block').length,
    hits: ev.filter((e) => e.type === 'hit').length,
    advantage: attackerFree >= 0 && defenderFree >= 0 ? defenderFree - attackerFree : null,
    moves: seen,
  };
}

describe.each(roster.map((f) => [f.name, f] as const))('%s', (_name, f) => {
  const moves = Object.values(f.moves);

  it('every move recovers, and its hits, spawns and windows fit inside it', () => {
    for (const mv of moves) {
      expect(mv.total, mv.id).toBeGreaterThan(mv.lastActive);
      for (const h of mv.hits) {
        expect(h.frames[0], mv.id).toBeGreaterThanOrEqual(1);
        expect(h.frames[1], mv.id).toBeGreaterThanOrEqual(h.frames[0]);
        expect(h.box.w > 0 && h.box.h > 0, mv.id).toBe(true);
        expect(h.blockstun, mv.id).toBeGreaterThan(0);
        if (!h.knockdown && h.launch === undefined && mv.kind !== 'super') expect(h.hitstun, mv.id).toBeGreaterThan(0);
      }
      for (const w of [mv.cancel, mv.invuln, mv.armor, mv.passThrough, ...mv.hurt.map((x) => x.frames), ...mv.motion.map((x) => x.frames)]) {
        if (!w) continue;
        expect(w[0] >= 1 && w[1] >= w[0] && w[1] <= mv.total, mv.id).toBe(true);
      }
      expect(mv.hits.length + mv.spawns.length + (mv.throwData ? 1 : 0) + mv.motion.length, `${mv.id} does something`).toBeGreaterThan(0);
    }
  });

  it('every reference resolves to a move of the right kind', () => {
    const kind = (id: string) => f.moves[id]?.kind;
    for (const id of [...Object.values(f.normals.s), ...Object.values(f.normals.c), ...Object.values(f.normals.f), ...Object.values(f.normals.b)]) expect(kind(id), id).toBe('normal');
    for (const id of Object.values(f.normals.j)) expect(kind(id), id).toBe('air');
    for (const id of Object.values(f.specials)) expect(kind(id), id).toBe('special');
    expect(kind(f.throwMove)).toBe('throw');
    expect(kind(f.superMove)).toBe('super');
    for (const mv of moves) {
      for (const next of Object.values(mv.chain)) expect(kind(next), `${mv.id} chains to ${next}`).toBe('normal');
      if (mv.boost) {
        const b = f.moves[mv.boost];
        expect(b, mv.boost).toBeDefined();
        // Boosting swaps the move by frame BOOST_WINDOW, so neither version may hit or spawn before then.
        expect(b.startup, mv.boost).toBeGreaterThanOrEqual(BOOST_WINDOW);
        if (mv.startup) expect(mv.startup, mv.id).toBeGreaterThanOrEqual(BOOST_WINDOW);
        expect(b.kind).toBe(mv.kind);
      }
    }
  });

  it('has 8 to 12 strings, each chaining through real moves', () => {
    expect(f.strings.length).toBeGreaterThanOrEqual(8);
    expect(f.strings.length).toBeLessThanOrEqual(12);
    for (const s of f.strings) expect(stringMoves(f, s), s.name).not.toBeNull();
  });

  it.each(f.strings.map((s) => [s.name, s] as const))('string %s: blocks in full, and its safe flag matches the measured advantage', (_n, s) => {
    const seq = stringMoves(f, s)!;
    const next = s.path.slice(1).map((b) => Input.ATTACK_BITS[b as keyof typeof Input.ATTACK_BITS]);
    const r = measure(f, seq, next);
    expect(r.moves).toEqual(seq);
    expect(r.hits).toBe(0);
    expect(r.blocks).toBe(seq.reduce((n, id) => n + f.moves[id].hits.length, 0));
    const listed = frameData(f.moves[seq[seq.length - 1]]).onBlock!;
    expect(r.advantage).toBe(listed);
    expect(isSafe(r.advantage!), `${s.name} is ${r.advantage} on block`).toBe(s.safe);
  });

  const single = moves.filter((mv) => (mv.kind === 'normal' || mv.kind === 'special') && mv.hits.length && !mv.spawns.length);
  const startable = single.filter((mv) => {
    try {
      startBits(f, mv.id);
      return true;
    } catch {
      return false;
    }
  });
  it.each(startable.map((mv) => [mv.id, mv] as const))('%s: blocked point blank, the measured advantage matches its frame data', (_id, mv: MoveData) => {
    const r = measure(f, [mv.id], []);
    expect(r.hits).toBe(0);
    expect(r.blocks).toBe(mv.hits.length);
    expect(r.advantage).toBe(frameData(mv).onBlock);
  });
});

describe('roster', () => {
  it('the fastest ground normal is PUNISH_STARTUP, the basis for "safe on block"', () => {
    const fastest = Math.min(...roster.flatMap((f) => Object.values(f.moves).filter((m) => m.kind === 'normal').map((m) => m.startup)));
    expect(fastest).toBe(PUNISH_STARTUP);
  });
});
