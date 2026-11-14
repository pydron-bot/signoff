// The CPU plays the real game: it converts openers into the combo guides'
// routes, punishes, learns what it can see of its opponent, and stays
// deterministic and blind to what a player can't see.
import { describe, expect, it } from 'vitest';
import { Cpu, type CpuLevel } from '../src/ai/cpu';
import { AFTER_BLOCK_BLOCK, AFTER_BLOCK_THROW, Habits, WAKE_ATTACK, type Glimpse } from '../src/ai/habits';
import { routeAfter, routeOf, routesFor } from '../src/ai/routes';
import { CHOICES, leanOf } from '../src/ai/lean';
import { ReplayPlayer } from '../src/game/replay';
import { Session } from '../src/game/session';
import { guides } from '../src/game/comboGuides';
import { BAR, FIGHTERS, Input, createMatch, fighterData, step, type MatchState, type SimEvent } from '../src/sim';
import { fx } from '../src/sim/fixed';
import { place } from './sim-helpers';

const IDS = Object.keys(FIGHTERS);

function play(p1: string, p2: string, seed: number, levels: [CpuLevel, CpuLevel]): { m: MatchState; ev: SimEvent[]; cpus: Cpu[] } {
  const m = createMatch({ p1, p2, stage: 'weather', seed, studio: true });
  const cpus = [new Cpu(0, levels[0], seed * 2 + 1), new Cpu(1, levels[1], seed * 2 + 2)];
  const ev: SimEvent[] = [];
  for (let t = 0; t < 40000 && m.phase !== 'over'; t++) step(m, cpus[0].next(m), cpus[1].next(m), ev);
  return { m, ev, cpus };
}

/**
 * Combos opened by a route's opener, landed on the ground and within the
 * range its route was measured to hold from: [opened, of them 3+ hits], by attacker.
 */
function conversions(p1: string, p2: string, seed: number, levels: [CpuLevel, CpuLevel]): { opened: number[]; three: number[]; routes: number[] } {
  const m = createMatch({ p1, p2, stage: 'weather', seed, studio: true });
  const cpus = [new Cpu(0, levels[0], seed * 2 + 1), new Cpu(1, levels[1], seed * 2 + 2)];
  const ev: SimEvent[] = [];
  const opened = [0, 0];
  const three = [0, 0];
  // Per defender: the combo on them, whether it counts, and its hits.
  const counts = [false, false];
  const hits = [0, 0];
  const close = (d: number) => {
    if (counts[d]) {
      opened[1 - d]++;
      if (hits[d] >= 3) three[1 - d]++;
    }
    counts[d] = false;
    hits[d] = 0;
  };
  for (let t = 0; t < 40000 && m.phase !== 'over' && m.phase !== 'stayTuned'; t++) {
    const grounded = [m.fighters[0].y === 0, m.fighters[1].y === 0];
    ev.length = 0;
    step(m, cpus[0].next(m), cpus[1].next(m), ev);
    for (const e of ev) {
      if (e.type === 'roundOver') {
        close(0);
        close(1);
      }
      if (e.type !== 'hit') continue;
      const d = e.defender;
      if (hits[d] === 0) {
        const r = routesFor(m.fighters[e.attacker].fighter).find((x) => x.opener === e.move);
        counts[d] = r !== undefined && grounded[d] && Math.abs(m.fighters[0].x - m.fighters[1].x) <= r.far + fx(0.05);
      }
      hits[d]++;
    }
    for (let d = 0; d < 2; d++) if (hits[d] && m.fighters[d].combo === 0 && m.fighters[d].mode !== 'hitstun' && m.fighters[d].mode !== 'launched') close(d);
  }
  return { opened, three, routes: [cpus[0].tally.routes, cpus[1].tally.routes] };
}

describe('combo routes', () => {
  it('every fighter has a route from a jab, a low and a punish, read from the guides and measured', () => {
    for (const id of IDS) {
      for (const kind of ['jab', 'low', 'punish'] as const) {
        const r = routeOf(id, kind);
        expect(r, `${id} ${kind}`).not.toBeNull();
        expect(guides(id)).toContain(r!.guide);
        expect(r!.hits, `${id} ${kind}`).toBeGreaterThanOrEqual(2);
        expect(r!.far).toBeGreaterThan(fx(0.7));
      }
      expect(routeOf(id, 'jab')!.opener).toBe(fighterData(id).normals.s.FP);
    }
  });

  it('spends bars on a meter route only when told it may, and the full meter only when it finishes them', () => {
    const cBP = fighterData('rox').normals.c.BP;
    expect(routeAfter('rox', cBP, 3 * BAR, false, 100)!.kind).toBe('punish');
    expect(routeAfter('rox', cBP, 3 * BAR, true, 100)!.guide.bars).toBe(1);
    expect(routeAfter('rox', cBP, 3 * BAR, true, 40)!.guide.bars).toBe(3);
    expect(routeAfter('rox', cBP, 0, true, 100)!.kind).toBe('punish');
    // A plain route that already finishes them: no bar spent.
    expect(routeAfter('rox', cBP, 3 * BAR, true, 5)!.kind).toBe('punish');
  });
});

describe('the CPU converts', () => {
  it('hard turns at least half of the openers it lands into three hits or more', () => {
    let opened = 0;
    let three = 0;
    for (let k = 0; k < IDS.length; k++) {
      for (const seed of [1, 2, 3, 4]) {
        const c = conversions(IDS[k], IDS[(k + seed) % IDS.length], seed, ['hard', 'hard']);
        opened += c.opened[0] + c.opened[1];
        three += c.three[0] + c.three[1];
      }
    }
    expect(opened).toBeGreaterThan(150);
    expect(three * 2).toBeGreaterThanOrEqual(opened);
  });

  it('easy never runs a route', () => {
    for (let k = 0; k < IDS.length; k++) {
      const c = conversions(IDS[k], IDS[(k + 1) % IDS.length], k + 1, ['easy', 'easy']);
      expect(c.routes).toEqual([0, 0]);
    }
  });

  it('the DIRECTOR converts more often than normal', () => {
    let director = 0;
    let normal = 0;
    for (let k = 0; k < IDS.length; k++) {
      const c = conversions(IDS[k], IDS[(k + 3) % IDS.length], k + 1, ['director', 'normal']);
      director += c.routes[0];
      normal += c.routes[1];
    }
    expect(director).toBeGreaterThan(normal * 2);
  });

  it('punishes a whiffed throw with a combo', () => {
    for (const id of ['rox', 'margaret', 'hollis']) {
      let best = 0;
      for (let k = 0; k < 6; k++) {
        const m = createMatch({ p1: 'dale', p2: id, stage: 'weather', seed: 4, studio: true });
        while (m.phase !== 'fight') step(m, 0, 0, []);
        // Just out of throw range: the throw whiffs and takes 23 frames to recover.
        place(m, -0.51, 0.51);
        const cpu = new Cpu(1, 'director', 9 + k);
        const ev: SimEvent[] = [];
        let hits = 0;
        for (let t = 0; t < 150; t++) {
          ev.length = 0;
          step(m, t === 0 ? Input.THROW : 0, cpu.next(m), ev);
          for (const e of ev) if (e.type === 'hit' && e.attacker === 1) hits++;
        }
        best = Math.max(best, hits);
      }
      expect(best, id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the CPU learns what it can see', () => {
  const g = (o: Partial<Glimpse>): Glimpse => ({ mode: 'idle', fresh: false, throwing: false, attacking: false, shooting: false, ...o });

  it('counts what they do after its attack is blocked and on getting up', () => {
    const h = new Habits(1);
    let at = 0;
    for (let k = 0; k < 4; k++) {
      h.blocked(at);
      h.see(g({ mode: 'blockstun' }), ++at);
      h.see(g({ mode: 'move', fresh: true, throwing: true }), ++at);
      at += 40;
    }
    expect(h.afterBlock[AFTER_BLOCK_THROW]).toBe(4);
    expect(h.likely(h.afterBlock, 40)).toBe(AFTER_BLOCK_THROW);
    // Blocking it out counts once the window's over.
    h.blocked(at);
    for (let k = 1; k <= 30; k++) h.see(g({ mode: 'guard' }), at + k);
    expect(h.afterBlock[AFTER_BLOCK_BLOCK]).toBe(1);
    h.see(g({ mode: 'getup' }), 1000);
    h.see(g({ mode: 'move', fresh: true, attacking: true }), 1001);
    expect(h.wake[WAKE_ATTACK]).toBe(1);
  });

  it('starts out even, and learns nothing with no prior (easy)', () => {
    const h = new Habits(3);
    expect(h.likely(h.afterBlock, 40)).toBe(-1);
    const none = new Habits(0);
    none.blocked(0);
    none.see(g({ mode: 'move', fresh: true, throwing: true }), 1);
    expect(none.afterBlock).toEqual([0, 0, 0]);
  });

  it('ducks the throw of someone who always throws after blocking', () => {
    // P1 holds Block, and throws as soon as the CPU's attack is blocked and they're free (topped up, so it lasts).
    const m = createMatch({ p1: 'rox', p2: 'rox', stage: 'weather', seed: 3, studio: true });
    const cpu = new Cpu(1, 'director', 8);
    const ev: SimEvent[] = [];
    let blocked = -99;
    let ducked = 0;
    for (let t = 0; t < 20000 && m.phase !== 'over' && m.phase !== 'stayTuned'; t++) {
      const p = m.fighters[0];
      const close = Math.abs(m.fighters[1].x - p.x) < fx(1.0);
      const free = p.mode === 'guard' || p.mode === 'idle';
      p.health = p.maxHealth;
      const throwNow = free && t - blocked < 40 && t - blocked > 0 && t % 2 === 0;
      const in0 = throwNow ? Input.THROW : close ? Input.BLOCK : Input.BLOCK | Input.RIGHT;
      ev.length = 0;
      step(m, in0, cpu.next(m), ev);
      for (const e of ev) {
        if (e.type === 'block' && e.defender === 0) blocked = t;
        if (e.type === 'ducked' && e.player === 1) ducked++;
      }
    }
    expect(cpu.habits.likely(cpu.habits.afterBlock, 40)).toBe(AFTER_BLOCK_THROW);
    expect(ducked).toBeGreaterThan(0);
  });
});

describe('the CPU is fair and deterministic', () => {
  it('a CPU match replays identically from its seed, the DIRECTOR included', () => {
    const a = play('gus', 'mumbles', 5, ['director', 'hard']);
    const b = play('gus', 'mumbles', 5, ['director', 'hard']);
    expect(a.m.phase).toBe('over');
    expect(b.m).toEqual(a.m);
    expect(b.ev).toEqual(a.ev);
  });

  it('a match against the DIRECTOR plays back from its recording', () => {
    const s = new Session({ mode: 'cpu', p1: 'margaret', p2: 'gideon', stage: 'weather', level: 'director', seed: 8, studio: true, version: 'test' });
    const player = new Cpu(0, 'hard', 17);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 40000 && s.match.phase !== 'over'; t++) s.tick(player.next(s.match), 0, ev);
    expect(s.match.phase).toBe('over');
    const p = new ReplayPlayer(s.recording()!);
    const back: SimEvent[] = [];
    while (!p.done) p.step(back);
    expect(p.match).toEqual(s.match);
    expect(back).toEqual(ev);
  });

  it('gives the same input whatever the opponent holds, buffers or rolls, which no player can see', () => {
    for (const [p1, p2, seed] of [['rox', 'gideon', 2], ['hollis', 'gus', 6]] as const) {
      const m = createMatch({ p1, p2, stage: 'weather', seed, studio: true });
      const cpus = [new Cpu(0, 'director', seed), new Cpu(1, 'hard', seed + 1)];
      // Twins with the same seeds, shown the same match with the hidden parts scrambled.
      const twins = [new Cpu(0, 'director', seed), new Cpu(1, 'hard', seed + 1)];
      const ev: SimEvent[] = [];
      let n = 0;
      for (let t = 0; t < 40000 && m.phase !== 'over'; t++) {
        const out = [0, 0];
        for (let i = 0; i < 2; i++) {
          const blind = structuredClone(m);
          const o = blind.fighters[1 - i];
          o.input.held = 0x1fff ^ (t * 7919);
          o.input.age.fill(t % 9);
          o.input.gap.fill(t % 5);
          o.input.hist.fill(t * 31);
          o.input.specialDir = t % 2 ? 'b' : 'd';
          o.comboMoves.push('hidden');
          o.techable = !o.techable;
          blind.rng.s = (t * 2654435761) | 0;
          out[i] = cpus[i].next(m);
          expect(twins[i].next(blind), `${p1} v ${p2}, step ${t}, P${i + 1}`).toBe(out[i]);
          if (out[i]) n++;
        }
        step(m, out[0], out[1], ev);
      }
      expect(m.phase).toBe('over');
      expect(n).toBeGreaterThan(500);
    }
  });
});

describe('leans', () => {
  it('every fighter has a lean with a positive weight on every kind of choice', () => {
    for (const id of Object.keys(FIGHTERS)) {
      const lean = leanOf(id);
      for (const c of CHOICES) {
        expect(lean[c], `${id}.${c}`).toBeGreaterThan(0);
        expect(lean[c], `${id}.${c}`).toBeLessThanOrEqual(5);
      }
    }
  });
});
