/**
 * How the fighters are presented, outside the simulation: their colours
 * (grey boxes, HUD accents) and the show each one hosts on Channel 0.
 */
export const FIGHTER_COLORS: Readonly<Record<string, number>> = { dale: 0x6f8fb8, rox: 0xe0559a, hollis: 0x4d5d3a, mumbles: 0xc9a06b, margaret: 0x8a3a4a, gus: 0xe8e4d8, gideon: 0x6a4ab0 };

/** Each fighter's show (docs/DESIGN.md, the finishers table). */
export const FIGHTER_SHOWS: Readonly<Record<string, string>> = {
  dale: 'Weather at Eleven',
  rox: 'Feel the Burn at Dawn',
  hollis: 'The Night Watch',
  mumbles: "Mumbles' Toybox",
  margaret: "The Eleven O'Clock News",
  gus: 'Kitchen Live',
  gideon: 'The Hour of Power',
};
