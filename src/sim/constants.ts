/** Tuning values shared by every fighter. Starting values, to be tuned in play. */
import { fx } from './fixed';

export const STEPS_PER_SECOND = 60;

// Input
/** A press stays usable this many frames, so touch inputs come out reliably. */
export const BUFFER = 8;
/** Frames a quarter-circle motion may take. */
export const MOTION_WINDOW = 12;
/** Most frames between the two taps of a dash. */
export const DASH_WINDOW = 12;

// Frame advantage
/** The fastest normal in the game. A move is safe on block if the fastest punish can't beat the attacker's recovery. */
export const PUNISH_STARTUP = 6;
export const SAFE_ON_BLOCK = 1 - PUNISH_STARTUP;

// Movement
export const GRAVITY = fx(0.011);
export const SLIDE_FRICTION = fx(0.004);
export const PREJUMP_FRAMES = 3;
export const JUMP_LAND_FRAMES = 2;
export const AIR_ATTACK_LAND_FRAMES = 4;
export const START_X = fx(1.5);

// Hits
export const HITSTOP = 8;
export const BLOCKSTOP = 6;
export const COUNTER_HITSTUN = 4;
export const COUNTER_HITSTOP = 4;
/** Frames a crushed guard reels: long enough for a normal to land after it, not a slow one. */
export const GUARD_CRUSH_STUN = 26;
/** The most donations Gideon can hold. */
export const DONATIONS_MAX = 5;
/** A returning projectile is caught when it's this close to its owner. */
export const CATCH_RANGE = fx(0.4);
/** The freeze when a counter (Teleprompter) reads a strike, so it reads on screen too. */
export const COUNTER_READ_STOP = 12;
/** Each further hit in a combo does 10% less, down to 30%. */
export const SCALE_STEP = 10;
export const SCALE_MIN = 30;
/** Each earlier use of the same move in a combo keeps only this % of its damage again, so repeating a move soon isn't worth it. */
export const REPEAT_KEEP = 60;
/** The attacker's meter gain falls this % per hit of a combo, down to METER_SCALE_MIN %, so a combo can't pay for its own relaunches. */
export const METER_SCALE_STEP = 15;
export const METER_SCALE_MIN = 10;
/** A safety net: juggles end on their own long before this (see JUGGLE_DECAY). */
export const MAX_JUGGLE = 16;
export const JUGGLE_POP = fx(0.1);
/** Each juggle hit pops the body this % lower than the first, down to JUGGLE_POP_MIN %... */
export const JUGGLE_DECAY = 7;
export const JUGGLE_POP_MIN = 30;
/** ...and it falls this % faster: juggles get lower and quicker until they drop. */
export const JUGGLE_GRAVITY = 6;
/** A boosted special that hits a juggled body pops it back up (no decay), as often as there's meter for; the faster fall still ends it. */
export const RELAUNCH_VY = fx(0.15);
/** The bar is worth it: a relaunch adds this much damage, scaled like the hit itself (combo and repeat scaling). */
export const RELAUNCH_DAMAGE = 70;
/** Relaunched, the body goes straight up this far in front of the attacker, so a follow-up reaches. */
export const RELAUNCH_PULL = fx(0.7);
/** Ground bounce: slammed down, the body comes back up off the floor once a combo. */
export const SLAM_VY = fx(-0.12);
export const GROUND_BOUNCE_VY = fx(0.17);
/** Wall bounce: hit within WALL_BOUNCE_RANGE of the wall, the body flies into it and comes back off towards the attacker, once a combo. */
export const WALL_BOUNCE_RANGE = fx(1.6);
export const WALL_BOUNCE_VX = fx(0.16);
export const WALL_BOUNCE_VY = fx(0.08);
export const WALL_BOUNCE_BACK_VX = fx(0.035);
export const WALL_REBOUND_VY = fx(0.16);
export const KNOCK_VY = fx(0.12);
export const KNOCK_VX = fx(0.04);
/** Sideways drift of a juggled body: small, so a normal can reach it. */
export const LAUNCH_VX = fx(0.012);
export const DOWN_FRAMES = 30;
export const GETUP_FRAMES = 20;

// Defence
/** Block pressed this few frames before a hit lands: a flawless block (no chip, shorter blockstun, a little meter). */
export const FLAWLESS_WINDOW = 4;
/** Frames a flawless block takes off the blockstun, so the blocker can punish more. */
export const FLAWLESS_BLOCKSTUN_CUT = 6;
export const FLAWLESS_METER = 100;
/** Down held as a knockdown ends keeps you down this much longer, once a knockdown: a timed attack on your getup misses. */
export const DELAYED_GETUP = 20;
/** A move started this soon after getting up is a reversal. */
export const REVERSAL_WINDOW = 3;
/** Hitting someone in a move's recovery (it whiffed or was blocked) is a punish: the first hit does this % and earns meter. */
export const PUNISH_DAMAGE_PCT = 120;
export const PUNISH_METER = 150;

// Throws
export const THROW_RANGE = fx(1.0);
/** Frames after being grabbed in which pressing Throw breaks it. */
export const THROW_TECH = 10;
export const THROW_HOLD = 24;
export const THROWER_FRAMES = 40;
export const TECH_FRAMES = 14;
export const TECH_PUSH = fx(0.07);

// Signal meter
export const BAR = 1000;
/** The first hit of a round is worth a bar. */
export const FIRST_HIT_METER = BAR;
export const METER_MAX = 3 * BAR;
/**
 * Boosting: Special (or METER) again within this many frames of the special
 * starting (a third of a second: room for a double tap on a touchscreen,
 * even once its first hit has landed), or Special twice this close together
 * even if both came before it started (a special cancelled out of a normal
 * waits for the hit).
 */
export const BOOST_WINDOW = 20;
export const BOOST_TAP = 20;
export const TAPE_SKIP_FRAMES = 10;
export const TAPE_SKIP_SPEED = fx(0.11);
export const CUT_AWAY_FRAMES = 20;

// Technical Difficulties
export const TD_HEALTH_PCT = 30;
export const TD_DAMAGE_PCT = 30;
export const TD_CINEMATIC_FRAMES = 150;

// Rounds
export const ROUND_FRAMES = 60 * STEPS_PER_SECOND;
export const INTRO_FRAMES = 90;
export const KO_FRAMES = 150;
/** The commercial break while the set changes. */
export const BREAK_FRAMES = 4 * STEPS_PER_SECOND;
/** "Stay tuned": the winner's window to enter a finisher. */
export const STAY_TUNED_FRAMES = 4 * STEPS_PER_SECOND;
/** Finisher ranges (centre to centre): close up to here... */
export const FINISH_CLOSE = fx(1.3);
/** ...far from here. */
export const FINISH_FAR = fx(2.4);
/** A finisher's taps and button must all come within this many frames. */
export const FINISH_INPUT_WINDOW = 40;
/** How long the closing card stays up. */
export const FINISH_CARD_FRAMES = 150;
export const WINS_NEEDED = 2;
/** Draws can't go on forever: after this many rounds the match is a draw. */
export const MAX_ROUNDS = 5;
