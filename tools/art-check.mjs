// Loads each fighter GLB in the art viewer (tools/viewer/, three.js, as the
// game will) on a dev server of its own, prints what it measured, and saves
// screenshots: idle in the game view and at 3/4, and every move clip with a
// hitbox on its first active frame, boxes drawn.
//   npx -y -p playwright@1.63.0 node tools/art-check.mjs [--out art-out]
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { launch } from './pw.mjs';

const PORT = 4198;
const i = process.argv.indexOf('--out');
const OUT = i > 0 ? process.argv[i + 1] : 'art-out';
mkdirSync(OUT, { recursive: true });
const FIGHTERS = readdirSync('public/assets/fighters').filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const browser = await launch();
let failed = false;
try {
  const base = `http://localhost:${PORT}/tools/viewer/`;
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const id of FIGHTERS) {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    page.on('pageerror', (e) => ((failed = true), console.log(`pageerror: ${e.message}`)));
    await page.goto(`${base}?f=${id}&frame=1`);
    await page.evaluate(() => window.__viewer.ready);
    const s = await page.evaluate(() => window.__viewer.stats());
    console.log(`${id}: ${s.triangles} tris, materials ${s.materials.join(' + ')}, ${s.height.toFixed(3)} m tall (feet at ${s.minY.toFixed(3)})`);
    for (const c of s.clips) console.log(`  ${c.name}: ${c.frames} frames (${c.seconds.toFixed(4)} s)`);
    const shot = async (name, clip, frame, view) => {
      await page.evaluate(([c, f, v]) => (window.__viewer.setClip(c), window.__viewer.setFrame(f), window.__viewer.setView(v)), [clip, frame, view]);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${OUT}/${id}-${name}.png` });
    };
    await shot('idle-game', 'idle', 1, 'game');
    await shot('idle-34', 'idle', 1, 'three');
    await shot('idle-front', 'idle', 1, 'front');
    await page.click('#facing');
    await shot('idle-game-left', 'idle', 1, 'game');
    await page.click('#facing');
    const active = await page.evaluate(() => {
      const out = [];
      for (const c of window.__viewer.stats().clips) out.push(c.name);
      return out;
    });
    for (const clip of active.filter((c) => c !== 'idle')) {
      const f = await page.evaluate((c) => window.__viewerFirstActive?.(c), clip);
      await shot(`${clip.replace(/[^\w.+-]/g, '_')}-active`, clip, f ?? 1, 'game');
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
