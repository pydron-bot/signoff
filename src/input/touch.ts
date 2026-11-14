/**
 * Touch controls for landscape phones: a floating stick on the left half,
 * and on the right the four attack buttons, Special above them, a big Block
 * under the thumb with Throw beside it, drawn as the keys of a TV remote.
 * METER has a key of its own, and tapping the HUD's meter spends it too; the
 * Technical Difficulties button shows only when it can be used. A button
 * with a fighter behind it fades so the fight shows through.
 */
import { Input } from '../sim';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, INTERACT, METER } = Input;
const DEAD = 14;
/** sin 22.5°: an 8-way stick with equal sectors. */
const SECTOR = 0.38;
/** How far (CSS pixels) a fighter must move off a faded button before it fills in again, so it doesn't flicker at the edge. */
const UNFADE_MARGIN = 12;

type Touch = { kind: 'stick'; ox: number; oy: number } | { kind: 'hold'; bit: number };

export class TouchControls {
  readonly root: HTMLElement;
  private readonly touches = new Map<number, Touch>();
  private stickBits = 0;
  private holdBits = new Map<number, number>();
  /** Buttons touched since the last read, so a very quick tap still counts once. */
  private tapped = 0;
  /** What the last step read, so a quick re-tap can be shown as a release first. */
  private last = 0;
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly td: HTMLElement;
  private readonly interact: HTMLElement;
  private readonly pad: HTMLElement;
  private readonly buttons: HTMLElement[] = [];
  /** Each button on screen: left, top, right, bottom in CSS pixels; measured again after a layout change. */
  private boxes = new Float32Array(0);
  private faded = new Uint8Array(0);
  private measured = false;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'touch');
    this.root.hidden = true;
    const zone = el('div', 'touch-stick-zone');
    this.base = el('div', 'touch-stick');
    this.knob = el('div', 'touch-knob');
    this.base.append(this.knob);
    zone.append(this.base);
    this.root.append(zone);

    const pad = el('div', 'touch-pad');
    this.pad = pad;
    const btn = (cls: string, label: string, bit: number, icon = '') => {
      const b = el('div', `touch-btn ${cls}`);
      b.textContent = label;
      // A fist or a foot beside the letters (style.css).
      if (icon) b.dataset.icon = icon;
      this.bindHold(b, bit);
      pad.append(b);
      this.buttons.push(b);
      return b;
    };
    btn('t-special', 'SP', SPECIAL);
    btn('t-fp', 'FP', FP, 'fist');
    btn('t-bp', 'BP', BP, 'fist');
    btn('t-fk', 'FK', FK, 'foot');
    btn('t-bk', 'BK', BK, 'foot');
    btn('t-block', 'BLOCK', BLOCK);
    btn('t-throw', 'THR', THROW);
    this.td = btn('t-td', 'TECH\nDIFF', BLOCK | SPECIAL);
    this.td.hidden = true;
    this.interact = btn('t-interact', 'USE', INTERACT);
    btn('t-meter', 'METER', METER);
    this.interact.hidden = true;
    this.root.append(pad);
    parent.append(this.root);
    this.boxes = new Float32Array(this.buttons.length * 4);
    this.faded = new Uint8Array(this.buttons.length);

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      this.touches.set(e.pointerId, { kind: 'stick', ox: e.clientX, oy: e.clientY });
      this.base.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.base.classList.add('on');
      this.knob.style.transform = '';
    });
    zone.addEventListener('pointermove', (e) => {
      const t = this.touches.get(e.pointerId);
      if (t?.kind !== 'stick') return;
      const dx = e.clientX - t.ox;
      const dy = e.clientY - t.oy;
      const len = Math.hypot(dx, dy);
      let bits = 0;
      if (len > DEAD) {
        const nx = dx / len;
        const ny = dy / len;
        if (nx > SECTOR) bits |= RIGHT;
        if (nx < -SECTOR) bits |= LEFT;
        if (ny > SECTOR) bits |= DOWN;
        if (ny < -SECTOR) bits |= UP;
      }
      this.stickBits = bits;
      const k = Math.min(len, 40) / (len || 1);
      this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    });
    const endStick = (e: PointerEvent) => {
      if (this.touches.get(e.pointerId)?.kind !== 'stick') return;
      this.touches.delete(e.pointerId);
      this.stickBits = 0;
      this.base.classList.remove('on');
    };
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);
  }

  /** Holds `bit` while a finger is on the element (also used for the HUD meter). */
  bindHold(target: HTMLElement, bit: number): void {
    target.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      target.setPointerCapture(e.pointerId);
      this.holdBits.set(e.pointerId, bit);
      this.tapped |= bit;
      target.classList.add('down');
    });
    const up = (e: PointerEvent) => {
      if (!this.holdBits.delete(e.pointerId)) return;
      target.classList.remove('down');
    };
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  input(): number {
    let bits = this.stickBits | this.tapped;
    for (const b of this.holdBits.values()) bits |= b;
    // A tap on a button that still read as held (lifted and touched again within one frame) would never
    // register as a press: show it released for this step and pressed on the next.
    const again = this.tapped & this.last;
    bits &= ~again;
    this.tapped = again;
    this.last = bits;
    return bits;
  }

  show(on: boolean): void {
    this.root.hidden = !on;
    this.measured = false;
    if (!on) this.clear();
  }

  get shown(): boolean {
    return !this.root.hidden;
  }

  /** The screen or the buttons' size or side changed: measure them again. */
  relayout(): void {
    this.measured = false;
  }

  /** The buttons' share of the screen's width: positive on the right, negative on the left, 0 when hidden. */
  share(): number {
    const w = window.innerWidth;
    const r = this.pad.getBoundingClientRect();
    if (this.root.hidden || !w || !r.width) return 0;
    return (r.left + r.right > w ? 1 : -1) * Math.min(1, r.width / w);
  }

  /** Fades the buttons a fighter is behind, so the fight shows through; `rects` as Arena.screenRects gives them. */
  fadeOver(rects: Float32Array): void {
    if (this.root.hidden) return;
    if (!this.measured) this.measure();
    for (let i = 0; i < this.buttons.length; i++) {
      const was = this.faded[i] === 1;
      const now = !this.buttons[i].hidden && overBody(this.boxes, i * 4, rects, was ? UNFADE_MARGIN : 0);
      if (now === was) continue;
      this.faded[i] = now ? 1 : 0;
      this.buttons[i].classList.toggle('clear', now);
    }
  }

  private measure(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const r = this.buttons[i].getBoundingClientRect();
      this.boxes.set([r.left, r.top, r.right, r.bottom], i * 4);
    }
    this.measured = true;
  }

  setTD(on: boolean): void {
    if (this.td.hidden !== on) return;
    this.td.hidden = !on;
    this.measured = false;
  }

  /** The Interact button appears only near something to use. */
  setInteract(on: boolean): void {
    if (this.interact.hidden !== on) return;
    this.interact.hidden = !on;
    this.measured = false;
  }

  clear(): void {
    this.touches.clear();
    this.holdBits.clear();
    this.stickBits = 0;
    this.tapped = 0;
    this.last = 0;
    this.base.classList.remove('on');
    for (const b of this.root.querySelectorAll('.down')) b.classList.remove('down');
  }
}

/**
 * Does the box at `boxes[o..o+3]` (left, top, right, bottom), grown by
 * `margin` pixels, meet either fighter's rect in `rects` (two of them, the
 * same way round)? An empty rect meets nothing.
 */
export function overBody(boxes: ArrayLike<number>, o: number, rects: ArrayLike<number>, margin: number): boolean {
  for (let i = 0; i < rects.length; i += 4) {
    if (rects[i + 2] <= rects[i]) continue;
    if (boxes[o] - margin < rects[i + 2] && rects[i] < boxes[o + 2] + margin && boxes[o + 1] - margin < rects[i + 3] && rects[i + 1] < boxes[o + 3] + margin) return true;
  }
  return false;
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
