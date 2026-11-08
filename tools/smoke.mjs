// Smoke test: builds for /signoff/, serves dist, and loads the game on
// desktop and the iPhone 15 Pro landscape profile, then starts a fight
// against the CPU and lets it run, failing on any page error, a blank
// canvas or a HUD that never appears. Screenshots land in smoke-out/.
//   npx -y -p playwright@1.63.0 node tools/smoke.mjs
import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { launch, playwright } from './pw.mjs';

const { devices } = await playwright();

const PORT = 4199;
const URL = `http://localhost:${PORT}/signoff/`;
mkdirSync('smoke-out', { recursive: true });

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, SIGNOFF_BASE: '/signoff/' } });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  env: { ...process.env, SIGNOFF_BASE: '/signoff/' },
  stdio: 'ignore',
});

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  '852x393': { ...devices['iPhone 15 Pro landscape'], viewport: { width: 852, height: 393 } },
};

let failed = false;
const browser = await launch();
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const [name, opts] of Object.entries(PROFILES)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(URL);
    await page.waitForTimeout(1500);
    const version = await page.textContent('#version');
    // Any lit pixel in the canvas means three.js drew the card.
    // Any lit pixel in the canvas means three.js drew the card. Read inside
    // a frame, after the game's own callback has drawn: between frames the
    // WebGL buffer reads back empty.
    const drew = await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => {
            const c = document.querySelector('#app canvas');
            if (!c) return resolve(false);
            const t = document.createElement('canvas');
            t.width = 64;
            t.height = 36;
            const g = t.getContext('2d');
            g.drawImage(c, 0, 0, 64, 36);
            const d = g.getImageData(0, 0, 64, 36).data;
            for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) return resolve(true);
            resolve(false);
          }),
        ),
    );
    await page.screenshot({ path: `smoke-out/${name}.png` });
    // Into a fight: the HUD shows and the clock runs.
    await page.click('#play-cpu');
    await page.waitForTimeout(4000);
    const hud = await page.isVisible('.hud');
    const clock = await page.textContent('.hud-clock');
    await page.screenshot({ path: `smoke-out/${name}-fight.png` });
    const fought = hud && /^0:\d\d$/.test(clock ?? '');
    const ok = errors.length === 0 && drew && fought && /^v\d/.test(version ?? '');
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}  ${version}${drew ? '' : '  (blank canvas)'}${fought ? '' : '  (no fight)'}`);
    for (const e of errors) console.log(`     ${e}`);
    failed ||= !ok;
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
