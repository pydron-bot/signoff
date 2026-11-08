/**
 * The game's version and what each release brought, newest first. The
 * version is Major.Minor.Patch: a minor step per feature release, a patch
 * for fixes. package.json's version must match (tests/changelog.test.ts).
 * Add an entry at the top with each release to main.
 */
export interface Release {
  version: string;
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  notes: readonly string[];
}

export const CHANGELOG: readonly Release[] = [
  {
    version: '0.3.0',
    date: '2026-11-08',
    title: 'The forecast comes true',
    notes: [
      'Weather at Eleven changes every round: kick the camera dollies, fight through wind and lightning, then knee-deep water with live puddles. Every hazard is announced first.',
      'New specials: Dale\'s Heat Lightning (a reversal, neutral + Special) and Rox\'s Star Jump (an overhead hop).',
      'Rebalanced Dale and Rox: Rox hits harder, Dale has less health and slower zoning.',
      'Sound: hits, blocks, the station ident, an announcer, a laugh track with bad timing, and the sign-off tone.',
      'Big hits wobble the tape, KOs crackle with static, and Technical Difficulties cuts to PLEASE STAND BY.',
      'Rules option (Studio: one segment, no hazards), sound options, and a segment picker in Training.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-08',
    title: 'First fight',
    notes: [
      'Dale Storm and Rox Vega fight on Weather at Eleven, in grey boxes: strings, specials, throws, the Signal meter and Technical Difficulties all work.',
      'VS CPU (easy, normal, hard), Training with frame advantage and a dummy, and VS Player with gamepads.',
      'Keyboard, gamepad and touch controls. Best of three, with a commercial break between rounds.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-07',
    title: 'Test card',
    notes: ['Channel 0 is on air: a title card and nothing else yet. The fighting comes next.'],
  },
];

export const VERSION: string = CHANGELOG[0].version;

/** Compare two Major.Minor.Patch versions: < 0 if a is older. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}
