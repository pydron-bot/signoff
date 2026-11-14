// A contact sheet of the game round the fight, on the desktop and iPhone 15
// Pro profiles: the title and each of its lists, the fighter select, the
// versus card, a fight with the meter empty, at one bar and full, a K.O.
// in its slow motion, and the results. Reaches each through the ?shots hook
// (src/game/shotHook.ts); whatever a build's hook can't show is left out, so
// an older build makes the "before" sheet. Writes each shot and
// screens-desktop.png, screens-iphone.png to --out.
//   PLAYWRIGHT=/opt/node-tools node tools/screens.mjs --out /tmp/screens [--dist <other build>] [--no-build]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { launch, playwright, serve } from './pw.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(arg('--out', 'screens-out'));
const DIST = path.resolve(arg('--dist', path.join(OUT, 'dist')));
const PORT = 4194;
const URL = `http://localhost:${PORT}/?shots`;
mkdirSync(OUT, { recursive: true });

const { devices } = await playwright();
const PROFILES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  iphone: { ...devices['iPhone 15 Pro landscape'], viewport: { width: 852, height: 393 } },
};
/** The title's lists, by the id of the row that opens each. */
const LISTS = ['title-fight', 'title-learn', 'title-watch', 'title-settings'];

if (!process.argv.includes('--no-build') && !process.argv.includes('--dist')) execSync(`npx vite build --outDir ${JSON.stringify(DIST)} --emptyOutDir`, { stdio: 'inherit' });
const server = await serve(DIST, PORT);
const browser = await launch();
let failed = false;
try {
  for (const [profile, opts] of Object.entries(PROFILES)) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('signoff.setup', JSON.stringify({ sound: 2, models: 0, studio: 0, p1: 1, p2: 5, stage: 1 }));
      localStorage.setItem('signoff.settings', JSON.stringify({ vhs: 2, motion: 2, perf: 0 }));
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => ((failed = true), console.log(`pageerror: ${e.message}`)));
    const cells = [];
    const shot = async (name) => {
      const file = path.join(OUT, `${profile}-${name}.png`);
      await page.screenshot({ path: file });
      cells.push({ label: name, file, vp: opts.viewport });
      console.log(`${profile} ${name}`);
    };
    await page.goto(URL);
    await page.waitForFunction(() => window.__shots, null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    await shot('title');
    for (const id of LISTS) {
      if (!(await page.$(`#${id}`))) continue;
      await page.click(`#${id}`);
      await page.waitForTimeout(400);
      await shot(id.replace('title-', 'title · '));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    const has = (fn) => page.evaluate((f) => typeof window.__shots[f] === 'function', fn);
    if (await has('screen')) {
      for (const name of ['select', 'versus']) {
        await page.evaluate((n) => window.__shots.screen(n), name);
        await page.waitForTimeout(1200);
        await page.evaluate(() => window.__shots.frame());
        await shot(name);
      }
    }
    // The fight's HUD: the meter empty, at one bar, full.
    await page.evaluate(() => window.__shots.start({ mode: 'cpu', p1: 'rox', p2: 'gus', stage: 'burn', seed: 9 }));
    await page.evaluate(() => window.__shots.to('start', 90));
    // The push in through the title's TV runs on display time.
    await page.waitForTimeout(2000);
    for (const [name, bars] of [['fight · meter 0', 0], ['fight · meter 1', 1], ['fight · meter full', 3]]) {
      if (bars > 0 && !(await has('meter'))) continue;
      if (await has('meter')) await page.evaluate((b) => window.__shots.meter(b), bars);
      await page.evaluate(() => window.__shots.frame());
      await shot(name);
    }
    await page.evaluate(() => window.__shots.start({ mode: 'watch', p1: 'rox', p2: 'gus', stage: 'burn', seed: 9 }));
    for (const after of [3, 20]) {
      await page.evaluate((a) => window.__shots.to('ko', a), after);
      await page.evaluate(() => window.__shots.frame());
      await shot(`ko +${after}`);
      await page.evaluate(() => window.__shots.start({ mode: 'watch', p1: 'rox', p2: 'gus', stage: 'burn', seed: 9 }));
    }
    if (await has('screen')) {
      await page.evaluate(() => window.__shots.screen('results'));
      await page.waitForTimeout(1500);
      await shot('results');
    }
    await ctx.close();
    await sheet(profile, cells);
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);

async function sheet(profile, cells) {
  const w = 480;
  const cols = 4;
  const page = await browser.newPage({ viewport: { width: w * cols + 8 * (cols + 1), height: 400 } });
  const imgs = cells
    .map((c) => `<figure><img src="data:image/png;base64,${readFileSync(c.file).toString('base64')}" width="${w}" height="${Math.round((w * c.vp.height) / c.vp.width)}"><figcaption>${c.label}</figcaption></figure>`)
    .join('');
  await page.setContent(`<style>body{margin:0;padding:8px;background:#111;color:#ddd;font:12px monospace}main{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:8px}figure{margin:0}img{display:block}</style><main>${imgs}</main>`);
  await page.screenshot({ path: path.join(OUT, `screens-${profile}.png`), fullPage: true });
  await page.close();
}
