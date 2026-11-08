/**
 * The shapes of fighter data. Moves are data: frames, boxes, damage, stun
 * and cancel windows all live here, and the simulation only interprets them.
 * Frame numbers are 1-based within a move; windows are inclusive.
 */
import type { Fx } from './fixed';

export type Height = 'mid' | 'low' | 'overhead';
export type Attack = 'FP' | 'BP' | 'FK' | 'BK';
export const ATTACKS: readonly Attack[] = ['FP', 'BP', 'FK', 'BK'];
/** The direction held with Special (or the motion that stands for it). */
export type SpecialDir = 'n' | 'f' | 'b' | 'd';
export type Stance = 'stand' | 'crouch' | 'air';
export type MoveKind = 'normal' | 'air' | 'special' | 'throw' | 'super';
export type Window = readonly [number, number];

/** A box in fighter space: +x is the way the fighter faces, y = 0 is their feet. */
export interface Box {
  readonly x: Fx;
  readonly y: Fx;
  readonly w: Fx;
  readonly h: Fx;
}

/** What a hit does when it connects or is blocked. */
export interface HitEffect {
  /** Health points (fighters have about 1000). */
  readonly damage: number;
  readonly height: Height;
  readonly hitstun: number;
  readonly blockstun: number;
  /** Starting speed of the slide away from the attacker. */
  readonly push: Fx;
  /** Chip on block, for specials; defaults to an eighth of the damage. */
  readonly chip?: number;
  /** Knocks down: the opponent falls and can't be juggled. */
  readonly knockdown?: boolean;
  /** Pops the opponent up at this vertical speed, open to juggles. */
  readonly launch?: Fx;
  /** Pulls the opponent to this distance in front of the attacker. */
  readonly pull?: Fx;
  readonly pullOnBlock?: boolean;
  readonly hitstop?: number;
}

export interface HitData extends HitEffect {
  readonly frames: Window;
  readonly box: Box;
}

export interface ProjectileData {
  /** Spawn point in the owner's fighter space. */
  readonly x: Fx;
  readonly y: Fx;
  readonly vx: Fx;
  readonly vy: Fx;
  readonly box: Box;
  readonly life: number;
  /** How many times it can hit before it's gone, and the frames between hits. */
  readonly hits: number;
  readonly rehit: number;
  /** Disappears when it reaches the floor (falling hail). */
  readonly groundEnds?: boolean;
  readonly effect: HitEffect;
}

export interface ThrowData {
  readonly frames: Window;
  /** Furthest distance between the two fighters' centres. */
  readonly range: Fx;
  readonly damage: number;
}

export interface MoveData {
  readonly id: string;
  readonly name: string;
  readonly kind: MoveKind;
  readonly stance: Stance;
  readonly total: number;
  readonly hits: readonly HitData[];
  readonly spawns: readonly { readonly frame: number; readonly projectile: ProjectileData }[];
  /** Extra hurtboxes, usually the attacking limb, so whiffs can be punished. */
  readonly hurt: readonly { readonly frames: Window; readonly box: Box }[];
  /** Forward speed over frame windows (lariats, dashes). */
  readonly motion: readonly { readonly frames: Window; readonly vx: Fx }[];
  /** Pushboxes off: the fighter can pass through the opponent. */
  readonly passThrough?: Window;
  readonly invuln?: Window;
  /** Absorbs one hit (takes the damage, ignores the stun). */
  readonly armor?: Window;
  /** Strings: the next step for each button, inside the cancel window. */
  readonly chain: Readonly<Partial<Record<Attack, string>>>;
  /** When chains and special cancels are allowed. */
  readonly cancel?: Window;
  /** The boosted version (Special again, 1 bar). */
  readonly boost?: string;
  readonly throwData?: ThrowData;
  /** First and last frames that can hit (0 when the move never hits). */
  readonly startup: number;
  readonly lastActive: number;
}

export interface StringData {
  readonly name: string;
  /** The starting move's id, then the button for each following step. */
  readonly path: readonly string[];
  /** Listed as safe on block: tests check it really is. */
  readonly safe: boolean;
}

export interface FighterData {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  readonly walkFwd: Fx;
  readonly walkBack: Fx;
  readonly jumpVy: Fx;
  readonly jumpVx: Fx;
  readonly dash: { readonly frames: number; readonly speed: Fx };
  readonly backdash: { readonly frames: number; readonly speed: Fx };
  readonly hurt: Readonly<Record<Stance, Box>>;
  /** Pushbox half-width and heights standing and crouching. */
  readonly pushW: Fx;
  readonly pushH: Fx;
  readonly pushHCrouch: Fx;
  readonly normals: {
    readonly s: Readonly<Record<Attack, string>>;
    readonly c: Readonly<Record<Attack, string>>;
    readonly j: Readonly<Record<Attack, string>>;
    /** Command normals: forward or back + button. */
    readonly f: Readonly<Partial<Record<Attack, string>>>;
    readonly b: Readonly<Partial<Record<Attack, string>>>;
  };
  /** Neutral + Special falls back to forward. */
  readonly specials: Readonly<Partial<Record<SpecialDir, string>>> & { readonly f: string };
  readonly throwMove: string;
  readonly superMove: string;
  readonly moves: Readonly<Record<string, MoveData>>;
  readonly strings: readonly StringData[];
}
