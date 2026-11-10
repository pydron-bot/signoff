// Heights are a promise (docs/DESIGN.md, Movement and defence): a high goes
// over anyone ducking and is plainly thrown high; a mid, low or overhead
// reaches every crouching fighter, the smallest included. Then the rules
// themselves, played out in the simulation: ducking highs and throws, being
// knocked upright, and cancelling a dash.
import { describe, expect, it } from 'vitest';
import { DASH_COMMIT, FIGHTERS, Input, fighterData, step, type HitData, type MatchState, type MoveData, type SimEvent } from '../src/sim';
import { guideInput, guides, guideStart, runGuide } from '../src/game/comboGuides';
import { fx } from '../src/sim/fixed';
import { count, place, presses, ready, run } from './sim-helpers';

const { BLOCK, DOWN, RIGHT, FP, BP, FK, THROW } = Input;
const roster = Object.values(FIGHTERS);
/** The lowest crouching head in the roster: every mid must reach below it. */
const lowestCrouch = Math.min(...roster.map((f) => f.hurt.crouch.y + f.hurt.crouch.h));
const shortestStand = Math.min(...roster.map((f) => f.hurt.stand.y + f.hurt.stand.h));
/** A high has to look high: it starts at least this far up. */
const HIGH_FROM = fx(1.0);

/** Ground strikes that land in front at point blank (not a cross-up, a teleport's or a counter's answer that comes from elsewhere). */
function groundStrikes(): { f: string; id: string; mv: MoveData; h: HitData }[] {
  const out: { f: string; id: string; mv: MoveData; h: HitData }[] = [];
  for (const f of roster) {
    for (const [id, mv] of Object.entries(f.moves)) {
      if (mv.stance === 'air' || mv.passThrough || mv.teleport || mv.kind === 'super' || mv.kind === 'interact') continue;
      for (const h of mv.hits) out.push({ f: f.id, id, mv, h });
    }
  }
  return out;
}

describe('heights', () => {
  it('every mid, low and overhead reaches the lowest crouching head', () => {
    const over = groundStrikes()
      .filter(({ h }) => h.height !== 'high' && h.height !== 'unblockable' && h.box.y >= lowestCrouch)
      .map(({ f, id }) => `${f}/${id}`);
    expect([...new Set(over)]).toEqual([]);
  });

  it('every high starts high and still hits the shortest fighter standing', () => {
    const bad = groundStrikes()
      .filter(({ h }) => h.height === 'high' && (h.box.y < HIGH_FROM || h.box.y >= shortestStand))
      .map(({ f, id }) => `${f}/${id}`);
    expect(bad).toEqual([]);
  });

  it('ground projectiles thrown over a crouching head are marked high', () => {
    const bad: string[] = [];
    for (const f of roster) {
      for (const [id, mv] of Object.entries(f.moves)) {
        if (mv.stance === 'air') continue;
        for (const s of mv.spawns) {
          const p = s.projectile;
          if (p.vy !== 0 || p.decoy) continue;
          if (p.y + p.box.y >= lowestCrouch && p.effect.height !== 'high') bad.push(`${f.id}/${id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('ducking is never free: everyone has a mid or low of 8 frames or less', () => {
    for (const f of roster) {
      const quick = Object.values(f.moves).filter((mv) => mv.kind === 'normal' && mv.stance !== 'air' && mv.startup > 0 && mv.startup <= 8 && mv.hits.length > 0 && mv.hits[0].height !== 'high');
      expect(quick.length, f.id).toBeGreaterThan(0);
    }
  });

  it('every standing jab is a high but the small fighter’s', () => {
    for (const f of roster) expect(f.moves[f.normals.s.FP].hits[0].height, f.id).toBe(f.id === 'mumbles' ? 'mid' : 'high');
  });
});

/** Two fighters point blank, P1 facing right. */
function close(p1 = 'dale', p2 = 'rox'): MatchState {
  const m = ready(p1, p2);
  place(m, -0.35, 0.35);
  return m;
}

describe('ducking', () => {
  it('a high goes over a crouch, a crouch-block and a crouching move, and says so once', () => {
    for (const hold of [DOWN, DOWN | BLOCK]) {
      const m = close();
      const ev = run(m, 30, presses({ 0: FP }), hold);
      expect(count(ev, 'hit') + count(ev, 'block'), `hold ${hold}`).toBe(0);
      expect(count(ev, 'ducked')).toBe(1);
      expect(ev.find((e) => e.type === 'ducked')).toMatchObject({ player: 1, move: 's.FP' });
    }
    // A crouching jab in its startup ducks too.
    const m = close();
    const ev = run(m, 30, presses({ 2: FP }), presses({ 0: DOWN | FP }, DOWN));
    expect(ev.some((e) => e.type === 'hit' && e.attacker === 0)).toBe(false);
  });

  it('a high is blocked standing and hits a fighter who stands', () => {
    let ev = run(close(), 30, presses({ 0: FP }), BLOCK);
    expect(count(ev, 'block')).toBe(1);
    ev = run(close(), 30, presses({ 0: FP }));
    expect(count(ev, 'hit')).toBe(1);
  });

  it('a mid and an overhead still reach a croucher, even the smallest', () => {
    for (const p2 of ['mumbles', 'rox']) {
      let ev = run(close('dale', p2), 40, presses({ 0: BP }), DOWN);
      expect(count(ev, 'hit'), `s.BP on ${p2}`).toBe(1);
      ev = run(close('rox', p2), 40, presses({ 0: RIGHT | FK }, 0), DOWN);
      expect(count(ev, 'hit'), `f.FK on ${p2}`).toBe(1);
    }
  });

  it('a neutral duck goes under a throw; crouch-blocking is thrown', () => {
    let m = close();
    let ev = run(m, 40, presses({ 0: THROW }), DOWN);
    expect(count(ev, 'throw')).toBe(0);
    expect(count(ev, 'ducked')).toBe(1);
    m = close();
    ev = run(m, 40, presses({ 0: THROW }), DOWN | BLOCK);
    expect(count(ev, 'throw')).toBe(1);
  });

  it('a ducked throw is punished by a launcher, for the punish bonus', () => {
    const m = close('rox', 'dale');
    // P2 ducks the throw, then launches out of its whiff.
    const ev = run(m, 60, presses({ 0: THROW }), (_m, t) => (t === 12 ? DOWN | BP : DOWN));
    expect(count(ev, 'ducked')).toBe(1);
    expect(count(ev, 'punish')).toBe(1);
    expect(ev.some((e) => e.type === 'hit' && e.attacker === 1 && e.move === 'c.BP')).toBe(true);
  });

  it('command and string grabs take a duck', () => {
    const m = close('hollis', 'dale');
    // Clocking In is Hollis's forward special.
    const ev = run(m, 40, presses({ 0: RIGHT | Input.SPECIAL }), DOWN);
    expect(count(ev, 'throw')).toBe(1);
  });

  it('a hit knocks a croucher upright: the rest of the combo meets a standing body', () => {
    const m = close('dale', 'rox');
    const ev = run(m, 3, 0, DOWN);
    run(m, 12, presses({ 0: DOWN | FP }), DOWN).forEach((e) => ev.push(e));
    const hit = ev.find((e) => e.type === 'hit');
    expect(hit).toMatchObject({ crouched: true });
    expect(m.fighters[1].mode).toBe('hitstun');
    expect(m.fighters[1].crouching).toBe(false);
  });

  it('every combo guide lands the same whether the dummy was standing or crouching', () => {
    const dropped: string[] = [];
    for (const f of roster) {
      for (const g of guides(f.id)) {
        // A guide that opens with a high can't start on a croucher at all.
        const opener = guideStart(f.id, g.bars);
        const ev0: SimEvent[] = [];
        step(opener, guideInput(g, 0, 1), DOWN, ev0);
        const end = runGuide(f.id, g).end + 30;
        const play = (hold: number) => {
          const m = guideStart(f.id, g.bars);
          const ev: SimEvent[] = [];
          for (let t = 0; t <= end; t++) step(m, guideInput(g, t, m.fighters[0].facing), hold, ev);
          return { ev, dealt: fighterData('rox').health - m.fighters[1].health };
        };
        const crouched = play(DOWN);
        if (crouched.ev.some((e) => e.type === 'ducked')) continue;
        const stood = play(0);
        const most = (ev: SimEvent[]) => Math.max(0, ...ev.map((e) => (e.type === 'hit' ? e.combo : 0)));
        if (most(crouched.ev) < most(stood.ev)) dropped.push(`${f.id}: ${g.name}`);
      }
    }
    expect(dropped).toEqual([]);
  });
});

describe('dash cancelling', () => {
  /** P1 dashes forward from far out: taps on steps 0 and 2. */
  const dash = (extra: Record<number, number>) => presses({ 0: RIGHT, 2: RIGHT, ...extra });

  it('is committed for its first frames, then cancels into Block and stops dead', () => {
    const m = ready('rox', 'dale');
    place(m, -3, 3);
    // Block held from the first dash frame: nothing until the commit is up.
    run(m, 3, dash({}));
    expect(m.fighters[0].mode).toBe('dash');
    run(m, DASH_COMMIT - 1, BLOCK);
    expect(m.fighters[0].mode).toBe('dash');
    run(m, 1, BLOCK);
    expect(m.fighters[0].mode).toBe('guard');
    expect(m.fighters[0].vx).toBe(0);
  });

  it('cancels into a normal, but not a jump or another dash', () => {
    const m = ready('rox', 'dale');
    place(m, -3, 3);
    run(m, 3 + DASH_COMMIT, dash({}));
    run(m, 1, Input.UP);
    expect(m.fighters[0].mode).toBe('dash');
    run(m, 1, FP);
    expect(m.fighters[0].mode).toBe('move');
  });

  it('blocks a hit on the step after the cancel', () => {
    const m = ready('rox', 'dale');
    place(m, -1.6, 0.4);
    // P2's jab is timed to land just after P1 cancels its dash into Block.
    const ev = run(m, 40, (_m, t) => (t < 2 ? (t === 0 ? RIGHT : 0) : t === 2 ? RIGHT : t > 2 + DASH_COMMIT ? BLOCK : 0), (_m, t) => (t === 2 + DASH_COMMIT ? BP : 0));
    expect(count(ev, 'hit')).toBe(0);
    expect(count(ev, 'block')).toBeGreaterThan(0);
  });

  it("Tape Skip's dash can't be cancelled early, so combos through it are unchanged", () => {
    const m = close('rox', 'dale');
    m.fighters[0].meter = 3000;
    // s.BP connects, then Tape Skip (METER), then Block held at once.
    run(m, 10, presses({ 0: BP, 9: Input.METER }));
    for (let t = 0; t < 30 && m.fighters[0].mode !== 'dash'; t++) run(m, 1);
    expect(m.fighters[0].mode).toBe('dash');
    run(m, DASH_COMMIT + 1, BLOCK);
    expect(m.fighters[0].mode).toBe('dash');
  });
});
