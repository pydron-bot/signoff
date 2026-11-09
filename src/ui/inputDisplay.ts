/**
 * The input display: one player's recent inputs down the side of the screen,
 * newest at the top, each with the frames it was held (src/game/inputLog.ts).
 * Redraws only when the log changes.
 */
import { InputLog } from '../game/inputLog';

export class InputDisplay {
  readonly log = new InputLog();
  private readonly root: HTMLElement;
  private drawn = -1;

  constructor(parent: HTMLElement, side: 0 | 1) {
    this.root = document.createElement('div');
    this.root.className = `input-display input-display-${side}`;
    this.root.hidden = true;
    parent.append(this.root);
  }

  show(on: boolean): void {
    if (this.root.hidden === !on) return;
    this.root.hidden = !on;
    if (!on) this.clear();
  }

  clear(): void {
    this.log.clear();
  }

  /** Draws the rows if they changed since the last draw. */
  update(): void {
    if (this.root.hidden || this.drawn === this.log.version) return;
    this.drawn = this.log.version;
    this.root.replaceChildren(
      ...this.log.rows.map((r) => {
        const row = document.createElement('div');
        row.className = 'input-row';
        const frames = document.createElement('span');
        frames.className = 'input-frames';
        frames.textContent = String(r.frames);
        const dir = document.createElement('span');
        dir.className = 'input-dir';
        dir.textContent = r.dir;
        row.append(frames, dir, ...r.buttons.map((b) => {
          const s = document.createElement('span');
          s.className = `input-btn input-${b}`;
          s.textContent = b;
          return s;
        }));
        return row;
      }),
    );
  }
}
