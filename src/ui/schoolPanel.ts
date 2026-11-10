/**
 * Combo School's coach, under training's readout: what to press next and
 * how it's done, a timing bar from the last hit (the guide's moment marked,
 * your press marked as you make it), how the last attempt went, and the
 * clean landings the part still needs. Text is rebuilt only when it changes;
 * the bar's cursor moves every step.
 */
import { REPS, framesText, howLabel, type Coaching, type Cue } from '../game/comboSchool';
import type { TrialTracker } from '../game/trials';

/** Steps the bar spans, from the last hit. */
const SPAN = 40;
/** The press window drawn round the guide's moment: this early, this late. */
const EARLY = 5;
const LATE = 2;

export class SchoolPanel {
  private readonly root: HTMLElement;
  private readonly next: HTMLElement;
  private readonly key: HTMLElement;
  private readonly how: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly window: HTMLElement;
  private readonly cursor: HTMLElement;
  private readonly mark: HTMLElement;
  private readonly reps: HTMLElement;
  private sig = '';
  private cursorAt = -1;
  private held = 0;

  constructor(parent: HTMLElement) {
    this.root = div('school');
    this.root.hidden = true;
    const head = div('school-head');
    this.next = div('school-next');
    this.key = div('school-key');
    this.how = div('school-how');
    this.reps = div('school-reps');
    head.append(this.next, this.key, this.how, this.reps);
    this.tip = div('school-tip');
    this.bar = div('school-bar');
    this.window = div('school-window');
    this.cursor = div('school-cursor');
    this.mark = div('school-mark');
    this.bar.append(this.window, this.mark, this.cursor);
    this.root.append(head, this.tip, this.bar);
    parent.append(this.root);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
    this.sig = '';
    this.cursorAt = -1;
  }

  /** After each frame: the attempt, how its steps are done, the next cue, and P1's input (for marking presses). */
  update(tr: TrialTracker, coach: readonly Coaching[], cue: Cue | null, input: number, pressBits: number, passed: boolean): void {
    const steps = tr.trial.steps;
    const st = tr.state;
    const k = st === 'dropped' ? tr.dropStep : st === 'ready' ? 0 : (cue?.step ?? -1);
    const sig = `${tr.version}|${k}|${passed}`;
    if (sig !== this.sig) {
      this.sig = sig;
      const s = k >= 0 ? steps[k] : null;
      const c = k >= 0 ? coach[k] : null;
      this.reps.textContent = '●'.repeat(Math.min(REPS, tr.clears)) + '○'.repeat(Math.max(0, REPS - tr.clears));
      this.root.classList.toggle('passed', passed);
      this.root.classList.toggle('dropped', st === 'dropped');
      if (st === 'cleared' || (passed && st !== 'going')) {
        this.next.textContent = passed ? 'PASSED' : 'CLEAN';
        this.key.textContent = '';
        this.how.textContent = '';
        this.tip.textContent = passed ? 'pause (Esc) for the next part, or keep going' : `${REPS - tr.clears} more to pass the part`;
      } else if (st === 'dropped' && s && c) {
        const by = tr.miss === 'early' || tr.miss === 'late' ? (tr.missBy ? framesText(tr.missBy) : tr.miss === 'early' ? 'too early' : 'too late') : tr.miss === 'wrong' ? 'wrong move' : 'missed';
        this.next.textContent = 'DROPPED';
        this.key.textContent = s.input;
        this.how.textContent = by.toUpperCase();
        this.tip.textContent = c.tip;
      } else if (s && c) {
        this.next.textContent = st === 'ready' ? 'START' : 'NEXT';
        this.key.textContent = s.input;
        this.how.textContent = howLabel(c.how);
        this.tip.textContent = c.tip;
      } else {
        this.next.textContent = '';
        this.key.textContent = '';
        this.how.textContent = '';
        this.tip.textContent = '';
      }
      // The press window round the guide's moment, while there's a next step to time.
      const timed = st === 'going' && cue !== null;
      this.bar.classList.toggle('off', !timed);
      if (timed) {
        const lo = Math.max(0, cue.at - EARLY);
        const hi = Math.min(SPAN, Math.max(lo + 1, cue.at + LATE));
        this.window.style.left = `${(lo * 100) / SPAN}%`;
        this.window.style.width = `${((hi - lo) * 100) / SPAN}%`;
        this.mark.hidden = true;
      }
    }
    // The cursor: steps since the last hit; a press made now leaves a mark there.
    const since = cue ? tr.sinceHit : -1;
    const x = since < 0 ? -1 : Math.min(SPAN, since);
    if (x !== this.cursorAt) {
      this.cursorAt = x;
      this.cursor.style.left = `${x < 0 ? 0 : (x * 100) / SPAN}%`;
      this.cursor.hidden = x < 0;
    }
    const pressed = input & ~this.held & pressBits;
    this.held = input;
    if (pressed && x >= 0) {
      this.mark.hidden = false;
      this.mark.style.left = `${(x * 100) / SPAN}%`;
    }
  }
}

function div(cls: string): HTMLElement {
  const e = document.createElement('div');
  e.className = cls;
  return e;
}
