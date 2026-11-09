// The simulation's public face, for the presentation and the tests.
export * from './constants';
export type { SimEvent } from './events';
export { FIGHTERS, fighterData, moveData } from './fighters';
export { frameData, isSafe, stringMoves, type FrameData } from './frameData';
export * as Input from './input';
export { canTD } from './fighter';
export { createMatch, step, type MatchOptions } from './match';
export { STAGES, STAGE_IDS, homeStage, stageData } from './stages';
export { saveMatch, type FighterMode, type FighterState, type MatchState, type Phase, type ProjectileState } from './state';
export type * from './types';
