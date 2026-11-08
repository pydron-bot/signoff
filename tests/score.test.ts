// The score holds together: a cue per segment of every stage, whole bars,
// every part a whole number of bars, and notes in a playable range.
import { describe, expect, it } from 'vitest';
import { SCORES, loopSteps, noteHz } from '../src/audio/score';
import { STAGES } from '../src/sim';

describe('score', () => {
  for (const id of Object.keys(STAGES)) {
    it(`${id}: a cue for every segment`, () => {
      expect(SCORES[id]?.length).toBe(STAGES[id].segments.length);
    });
  }
  for (const cues of Object.values(SCORES)) {
    for (const c of cues) {
      it(`${c.name}: whole bars and playable notes`, () => {
        const n = loopSteps(c);
        expect(n % 16).toBe(0);
        expect(c.drums).toMatch(/^[ksSh.]+$/);
        expect(n % c.drums.length).toBe(0);
        for (const p of c.parts) {
          expect(p.notes.length % 16, `${p.voice}`).toBe(0);
          expect(n % p.notes.length).toBe(0);
          for (const note of p.notes) if (note) expect(noteHz(note)).toBeGreaterThan(25), expect(noteHz(note)).toBeLessThan(5000);
        }
      });
    }
  }
});
