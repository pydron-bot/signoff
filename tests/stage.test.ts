// The living stage: the fairness rules from the design, and each segment's changes.
import { describe, expect, it } from 'vitest';
import { fx } from '../src/sim/fixed';
import { setupRound } from '../src/sim/stage';
import { DALE } from '../src/sim/fighters/dale';
import { Input, STAGES, type MatchState, type SimEvent } from '../src/sim';
import { homeStage } from '../src/sim/stages';
import { count, place, presses, ready, run } from './sim-helpers';

const { INTERACT, UP, RIGHT } = Input;

function onSegment(seg: number, p1 = 'dale', p2 = 'rox'): MatchState {
  const m = ready(p1, p2);
  m.segment = seg;
  setupRound(m);
  return m;
}

/** Steps until an event of this type, returning it and the steps taken. */
function until(m: MatchState, type: SimEvent['type'], max = 2000, in0 = 0, in1 = 0) {
  const ev: SimEvent[] = [];
  for (let t = 0; t < max; t++) {
    const from = ev.length;
    run(m, 1, in0, in1).forEach((e) => ev.push(e));
    const hit = ev.slice(from).find((e) => e.type === type);
    if (hit) return { e: hit, t, ev };
  }
  throw new Error(`no ${type} in ${max} steps`);
}

describe('fairness rules', () => {
  for (const stage of Object.values(STAGES)) {
    stage.segments.forEach((seg, i) => {
      it(`${stage.name} segment ${i + 1}: hazards warn at least a second ahead and everything fits the arena`, () => {
        for (const h of seg.hazards) {
          expect(h.warn, h.id).toBeGreaterThanOrEqual(60);
          expect(h.active).toBeGreaterThan(0);
          expect(h.period).toBeGreaterThan(h.warn + h.active);
          for (const x of h.spots) expect(Math.abs(x)).toBeLessThan(seg.halfWidth);
        }
        for (const p of seg.props) expect(Math.abs(p.x)).toBeLessThan(seg.halfWidth);
      });
    });
  }

  it('studio rules: one segment, hazards off, props stay', () => {
    const m = ready('dale', 'rox', { studio: true });
    m.segment = 1;
    setupRound(m);
    expect(m.hazards).toEqual([]);
    expect(m.wind).not.toBe(0);
  });
});

describe('The Studio (segment 1)', () => {
  it('kicking the camera dolly sends it into the opponent, once', () => {
    const m = onSegment(0);
    place(m, -4.3, 0);
    const ev = run(m, 90, presses({ 0: INTERACT, 40: INTERACT }));
    expect(count(ev, 'propKick')).toBe(1);
    const hit = ev.find((e) => e.type === 'hit');
    expect(hit).toMatchObject({ attacker: 0, defender: 1, move: 'dolly-left' });
    expect(m.props[0].mode).toBe('spent');
  });

  it('Interact does nothing away from a prop', () => {
    const m = onSegment(0);
    place(m, -1, 1);
    const ev = run(m, 30, presses({ 0: INTERACT }));
    expect(count(ev, 'propKick')).toBe(0);
    expect(m.fighters[0].mode).toBe('idle');
  });
});

describe('The Forecast Comes True (segment 2)', () => {
  it('wind pushes both fighters the same way by the same amount', () => {
    const m = onSegment(1);
    place(m, -1, 1);
    const [a0, b0] = m.fighters.map((f) => f.x);
    run(m, 30);
    expect(m.fighters[0].x - a0).toBe(30 * m.wind);
    expect(m.fighters[1].x - b0).toBe(30 * m.wind);
  });

  it('lightning strikes the announced spot, exactly `warn` frames after the warning', () => {
    const m = onSegment(1);
    m.wind = 0;
    const warn = until(m, 'hazardWarn');
    expect(warn.e).toMatchObject({ hazard: 'lightning', caption: 'SEVERE STORM WARNING' });
    const x = warn.e.type === 'hazardWarn' ? warn.e.x : 0;
    // Player 1 stands on the spot; player 2 stays well clear.
    m.fighters[0].x = x;
    m.fighters[1].x = x > 0 ? x - fx(3) : x + fx(3);
    const strike = until(m, 'hazardStrike');
    expect(strike.t + 1).toBe(STAGES.weather.segments[1].hazards[0].warn);
    const after = run(m, 20);
    const hits = [...strike.ev, ...after].filter((e) => e.type === 'hazardHit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ player: 0, damage: 80 });
    expect(['launched', 'down']).toContain(m.fighters[0].mode);
  });
});

describe('Flood Warning (segment 3)', () => {
  it('walking is slower in the water', () => {
    const m = onSegment(2);
    const x0 = m.fighters[0].x;
    run(m, 30, RIGHT);
    expect(m.fighters[0].x - x0).toBe(30 * Math.floor((DALE.walkFwd * 65) / 100));
  });

  it('the puddles shock whoever stands in them, but not someone in the air', () => {
    const m = onSegment(2);
    place(m, -3, 3);
    until(m, 'hazardWarn');
    // Player 2 jumps so they're airborne when the shock comes.
    const hz = STAGES.weather.segments[2].hazards[0];
    run(m, hz.warn - 12);
    const ev = run(m, hz.active + 10, 0, presses({ 0: UP }));
    const hits = ev.filter((e) => e.type === 'hazardHit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ player: 0 });
    expect(m.fighters[0].health).toBe(m.fighters[0].maxHealth - 50);
  });
});

describe('rounds bring the next segment', () => {
  it('the break swaps in the next segment’s hazards and props', () => {
    const m = ready();
    expect(m.props).toHaveLength(2);
    m.fighters[1].health = 1;
    place(m, -0.3, 0.3);
    run(m, 20, presses({ 0: Input.FP }));
    const ev: SimEvent[] = [];
    while (m.phase !== 'fight') ev.push(...run(m, 1));
    expect(m.segment).toBe(1);
    expect(m.props).toHaveLength(0);
    expect(m.hazards).toHaveLength(1);
    expect(m.wind).not.toBe(0);
  });
});

describe('Feel the Burn at Dawn', () => {
  const burn = (seg: number, p1 = 'dale', p2 = 'rox'): MatchState => {
    const m = ready(p1, p2, { stage: 'burn' });
    m.segment = seg;
    setupRound(m);
    return m;
  };

  it('Warm-Up: the boombox is picked up and thrown at chest height, once', () => {
    const m = burn(0);
    place(m, -0.5, 3);
    const ev = run(m, 60, presses({ 0: INTERACT, 30: INTERACT }));
    expect(count(ev, 'propKick')).toBe(1);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, defender: 1, move: 'boombox' });
    expect(m.props[0].mode).toBe('spent');
  });

  it('Warm-Up: a crouching Mumbles is under the boombox', () => {
    const m = burn(0, 'dale', 'mumbles');
    place(m, -0.5, 3);
    const ev = run(m, 60, presses({ 0: INTERACT }), Input.DOWN);
    expect(count(ev, 'hit')).toBe(0);
    expect(m.props[0].mode).toBe('spent');
  });

  it('Double Time: the game runs 10% faster, clock and all, the same on every run', () => {
    const a = burn(1);
    const b = burn(1);
    const t0 = a.timer;
    const evA = run(a, 600, RIGHT);
    const evB = run(b, 600, RIGHT);
    expect(t0 - a.timer).toBe(660);
    expect(a.roundFrame).toBe(660);
    expect(a).toEqual(b);
    expect(evA).toEqual(evB);
  });

  it('Warm-Up and Burnout run at the normal speed', () => {
    for (const seg of [0, 2]) {
      const m = burn(seg);
      const t0 = m.timer;
      run(m, 600);
      expect(t0 - m.timer).toBe(600);
    }
  });

  it('Burnout: the arena opens out to ±8 m', () => {
    const m = burn(2);
    place(m, 0, 2);
    run(m, 600, presses({}, Input.LEFT));
    expect(m.fighters[0].x).toBeLessThan(fx(-7));
    const weather = onSegment(2);
    place(weather, 0, 2);
    run(weather, 600, presses({}, Input.LEFT));
    expect(weather.fighters[0].x).toBeGreaterThan(fx(-6));
  });

  it('Burnout: a shard falls on the announced spot, on the beat', () => {
    const m = burn(2);
    const hz = STAGES.burn.segments[2].hazards[0];
    const warn = until(m, 'hazardWarn');
    expect(warn.e).toMatchObject({ hazard: 'shards', caption: 'MIND THE GLASS' });
    const x = warn.e.type === 'hazardWarn' ? warn.e.x : 0;
    m.fighters[0].x = x;
    m.fighters[1].x = x > 0 ? x - fx(3) : x + fx(3);
    const strike = until(m, 'hazardStrike');
    // The music's beat is every 30 steps from the start of the fight.
    expect(m.roundFrame % 30).toBe(0);
    expect(hz.period % 30).toBe(0);
    const ev = [...strike.ev, ...run(m, 20)];
    expect(ev.filter((e) => e.type === 'hazardHit')).toEqual([expect.objectContaining({ player: 0, damage: 60 })]);
  });
});

describe("The Eleven O'Clock News", () => {
  const news = (seg: number, p1 = 'dale', p2 = 'rox'): MatchState => {
    const m = ready(p1, p2, { stage: 'news' });
    m.segment = seg;
    setupRound(m);
    return m;
  };

  it('Headlines: the desk is shoved along the floor into the opponent, once', () => {
    const m = news(0);
    place(m, -0.6, 3);
    const ev = run(m, 90, presses({ 0: INTERACT, 40: INTERACT }));
    expect(count(ev, 'propKick')).toBe(1);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, defender: 1, move: 'desk' });
    expect(m.props[0].mode).toBe('spent');
  });

  it('Headlines: the desk can be jumped', () => {
    const m = news(0);
    place(m, -0.6, 3);
    // Player 2 jumps as the desk arrives (it travels about 3 m at 0.1 m a step).
    const ev = run(m, 70, presses({ 0: INTERACT }), presses({ 18: UP }));
    expect(count(ev, 'hit')).toBe(0);
    expect(m.props[0].mode).toBe('spent');
  });

  it('The Ticker: the riser throws whoever stands in the middle, not someone at the side', () => {
    const m = news(1);
    place(m, 0.2, 3);
    const hz = STAGES.news.segments[1].hazards[0];
    const warn = until(m, 'hazardWarn');
    expect(warn.e).toMatchObject({ hazard: 'riser', caption: 'ANCHOR DESK RISING', all: true });
    m.fighters[0].x = fx(0.2);
    m.fighters[1].x = fx(3);
    const ev = run(m, hz.warn + hz.active + 5);
    const hits = ev.filter((e) => e.type === 'hazardHit');
    expect(hits).toEqual([expect.objectContaining({ player: 0, damage: 40 })]);
  });

  it('Lights Out: a lamp falls on the announced spot', () => {
    const m = news(2);
    const warn = until(m, 'hazardWarn');
    expect(warn.e).toMatchObject({ hazard: 'lamps', caption: 'LIGHTING FAILURE' });
    const x = warn.e.type === 'hazardWarn' ? warn.e.x : 0;
    m.fighters[0].x = x;
    m.fighters[1].x = x > 0 ? x - fx(3) : x + fx(3);
    const strike = until(m, 'hazardStrike');
    const ev = [...strike.ev, ...run(m, 20)];
    expect(ev.filter((e) => e.type === 'hazardHit')).toEqual([expect.objectContaining({ player: 0, damage: 70 })]);
  });

  it("is Margaret's home stage in Arcade", () => {
    expect(homeStage("The Eleven O'Clock News")).toBe('news');
  });
});

describe('Kitchen Live', () => {
  const kitchen = (seg: number, p1 = 'dale', p2 = 'rox'): MatchState => {
    const m = ready(p1, p2, { stage: 'kitchen' });
    m.segment = seg;
    setupRound(m);
    return m;
  };

  it('Prep: the stockpot is thrown at chest height, once', () => {
    const m = kitchen(0);
    place(m, -3.5, 0);
    const ev = run(m, 60, presses({ 0: INTERACT, 30: INTERACT }));
    expect(count(ev, 'propKick')).toBe(1);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ attacker: 0, defender: 1, move: 'pot' });
    expect(m.props[0].mode).toBe('spent');
  });

  it('Prep: the knife block goes in low: blocked crouching, not standing', () => {
    const stand = kitchen(0);
    place(stand, 3.5, 0);
    const ev = run(stand, 60, presses({ 0: INTERACT }), Input.BLOCK);
    expect(ev.find((e) => e.type === 'hit')).toMatchObject({ move: 'knives' });
    const crouch = kitchen(0);
    place(crouch, 3.5, 0);
    const ev2 = run(crouch, 60, presses({ 0: INTERACT }), Input.BLOCK | Input.DOWN);
    expect(count(ev2, 'hit')).toBe(0);
    expect(ev2.find((e) => e.type === 'block')).toMatchObject({ move: 'knives' });
  });

  it('Grease Fire: the walls close in to ±4.5 m and the fire flares at one end', () => {
    const m = kitchen(1);
    place(m, 0, 2);
    run(m, 400, presses({}, Input.LEFT));
    expect(m.fighters[0].x).toBeGreaterThan(fx(-4.5));
    const f = kitchen(1);
    const warn = until(f, 'hazardWarn');
    expect(warn.e).toMatchObject({ hazard: 'flare', caption: 'GREASE FIRE' });
    const x = warn.e.type === 'hazardWarn' ? warn.e.x : 0;
    f.fighters[0].x = x;
    f.fighters[1].x = 0;
    const strike = until(f, 'hazardStrike');
    const ev = [...strike.ev, ...run(f, 20)];
    expect(ev.filter((e) => e.type === 'hazardHit')).toEqual([expect.objectContaining({ player: 0, damage: 55 })]);
  });

  it('The Oven: meter fills half as fast again, for both', () => {
    const gain = (seg: number) => {
      const m = kitchen(seg);
      place(m, -0.3, 0.3);
      run(m, 30, presses({ 0: Input.FP }));
      return [m.fighters[0].meter, m.fighters[1].meter];
    };
    const [a, d] = gain(0);
    const [a2, d2] = gain(2);
    expect(a).toBeGreaterThan(0);
    expect(d).toBeGreaterThan(0);
    // The first hit's bonus bar isn't scaled; the hit's own meter is.
    expect(a2).toBeGreaterThan(a);
    expect(d2).toBe(Math.floor((d * 150) / 100));
  });
});
