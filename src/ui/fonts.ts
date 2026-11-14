/**
 * The game's three typefaces (public/assets/fonts, made by tools/fonts.mjs):
 * a rounded display face for the logo, show titles and callouts, a heavy
 * condensed face for names, the HUD and menus, and a CRT monospace for
 * numbers, the clock and the tape's overlay. Registered from script so their
 * address goes through publicUrl, swapped in when they arrive; the title
 * waits for them (a moment at most) so it doesn't jump. The CSS names them
 * by the families below (style.css, --font-*).
 */
import { publicUrl } from '../core/paths';

const FACES: readonly { family: string; file: string; weight: string }[] = [
  { family: 'SignOff Display', file: 'display.woff2', weight: '400' },
  { family: 'SignOff Condensed', file: 'condensed-600.woff2', weight: '600' },
  { family: 'SignOff Condensed', file: 'condensed-800.woff2', weight: '800' },
  { family: 'SignOff Mono', file: 'mono.woff2', weight: '400' },
];
/** The longest the title waits for them. */
const WAIT_MS = 1200;

/** Starts loading the faces now; resolves when they're in, or after WAIT_MS, whichever is first (never rejects). */
export function loadFonts(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return Promise.resolve();
  const loads = FACES.map((f) => {
    const url = publicUrl(`assets/fonts/${f.file}`);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.append(link);
    const face = new FontFace(f.family, `url(${url}) format('woff2')`, { weight: f.weight, display: 'swap' });
    document.fonts.add(face);
    return face.load().catch(() => undefined);
  });
  return Promise.race([Promise.all(loads).then(() => undefined), new Promise<void>((r) => setTimeout(r, WAIT_MS))]);
}
