/**
 * LEARN's own menus: the lessons and Combo School's courses and their parts,
 * as the fighter picked here (the fighter left the title for the select
 * screen, so these pick their own). main.ts starts what's chosen.
 */
import { coursePassed, courses, schoolId, type Course } from '../../game/comboSchool';
import type { Cleared } from '../../game/cleared';
import { LESSONS } from '../../game/lessons';
import { fighterData } from '../../sim';
import type { Menu } from '../menu';

export interface LearnHost {
  ids: readonly string[];
  /** The fighter chosen (player 1's), as an index of `ids`, and setting it. */
  fighter(): number;
  setFighter(index: number): void;
  lessonsDone: Cleared;
  schoolDone: Cleared;
  startLesson(id: string): void;
  startSchool(c: Course, part: number): void;
  watch(c: Course): void;
  back(): void;
}

export class LearnScreens {
  constructor(
    private readonly menu: Menu,
    private readonly host: LearnHost,
  ) {}

  private fighterRow(again: () => void) {
    const h = this.host;
    const names = h.ids.map((id) => `${fighterData(id).name} · ${fighterData(id).style}`);
    return { label: 'FIGHTER', options: names, value: h.fighter(), onChange: (v: number) => (h.setFighter(v), again()) };
  }

  /** `focus`: the row to land on (the FIGHTER row, after changing it). */
  lessons(focus = 0): void {
    const h = this.host;
    this.menu.show(
      `LESSONS · AS ${fighterData(h.ids[h.fighter()]).name.toUpperCase()}`,
      [
        ...LESSONS.map((l) => ({ label: `${h.lessonsDone.has(l.id) ? '✓ ' : ''}${l.name.toUpperCase()}`, id: `lesson-${l.id}`, run: () => h.startLesson(l.id) })),
        this.fighterRow(() => this.lessons(LESSONS.length)),
        { label: 'BACK', run: () => h.back() },
      ],
      focus,
    );
  }

  /** Combo School: a course for every combo guide, easiest first. */
  school(focus = 0): void {
    const h = this.host;
    const id = h.ids[h.fighter()];
    const cs = courses(id);
    this.menu.show(`COMBO SCHOOL · ${fighterData(id).name.toUpperCase()}`, [
      ...cs.map((c, k) => {
        const n = coursePassed(h.schoolDone, c);
        const meter = c.bars ? ` · ${c.bars} BAR${c.bars > 1 ? 'S' : ''}` : '';
        return { label: `${n === c.parts.length ? '✓ ' : ''}${c.name.toUpperCase()}${meter} · ${n}/${c.parts.length}`, id: `school-${k}`, run: () => this.course(c) };
      }),
      this.fighterRow(() => this.school(courses(h.ids[h.fighter()]).length)),
      { label: 'BACK', run: () => h.back() },
    ], focus);
  }

  /** One course: its parts (each a few more moves of the combo), and the whole combo to watch first. */
  course(c: Course): void {
    const h = this.host;
    this.menu.show(`${fighterData(c.fighter).name.toUpperCase()} · ${c.name.toUpperCase()}`, [
      ...c.parts.map((moves, p) => ({
        label: `${h.schoolDone.has(schoolId(c.fighter, c.name, p)) ? '✓ ' : ''}PART ${p + 1}: ${p === c.parts.length - 1 ? `THE WHOLE COMBO (${moves} MOVES)` : `THE FIRST ${moves} MOVES`}`,
        id: `school-part-${p}`,
        run: () => h.startSchool(c, p),
      })),
      { label: 'WATCH IT', run: () => h.watch(c) },
      { label: 'BACK', run: () => this.school() },
    ]);
  }
}
