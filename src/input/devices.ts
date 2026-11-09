/**
 * The keyboard and gamepads, read once per simulation step. Menu
 * navigation reads the same devices through `menuPresses`.
 */
import { applyChords, cleanDirections, keyBits, keyboardChords, padBits, padChords, type Chord } from './map';

const held = new Set<string>();
/** Keys pressed since the last read: a tap shorter than a frame still counts once. */
const tapped = new Set<string>();
const pressedOnce: string[] = [];

export function initKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!e.repeat) pressedOnce.push(e.code);
    held.add(e.code);
    tapped.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  // A key released while the tab was hidden never sends keyup.
  const clear = () => {
    held.clear();
    tapped.clear();
  };
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
}

const kbChords = keyboardChords();
const padChordSets: Chord[][] = [padChords(), padChords(), padChords(), padChords()];

export function keyboardInput(): number {
  const bits = keyBits(held) | keyBits(tapped);
  tapped.clear();
  return cleanDirections(applyChords(kbChords, bits));
}

// Read several times a frame: refilled in place, so polling allocates nothing of ours.
const connected: Gamepad[] = [];

function pads(): Gamepad[] {
  connected.length = 0;
  const list = navigator.getGamepads?.();
  if (list) for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p && p.connected) connected.push(p);
  }
  return connected;
}

export function padCount(): number {
  return pads().length;
}

/** Input from the n-th connected pad (0 if there isn't one). */
export function padInput(n: number): number {
  const p = pads()[n];
  if (!p) return 0;
  return cleanDirections(applyChords(padChordSets[p.index % 4], padBits(p)));
}

/** Menu actions since the last call: keys plus gamepad edges. */
export type MenuKey = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'pause';
const padPrev = new Map<number, number>();

/** Reused every call: read it before the next. */
const menuOut: MenuKey[] = [];

export function menuPresses(): readonly MenuKey[] {
  const out = menuOut;
  out.length = 0;
  for (let i = 0; i < pressedOnce.length; i++) {
    const k = KEY_MENU[pressedOnce[i]];
    if (k) out.push(k);
  }
  pressedOnce.length = 0;
  for (const p of pads()) {
    let now = 0;
    for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].pressed) now |= 1 << i;
    const x = p.axes[0] ?? 0;
    const y = p.axes[1] ?? 0;
    if (y < -0.6) now |= 1 << 12;
    if (y > 0.6) now |= 1 << 13;
    if (x < -0.6) now |= 1 << 14;
    if (x > 0.6) now |= 1 << 15;
    const edge = now & ~(padPrev.get(p.index) ?? 0);
    padPrev.set(p.index, now);
    if (edge & (1 << 12)) out.push('up');
    if (edge & (1 << 13)) out.push('down');
    if (edge & (1 << 14)) out.push('left');
    if (edge & (1 << 15)) out.push('right');
    if (edge & 1) out.push('ok');
    if (edge & 2) out.push('back');
    if (edge & (1 << 9)) out.push('pause');
  }
  return out;
}

const KEY_MENU: Readonly<Record<string, MenuKey>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Enter: 'ok',
  KeyU: 'ok',
  Space: 'ok',
  Backspace: 'back',
  Escape: 'pause',
  KeyP: 'pause',
};
