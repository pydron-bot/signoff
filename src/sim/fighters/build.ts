/**
 * Helpers for writing fighter data in readable units (metres, frames). They
 * run once when the data loads, converting to fixed point, so the numbers in
 * the data files stay easy to tune.
 */
import { FINISH_CARD_FRAMES, THROW_RANGE } from '../constants';
import { fx } from '../fixed';
import type { Attack, Box, Censor, FinishBeat, FinishBlow, FinishDir, FinishRange, FinisherData, FinisherKind, Height, HitData, HitEffect, MoveData, MoveKind, ProjectileData, Stance, Window } from '../types';

/** Chains and special cancels open after the last active frame (so the hit is checked first) and stay open this long. */
const CANCEL_LATE = 7;
const DEFAULT_PUSH = 0.035;

/** A box from x0 to x1 (forward of the fighter's centre) and y0 to y1 (above their feet). */
export function box(x0: number, x1: number, y0: number, y1: number): Box {
  return { x: fx(x0), y: fx(y0), w: fx(x1 - x0), h: fx(y1 - y0) };
}

export interface EffectSpec {
  damage: number;
  height?: Height;
  hitstun: number;
  blockstun: number;
  push?: number;
  chip?: number;
  knockdown?: boolean;
  launch?: number;
  pull?: number;
  pullOnBlock?: boolean;
  hitstop?: number;
  armorBreak?: boolean;
  groundBounce?: boolean;
  wallBounce?: boolean;
  guardCrush?: boolean;
}

export interface StrikeSpec extends EffectSpec {
  frames: Window;
  reach: readonly [number, number];
  at: readonly [number, number];
}

export function effect(s: EffectSpec): HitEffect {
  return {
    damage: s.damage,
    height: s.height ?? 'mid',
    hitstun: s.hitstun,
    blockstun: s.blockstun,
    push: fx(s.push ?? DEFAULT_PUSH),
    chip: s.chip,
    knockdown: s.knockdown,
    launch: s.launch === undefined ? undefined : fx(s.launch),
    pull: s.pull === undefined ? undefined : fx(s.pull),
    pullOnBlock: s.pullOnBlock,
    hitstop: s.hitstop,
    armorBreak: s.armorBreak,
    groundBounce: s.groundBounce,
    wallBounce: s.wallBounce,
    guardCrush: s.guardCrush,
  };
}

export function strike(s: StrikeSpec): HitData {
  return { ...effect(s), frames: s.frames, box: box(s.reach[0], s.reach[1], s.at[0], s.at[1]) };
}

export interface ProjectileSpec {
  at: readonly [number, number];
  speed: readonly [number, number];
  size: readonly [number, number, number, number];
  life: number;
  hits?: number;
  rehit?: number;
  groundEnds?: boolean;
  decoy?: boolean;
  delay?: number;
  returnAfter?: number;
  collects?: boolean;
  effect: EffectSpec;
}

export function projectile(s: ProjectileSpec): ProjectileData {
  return {
    x: fx(s.at[0]),
    y: fx(s.at[1]),
    vx: fx(s.speed[0]),
    vy: fx(s.speed[1]),
    box: box(...s.size),
    life: s.life,
    hits: s.hits ?? 1,
    rehit: s.rehit ?? 0,
    groundEnds: s.groundEnds,
    decoy: s.decoy,
    delay: s.delay,
    returnAfter: s.returnAfter,
    collects: s.collects,
    effect: effect(s.effect),
  };
}

export interface MoveSpec {
  name: string;
  kind: MoveKind;
  total: number;
  stance?: Stance;
  hits?: readonly HitData[];
  spawns?: readonly { frame: number; projectile: ProjectileData }[];
  hurt?: readonly { frames: Window; box: Box }[];
  motion?: readonly { frames: Window; vx: number }[];
  passThrough?: Window;
  invuln?: Window;
  armor?: Window;
  counter?: MoveData['counter'];
  chain?: Partial<Record<Attack, string>>;
  cancel?: Window;
  boost?: string;
  throwData?: MoveData['throwData'];
  interactFrame?: number;
  teleport?: MoveData['teleport'];
  hidden?: Window;
  tithe?: MoveData['tithe'];
  heal?: MoveData['heal'];
  hover?: Window;
  /** Metres a frame, forward and up (negative: down). */
  dive?: { frame: number; vx: number; vy: number };
  landing?: number;
}

export function move(id: string, s: MoveSpec): MoveData {
  const hits = s.hits ?? [];
  const spawns = s.spawns ?? [];
  const starts = [...hits.map((h) => h.frames[0]), ...spawns.map((p) => p.frame)];
  const ends = [...hits.map((h) => h.frames[1]), ...spawns.map((p) => p.frame)];
  if (s.throwData) {
    starts.push(s.throwData.frames[0]);
    ends.push(s.throwData.frames[1]);
  }
  // A counter is "active" while it reads.
  if (s.counter) {
    starts.push(s.counter.frames[0]);
    ends.push(s.counter.frames[1]);
  }
  return {
    id,
    name: s.name,
    kind: s.kind,
    stance: s.stance ?? (s.kind === 'air' ? 'air' : 'stand'),
    total: s.total,
    hits,
    spawns,
    hurt: s.hurt ?? [],
    motion: (s.motion ?? []).map((m) => ({ frames: m.frames, vx: fx(m.vx) })),
    passThrough: s.passThrough,
    invuln: s.invuln,
    armor: s.armor,
    counter: s.counter,
    chain: s.chain ?? {},
    cancel: s.cancel,
    boost: s.boost,
    throwData: s.throwData,
    interactFrame: s.interactFrame,
    teleport: s.teleport,
    hidden: s.hidden,
    tithe: s.tithe,
    heal: s.heal,
    hover: s.hover,
    dive: s.dive && { frame: s.dive.frame, vx: fx(s.dive.vx), vy: fx(s.dive.vy) },
    landing: s.landing,
    startup: starts.length ? Math.min(...starts) : 0,
    lastActive: ends.length ? Math.max(...ends) : 0,
  };
}

export interface NormalSpec extends Omit<StrikeSpec, 'frames'> {
  name: string;
  startup: number;
  active: number;
  recovery: number;
  kind?: MoveKind;
  stance?: Stance;
  chain?: Partial<Record<Attack, string>>;
  boost?: string;
  armor?: Window;
  invuln?: Window;
  /** Steps in (or back) as it strikes: metres a frame over the frames given. */
  motion?: readonly { frames: Window; vx: number }[];
}

/**
 * One hit: startup is the first active frame, so total = startup - 1 +
 * active + recovery. Ground normals get a limb hurtbox through the active
 * frames and half the recovery, and a cancel window for strings and specials.
 */
export function normal(id: string, s: NormalSpec): MoveData {
  const kind = s.kind ?? 'normal';
  const last = s.startup + s.active - 1;
  const ground = kind !== 'air';
  const limbEnd = s.reach[1] - 0.1;
  return move(id, {
    name: s.name,
    kind,
    stance: s.stance,
    total: last + s.recovery,
    hits: [strike({ ...s, frames: [s.startup, last] })],
    hurt:
      ground && limbEnd > Math.max(0, s.reach[0])
        ? [{ frames: [s.startup, last + Math.ceil(s.recovery / 2)], box: box(Math.max(0, s.reach[0]), limbEnd, s.at[0], s.at[1]) }]
        : [],
    chain: s.chain,
    // Air normals cancel too: into the next step of an air string, or (on a hit) an air special.
    cancel: kind === 'normal' ? [last + 1, last + CANCEL_LATE] : kind === 'air' ? [last + 1, last + Math.min(CANCEL_LATE, s.recovery)] : undefined,
    boost: s.boost,
    armor: s.armor,
    invuln: s.invuln,
    motion: s.motion,
  });
}

/**
 * A special's follow-up: Special, then this button as the special plays (it
 * comes out whether the special hit or not, as a string's next step does).
 * One hit, kind special; a launcher keeps a cancel window, to follow them up.
 */
export function followUp(id: string, s: Omit<NormalSpec, 'kind' | 'chain'>): MoveData {
  const mv = normal(id, { ...s, kind: 'special' });
  const last = s.startup + s.active - 1;
  return s.launch === undefined ? mv : { ...mv, cancel: [last + 1, last + CANCEL_LATE] };
}

/** An air string's ender: the body spiked into the floor, to bounce back up into a juggle (once a combo; else it knocks down). */
export function airSpike(id: string, s: { name: string; damage: number; startup?: number; reach?: readonly [number, number]; at?: readonly [number, number] }): MoveData {
  return normal(id, { name: s.name, kind: 'air', startup: s.startup ?? 6, active: 4, recovery: 9, reach: s.reach ?? [0, 1.0], at: s.at ?? [-0.3, 1.8], height: 'overhead', damage: s.damage, hitstun: 0, blockstun: 14, knockdown: true, groundBounce: true });
}

/** An air string's middle step: reaches high, to meet a body juggled above. */
export function airStep(id: string, s: { name: string; damage: number; chain: Partial<Record<Attack, string>>; startup?: number; reach?: readonly [number, number] }): MoveData {
  return normal(id, { name: s.name, kind: 'air', startup: s.startup ?? 5, active: 4, recovery: 7, reach: s.reach ?? [0.1, 0.95], at: [0.3, 1.7], height: 'overhead', damage: s.damage, hitstun: 18, blockstun: 12, chain: s.chain });
}

export function throwMove(damage: number): MoveData {
  return move('throw', {
    name: 'Throw',
    kind: 'throw',
    total: 28,
    throwData: { frames: [5, 6], range: THROW_RANGE, damage },
  });
}

/** Using a stage object (kicking the camera dolly): Interact near it. */
export function interactMove(): MoveData {
  return move('interact', { name: 'Interact', kind: 'interact', total: 22, interactFrame: 8 });
}

/** The comeback super. On a hit it starts the cinematic, which deals the damage; on block it chips. */
export function technicalDifficulties(reach: number): MoveData {
  return move('td', {
    name: 'Technical Difficulties',
    kind: 'super',
    total: 45,
    invuln: [1, 15],
    hits: [strike({ frames: [12, 15], reach: [0.1, reach], at: [0.3, 1.6], damage: 0, hitstun: 0, blockstun: 20, chip: 30 })],
  });
}

export function table(...moves: MoveData[]): Record<string, MoveData> {
  const t: Record<string, MoveData> = {};
  for (const m of moves) {
    if (t[m.id]) throw new Error(`duplicate move id ${m.id}`);
    t[m.id] = m;
  }
  // A boost target is a boosted special: it relaunches a juggled body.
  for (const m of moves) if (m.boost && t[m.boost]) t[m.boost] = { ...t[m.boost], boosted: true };
  return t;
}

/** A blow in a finisher script, in readable units. */
export interface BlowSpec {
  react: FinishBlow['react'];
  damage: number;
  pop?: number;
  carry?: number;
  pull?: number;
}

function toBlow(b: BlowSpec): FinishBlow {
  return {
    react: b.react,
    damage: b.damage,
    pop: b.pop === undefined ? undefined : fx(b.pop),
    carry: b.carry === undefined ? undefined : fx(b.carry),
    pull: b.pull === undefined ? undefined : fx(b.pull),
  };
}

/**
 * Writes a finisher as a sequence: strike() plays one of the fighter's moves
 * and lands its blow on the move's first active frame, so the clip and the
 * reaction line up; play() and blow() place them by hand (projectiles,
 * multi-hit moves). The cursor moves on as it goes.
 */
export class Script {
  private readonly beats: FinishBeat[] = [];
  private t = 1;
  private cutAt = 0;
  private censor: Censor = 'static';

  constructor(private readonly moves: Readonly<Record<string, MoveData>>) {}

  /** The move, and its blow on its first active frame; the next starts `gap` frames after. */
  strike(id: string, b: BlowSpec, gap = 6): this {
    const mv = this.moves[id];
    if (!mv) throw new Error(`finisher script: unknown move ${id}`);
    if (!mv.startup) throw new Error(`finisher script: ${id} never hits`);
    this.beats.push({ at: this.t, move: id });
    const hit = this.t + mv.startup - 1;
    this.beats.push({ at: hit, blow: toBlow(b) });
    this.t = hit + gap;
    return this;
  }

  /** The move alone; the cursor moves on `frames`. */
  play(id: string, frames: number): this {
    if (!this.moves[id]) throw new Error(`finisher script: unknown move ${id}`);
    this.beats.push({ at: this.t, move: id });
    this.t += frames;
    return this;
  }

  /** A blow `after` frames from the cursor (which doesn't move). */
  blow(after: number, b: BlowSpec): this {
    this.beats.push({ at: this.t + after, blow: toBlow(b) });
    return this;
  }

  wait(frames: number): this {
    this.t += frames;
    return this;
  }

  /** A Stage Sign-Off's cue: the set does the rest from here. */
  cue(): this {
    this.beats.push({ at: this.t, cue: true });
    return this;
  }

  /** Cut away here (to `censor`); blows written after it are heard, not seen. */
  cut(censor: Censor): this {
    this.cutAt = this.t;
    this.censor = censor;
    return this;
  }

  /** The finished data; the closing card comes `card` frames after the cut. */
  done(head: { id: string; name: string; kind: FinisherKind; range: FinishRange; input: FinishDir[]; button: Attack | 'block'; trigger?: string; hold?: FinishDir; stage?: string }, card: number): FinisherData {
    if (!this.cutAt) throw new Error(`finisher ${head.id} never cuts away`);
    const cardAt = this.cutAt + card;
    return { ...head, beats: [...this.beats].sort((a, b) => a.at - b.at), cut: this.cutAt, censor: this.censor, card: cardAt, total: cardAt + FINISH_CARD_FRAMES };
  }
}

/**
 * The Rerun, the same for everyone: the winner lets them go. Up, down and
 * Block, at any range; the set switches off and the loser wakes up at home.
 */
export function rerun(moves: Readonly<Record<string, MoveData>>): FinisherData {
  return new Script(moves).wait(40).cut('off').done({ id: 'Rerun', name: 'Rerun', kind: 'rerun', range: 'any', input: ['u', 'd'], button: 'block' }, 45);
}
