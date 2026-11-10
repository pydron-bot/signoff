// The recording script at deeek.org/signoff/recording/ is built from the
// game's catalogue, so its file names are the ones the game reads. After
// changing slots, lines or the template, `npm run audio:index` rewrites it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HIT_SLOTS, VOICE_SLOTS } from '../src/audio/clips';
import { scriptOf } from '../src/game/banter';
import { FIGHTERS } from '../src/sim';
import { recordingPage } from '../tools/recording/page';

const OUT = new URL('../public/recording/index.html', import.meta.url);

describe('recording script page', () => {
  const page = recordingPage();

  it('lists every take and line the game knows, nothing left unfilled', () => {
    expect(page).not.toContain('{{');
    const takes = (page.match(/class="take"/g) ?? []).length;
    const want = Object.values(FIGHTERS).reduce((n, f) => n + VOICE_SLOTS.reduce((m, s) => m + s.count, 0) + scriptOf(f.id).length, 0) + HIT_SLOTS.reduce((n, s) => n + s.count, 0);
    expect(takes).toBe(want);
    for (const f of Object.values(FIGHTERS)) {
      expect(page).toContain(`id="${f.id}"`);
      for (const l of scriptOf(f.id)) expect(page).toContain(`line_${l.id}.wav`);
    }
    // Every tick box has its own id, so ticks are remembered one by one.
    const ids = [...page.matchAll(/id="(t-[^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('public/recording/index.html is up to date', () => {
    if (process.env.UPDATE_AUDIO) {
      mkdirSync(new URL('../public/recording/', import.meta.url), { recursive: true });
      writeFileSync(OUT, page);
      return;
    }
    expect(readFileSync(OUT, 'utf8'), 'public/recording/index.html is out of date: run `npm run audio:index`').toBe(page);
  });
});
