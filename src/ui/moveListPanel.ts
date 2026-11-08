/**
 * The move list over the paused game: one fighter's moves by section, the
 * controls legend, and frame data in training. Scrolls with up/down (keys
 * or pad) or a swipe; left/right switch fighter; OK, back or pause closes.
 */
import type { MenuKey } from '../input/devices';
import { moveList } from '../game/moveList';
import { fighterData } from '../sim';

const LEGEND =
  'Facing right: → forward, ← back. SP = Special, METER = Tape Skip / Cut Away.\n' +
  'Keyboard: WASD move · U FP · I BP · J FK · K BK · L BLOCK · O SP · U+J THROW · Space METER\n' +
  'Gamepad: X FP · Y BP · A FK · B BK · RB BLOCK · RT SP · LB THROW · Y+B METER · Touch: the buttons, tap the meter for METER';

export class MoveListPanel {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly title: HTMLElement;
  private fighters: string[] = [];
  private index = 0;
  private frames = false;
  onClose: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'movelist';
    this.root.hidden = true;
    const head = document.createElement('div');
    head.className = 'movelist-head';
    const prev = button('‹', () => this.switch(-1));
    const next = button('›', () => this.switch(1));
    this.title = document.createElement('div');
    this.title.className = 'movelist-title';
    const close = button('✕', () => this.close());
    close.id = 'movelist-close';
    head.append(prev, this.title, next, close);
    this.body = document.createElement('div');
    this.body.className = 'movelist-body';
    this.root.append(head, this.body);
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  /** Shows the moves of `fighters[first]`; left/right go through the others. */
  show(fighters: string[], first: number, frames: boolean): void {
    this.fighters = fighters;
    this.index = first;
    this.frames = frames;
    this.root.hidden = false;
    this.paint();
  }

  close(): void {
    this.root.hidden = true;
    this.onClose();
  }

  key(k: MenuKey): void {
    if (k === 'up' || k === 'down') this.body.scrollBy({ top: k === 'up' ? -80 : 80 });
    else if (k === 'left' || k === 'right') this.switch(k === 'left' ? -1 : 1);
    else this.close();
  }

  private switch(d: number): void {
    if (this.fighters.length < 2) return;
    this.index = (this.index + d + this.fighters.length) % this.fighters.length;
    this.paint();
  }

  private paint(): void {
    const id = this.fighters[this.index];
    this.title.textContent = `${fighterData(id).name.toUpperCase()} · MOVE LIST`;
    this.body.replaceChildren();
    for (const s of moveList(id)) {
      const h = document.createElement('div');
      h.className = 'movelist-section';
      h.textContent = s.title.toUpperCase();
      this.body.append(h);
      for (const r of s.rows) {
        const row = document.createElement('div');
        row.className = 'movelist-row';
        row.append(cell('movelist-name', r.name), cell('movelist-input', r.input), cell('movelist-notes', this.frames && r.frames ? `${r.notes}\n${r.frames}` : r.notes));
        this.body.append(row);
      }
    }
    this.body.append(cell('movelist-legend', LEGEND));
    this.body.scrollTop = 0;
  }
}

function cell(cls: string, text: string): HTMLElement {
  const e = document.createElement('div');
  e.className = cls;
  e.textContent = text;
  return e;
}

function button(text: string, run: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'movelist-btn';
  b.textContent = text;
  b.addEventListener('click', run);
  return b;
}
