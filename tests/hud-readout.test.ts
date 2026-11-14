import { describe, expect, it } from 'vitest';
import { CALLOUT_STEPS, CalloutQueue, SPEND_BOOST, SPEND_CUT, SPEND_SKIP, clockUrgent, comboScale, spendsReady } from '../src/ui/hudReadout';
import { BAR, METER_MAX } from '../src/sim/constants';

describe('the HUD’s readings', () => {
  it('lights a spend only when the meter pays for it', () => {
    expect(spendsReady({ meter: BAR - 1, cutAwayUsed: false })).toBe(0);
    expect(spendsReady({ meter: BAR, cutAwayUsed: false })).toBe(SPEND_BOOST | SPEND_SKIP);
    expect(spendsReady({ meter: METER_MAX, cutAwayUsed: false })).toBe(SPEND_BOOST | SPEND_SKIP | SPEND_CUT);
    expect(spendsReady({ meter: METER_MAX, cutAwayUsed: true }) & SPEND_CUT).toBe(0);
  });

  it('the combo counter grows with the hits and the weight of the last', () => {
    expect(comboScale(2, 0)).toBe(1);
    expect(comboScale(7, 0)).toBeGreaterThan(comboScale(3, 0));
    expect(comboScale(30, 0)).toBe(comboScale(12, 0));
    expect(comboScale(4, 3)).toBeGreaterThan(comboScale(4, 0));
  });

  it('the clock is urgent in the last ten seconds of a running round', () => {
    expect(clockUrgent(11, true)).toBe(false);
    expect(clockUrgent(10, true)).toBe(true);
    expect(clockUrgent(3, false)).toBe(false);
  });

  it('callouts take turns in their slot instead of stacking', () => {
    const q = new CalloutQueue();
    q.push('COUNTER');
    q.push('PUNISH');
    q.push('PUNISH');
    expect(q.text).toBe('COUNTER');
    let changes = 0;
    const seen: string[] = [];
    for (let i = 0; i < CALLOUT_STEPS * 3; i++) if (q.step()) (changes++, seen.push(q.text));
    expect(seen).toEqual(['PUNISH', '']);
    expect(changes).toBe(2);
  });
});
