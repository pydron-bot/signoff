/**
 * The shapes of fighter data. Moves are data: frames, boxes, damage, stun
 * and cancel windows all live here, and the simulation only interprets them.
 * Frame numbers are 1-based within a move; windows are inclusive.
 */
import type { Fx } from './fixed';

/** Unblockable hits can only be avoided (jumped, dodged), never blocked. */
export type Height = 'mid' | 'low' | 'overhead' | 'unblockable';
export type Attack = 'FP' | 'BP' | 'FK' | 'BK';
export const ATTACKS: readonly Attack[] = ['FP', 'BP', 'FK', 'BK'];
/** The direction held with Special (or the motion that stands for it). */
export type SpecialDir = 'n' | 'f' | 'b' | 'd';
export type Stance = 'stand' | 'crouch' | 'air';
export type MoveKind = 'normal' | 'air' | 'special' | 'throw' | 'super' | 'interact';
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
  /** Goes through armour instead of being soaked by it. */
  readonly armorBreak?: boolean;
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
  /** A decoy: hits nobody, but soaks one attack or projectile meant for its owner. */
  readonly decoy?: boolean;
  readonly effect: HitEffect;
}

export interface ThrowData {
  readonly frames: Window;
  /** Furthest distance between the two fighters' centres. */
  readonly range: Fx;
  readonly damage: number;
  /** A command grab: Throw doesn't break it. */
  readonly untechable?: boolean;
  /** A string's grab: it also catches an opponent still reeling from the hit before (never one who blocked). */
  readonly reeling?: boolean;
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
  /** On this frame the fighter reappears behind the opponent, or well back from them. */
  readonly teleport?: { readonly frame: number; readonly to: 'behind' | 'away' };
  /** Frames the fighter is off screen (teleporting). */
  readonly hidden?: Window;
  /** Interact: the frame the stage object is used. */
  readonly interactFrame?: number;
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

/** Sign-Off: the full finisher. Rerun: the merciful one. Cancellation: the quick one, earned by ending the match with a set special. */
export type FinisherKind = 'signoff' | 'rerun' | 'cancellation';
/** Centre-to-centre distance to the loser: close up to 1.3 m, far from 2.4 m, mid between. */
export type FinishRange = 'close' | 'mid' | 'far' | 'any';
/** A tap in a finisher's input: forward, back (both relative to facing), down, up. */
export type FinishDir = 'f' | 'b' | 'd' | 'u';
/** What the broadcast cuts to at the worst moment: snow, colour bars, the stand-by card, or the set switching off. */
export type Censor = 'static' | 'bars' | 'standby' | 'off';

/** What a beat does to the loser. */
export interface FinishBlow {
  /** high/low: staggered and held there; launch: popped up; knockdown: thrown down; grab: held; none: a blow with no new reaction (on the floor, or off screen). */
  readonly react: 'high' | 'low' | 'launch' | 'knockdown' | 'grab' | 'none';
  /** For the hit event (sparks, sound, shake, the hits counter); the loser is already out. */
  readonly damage: number;
  /** Upward speed for launch and knockdown. */
  readonly pop?: Fx;
  /** Sideways speed away from the winner while in the air (0: straight up). */
  readonly carry?: Fx;
  /** Moves the loser to this distance in front of the winner first. */
  readonly pull?: Fx;
}

/** One step of a finisher's script: the winner starts a move (its clip, motion and projectiles, but it can't hit), and/or a blow lands. */
export interface FinishBeat {
  readonly at: number;
  readonly move?: string;
  readonly blow?: FinishBlow;
}

/** A scripted finisher. Steps count from 1 when it starts. */
export interface FinisherData {
  readonly id: string;
  readonly name: string;
  readonly kind: FinisherKind;
  readonly range: FinishRange;
  /** Taps in order, then the button (all within FINISH_INPUT_WINDOW). Empty for a cancellation. */
  readonly input: readonly FinishDir[];
  readonly button: Attack | 'block';
  /** A cancellation: the special (or its boost) that must land the final K.O. */
  readonly trigger?: string;
  readonly beats: readonly FinishBeat[];
  /** The step the picture cuts away, and to what. */
  readonly cut: number;
  readonly censor: Censor;
  /** The step the closing card comes up; the finisher ends at `total`. */
  readonly card: number;
  readonly total: number;
}

/** How the fighter plays; the CPU plays to it. */
export type Style = 'zoner' | 'rushdown' | 'grappler' | 'trickster';

export interface FighterData {
  readonly id: string;
  readonly name: string;
  readonly style: Style;
  readonly health: number;
  readonly walkFwd: Fx;
  readonly walkBack: Fx;
  readonly jumpVy: Fx;
  readonly jumpVx: Fx;
  readonly dash: { readonly frames: number; readonly speed: Fx };
  readonly backdash: { readonly frames: number; readonly speed: Fx };
  /** Hurtboxes standing, crouching and in the air; `juggle` is the long, low box for a body thrown up and falling back. */
  readonly hurt: Readonly<Record<Stance, Box>> & { readonly juggle: Box };
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
  readonly interactMove: string;
  readonly moves: Readonly<Record<string, MoveData>>;
  readonly strings: readonly StringData[];
  /** The fighter's own show: what goes off the air when they lose to a Sign-Off. */
  readonly show: string;
  /** Two Sign-Offs, a Rerun and a Cancellation. */
  readonly finishers: readonly FinisherData[];
}
