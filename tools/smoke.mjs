// Smoke test: builds for /signoff/, serves dist, and loads the game on
// desktop and the iPhone 15 Pro landscape profile, then starts a fight
// against the CPU and lets it run, failing on any page error, a blank
// canvas or a HUD that never appears (title, FIGHT, VS CPU, the fighter
// select, START, the versus card, the cold open, the fight), and a whole
// match played out to the results screen. Then it plays scripted moments on
// Burn (mirrors: the most drawn) through the ?shots hook
// (src/game/shotHook.ts) and fails if the busiest frame draws more than the
// iPhone budget of 100 calls. Screenshots land in smoke-out/.
//   npx -y -p playwright@1.63.0 node tools/smoke.mjs
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { launch, playwright, serve } from './pw.mjs';

const { devices } = await playwright();

const PORT = 4199;
const URL = `http://localhost:${PORT}/signoff/`;
mkdirSync('smoke-out', { recursive: true });

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, SIGNOFF_BASE: '/signoff/' } });
const server = await serve('dist', PORT, { SIGNOFF_BASE: '/signoff/' });

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  '852x393': { ...devices['iPhone 15 Pro landscape'], viewport: { width: 852, height: 393 } },
};

/** The iPhone budget (CLAUDE.md), and the moments that draw the most: Burn's first segment has the mirrors. */
const DRAW_CALL_BUDGET = 100;
const BUSY = [
  ['burn', 'start', 30],
  ['burn', 'heavy', 1],
  ['burn', 'td', 8],
  ['burn', 'ko', 3],
];

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
    // Title, FIGHT, VS CPU: the fighter select.
    await page.click('#title-fight');
    await page.click('#play-cpu');
    await page.waitForTimeout(800);
    const selected = await page.isVisible('.select-card-0');
    await page.screenshot({ path: `smoke-out/${name}-select.png` });
    // START: the versus card, then (a tap skips it) the cold open.
    await page.click('#select-start');
    await page.waitForTimeout(300);
    const versus = await page.isVisible('.versus');
    await page.screenshot({ path: `smoke-out/${name}-versus.png` });
    if (versus) await page.click('.versus');
    // The cold open: the two fighters' lines, then a tap skips the rest.
    await page.waitForTimeout(2500);
    const opened = await page.isVisible('.cold-open');
    await page.screenshot({ path: `smoke-out/${name}-cold-open.png` });
    if (opened) await page.click('.cold-open');
    await page.waitForTimeout(4000);
    const hud = await page.isVisible('.hud');
    const clock = await page.textContent('.hud-clock');
    await page.screenshot({ path: `smoke-out/${name}-fight.png` });
    const fought = selected && versus && opened && hud && /^0:\d\d$/.test(clock ?? '');
    // The draw-call budget, in the busiest scripted frames.
    await page.goto(`${URL}?shots`);
    await page.waitForFunction(() => window.__shots, null, { timeout: 60000 });
    let worst = { calls: 0, at: '' };
    for (const [stage, moment, after] of BUSY) {
      await page.evaluate((o) => window.__shots.start(o), { mode: 'cpu', p1: 'rox', p2: 'gideon', stage, seed: 5 });
      await page.evaluate(([m, a]) => window.__shots.to(m, a), [moment, after]);
      await page.evaluate(() => window.__shots.frame());
      const calls = await page.evaluate(() => window.__shots.calls());
      if (calls > worst.calls) worst = { calls, at: `${stage} ${moment}` };
    }
    await page.screenshot({ path: `smoke-out/${name}-busiest.png` });
    // A whole match played out, to the results.
    await page.evaluate(() => window.__shots.screen('results'));
    await page.waitForTimeout(800);
    const results = (await page.isVisible('.results-figures')) && (await page.isVisible('#results-title'));
    await page.screenshot({ path: `smoke-out/${name}-results.png` });
    const budget = worst.calls > 0 && worst.calls <= DRAW_CALL_BUDGET;
    const ok = errors.length === 0 && drew && fought && results && budget && /^v\d/.test(version ?? '');
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}  ${version}${drew ? '' : '  (blank canvas)'}${fought ? '' : `  (no fight: select ${selected}, versus ${versus}, cold open ${opened}, hud ${hud})`}${results ? '' : '  (no results)'}  busiest frame ${worst.calls} draw calls (${worst.at})${budget ? '' : ` over ${DRAW_CALL_BUDGET}`}`);
    for (const e of errors) console.log(`     ${e}`);
    failed ||= !ok;
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
