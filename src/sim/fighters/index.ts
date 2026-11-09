import type { FighterData, MoveData } from '../types';
import { DALE } from './dale';
import { GIDEON } from './gideon';
import { GUS } from './gus';
import { HOLLIS } from './hollis';
import { MARGARET } from './margaret';
import { MUMBLES } from './mumbles';
import { ROX } from './rox';

/** The roster, in select-screen order. */
export const FIGHTERS: Readonly<Record<string, FighterData>> = { dale: DALE, rox: ROX, hollis: HOLLIS, mumbles: MUMBLES, margaret: MARGARET, gus: GUS, gideon: GIDEON };

export function fighterData(id: string): FighterData {
  const f = FIGHTERS[id];
  if (!f) throw new Error(`unknown fighter ${id}`);
  return f;
}

export function moveData(fighter: string, id: string): MoveData {
  const m = fighterData(fighter).moves[id];
  if (!m) throw new Error(`unknown move ${fighter}/${id}`);
  return m;
}
