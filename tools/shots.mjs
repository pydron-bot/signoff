// A contact sheet of the same moments on every stage, for judging a look
// release before and after: a round start, a heavy hit, Technical
// Difficulties at low health and a KO, from fixed seeds, on the desktop and
// iPhone 15 Pro profiles. Builds the game to a folder of its own, serves it,
// and reaches each moment through the ?shots hook (src/game/shotHook.ts),
// which steps the match without drawing. Writes each shot and one sheet per
// profile (sheet-desktop.png, sheet-iphone.png) to --out.
//   PLAYWRIGHT=/opt/node-tools node tools/shots.mjs --out /tmp/shots [--no-build] [--stages weather,burn]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { launch, playwright, serve } from './pw.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(arg('--out', 'shots-out'));
// --dist: an existing build (another checkout's, for the "before" sheet) instead of building this one.
const DIST = path.resolve(arg('--dist', path.join(OUT, 'dist')));
const PORT = 4197;
const URL = `http://localhost:${PORT}/?shots`;
mkdirSync(OUT, { recursive: true });

/** Each stage with a fixed pairing and seed. */
const ALL = [
  { stage: 'weather', p1: 'dale', p2: 'mumbles', seed: 101 },
  { stage: 'burn', p1: 'rox', p2: 'hollis', seed: 202 },
  { stage: 'news', p1: 'margaret', p2: 'gideon', seed: 303 },
  { stage: 'kitchen', p1: 'gus', p2: 'gideon', seed: 404 },
];
const only = arg('--stages', '');
const STAGES = only ? ALL.filter((s) => only.split(',').includes(s.stage)) : ALL;
/** The moments: how the match is played to them, and steps after. */
const MOMENTS = [
  { name: 'start', mode: 'watch', after: 30 },
  { name: 'heavy', mode: 'watch', after: 2 },
  { name: 'td', mode: 'cpu', after: 10 },
  { name: 'ko', mode: 'watch', after: 20 },
];

const { devices } = await playwright();
const PROFILES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  iphone: { ...devices['iPhone 15 Pro landscape'], viewport: { width: 852, height: 393 } },
};

if (!process.argv.includes('--no-build') && !process.argv.includes('--dist')) execSync(`npx vite build --outDir ${JSON.stringify(DIST)} --emptyOutDir`, { stdio: 'inherit' });
const server = await serve(DIST, PORT);
const browser = await launch();
let failed = false;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const [profile, opts] of Object.entries(PROFILES)) {
    const ctx = await browser.newContext(opts);
    // CPU VS CPU at NORMAL, models, no sound; the full VHS look.
    await ctx.addInitScript(() => {
      localStorage.setItem('signoff.setup', JSON.stringify({ watch1: 1, watch2: 1, sound: 2, models: 0, studio: 0 }));
      localStorage.setItem('signoff.settings', JSON.stringify({ vhs: 2, motion: 2, perf: 0 }));
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => ((failed = true), console.log(`pageerror: ${e.message}`)));
    await page.goto(URL);
    await page.waitForFunction(() => window.__shots, null, { timeout: 60000 });
    const cells = [];
    for (const s of STAGES) {
      for (const mo of MOMENTS) {
        await page.evaluate((o) => window.__shots.start(o), { mode: mo.mode, p1: s.p1, p2: s.p2, stage: s.stage, seed: s.seed });
        const ok = await page.evaluate(([m, a]) => window.__shots.to(m, a), [mo.name, mo.after]);
        await page.evaluate(() => window.__shots.frame());
        await page.evaluate(() => window.__shots.frame());
        const calls = await page.evaluate(() => window.__shots.calls());
        const file = path.join(OUT, `${profile}-${s.stage}-${mo.name}.png`);
        await page.screenshot({ path: file });
        console.log(`${profile} ${s.stage} ${mo.name}: ${ok ? '' : '(moment not reached) '}${calls} draw calls`);
        cells.push({ label: `${s.stage} · ${mo.name}${ok ? '' : ' (not reached)'} · ${calls} calls`, file });
      }
    }
    await ctx.close();
    await sheet(profile, cells, opts.viewport);
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);

/** One sheet a profile: a row a stage, a column a moment. */
async function sheet(profile, cells, vp) {
  const w = 480;
  const h = Math.round((w * vp.height) / vp.width);
  const page = await browser.newPage({ viewport: { width: w * MOMENTS.length + 8 * (MOMENTS.length + 1), height: 400 } });
  const imgs = cells
    .map((c) => `<figure><img src="data:image/png;base64,${readFileSync(c.file).toString('base64')}" width="${w}" height="${h}"><figcaption>${c.label}</figcaption></figure>`)
    .join('');
  await page.setContent(
    `<style>body{margin:0;padding:8px;background:#111;color:#ddd;font:12px monospace}main{display:grid;grid-template-columns:repeat(${MOMENTS.length},${w}px);gap:8px}figure{margin:0}img{display:block}</style><main>${imgs}</main>`,
  );
  await page.screenshot({ path: path.join(OUT, `sheet-${profile}.png`), fullPage: true });
  await page.close();
}
