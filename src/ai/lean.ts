/**
 * How the CPU leans when it plays each fighter: a weight on each kind of
 * choice its style makes (src/ai/cpu.ts), 1 meaning as the style has it.
 * The style says what a fighter does; the lean says how much, and it is
 * tuned so the CPU plays every fighter as well as it can (each fighter's
 * lean was searched for the one that wins most against the whole cast,
 * docs/MATCHUPS.md). Plain data, read every decision.
 */

/** The kinds of choice a style makes. */
export const CHOICES = ['string', 'throw', 'special', 'poke', 'low', 'approach', 'retreat', 'wait', 'guard', 'jump', 'mix'] as const;
export type Choice = (typeof CHOICES)[number];
export type Lean = Readonly<Record<Choice, number>>;

export const EVEN: Lean = { string: 1, throw: 1, special: 1, poke: 1, low: 1, approach: 1, retreat: 1, wait: 1, guard: 1, jump: 1, mix: 1 };

export const LEANS: Readonly<Record<string, Lean>> = {
  dale: EVEN,
  rox: EVEN,
  hollis: EVEN,
  mumbles: EVEN,
  margaret: EVEN,
  gus: EVEN,
  gideon: EVEN,
};

/**
 * Matchup knowledge: how the CPU leans playing a fighter against one
 * opponent, where that matchup needs it. Only the losing side of a matchup
 * the bench flagged has one, searched to win that matchup (the winner's
 * play is left alone).
 */
export const MATCHUP_LEANS: Readonly<Record<string, Readonly<Record<string, Lean>>>> = {
  gus: {
    rox: { ...EVEN, string: 1.6, throw: 0.6, retreat: 0.6, mix: 2.5 },
  },
  gideon: {
    hollis: { ...EVEN, string: 1.6, throw: 1.6, approach: 1.6, retreat: 0.6, wait: 0.6 },
  },
  // 0.51.0: the new moves moved three matchups past 70:30.
  margaret: {
    dale: { ...EVEN, low: 1.6 },
  },
  hollis: {
    rox: { ...EVEN, special: 2.5 },
  },
  rox: {
    mumbles: { ...EVEN, string: 2.5, throw: 0.6, special: 2.5, approach: 0.6, guard: 0.6 },
    margaret: { ...EVEN, low: 1.6 },
  },
  mumbles: {
    margaret: { ...EVEN, string: 1.6, special: 0.6, mix: 1.6 },
  },
};

export function leanOf(fighter: string, opponent = ''): Lean {
  return MATCHUP_LEANS[fighter]?.[opponent] ?? LEANS[fighter] ?? EVEN;
}
