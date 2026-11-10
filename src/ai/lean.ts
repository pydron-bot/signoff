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

export function leanOf(fighter: string): Lean {
  return LEANS[fighter] ?? EVEN;
}
