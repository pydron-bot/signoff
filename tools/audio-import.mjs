// Brings recordings into the game: every audio file under <folder>
// (laid out as public/assets/audio is: dale/shout_1.wav, hits/thud_2.wav,
// ...; WAV, AIFF, FLAC or MP3) is trimmed of silence at both ends,
// brought to the same peak (voices -4 dB, hits -3 dB: leaves room for the 1-2 dB AAC can add),
// faded in and out over a few milliseconds (no clicks), made mono, and
// written as AAC to public/assets/audio/<same path>.m4a. Needs ffmpeg.
// Then run `npm run audio:index`, which lists the files for the game and
// rejects any name it doesn't know (docs/AUDIO-TODO.md has them all).
//   node tools/audio-import.mjs ~/recordings/signoff
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('usage: node tools/audio-import.mjs <folder of recordings>');
  process.exit(1);
}
const OUT = path.resolve('public/assets/audio');
const EXT = /\.(wav|aiff?|flac|mp3)$/i;
/** Silence below this is trimmed from both ends. */
const QUIET = '-50dB';
const trim = `silenceremove=start_periods=1:start_threshold=${QUIET},areverse,silenceremove=start_periods=1:start_threshold=${QUIET},areverse`;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(n) ? [p] : [];
  });
}

let done = 0;
for (const file of walk(src)) {
  const rel = path.relative(src, file).split(path.sep).join('/');
  const out = path.join(OUT, rel.replace(EXT, '.m4a'));
  const peakTarget = rel.startsWith('hits/') ? -3 : -4;
  // Measure the peak after trimming, then lift or lower to the target.
  // ffmpeg reports the measurement on stderr.
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `${trim},volumedetect`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /max_volume: (-?[\d.]+) dB/.exec(probe.stderr ?? '');
  const peak = m ? Number(m[1]) : 0;
  const gain = (peakTarget - peak).toFixed(2);
  mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-af', `${trim},volume=${gain}dB,afade=t=in:d=0.004,areverse,afade=t=in:d=0.01,areverse`, '-ac', '1', '-ar', '48000', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out]);
  console.log(`${rel} -> ${path.relative(process.cwd(), out)} (${gain >= 0 ? '+' : ''}${gain} dB)`);
  done++;
}
console.log(`${done} file${done === 1 ? '' : 's'}. Now: npm run audio:index`);
