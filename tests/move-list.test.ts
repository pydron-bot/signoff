// The move list is built from the data: every special, string and finisher
// shows up, with an input a player can follow.
import { describe, expect, it } from 'vitest';
import { moveList } from '../src/game/moveList';
import { FIGHTERS } from '../src/sim';

describe('move list', () => {
  for (const f of Object.values(FIGHTERS)) {
    it(`${f.name}: every special, string and finisher, with its input`, () => {
      const list = moveList(f.id);
      const section = (t: string) => list.find((s) => s.title.startsWith(t))!.rows;
      // The specials, each followed by its follow-ups (a button as it plays).
      const ground = Object.values(f.specials).flatMap((id) => [id, ...Object.values(f.moves[id].chain)] as string[]);
      expect(section('Specials').map((r) => r.name).sort()).toEqual(ground.map((id) => f.moves[id].name).sort());
      for (const r of section('Specials')) expect(r.input).toMatch(/^([←→↓] )?SP( › (FP|BP|FK|BK))?$/);
      expect(section('Strings').map((r) => r.name)).toEqual(f.strings.map((s) => s.name));
      for (const r of section('Strings')) expect(r.input).toMatch(/^(↓ |→ |← )?(FP|BP|FK|BK)( · (FP|BP|FK|BK))+$/);
      // The air specials and air strings.
      const air = section('In the air');
      expect(air.map((r) => r.name)).toEqual([...new Set(Object.values(f.airSpecials))].map((id) => f.moves[id].name).concat(f.airStrings.map((s) => s.name)));
      for (const r of air) expect(r.input).toMatch(/^in the air: ([←→↓] )?SP$|^in the air: (FP|BP|FK|BK)( · (FP|BP|FK|BK))+$/);
      expect(section('Finishers').map((r) => r.name).sort()).toEqual([...f.finishers.map((x) => x.name), 'Stage Sign-Off'].sort());
      for (const r of section('Finishers')) expect(r.input).toMatch(/^([←→↑↓] )+(FP|BP|FK|BK|BLOCK)$|^win with /);
      // Until found, the cancellations beyond the first are ???, with a hint that doesn't give them away.
      const hidden = moveList(f.id, () => false);
      const fins = hidden.find((x) => x.title.startsWith('Finishers'))!.rows;
      expect(fins.filter((r) => r.name === '???').length).toBe(f.finishers.filter((x) => x.kind === 'cancellation').length - 1);
      for (const r of fins.filter((x) => x.name === '???')) {
        expect(r.input).toMatch(/^win with (a|an) [a-z ]+(, holding a direction)?$/);
        for (const fin of f.finishers.filter((x) => x.trigger)) expect(r.input).not.toContain(f.moves[fin.trigger!].name);
      }
      for (const s of list) for (const r of s.rows) expect(r.input.length).toBeGreaterThan(0);
      // Each combo guide, written as presses, with the game able to play it.
      const combos = section('Combos');
      expect(combos.length).toBeGreaterThanOrEqual(1);
      combos.forEach((r, k) => {
        // A step is a press (a direction and a button, a boost as SP SP) or a jump (↑, ↗ or ↖ alone).
        const step = '(wait\u00a0)?([↓→←]?(FP|BP|FK|BK|SP)(\u00a0SP)?|[↑↗↖])';
        expect(r.input).toMatch(new RegExp(`^${step}( › ${step})+$`));
        expect(r.notes).toMatch(/^\d+ hits · \d+% · (no meter|\d bars?)$/);
        expect(r.watch).toBe(k);
      });
    });
  }
});
