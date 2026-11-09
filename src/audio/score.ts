/**
 * The music as data: one loop per segment of a show, written as 16th-note
 * steps of MIDI notes (0 for a rest). Played by src/audio/music.ts with Web
 * Audio, so there are no audio files. Weather at Eleven: a bright synth news
 * theme in the studio, a driving minor arpeggio in the storm, a slow,
 * detuned dirge for the flood. Feel the Burn at Dawn: aerobics pop, the same
 * tape run fast, then the tune in the dark. The Eleven O'Clock News: a
 * brass-stab news theme over a telex pluck, the same theme pushed harder
 * under the ticker, then the theme in fragments as the lights fail.
 */

export interface Part {
  /** One entry per 16th step (a rest is 0); the loop's length is the longest part's. */
  notes: readonly number[];
  voice: 'bass' | 'pad' | 'lead' | 'arp' | 'pluck';
  gain: number;
  /** Steps each note lasts (pads and the lead hold; the rest are short). */
  hold?: number;
}

export interface Cue {
  name: string;
  bpm: number;
  parts: readonly Part[];
  /** Drum pattern per step: k kick, s snare, h hat, '.' nothing. */
  drums: string;
}

/** A bar of 16 steps from a note per beat, each held for the beat (rests between). */
function beats(...n: number[]): number[] {
  return n.flatMap((x) => [x, 0, 0, 0]);
}

/** The same notes every 8th. */
function eighths(...n: number[]): number[] {
  return n.flatMap((x) => [x, 0]);
}

function bars(...b: number[][]): number[] {
  return b.flat();
}

// Studio: C major, I-vi-IV-V, a brisk 1987 news bed.
const STUDIO: Cue = {
  name: 'Weather at Eleven',
  bpm: 116,
  drums: 'k.h.s.h.k.hkS.h.'.repeat(4),
  parts: [
    { voice: 'bass', gain: 0.5, notes: bars(eighths(36, 48, 36, 43, 36, 48, 43, 48), eighths(33, 45, 33, 40, 33, 45, 40, 45), eighths(29, 41, 29, 36, 29, 41, 36, 41), eighths(31, 43, 31, 38, 31, 43, 38, 43)) },
    { voice: 'pad', gain: 0.18, hold: 16, notes: bars([60, ...Array(15).fill(0)], [57, ...Array(15).fill(0)], [53, ...Array(15).fill(0)], [55, ...Array(15).fill(0)]) },
    { voice: 'pad', gain: 0.14, hold: 16, notes: bars([64, ...Array(15).fill(0)], [60, ...Array(15).fill(0)], [57, ...Array(15).fill(0)], [59, ...Array(15).fill(0)]) },
    { voice: 'pad', gain: 0.12, hold: 16, notes: bars([67, ...Array(15).fill(0)], [64, ...Array(15).fill(0)], [60, ...Array(15).fill(0)], [62, ...Array(15).fill(0)]) },
    { voice: 'lead', gain: 0.16, hold: 2, notes: bars([72, 0, 0, 74, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0], [69, 0, 0, 72, 76, 0, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0], [65, 0, 69, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0], [71, 0, 0, 0, 74, 0, 0, 0, 79, 0, 0, 0, 77, 0, 74, 0]) },
  ],
};

// The storm: A minor, i-VI-III-V, 16th arpeggios over a pulsing bass.
const STORM: Cue = {
  name: 'The Forecast Comes True',
  bpm: 132,
  drums: 'k.hhs.hhk.hhs.hh'.repeat(3) + 'k.hhs.hhkkhhsSss',
  parts: [
    { voice: 'bass', gain: 0.5, notes: bars(eighths(33, 33, 33, 33, 33, 33, 33, 33), eighths(29, 29, 29, 29, 29, 29, 29, 29), eighths(36, 36, 36, 36, 36, 36, 36, 36), eighths(28, 28, 28, 28, 28, 28, 40, 40)) },
    { voice: 'arp', gain: 0.12, notes: bars([69, 72, 76, 81].flatMap((x) => [x]).concat([69, 72, 76, 81, 69, 72, 76, 81, 69, 72, 76, 81]), [65, 69, 72, 77, 65, 69, 72, 77, 65, 69, 72, 77, 65, 69, 72, 77], [67, 72, 76, 79, 67, 72, 76, 79, 67, 72, 76, 79, 67, 72, 76, 79], [64, 68, 71, 76, 64, 68, 71, 76, 64, 68, 71, 76, 64, 68, 71, 76]) },
    { voice: 'lead', gain: 0.14, hold: 6, notes: bars(beats(81, 0, 79, 76), beats(77, 0, 0, 72), beats(79, 0, 76, 72), beats(76, 0, 80, 0)) },
  ],
};

// The flood: D minor, slow, the pads a little out of tune, drips on top.
const FLOOD: Cue = {
  name: 'Flood Warning',
  bpm: 84,
  drums: 'k.......s.......k.....k.s.......'.repeat(2),
  parts: [
    { voice: 'bass', gain: 0.55, hold: 8, notes: bars(beats(38, 0, 38, 0), beats(34, 0, 34, 0), beats(31, 0, 31, 0), beats(33, 0, 33, 0)) },
    { voice: 'pad', gain: 0.16, hold: 16, notes: bars([62, ...Array(15).fill(0)], [58, ...Array(15).fill(0)], [55, ...Array(15).fill(0)], [57, ...Array(15).fill(0)]) },
    { voice: 'pad', gain: 0.12, hold: 16, notes: bars([65, ...Array(15).fill(0)], [62, ...Array(15).fill(0)], [58, ...Array(15).fill(0)], [61, ...Array(15).fill(0)]) },
    { voice: 'pluck', gain: 0.1, notes: bars([0, 0, 0, 86, 0, 0, 0, 0, 0, 0, 81, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 82, 0, 0, 0, 0, 0, 0, 77, 0, 0, 0], [0, 0, 86, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 85, 0, 0, 0, 0, 0, 0, 81, 0, 0, 0, 0]) },
  ],
};

/** A cue's notes moved by some semitones (rests stay rests). */
function transpose(c: Cue, by: number, name: string, bpm: number): Cue {
  return { ...c, name, bpm, parts: c.parts.map((p) => ({ ...p, notes: p.notes.map((n) => (n ? n + by : 0)) })) };
}

// Feel the Burn at Dawn. Warm-Up: E major aerobics pop, I-V-vi-IV, four on
// the floor at 120 bpm (a beat every 30 steps: Burnout's shards fall on it).
const WARMUP: Cue = {
  name: 'Warm-Up',
  bpm: 120,
  drums: 'k.hhs.hhk.hhs.hk'.repeat(3) + 'k.hhs.hhk.hss.sS',
  parts: [
    { voice: 'bass', gain: 0.5, notes: bars(eighths(28, 40, 28, 40, 28, 40, 28, 40), eighths(35, 47, 35, 47, 35, 47, 35, 47), eighths(37, 49, 37, 49, 37, 49, 37, 49), eighths(33, 45, 33, 45, 33, 45, 35, 47)) },
    { voice: 'pluck', gain: 0.12, notes: bars(eighths(0, 64, 68, 71, 0, 64, 68, 71), eighths(0, 63, 66, 71, 0, 63, 66, 71), eighths(0, 61, 64, 68, 0, 61, 64, 68), eighths(0, 61, 64, 69, 0, 61, 64, 69)) },
    { voice: 'lead', gain: 0.15, hold: 3, notes: bars([76, 0, 0, 76, 0, 0, 78, 0, 80, 0, 0, 0, 78, 0, 76, 0], [75, 0, 0, 0, 78, 0, 0, 0, 83, 0, 0, 0, 0, 0, 0, 0], [73, 0, 0, 73, 0, 0, 76, 0, 80, 0, 0, 0, 78, 0, 76, 0], [73, 0, 0, 0, 76, 0, 78, 0, 81, 0, 0, 0, 80, 0, 0, 0]) },
  ],
};

// Double Time: the same tape run fast, so faster and higher (10% is about two semitones).
const DOUBLE: Cue = transpose(WARMUP, 2, 'Double Time', 132);

// Burnout: the tune in the dark, E minor, i-VI-III-VII, pads out of tune, the beat still 120.
const BURNOUT: Cue = {
  name: 'Burnout',
  bpm: 120,
  drums: 'k...s...k...s...k...s...k.k.s.ss',
  parts: [
    { voice: 'bass', gain: 0.55, hold: 4, notes: bars(beats(28, 28, 28, 28), beats(24, 24, 24, 24), beats(31, 31, 31, 31), beats(26, 26, 26, 38)) },
    { voice: 'pad', gain: 0.15, hold: 16, notes: bars([64, ...Array(15).fill(0)], [60, ...Array(15).fill(0)], [62, ...Array(15).fill(0)], [62, ...Array(15).fill(0)]) },
    { voice: 'pad', gain: 0.12, hold: 16, notes: bars([67, ...Array(15).fill(0)], [64, ...Array(15).fill(0)], [67, ...Array(15).fill(0)], [66, ...Array(15).fill(0)]) },
    { voice: 'lead', gain: 0.12, hold: 6, notes: bars(beats(76, 0, 0, 74), beats(72, 0, 0, 0), beats(74, 0, 71, 0), beats(69, 0, 0, 0)) },
  ],
};

// Headlines: D major, I-IV-vi-V, the telex rattling in 16ths under the theme's stabs.
const TELEX = [86, 0, 86, 86, 0, 86, 0, 86, 86, 0, 86, 0, 86, 86, 0, 0];
const HEADLINES: Cue = {
  name: 'Headlines',
  bpm: 112,
  drums: 'k..hs..hk.khs..h'.repeat(4),
  parts: [
    { voice: 'bass', gain: 0.5, notes: bars(eighths(38, 0, 38, 50, 38, 0, 45, 0), eighths(43, 0, 43, 55, 43, 0, 50, 0), eighths(35, 0, 35, 47, 35, 0, 42, 0), eighths(33, 0, 33, 45, 33, 0, 40, 45)) },
    { voice: 'pluck', gain: 0.06, notes: bars(TELEX, TELEX, TELEX, TELEX) },
    { voice: 'lead', gain: 0.16, hold: 2, notes: bars([74, 0, 0, 74, 0, 0, 78, 0, 81, 0, 0, 0, 0, 0, 0, 0], [79, 0, 0, 79, 0, 0, 83, 0, 86, 0, 0, 0, 83, 0, 0, 0], [78, 0, 0, 78, 0, 0, 81, 0, 83, 0, 81, 0, 78, 0, 0, 0], [76, 0, 0, 0, 79, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 0]) },
    { voice: 'pad', gain: 0.13, hold: 16, notes: bars([66, ...Array(15).fill(0)], [67, ...Array(15).fill(0)], [66, ...Array(15).fill(0)], [64, ...Array(15).fill(0)]) },
  ],
};

// The Ticker: the theme a tone up and faster, the kick on every beat.
const TICKER: Cue = { ...transpose(HEADLINES, 2, 'The Ticker', 124), drums: 'k.hhs.hhk.hhs.hh'.repeat(3) + 'k.hhs.hhk.hhsSsS' };

// Lights Out: F minor, the theme's stabs alone in the dark, a low drone, a ticking clock.
const LIGHTS_OUT: Cue = {
  name: 'Lights Out',
  bpm: 96,
  drums: 'k...h...h...h...s...h...h...h...',
  parts: [
    { voice: 'bass', gain: 0.55, hold: 16, notes: bars([29, ...Array(15).fill(0)], [29, ...Array(15).fill(0)], [25, ...Array(15).fill(0)], [24, ...Array(15).fill(0)]) },
    { voice: 'pad', gain: 0.13, hold: 16, notes: bars([60, ...Array(15).fill(0)], [65, ...Array(15).fill(0)], [61, ...Array(15).fill(0)], [64, ...Array(15).fill(0)]) },
    { voice: 'lead', gain: 0.12, hold: 2, notes: bars([77, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0, 0], [73, 0, 0, 73, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 76, 0, 0, 0, 72, 0, 0, 0]) },
  ],
};

/** Music by stage, one cue per segment. */
export const SCORES: Readonly<Record<string, readonly Cue[]>> = { weather: [STUDIO, STORM, FLOOD], burn: [WARMUP, DOUBLE, BURNOUT], news: [HEADLINES, TICKER, LIGHTS_OUT] };

/** Steps in a cue's loop. */
export function loopSteps(c: Cue): number {
  return Math.max(c.drums.length, ...c.parts.map((p) => p.notes.length));
}

export function noteHz(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}
