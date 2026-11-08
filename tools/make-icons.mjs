// Renders the PWA icons: a Channel 0 test card (colour bars under a "0").
// Placeholder art until there are fighters to put on it.
//   npx -y -p playwright@1.63.0 node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { launch } from './pw.mjs';

const OUT = new URL('../public/icons/', import.meta.url);
const BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];

/** The card at `size` px; maskable art keeps the "0" inside the 80% safe circle. */
function svg(size, maskable) {
  const w = 100 / BARS.length;
  const bars = BARS.map((c, i) => `<rect x="${i * w}" y="0" width="${w + 0.2}" height="100" fill="${c}"/>`).join('');
  const r = maskable ? 26 : 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#0b0b0f"/>${bars}
    <rect width="100" height="100" fill="#0b0b0f" opacity="0.25"/>
    <circle cx="50" cy="50" r="${r}" fill="#0b0b0f" stroke="#f1ede0" stroke-width="3"/>
    <text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="Menlo, monospace" font-weight="800"
      font-size="${r * 1.35}" fill="#f1ede0">0</text>
  </svg>`;
}

const ICONS = [
  ['favicon-32.png', 32, false],
  ['apple-touch-icon.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
];

const browser = await launch();
const page = await browser.newPage();
for (const [name, size, maskable] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size, maskable)}</body>`);
  writeFileSync(new URL(name, OUT), await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
  console.log(name);
}
await browser.close();
