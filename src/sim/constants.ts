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
/** The freeze when a counter (Teleprompter) reads a strike, so it reads on screen too. */
export const COUNTER_READ_STOP = 12;
/** Each further hit in a combo does 10% less, down to 30%. */
export const SCALE_STEP = 10;
export const SCALE_MIN = 30;
export const MAX_JUGGLE = 4;
export const JUGGLE_POP = fx(0.1);
export const KNOCK_VY = fx(0.12);
export const KNOCK_VX = fx(0.04);
/** Sideways drift of a juggled body: small, so a normal can reach it. */
export const LAUNCH_VX = fx(0.012);
export const DOWN_FRAMES = 30;
export const GETUP_FRAMES = 20;

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
export const METER_MAX = 3 * BAR;
/** Boosting must come within this many frames of the special starting. */
export const BOOST_WINDOW = 8;
export const TAPE_SKIP_FRAMES = 10;
export const TAPE_SKIP_SPEED = fx(0.11);
export const CUT_AWAY_BARS = 2;
export const CUT_AWAY_HEALTH_PCT = 5;
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
