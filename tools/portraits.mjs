// Each fighter's face, neutral, hurt and winning, rendered from their GLB in
// three.js with the game's shading (src/render/portrait.ts, through the
// ?shots hook) to small webp files in public/assets/portraits: <id>.webp,
// <id>-hurt.webp, <id>-win.webp. Run again after the models change.
//   PLAYWRIGHT=/opt/node-tools node tools/portraits.mjs [--no-build]
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, serve } from './pw.mjs';

const OUT = 'public/assets/portraits';
const DIST = path.resolve(process.env.TMPDIR ?? '/tmp', 'signoff-portraits-dist');
const PORT = 4193;
const FIGHTERS = readdirSync('public/assets/fighters').filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
mkdirSync(OUT, { recursive: true });

if (!process.argv.includes('--no-build')) execSync(`npx vite build --outDir ${JSON.stringify(DIST)} --emptyOutDir`, { stdio: 'inherit' });
const server = await serve(DIST, PORT);
const browser = await launch();
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', (e) => ((failed = true), console.log(`pageerror: ${e.message}`)));
  await page.goto(`http://localhost:${PORT}/?shots`);
  await page.waitForFunction(() => window.__shots, null, { timeout: 60000 });
  for (const id of FIGHTERS)
    for (const mood of ['neutral', 'hurt', 'win']) {
      const url = await page.evaluate(([f, m]) => window.__shots.portrait(f, m), [id, mood]);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      const file = path.join(OUT, `${id}${mood === 'neutral' ? '' : `-${mood}`}.webp`);
      writeFileSync(file, buf);
      console.log(`${file}: ${(buf.length / 1024).toFixed(1)} KB`);
    }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
