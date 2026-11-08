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
