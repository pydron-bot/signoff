/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Shown on the title screen (src/core/build.ts): the commit (GITHUB_SHA on
// the Pages workflow, else the local checkout) and UTC time.
function buildId(): string {
  let sha = process.env.GITHUB_SHA;
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      sha = 'dev'; // no git (e.g. a source tarball)
    }
  }
  const id = `${sha.slice(0, 7)} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`;
  return PREVIEW ? `${id} · preview of ${PREVIEW}` : id;
}

// A branch preview (tools/build-previews.sh) names its branch here. Previews
// have no service worker: they're always fresh, and only the real game at
// /signoff/ installs and works offline.
const PREVIEW = process.env.SIGNOFF_PREVIEW ?? '';

export default defineConfig({
  // '/' locally, '/signoff/' when the Pages workflow builds it for
  // deeek.org/signoff/ (SIGNOFF_BASE).
  base: process.env.SIGNOFF_BASE ?? '/',
  define: { __BUILD__: JSON.stringify(buildId()) },
  server: {
    host: true,
    // Curbside's dev server has 5173.
    port: 5174,
    // Reached from a phone over Tailscale as http://hive1:5174
    allowedHosts: ['hive1', '.ts.net'],
  },
  preview: { host: true, port: 4174 },
  build: {
    chunkSizeWarningLimit: 800,
    license: { fileName: 'licenses.md' },
    rolldownOptions: {
      output: {
        // three.js in a chunk of its own: game updates don't re-download it.
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] },
      },
    },
  },
  plugins: [
    // The bundled typefaces' licences (public/assets/fonts, tools/fonts.mjs) join the licences the build ships.
    {
      name: 'signoff-font-licences',
      // After the bundler has written its own licences file.
      writeBundle(options) {
        const out = join(options.dir ?? 'dist', 'licenses.md');
        if (existsSync(out)) appendFileSync(out, `\n\n${readFileSync('public/assets/fonts/LICENSES.md', 'utf8')}`);
      },
    },
    VitePWA({
      disable: PREVIEW !== '',
      // A new version waits for a safe moment (not mid-match) to reload.
      registerType: 'prompt',
      includeManifestIcons: false,
      manifest: {
        name: 'SIGN-OFF',
        short_name: 'SIGN-OFF',
        description: 'A fighting game on a haunted 1987 TV channel.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,glb,ktx2,json,m4a,woff2,webp}'],
        // The fighter models are precached (~3 MB) so fights work offline.
        // The recording script (/recording/) is a page of its own, not part of the game.
        globIgnores: ['**/node_modules/**/*', '**/icons/*512.png', 'recording/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // The shell answers navigations to the game only, not files opened by URL.
        // Nor branch previews (/signoff/preview/...) or the recording script, which are their own pages.
        navigateFallbackDenylist: [/^[^?]*\.(?!html?\b)\w+(?:\?.*)?$/, /\/preview\//, /\/recording\/?/],
        // GLBs are copied unhashed from public/: only Vite's hashed bundles may skip a revision.
        dontCacheBustURLsMatching: /^assets\/.+-[\w-]{8}\.(?:js|css)$/,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
