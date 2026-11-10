/**
 * A small menu: rows that are buttons or choices, worked by tap, keyboard
 * or gamepad (up/down to move, left/right to change, OK to pick).
 */
import type { MenuKey } from '../input/devices';

export interface Choice {
  label: string;
  options: readonly string[];
  value: number;
  onChange?: (value: number) => void;
}

export interface Action {
  label: string;
  id?: string;
  run: () => void;
}

export type Row = Choice | Action;

function isChoice(r: Row): r is Choice {
  return 'options' in r;
}

export class Menu {
  readonly root: HTMLElement;
  private rows: Row[] = [];
  private els: HTMLElement[] = [];
  private focus = 0;

  constructor(parent: HTMLElement, cls: string) {
    this.root = document.createElement('div');
    this.root.className = `menu ${cls}`;
    this.root.hidden = true;
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  show(title: string, rows: Row[], focus = 0): void {
    this.rows = rows;
    this.focus = Math.min(focus, rows.length - 1);
    this.root.replaceChildren();
    if (title) {
      const t = document.createElement('div');
      t.className = 'menu-title';
      t.textContent = title;
      this.root.append(t);
    }
    this.els = rows.map((r, i) => {
      const e = document.createElement('button');
      e.type = 'button';
      e.className = isChoice(r) ? 'menu-row menu-choice' : 'menu-row menu-action';
      if (!isChoice(r) && r.id) e.id = r.id;
      // A choice is its label, then the value between arrows: the value alone gives way (an ellipsis) when the row is narrow, so the arrows stay.
      if (isChoice(r)) {
        const label = document.createElement('span');
        label.className = 'menu-label';
        label.textContent = r.label;
        const value = document.createElement('span');
        value.className = 'menu-value';
        e.append(label, arrow('‹'), value, arrow('›'));
      }
      e.addEventListener('click', () => {
        this.focus = i;
        if (isChoice(r)) this.change(1);
        else r.run();
        this.paint();
      });
      this.root.append(e);
      return e;
    });
    this.root.hidden = false;
    this.paint();
  }

  hide(): void {
    this.root.hidden = true;
  }

  private change(d: number): void {
    const r = this.rows[this.focus];
    if (!isChoice(r)) return;
    r.value = (r.value + d + r.options.length) % r.options.length;
    r.onChange?.(r.value);
  }

  key(k: MenuKey): void {
    if (!this.open) return;
    const r = this.rows[this.focus];
    if (k === 'up') this.focus = (this.focus - 1 + this.rows.length) % this.rows.length;
    else if (k === 'down') this.focus = (this.focus + 1) % this.rows.length;
    else if (k === 'left') this.change(-1);
    else if (k === 'right') this.change(1);
    else if (k === 'ok') {
      if (isChoice(r)) this.change(1);
      else {
        r.run();
        return;
      }
    }
    this.paint();
  }

  private paint(): void {
    this.rows.forEach((r, i) => {
      const e = this.els[i];
      if (isChoice(r)) {
        const value = e.children[2] as HTMLElement;
        value.textContent = r.options[r.value];
        value.title = r.options[r.value];
      } else e.textContent = r.label;
      e.classList.toggle('focus', i === this.focus);
      // Moving with keys or a pad: keep the row in view when the menu scrolls (Settings on a phone).
      if (i === this.focus) e.scrollIntoView?.({ block: 'nearest' });
    });
  }
}

function arrow(c: string): HTMLSpanElement {
  const a = document.createElement('span');
  a.className = 'menu-arrow';
  a.textContent = c;
  return a;
}
