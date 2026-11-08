/**
 * Touch controls for landscape phones: a floating stick on the left half,
 * and on the right the four attack buttons, Special above them, a big Block
 * under the thumb with Throw beside it. Tapping the meter spends it; the
 * Technical Difficulties button shows only when it can be used.
 */
import { Input } from '../sim';

const { UP, DOWN, LEFT, RIGHT, FP, BP, FK, BK, BLOCK, SPECIAL, THROW, INTERACT } = Input;
const DEAD = 14;
/** sin 22.5°: an 8-way stick with equal sectors. */
const SECTOR = 0.38;

type Touch = { kind: 'stick'; ox: number; oy: number } | { kind: 'hold'; bit: number };

export class TouchControls {
  readonly root: HTMLElement;
  private readonly touches = new Map<number, Touch>();
  private stickBits = 0;
  private holdBits = new Map<number, number>();
  /** Buttons touched since the last read, so a very quick tap still counts once. */
  private tapped = 0;
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly td: HTMLElement;
  private readonly interact: HTMLElement;

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
    const btn = (cls: string, label: string, bit: number) => {
      const b = el('div', `touch-btn ${cls}`);
      b.textContent = label;
      this.bindHold(b, bit);
      pad.append(b);
      return b;
    };
    btn('t-special', 'SP', SPECIAL);
    btn('t-fp', 'FP', FP);
    btn('t-bp', 'BP', BP);
    btn('t-fk', 'FK', FK);
    btn('t-bk', 'BK', BK);
    btn('t-block', 'BLOCK', BLOCK);
    btn('t-throw', 'THR', THROW);
    this.td = btn('t-td', 'TECH\nDIFF', BLOCK | SPECIAL);
    this.td.hidden = true;
    this.interact = btn('t-interact', 'USE', INTERACT);
    this.interact.hidden = true;
    this.root.append(pad);
    parent.append(this.root);

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
    this.tapped = 0;
    for (const b of this.holdBits.values()) bits |= b;
    return bits;
  }

  show(on: boolean): void {
    this.root.hidden = !on;
    if (!on) this.clear();
  }

  setTD(on: boolean): void {
    if (this.td.hidden === on) this.td.hidden = !on;
  }

  /** The Interact button appears only near something to use. */
  setInteract(on: boolean): void {
    if (this.interact.hidden === on) this.interact.hidden = !on;
  }

  clear(): void {
    this.touches.clear();
    this.holdBits.clear();
    this.stickBits = 0;
    this.tapped = 0;
    this.base.classList.remove('on');
    for (const b of this.root.querySelectorAll('.down')) b.classList.remove('down');
  }
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
