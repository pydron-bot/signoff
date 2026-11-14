// How well each fighter stands out from the set: every fighter in every
// segment of every stage, standing at the start in Training, drawn once with
// the fighters and once without (the ?shots hook, src/game/shotHook.ts).
// The pixels that change are the fighter; the same pixels in the empty frame
// are the band of set behind them. Reports the brightness of each (mean
// luma, 0 to 255), the difference, and the share of the fighter that is
// clearly lighter or darker than what's behind it (by 24 or more). A
// fighter fails when that share is under 50%, or the means are within 16.
// The tape is off for the measurement (VHS LOOK OFF, grain still): it keeps
// brightness and only adds noise. Writes readability.json and a table.
//   PLAYWRIGHT=/opt/node-tools node tools/readability.mjs --out /tmp/read [--no-build] [--stages kitchen]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, serve } from './pw.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(arg('--out', 'readability-out'));
const DIST = path.join(OUT, 'dist');
const PORT = 4196;
const URL = `http://localhost:${PORT}/?shots`;
mkdirSync(OUT, { recursive: true });

const FIGHTERS = ['dale', 'rox', 'hollis', 'mumbles', 'margaret', 'gus', 'gideon'];
const ALL_STAGES = ['weather', 'burn', 'news', 'kitchen'];
const only = arg('--stages', '');
const STAGES = only ? only.split(',') : ALL_STAGES;
const SEGMENTS = [0, 1, 2];
/** A pixel is clearly apart from the set behind it by this much luma; a fighter passes with this share of such pixels. */
const APART = 24;
const PASS_SHARE = 0.5;
const PASS_MEAN = 16;

if (!process.argv.includes('--no-build')) execSync(`npx vite build --outDir ${JSON.stringify(DIST)} --emptyOutDir`, { stdio: 'inherit' });
const server = await serve(DIST, PORT);
const browser = await launch();
const rows = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('signoff.setup', JSON.stringify({ sound: 2, models: 0, studio: 0 }));
    localStorage.setItem('signoff.settings', JSON.stringify({ vhs: 0, motion: 1, inputs: 0, perf: 0 }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
  await page.goto(URL);
  await page.waitForFunction(() => window.__shots, null, { timeout: 60000 });
  // Reads the canvas inside a frame, after the game has drawn it (between frames it reads back empty).
  await page.evaluate(() => {
    window.__grab = () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const c = document.querySelector('#app canvas');
          const t = document.createElement('canvas');
          t.width = innerWidth;
          t.height = innerHeight;
          const g = t.getContext('2d');
          g.drawImage(c, 0, 0, innerWidth, innerHeight);
          resolve(g.getImageData(0, 0, innerWidth, innerHeight).data);
        }),
      );
    window.__measure = async (apart) => {
      const s = window.__shots;
      s.hideFighters(false);
      await s.frame();
      const rects = s.rects();
      const a = await window.__grab();
      s.hideFighters(true);
      await s.frame();
      const b = await window.__grab();
      s.hideFighters(false);
      const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const out = [];
      for (let k = 0; k < 2; k++) {
        const [l, t, r, bo] = rects.slice(k * 4, k * 4 + 4);
        // Not the feet: the shadow and the reflection lie there.
        const bottom = bo - (bo - t) * 0.12;
        let n = 0, fs = 0, ss = 0, apartN = 0;
        for (let y = Math.max(0, Math.floor(t)); y < Math.min(innerHeight, bottom); y++)
          for (let x = Math.max(0, Math.floor(l)); x < Math.min(innerWidth, r); x++) {
            const i = (y * innerWidth + x) * 4;
            const fa = luma(a, i);
            const fb = luma(b, i);
            if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) < 18) continue;
            n++;
            fs += fa;
            ss += fb;
            if (Math.abs(fa - fb) >= apart) apartN++;
          }
        out.push(n ? { pixels: n, fighter: fs / n, set: ss / n, share: apartN / n } : { pixels: 0, fighter: 0, set: 0, share: 0 });
      }
      return out;
    };
  });
  for (const stage of STAGES)
    for (const segment of SEGMENTS)
      for (let f = 0; f < FIGHTERS.length; f++) {
        const p1 = FIGHTERS[f];
        const p2 = FIGHTERS[(f + 1) % FIGHTERS.length];
        await page.evaluate((o) => window.__shots.start(o), { mode: 'training', p1, p2, stage, seed: 1, segment });
        await page.evaluate(() => window.__shots.steps(20));
        const m = await page.evaluate((a) => window.__measure(a), APART);
        if (f === 0) await page.screenshot({ path: path.join(OUT, `${stage}-${segment}.png`) });
        for (const [side, who] of [[0, p1], [1, p2]]) {
          const r = m[side];
          const diff = r.fighter - r.set;
          const ok = r.share >= PASS_SHARE && Math.abs(diff) >= PASS_MEAN;
          rows.push({ stage, segment, fighter: who, side, pixels: r.pixels, fighterLuma: r.fighter, setLuma: r.set, share: r.share, diff, ok });
          console.log(`${ok ? 'ok  ' : 'FAIL'} ${stage} ${segment} ${who.padEnd(8)} ${side ? 'right' : 'left '}  fighter ${r.fighter.toFixed(0).padStart(3)}  set ${r.set.toFixed(0).padStart(3)}  diff ${diff.toFixed(0).padStart(4)}  apart ${(r.share * 100).toFixed(0).padStart(3)}%  (${r.pixels} px)`);
        }
      }
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(path.join(OUT, 'readability.json'), JSON.stringify(rows, null, 1));
const fails = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - fails.length}/${rows.length} pass`);
// Each fighter's worst side per segment.
const worst = new Map();
for (const r of rows) {
  const k = `${r.stage} ${r.segment} ${r.fighter}`;
  if (!worst.has(k) || worst.get(k).share > r.share) worst.set(k, r);
}
const failing = [...worst.values()].filter((r) => !r.ok);
console.log(`failing (worst side): ${failing.map((r) => `${r.stage} ${r.segment} ${r.fighter}`).join(', ') || 'none'}`);
process.exit(0);
