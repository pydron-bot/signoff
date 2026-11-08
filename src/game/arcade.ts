/**
 * Arcade: one night of Channel 0's schedule. Your fighter takes on everyone
 * else in turn, the CPU getting harder each show, with continues if you
 * lose; beat them all and the ending plays: the opening titles of the show
 * you won. Plain data and pure functions; main.ts drives it. No DOM here.
 */
import type { CpuLevel } from '../ai/cpu';
import { FIGHTERS, fighterData } from '../sim';

export const CONTINUES = 3;

export interface Ladder {
  fighter: string;
  /** Opponents in order. */
  opponents: string[];
  /** The fight on now (index into opponents). */
  at: number;
  continues: number;
  /** 'fight' until it ends one way or the other. */
  state: 'fight' | 'won' | 'over';
}

/** Everyone else, in the order the schedule runs: the next channel along first. */
export function createLadder(fighter: string): Ladder {
  const ids = Object.keys(FIGHTERS);
  const k = ids.indexOf(fighter);
  const opponents = ids.slice(k + 1).concat(ids.slice(0, k));
  return { fighter, opponents, at: 0, continues: CONTINUES, state: 'fight' };
}

/** The CPU gets harder each fight: easy first, hard for the last. */
export function levelFor(l: Ladder): CpuLevel {
  const last = l.opponents.length - 1;
  return l.at === 0 ? 'easy' : l.at >= last ? 'hard' : 'normal';
}

export function opponent(l: Ladder): string {
  return l.opponents[l.at];
}

/** After a match: a win moves on (or wins the ladder); a loss spends a continue (or ends it). */
export function afterMatch(l: Ladder, won: boolean): Ladder {
  if (won) {
    const at = l.at + 1;
    return at >= l.opponents.length ? { ...l, state: 'won' } : { ...l, at };
  }
  return l.continues > 0 ? { ...l, continues: l.continues - 1 } : { ...l, state: 'over' };
}

/** The listings card between fights: tonight's schedule, the next show marked. */
export function schedule(l: Ladder): { time: string; show: string; next: boolean; done: boolean }[] {
  return l.opponents.map((id, k) => ({
    time: `${1 + k}:${k % 2 ? '30' : '00'} A.M.`,
    show: `${fighterData(id).show.toUpperCase()} · ${fighterData(id).name.toUpperCase()}`,
    next: k === l.at,
    done: k < l.at,
  }));
}

/**
 * The endings: the opening titles of the show each fighter won, on air
 * forever and rewritten however they like. The last line is the Programme
 * Director's, and it hints at the price.
 */
export const ENDINGS: Readonly<Record<string, { title: string; lines: readonly string[] }>> = {
  dale: {
    title: 'THE ETERNAL FORECAST',
    lines: [
      'Starring Dale Storm.',
      'Every night: sunny, 72 degrees, no chance of rain. Ever again.',
      'The smile has never been wider. It cannot be any narrower.',
      'THE PROGRAMME DIRECTOR: "Tomorrow\'s outlook? You\'ll find out."',
    ],
  },
  rox: {
    title: 'FEEL THE BURN FOREVER',
    lines: [
      'Starring Rox Vega.',
      'One more rep. One more rep. One more rep. The tape never ends.',
      'The studio audience is still doing jumping jacks. They cannot stop. Neither can she.',
      'THE PROGRAMME DIRECTOR: "Keep moving. We\'re watching."',
    ],
  },
  hollis: {
    title: 'THE LONG NIGHT SHIFT',
    lines: [
      'Starring Hollis Bey.',
      'He finally gets to go home. Home is a monitor bank showing every room of the building.',
      'Someone has to keep watch. Someone always will.',
      'THE PROGRAMME DIRECTOR: "Clock in, Hollis. You\'re management now."',
    ],
  },
  mumbles: {
    title: 'MISTER MUMBLES\' VERY OWN HOUR',
    lines: [
      'Starring Mister Mumbles, and nobody\'s hand.',
      'The children at home laugh at every joke. They are not allowed to stop.',
      'Knock knock. Who\'s there? Everyone, now.',
      'THE PROGRAMME DIRECTOR: "Such a natural. You\'ll go far. All the way to the top."',
    ],
  },
};
