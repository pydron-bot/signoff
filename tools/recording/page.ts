/**
 * The recording script as a web page (deeek.org/signoff/recording/): the
 * template, filled from the game's own catalogue (src/audio/clips.ts) and
 * the cold open's lines, so its file names are the ones the game reads.
 * Written to public/recording/index.html by `npm run audio:index`
 * (tests/recording-page.test.ts checks it's up to date).
 */
import { readFileSync } from 'node:fs';
import { HIT_SLOTS, VOICE_SLOTS, WIN_LINES } from '../../src/audio/clips';
import { FIGHTER_COLORS } from '../../src/core/fighterLook';
import { scriptOf } from '../../src/game/banter';
import { FIGHTERS } from '../../src/sim';

/** How each one sounds: for whoever performs them. */
const CAST: Readonly<Record<string, { voice: string; efforts: string; shouts: string[]; pain: string; scream: string; lines: string }>> = {
  dale: { voice: "Fifties, a warm, smooth baritone, with a TV smile he can't switch off even when it hurts.", efforts: 'Bright and a little showy: “hup!”, “ha-ha!”.', shouts: ['Front coming through!', 'Batten down!', 'Look out below!', 'Ha!'], pain: 'A polite wince that cracks: “ooh! … ha, fine.”', scream: 'The smile finally breaking.', lines: 'Broadcast patter, always to camera.' },
  rox: { voice: 'High, breathy, relentless energy. She counts everything.', efforts: 'Workout cues: “Hah!”, “Hup!”, “And!”.', shouts: ['And PUSH!', 'Five, six!', 'Feel it!', 'Hit it!'], pain: 'Winded gasps, never quite stopping.', scream: 'A long, breathless shriek.', lines: "Peppy 1983 and faintly unhinged: she hasn't stopped since." },
  mumbles: { voice: "A ventriloquist's dummy with no ventriloquist: high, squeaky, sing-song, childlike and wrong. Perform it; don't pitch it up afterwards.", efforts: 'Giggles and “hee!”s.', shouts: ['Peekaboo!', 'Tag!', 'Knock knock!', 'Hee hee!'], pain: 'A squeaky-toy yelp.', scream: 'A wind-up toy running down, the pitch sagging at the end.', lines: 'If you can, knock two bits of wood together at the start of some takes: his jaw.' },
  hollis: { voice: 'Older, deep, rough and tired.', efforts: "A heavy man's grunts, low and short.", shouts: ['Hold it!', 'Stop right there!', 'Lights!', 'Hrrah!'], pain: 'Annoyed growls: a man who has been hit before.', scream: 'A bellow.', lines: 'Flat, deadpan, unimpressed.' },
  margaret: { voice: "Calm, precise, immaculate diction, a newsreader's measured cadence.", efforts: 'Controlled: a sharp breath through the nose, “hn.”', shouts: ['Breaking!', 'Next story.', 'Stand by.', 'Correction.'], pain: "Clipped and offended, as if it's an interruption. She only loses composure at the K.O.", scream: 'Composure gone, all at once.', lines: 'Read, not said.' },
  gus: { voice: 'Gravelly, loud, a kitchen bark, sweating.', efforts: '“HUP!”, “Hah!”: heavy pans being lifted.', shouts: ['Behind!', 'Hot pan!', 'Yes, chef!', 'Order up!'], pain: 'Grunts of a man swearing without swearing.', scream: 'A big man going down.', lines: "Gruff and rushed: it's one take, every night, forever." },
  gideon: { voice: "Booming and theatrical, with a preacher's tremble on long notes.", efforts: 'Big and breathy: “HAH!”.', shouts: ['Hallelujah!', 'Be HEALED!', 'Repent!', 'Give!'], pain: 'Theatrical: “Lord!”, “Ohh!”.', scream: 'A sermon going wrong.', lines: 'Sung as much as spoken.' },
};

/** How long each take should run. */
const LENGTH: Readonly<Record<string, string>> = {
  effort_light: '0.2–0.4 s', effort_heavy: '0.3–0.5 s', shout: '0.4–1 s', pain_light: '0.3–0.6 s', pain_heavy: '0.5–0.8 s', oof: '0.3–0.5 s', scream: '1–2 s', win: 'a line',
  snap_punch: 'under 0.1 s', snap_kick: 'under 0.1 s', snap_special: 'under 0.15 s', metal: '0.2–0.6 s', blade: '0.2–0.5 s', wood: '0.1–0.3 s', thud: '0.1–0.3 s', crunch: '0.1–0.3 s', boom: '0.5–1 s', block: '0.1–0.3 s', bodyfall: '0.3–0.8 s', throw: '0.4–0.8 s', whoosh_light: '0.15–0.3 s', whoosh_heavy: '0.25–0.5 s',
};

/** What the navigation calls each fighter. */
const SHORT: Readonly<Record<string, string>> = { dale: 'Dale', rox: 'Rox', hollis: 'Hollis', mumbles: 'Mumbles', margaret: 'Margaret', gus: 'Gus', gideon: 'Gideon' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function color(id: string): string {
  return `#${(FIGHTER_COLORS[id] ?? 0xcccccc).toString(16).padStart(6, '0')}`;
}

/** A tick box per take; the ids are what the page remembers ticks by. */
function takes(group: string, slot: string, n: number): string {
  let out = '';
  for (let k = 1; k <= n; k++) out += `<label class="take"><input type="checkbox" id="t-${group}-${slug(slot)}-${k}" data-g="${group}"><span>${k}</span></label>`;
  return out;
}

export function recordingPage(template: string = readFileSync(new URL('./template.html', import.meta.url), 'utf8')): string {
  let total = 0;
  const sections: string[] = [];
  for (const f of Object.values(FIGHTERS)) {
    const c = CAST[f.id];
    if (!c) throw new Error(`no direction for ${f.id} in tools/recording/page.ts`);
    let n = 0;
    const rows = VOICE_SLOTS.map((s) => {
      n += s.count;
      let said = '';
      if (s.id === 'win') said = `<div class="said">${WIN_LINES[f.id].map((x) => `<q>${esc(x)}</q>`).join(' / ')}</div>`;
      if (s.id === 'shout') said = `<div class="said">Ideas: ${c.shouts.map((x) => `<q>${esc(x)}</q>`).join(', ')}</div>`;
      return `<tr><td class="file"><code>${s.id}_N.wav</code><span class="len">${LENGTH[s.id]}</span></td><td>${esc(s.when)}${said}</td><td class="takes">${takes(f.id, s.id, s.count)}</td></tr>`;
    });
    const lines = scriptOf(f.id).map((l) => {
      n++;
      const to = l.to ? `<span class="to">to ${esc(FIGHTERS[l.to].name)}</span>` : '';
      return `<tr><td class="file"><code>line_${l.id}.wav</code>${to}</td><td class="line">${esc(l.text)}</td><td class="takes"><label class="take"><input type="checkbox" id="t-${f.id}-line-${slug(l.id)}" data-g="${f.id}"><span>✓</span></label></td></tr>`;
    });
    total += n;
    sections.push(`
<section class="fighter" id="${f.id}" style="--who:${color(f.id)}">
  <header class="slate">
    <div class="swatch" aria-hidden="true"></div>
    <div><h3>${esc(f.name)}</h3><p class="show">${esc(f.show)} · folder <code>${f.id}/</code></p></div>
    <p class="count" data-count="${f.id}" data-total="${n}">0 of ${n}</p>
  </header>
  <dl class="cast">
    <div><dt>Voice</dt><dd>${esc(c.voice)}</dd></div>
    <div><dt>Efforts</dt><dd>${esc(c.efforts)}</dd></div>
    <div><dt>Pain</dt><dd>${esc(c.pain)}</dd></div>
    <div><dt>The K.O.</dt><dd>${esc(c.scream)}</dd></div>
    <div><dt>Lines</dt><dd>${esc(c.lines)}</dd></div>
  </dl>
  <div class="scroll"><table>
    <thead><tr><th>File</th><th>When it plays</th><th>Takes</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>
  <h4>Before the match</h4>
  <p class="note">Lines said in the cold open before round 1. One good take each.</p>
  <div class="scroll"><table>
    <thead><tr><th>File</th><th>Line</th><th>Done</th></tr></thead>
    <tbody>${lines.join('')}</tbody>
  </table></div>
</section>`);
  }
  let hitN = 0;
  const hits = HIT_SLOTS.map((s) => {
    hitN += s.count;
    return `<tr><td class="file"><code>${s.id}_N.wav</code><span class="len">${LENGTH[s.id]}</span></td><td>${esc(s.when)}</td><td class="takes">${takes('hits', s.id, s.count)}</td></tr>`;
  });
  total += hitN;
  const nav =
    Object.values(FIGHTERS)
      .map((f) => `<a href="#${f.id}" style="--who:${color(f.id)}"><i aria-hidden="true"></i>${esc(SHORT[f.id] ?? f.name)}</a>`)
      .join('') + '<a href="#hits" class="hitslink"><i aria-hidden="true"></i>Hits</a>';
  return template
    .replace('{{NAV}}', nav)
    .replace('{{FIGHTERS}}', sections.join(''))
    .replace('{{HITROWS}}', hits.join(''))
    .replaceAll('{{TOTAL}}', String(total))
    .replaceAll('{{HITN}}', String(hitN));
}
