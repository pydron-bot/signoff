/**
 * The cold open: before round 1, the two fighters trade a line each, like
 * the top of a talk show. Some pairings have their own exchange (colleagues,
 * old grudges); otherwise the first fighter opens with one of their lines
 * and the second answers with one of theirs. Pure: the pick comes from the
 * match seed, so a rematch can say something else.
 */

export interface Exchange {
  /** Who speaks first (0 left, 1 right) and the two lines, in order. */
  first: 0 | 1;
  lines: readonly [string, string];
}

/** Said to anyone, to open. */
const OPENERS: Readonly<Record<string, readonly string[]>> = {
  dale: ["Tonight's forecast: scattered pain, clearing by the second round.", "Stay right where you are. There's a front moving in.", "Smile! We're live. We're always live."],
  rox: ["And reach! And reach! And... oh, you're new. Let's warm you up.", "Feel that? That's the burn. It doesn't stop. Mine never has.", 'Five, six, seven, eight, and HIT!'],
  mumbles: ["Wanna be friends? My last friend's in the toy chest. All of him.", "Nobody's got their hand up my back any more. Isn't that wonderful?", 'Say the magic word! ...Wrong.'],
  hollis: ["Building's closed. Has been since '79. Let's see your badge.", 'I do my rounds at three thirty-three. You\'re on my round.', 'Nobody leaves till the sign-off. Nobody.'],
  margaret: ['Good evening. Our top story tonight: you.', "I've read this script before. You don't last.", "We'll go to you live. Briefly."],
  gus: ["One take, no cuts. Let's not waste it.", "Tonight we're tenderising. Come closer.", "Everything's better with a little heat."],
  gideon: ['I can see the darkness in you. For a modest gift, I can take it away.', 'The lines are open! Who will be saved tonight?', 'Kneel, and be healed. Or stand, and be hurt.'],
};

/** Said back to anyone. */
const REPLIES: Readonly<Record<string, readonly string[]>> = {
  dale: ['Ha! Ha. Back to you.', "I'd give that a ten percent chance.", 'Not on my map, friend.'],
  rox: ['Less talk, more reps!', 'Keep up, sweetheart.', "I've been warmed up since 1983."],
  mumbles: ["Hee hee! You're funny. I'm keeping you.", "My lips aren't moving. Soon yours won't either.", 'Uh-oh. Somebody\'s going in the toy chest.'],
  hollis: ['Uh huh. Write it in the log.', "That's a violation.", 'Lights out in five.'],
  margaret: ["That's not what the teleprompter says.", "We'll fact-check that after the break.", 'Noted. And dismissed.'],
  gus: ["Chef's kiss. Then chef's cleaver.", "Too raw. Let's fix that.", 'Behind! Hot pan!'],
  gideon: ['Hallelujah. Pass the plate.', "The Lord forgives. I don't.", 'Can I get an amen? No? A pity.'],
};

/** Their own exchange: the first named speaks first. */
const PAIRS: Readonly<Record<string, readonly [string, string]>> = {
  'margaret:dale': ["Dale. You've been wrong every night since 1979.", 'Partly right, Margaret. Partly.'],
  'dale:margaret': ["And now back to Margaret... who's looking stormy.", "That's enough weather, Dale."],
  'gideon:mumbles': ['This puppet is possessed. Two hundred dollars and I cast it out.', 'Possessed by who, mister? Look behind you.'],
  'mumbles:gideon': ['Your hands are glowing. Can I have them?', 'Get thee behind me, splinters.'],
  'hollis:mumbles': ['You. Toy chest. Now.', 'Make me, flashlight.'],
  'mumbles:hollis': ['Mister Guard! Play hide and seek with me!', "I've been finding you every night for eight years."],
  'rox:gus': ['Ugh. Do you ever stop eating?', 'Do you ever stop moving?'],
  'gus:rox': ['You want carbs? I got carbs.', 'Not on my meal plan, Chef.'],
  'hollis:gideon': ['No preaching in the building after hours.', 'The Lord keeps no hours, officer.'],
  'gideon:hollis': ['Officer! Come, be blessed.', 'Badge first, Reverend.'],
  'dale:rox': ['Clear skies for your morning workout, Rox!', "Morning? Dale, it's always 3:33."],
  'margaret:gus': ['Kitchen Live. Still in one take?', "Still one take. Tonight you're the special."],
  'margaret:gideon': ["We're investigating your ministry, Reverend.", 'Investigate this, sister.'],
  'hollis:margaret': ['Ms. Okafor. You on the late shift too?', 'There is no other shift, Hollis.'],
};

/** Two of the same: only one time slot. */
const MIRROR: readonly [string, string] = ["There's only room in the schedule for one of us.", 'Then one of us gets cancelled.'];

function pick<T>(xs: readonly T[], n: number): T {
  return xs[((n % xs.length) + xs.length) % xs.length];
}

/** What the two say before round 1 (`p1` on the left). */
export function banter(p1: string, p2: string, seed: number): Exchange {
  if (p1 === p2) return { first: 0, lines: MIRROR };
  // A pairing's own exchange, most nights; the other order if only that one's written.
  const own = PAIRS[`${p1}:${p2}`];
  const back = PAIRS[`${p2}:${p1}`];
  if ((own || back) && seed % 4 !== 3) return own && (!back || seed % 2 === 0) ? { first: 0, lines: own } : { first: 1, lines: back! };
  const first: 0 | 1 = seed % 2 === 0 ? 0 : 1;
  const [a, b] = first === 0 ? [p1, p2] : [p2, p1];
  return { first, lines: [pick(OPENERS[a] ?? OPENERS.dale, seed >> 1), pick(REPLIES[b] ?? REPLIES.dale, seed >> 2)] };
}

/** Every line a fighter has, for tests. */
export function linesOf(id: string): readonly string[] {
  return [...(OPENERS[id] ?? []), ...(REPLIES[id] ?? [])];
}

/** How long a line stays up, in seconds: time to read it, at least two seconds. */
export function lineSeconds(line: string): number {
  return Math.max(2, 0.9 + line.length / 22);
}

/** Characters shown at once while the line types on. */
export const TYPE_RATE = 45;
