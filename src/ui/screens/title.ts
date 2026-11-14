/**
 * The title: four rows beside the TV, FIGHT, LEARN, WATCH and SETTINGS,
 * each opening a short list. What the old fourteen rows reached is all here;
 * the fighters, the stage, the CPU level and the rules moved to the fighter
 * select (select.ts). The lists are plain data (titleLists, tested); main.ts
 * gives each item's id its action.
 */
import type { MenuKey } from '../../input/devices';
import type { Menu, Row } from '../menu';

export interface TitleItem {
  id: string;
  label: string;
}

export interface TitleList {
  id: string;
  label: string;
  /** Empty for a row that acts at once (SETTINGS). */
  items: readonly TitleItem[];
}

/** The title's lists; `replay` adds the last match's replay to WATCH. */
export function titleLists(replay: boolean): TitleList[] {
  return [
    {
      id: 'title-fight',
      label: 'FIGHT',
      items: [
        { id: 'play-arcade', label: 'ARCADE' },
        { id: 'play-cpu', label: 'VS CPU' },
        { id: 'play-versus', label: 'VS PLAYER' },
      ],
    },
    {
      id: 'title-learn',
      label: 'LEARN',
      items: [
        { id: 'lessons', label: 'LESSONS' },
        { id: 'school', label: 'COMBO SCHOOL' },
        { id: 'play-training', label: 'TRAINING' },
        { id: 'move-list', label: 'MOVE LIST' },
      ],
    },
    {
      id: 'title-watch',
      label: 'WATCH',
      items: [{ id: 'play-watch', label: 'CPU VS CPU' }, { id: 'watch-random', label: 'RANDOM MATCH' }, ...(replay ? [{ id: 'watch-replay', label: 'THE LAST MATCH' }] : [])],
    },
    { id: 'title-settings', label: 'SETTINGS', items: [] },
  ];
}

export interface TitleHost {
  /** Runs an item (or SETTINGS) by id. */
  run(id: string): void;
  /** Whether there's a last match to watch. */
  replay(): boolean;
  /** A label to show instead of the plain one (the move list's trial count). */
  label?(id: string): string | undefined;
}

export class TitleScreen {
  /** The list open, or '' on the top rows. */
  private open = '';

  constructor(
    private readonly menu: Menu,
    private readonly host: TitleHost,
  ) {}

  /** The top rows; `focus` the list to land on (coming back out of one). */
  show(focus = ''): void {
    this.open = '';
    const lists = titleLists(this.host.replay());
    const at = Math.max(0, lists.findIndex((l) => l.id === focus));
    this.menu.show(
      '',
      lists.map((l) => ({ label: l.label, id: l.id, run: () => (l.items.length ? this.showList(l.id) : this.host.run(l.id)) })),
      at,
    );
  }

  showList(id: string): void {
    const list = titleLists(this.host.replay()).find((l) => l.id === id);
    if (!list) return;
    this.open = id;
    const rows: Row[] = list.items.map((it) => ({ label: this.host.label?.(it.id) ?? it.label, id: it.id, run: () => this.host.run(it.id) }));
    rows.push({ label: 'BACK', id: 'title-back', run: () => this.show(id) });
    this.menu.show(list.label, rows);
  }

  /** Back (Escape, Backspace, B on a pad) out of a list to the top rows. */
  key(k: MenuKey): void {
    if ((k === 'back' || k === 'pause') && this.open) this.show(this.open);
    else this.menu.key(k);
  }
}
