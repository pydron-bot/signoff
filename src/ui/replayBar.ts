/**
 * The replay controls along the bottom: back to the start, back and forward
 * 5 seconds, play and pause, speed, a scrubber and exit. It only reports
 * what was pressed; main.ts does it.
 */
import { STEPS_PER_SECOND } from '../sim/constants';

export type ReplayAction = 'restart' | 'back' | 'forward' | 'toggle' | 'speed' | 'exit';
export const SPEEDS: readonly number[] = [1, 2, 0.5];

export class ReplayBar {
  readonly root: HTMLElement;
  /** A button was pressed. */
  onAction: (a: ReplayAction) => void = () => {};
  /** The scrubber was dragged to step `frame`. */
  onSeek: (frame: number) => void = () => {};
  private readonly play: HTMLButtonElement;
  private readonly speed: HTMLButtonElement;
  private readonly scrub: HTMLInputElement;
  private readonly time: HTMLElement;
  private dragging = false;
  private shown = [-1, -1, -1, -1];

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'replay-bar';
    this.root.hidden = true;
    const tag = document.createElement('div');
    tag.className = 'replay-tag';
    tag.textContent = '● REPLAY';
    const button = (label: string, a: ReplayAction, title: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `replay-btn replay-${a}`;
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', () => this.onAction(a));
      return b;
    };
    this.play = button('❚❚', 'toggle', 'Play / pause (Space)');
    this.speed = button('1×', 'speed', 'Speed (S)');
    this.scrub = document.createElement('input');
    this.scrub.type = 'range';
    this.scrub.className = 'replay-scrub';
    this.scrub.min = '0';
    this.scrub.step = '1';
    this.scrub.addEventListener('input', () => {
      this.dragging = true;
      this.onSeek(Number(this.scrub.value));
    });
    this.scrub.addEventListener('change', () => (this.dragging = false));
    this.time = document.createElement('div');
    this.time.className = 'replay-time';
    this.root.append(
      tag,
      button('⏮', 'restart', 'From the start (Home)'),
      button('«5', 'back', 'Back 5 seconds (←)'),
      this.play,
      button('5»', 'forward', 'Forward 5 seconds (→)'),
      this.speed,
      this.scrub,
      this.time,
      button('✕', 'exit', 'Exit (Esc)'),
    );
    parent.append(this.root);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  /** Every displayed frame; touches the DOM only when something changed. */
  update(frame: number, frames: number, paused: boolean, speed: number): void {
    // A tenth of a second is fine enough for the scrubber.
    const s = this.shown;
    const tick = Math.floor(frame / 6);
    const p = paused ? 1 : 0;
    if (s[0] === tick && s[1] === frames && s[2] === p && s[3] === speed) return;
    s[0] = tick;
    s[1] = frames;
    s[2] = p;
    s[3] = speed;
    this.play.textContent = paused ? '▶' : '❚❚';
    this.speed.textContent = speed === 0.5 ? '½×' : `${speed}×`;
    this.scrub.max = String(frames);
    if (!this.dragging) this.scrub.value = String(frame);
    this.time.textContent = `${clock(frame)} / ${clock(frames)}`;
  }
}

function clock(steps: number): string {
  const s = Math.floor(steps / STEPS_PER_SECOND);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
