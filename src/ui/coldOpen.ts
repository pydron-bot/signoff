/**
 * The cold open before round 1: each fighter's line types on in a caption
 * on their side of the screen, with their voice babbling under it, then
 * the match goes on air. Any button (or a tap) skips it. Runs on display
 * time: the match isn't stepped while it plays.
 */
import { FIGHTER_COLORS } from '../core/fighterLook';
import { lineSeconds, TYPE_RATE, type Exchange } from '../game/banter';
import { fighterData } from '../sim';

/** Seconds of the empty studio before the first line, and after the last. */
const LEAD = 0.5;
const TAIL = 0.5;
/** A syllable every this many characters typed. */
const SYLLABLE = 3;

export class ColdOpen {
  readonly root: HTMLElement;
  private readonly plates: HTMLElement[] = [];
  private readonly texts: HTMLElement[] = [];
  private fighters: [string, string] = ['', ''];
  private ex: Exchange | null = null;
  private t = 0;
  private typed = [0, 0];

  constructor(
    parent: HTMLElement,
    /** A syllable from this side. */
    private readonly babble: (side: number, fighter: string) => void,
    onSkip: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'cold-open';
    this.root.hidden = true;
    for (let i = 0; i < 2; i++) {
      const plate = document.createElement('div');
      plate.className = `cold-open-plate cold-open-${i}`;
      const name = document.createElement('div');
      name.className = 'cold-open-name';
      const text = document.createElement('div');
      text.className = 'cold-open-line';
      plate.append(name, text);
      this.root.append(plate);
      this.plates.push(plate);
      this.texts.push(text);
    }
    const hint = document.createElement('div');
    hint.className = 'cold-open-skip';
    hint.textContent = 'ANY BUTTON TO SKIP';
    this.root.append(hint);
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onSkip();
    });
    parent.append(this.root);
  }

  get active(): boolean {
    return this.ex !== null;
  }

  begin(p1: string, p2: string, ex: Exchange): void {
    this.fighters = [p1, p2];
    this.ex = ex;
    this.t = 0;
    this.typed = [0, 0];
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i];
      this.plates[i].style.setProperty('--accent', `#${(FIGHTER_COLORS[f] ?? 0xcccccc).toString(16).padStart(6, '0')}`);
      this.plates[i].querySelector('.cold-open-name')!.textContent = fighterData(f).name.toUpperCase();
      this.texts[i].textContent = '';
      this.plates[i].classList.remove('in');
    }
    this.root.hidden = false;
  }

  end(): void {
    this.ex = null;
    this.root.hidden = true;
  }

  /** Advances by `dt` seconds; returns false once it's over. */
  update(dt: number): boolean {
    const ex = this.ex;
    if (!ex) return false;
    this.t += dt;
    const first = lineSeconds(ex.lines[0]);
    const second = lineSeconds(ex.lines[1]);
    const at = [LEAD, LEAD + first];
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? ex.first : 1 - ex.first;
      const line = ex.lines[k];
      const since = this.t - at[k];
      const shown = since >= 0 && since < (k === 0 ? first + second : second) + TAIL;
      this.plates[side].classList.toggle('in', shown);
      if (since < 0) continue;
      const n = Math.min(line.length, Math.floor(since * TYPE_RATE));
      if (n > this.typed[k]) {
        // A syllable for every few letters typed (not for spaces and punctuation).
        for (let c = this.typed[k]; c < n; c++) if (c % SYLLABLE === 0 && /\w/.test(line[c])) this.babble(side, this.fighters[side]);
        this.typed[k] = n;
        this.texts[side].textContent = line.slice(0, n);
      }
    }
    if (this.t >= LEAD + first + second + TAIL) {
      this.end();
      return false;
    }
    return true;
  }
}
