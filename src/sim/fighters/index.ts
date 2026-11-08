import type { FighterData, MoveData } from '../types';
import { DALE } from './dale';
import { ROX } from './rox';

export const FIGHTERS: Readonly<Record<string, FighterData>> = { dale: DALE, rox: ROX };

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
