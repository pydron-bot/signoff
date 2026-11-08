/**
 * What the simulation tells the presentation. step() appends these to the
 * array it's given; the renderer, camera, audio, HUD and VHS effects read
 * them and never write back. Players are 0 and 1; -1 means nobody (a draw).
 */
import type { Fx } from './fixed';
import type { Censor, FinisherKind, Height } from './types';

export type SimEvent =
  | { type: 'roundStart'; round: number; segment: number }
  | { type: 'fight'; round: number }
  | { type: 'hit'; attacker: number; defender: number; move: string; damage: number; height: Height; counter: boolean; combo: number; x: Fx; y: Fx }
  | { type: 'block'; attacker: number; defender: number; move: string; chip: number; x: Fx; y: Fx }
  | { type: 'armor'; player: number; move: string }
  | { type: 'special'; player: number; move: string }
  | { type: 'boost'; player: number; move: string }
  | { type: 'projectileClash'; x: Fx; y: Fx }
  | { type: 'throw'; thrower: number; move: string }
  | { type: 'teleport'; player: number; x: Fx }
  | { type: 'decoyPop'; player: number; x: Fx; y: Fx }
  | { type: 'throwTech'; player: number }
  | { type: 'tapeSkip'; player: number }
  | { type: 'cutAway'; player: number }
  | { type: 'superStart'; player: number }
  | { type: 'superHit'; player: number }
  | { type: 'knockdown'; player: number }
  | { type: 'ko'; player: number }
  | { type: 'roundOver'; winner: number; reason: 'ko' | 'time' }
  | { type: 'hazardWarn'; hazard: string; caption: string; x: Fx; all: boolean }
  | { type: 'hazardStrike'; hazard: string; x: Fx; all: boolean }
  | { type: 'hazardHit'; player: number; hazard: string; damage: number }
  | { type: 'propKick'; player: number; prop: string }
  | { type: 'propStop'; prop: string; x: Fx }
  | { type: 'commercialBreak'; nextSegment: number }
  | { type: 'segmentChange'; segment: number }
  /** "Stay tuned": the winner's finisher window opens. */
  | { type: 'stayTuned'; winner: number }
  /** A finisher starts (kind tells which); its blows arrive as ordinary hit events. */
  | { type: 'finisher'; player: number; id: string; kind: FinisherKind }
  /** The broadcast cuts away from the worst of it for `frames` steps; the sound carries on. */
  | { type: 'finisherCut'; player: number; censor: Censor; frames: number }
  /** The closing card: the loser's show goes off the air (or, for a Rerun, they wake up at home). */
  | { type: 'finisherCard'; player: number; id: string; kind: FinisherKind }
  | { type: 'matchOver'; winner: number };
