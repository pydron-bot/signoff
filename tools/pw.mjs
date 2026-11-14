/**
 * Playwright for the tools (it isn't a game dependency). Run them with it on
 * hand, e.g. `npx -y -p playwright@1.63.0 node tools/smoke.mjs`, or set
 * PLAYWRIGHT to a directory that has node_modules/playwright.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

export async function playwright() {
  if (process.env.PLAYWRIGHT) return createRequire(path.join(process.env.PLAYWRIGHT, 'noop.js'))('playwright');
  try {
    return await import('playwright');
  } catch {
    // npx -p puts the package's bin on PATH but not on the import path: find it from there.
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      if (!dir.endsWith(path.join('node_modules', '.bin'))) continue;
      try {
        return createRequire(path.join(dir, '..', 'noop.js'))('playwright');
      } catch {
        // not this one
      }
    }
    throw new Error('playwright not found: run with `npx -y -p playwright node …` or set PLAYWRIGHT');
  }
}

/** Headless Chromium with WebGL on SwiftShader (no GPU needed). */
export async function launch() {
  const { chromium } = await playwright();
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}

/**
 * `vite preview` of a build on a port, run with node directly (through npx,
 * killing it would leave vite serving the old build to the next run). Fails
 * if something else already answers on the port.
 */
export async function serve(dir, port, env = {}) {
  const { spawn } = await import('node:child_process');
  const url = `http://localhost:${port}/`;
  if (await fetch(url).then(() => true, () => false)) throw new Error(`port ${port} is already serving: stop it first`);
  const vite = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--outDir', dir, '--port', String(port), '--strictPort'], { env: { ...process.env, ...env }, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    if (await fetch(url).then((r) => r.status < 500, () => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return server;
}
