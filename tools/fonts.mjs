// The game's three typefaces, subset to the characters it shows: from the
// @fontsource packages (dev dependencies) to public/assets/fonts as woff2,
// with their licences in LICENSES.md (the build appends it to licenses.md).
// Run again after adding text with a character not in KEEP.
//   node tools/fonts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';

/** Printable ASCII, and what the game's text uses beyond it (punctuation, ‹ › round the menu values, the caption marks). */
const KEEP = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '«±·»½×éè–—‘’“”…‹›°';
const FACES = [
  // Display: the logo, show titles and callouts. Rounded, like a 1987 station ident.
  { pkg: 'righteous', file: 'righteous-latin-400-normal.woff2', out: 'display.woff2', name: 'Righteous' },
  // Condensed: names, the HUD, menus. The caption generator's heavy sans.
  { pkg: 'barlow-condensed', file: 'barlow-condensed-latin-600-normal.woff2', out: 'condensed-600.woff2', name: 'Barlow Condensed' },
  { pkg: 'barlow-condensed', file: 'barlow-condensed-latin-800-normal.woff2', out: 'condensed-800.woff2', name: 'Barlow Condensed' },
  // Monospace: numbers, the clock, CH 0, the tape's overlay. A CRT terminal's pixels.
  { pkg: 'vt323', file: 'vt323-latin-400-normal.woff2', out: 'mono.woff2', name: 'VT323' },
];

const licences = ['# Typefaces', '', 'Bundled in public/assets/fonts, subset by tools/fonts.mjs from the @fontsource packages.', ''];
const seen = new Set();
for (const f of FACES) {
  const src = readFileSync(`node_modules/@fontsource/${f.pkg}/files/${f.file}`);
  const out = await subsetFont(src, KEEP, { targetFormat: 'woff2' });
  writeFileSync(`public/assets/fonts/${f.out}`, out);
  console.log(`${f.out}: ${(src.length / 1024).toFixed(1)} KB -> ${(out.length / 1024).toFixed(1)} KB`);
  if (seen.has(f.pkg)) continue;
  seen.add(f.pkg);
  licences.push(`## ${f.name} (@fontsource/${f.pkg})`, '', '```', readFileSync(`node_modules/@fontsource/${f.pkg}/LICENSE`, 'utf8').trim(), '```', '');
}
writeFileSync('public/assets/fonts/LICENSES.md', licences.join('\n'));
