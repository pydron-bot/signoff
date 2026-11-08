/**
 * Arcade's cards between fights: tonight's listings with the next show
 * marked, the continue screen, and the ending (the opening titles of the
 * show you won). Its buttons are a Menu, worked like any other.
 */
import { ENDINGS, schedule, type Ladder } from '../game/arcade';
import type { MenuKey } from '../input/devices';
import { fighterData } from '../sim';
import { Menu, type Row } from './menu';

export class ArcadeCard {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly menu: Menu;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'arcade-card';
    this.root.hidden = true;
    this.body = document.createElement('div');
    this.body.className = 'arcade-body';
    this.root.append(this.body);
    this.menu = new Menu(this.root, 'arcade-menu');
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  hide(): void {
    this.root.hidden = true;
    this.menu.hide();
  }

  key(k: MenuKey): void {
    this.menu.key(k);
  }

  /** Tonight's listings: done shows struck off, the next one lit. */
  listings(l: Ladder, heading: string, rows: Row[]): void {
    this.body.replaceChildren(line('arcade-top', heading), line('arcade-sub', `${fighterData(l.fighter).name.toUpperCase()} · CONTINUES ${l.continues}`));
    for (const s of schedule(l)) {
      const r = line(`arcade-slot${s.next ? ' next' : ''}${s.done ? ' done' : ''}`, `${s.time.padEnd(10)} ${s.show}`);
      this.body.append(r);
    }
    this.show(rows);
  }

  ending(fighter: string, rows: Row[]): void {
    const e = ENDINGS[fighter];
    this.body.replaceChildren(line('arcade-top', 'CHANNEL 0 PRESENTS'), line('arcade-title', e.title), ...e.lines.map((t) => line('arcade-line', t)));
    this.show(rows);
  }

  private show(rows: Row[]): void {
    this.root.hidden = false;
    this.menu.show('', rows);
  }
}

function line(cls: string, text: string): HTMLElement {
  const e = document.createElement('div');
  e.className = cls;
  e.textContent = text;
  return e;
}
