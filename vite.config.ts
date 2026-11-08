/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
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
  return `${sha.slice(0, 7)} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`;
}

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
    VitePWA({
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
        globPatterns: ['**/*.{js,css,html,png,svg,glb,ktx2,json}'],
        // The fighter models are precached (~3 MB) so fights work offline.
        globIgnores: ['**/node_modules/**/*', '**/icons/*512.png'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // The shell answers navigations to the game only, not files opened by URL.
        navigateFallbackDenylist: [/^[^?]*\.(?!html?\b)\w+(?:\?.*)?$/],
        // GLBs are copied unhashed from public/: only Vite's hashed bundles may skip a revision.
        dontCacheBustURLsMatching: /^assets\/.+-[\w-]{8}\.(?:js|css)$/,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
