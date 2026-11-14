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
    // 0.62.0 (health into a band): low and mixed up on the small one.
    mumbles: { ...EVEN, low: 2.5, mix: 2.5 },
    // 0.62.0: specials from range, where Dale's pokes would win.
    dale: { ...EVEN, special: 2.5 },
  },
  gideon: {
    // 0.62.0: strings and mix-ups rather than waiting (searched again with Hollis's new health).
    hollis: { ...EVEN, string: 2.5, mix: 2.5 },
    // 0.62.0: his specials from range against Gus's reach.
    gus: { ...EVEN, special: 2.5 },
  },
  dale: {
    // 0.62.0: Rox's quick jump gets in over his zoning; he presses her instead.
    rox: { ...EVEN, string: 2.5, mix: 2.5 },
    // 0.62.0: mix-ups on the heavies, and a few more jumps over Gus's pans.
    hollis: { ...EVEN, mix: 2.5 },
    gus: { ...EVEN, jump: 1.6, mix: 2.5 },
  },
  // 0.51.0: the new moves moved three matchups past 70:30.
  margaret: {
    dale: { ...EVEN, low: 1.6 },
    // 0.62.0: her specials and mix-ups, not footsies, against his reach.
    gus: { ...EVEN, special: 2.5, mix: 2.5 },
    gideon: { ...EVEN, mix: 2.5 },
  },
  hollis: {
    rox: { ...EVEN, special: 2.5 },
    // 0.62.0: Mumbles ducks his jab; his specials reach him.
    mumbles: { ...EVEN, special: 1.6 },
  },
  rox: {
    mumbles: { ...EVEN, string: 2.5, throw: 0.6, special: 2.5, approach: 0.6, guard: 0.6 },
    // 0.62.0: her strings and specials, not her lows, against Margaret's guard.
    margaret: { ...EVEN, string: 2.5, special: 2.5 },
  },
  mumbles: {
    // 0.62.0: more strings and mix-ups still (she has more health now).
    margaret: { ...EVEN, string: 2.5, special: 0.6, mix: 2.5 },
    gideon: { ...EVEN, mix: 2.5 },
  },
};

export function leanOf(fighter: string, opponent = ''): Lean {
  return MATCHUP_LEANS[fighter]?.[opponent] ?? LEANS[fighter] ?? EVEN;
}
