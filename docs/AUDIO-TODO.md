# SIGN-OFF — Audio TODO: the recording script

Nov 9, 2026

The fighters' voices and the hits are synthesised today, and it shows:
fighting-game sound is people and impacts. This is everything needed to
replace them with recordings: what to record, how each character should
sound, how to record it, where to get the hits, and how to get the files
into the game. Hand it to whoever records: friends, hired actors or a sound
designer.

**For the people recording:** the same script, as a page with takes to tick
off, is at https://deeek.org/signoff/recording/ (built from the game's own
catalogue by `npm run audio:index`; the direction lives in
`tools/recording/page.ts`).

**Nothing has to be done all at once.** Every slot below keeps its
synthesised sound until it has a recording, and the game uses however many
takes there are (one is enough to start). Record Dale's efforts and pain on
a Sunday afternoon, drop them in, and Dale sounds real while everyone else
stays as they are.

## How a recording gets into the game

1. Record (specs below), cut each take into its own WAV, and name it as the
   shot list says, in a folder per fighter (and `hits/`):
   `dale/effort_heavy_1.wav`, `dale/line_open_2.wav`, `hits/thud_3.wav`.
   No processing: no EQ, compression, reverb or trimming. The import does
   the trimming and levels; the game does the rest.
2. Bring them in (needs [ffmpeg](https://ffmpeg.org/)): this trims the
   silence off both ends, brings every take to the same peak, and writes
   mono AAC to `public/assets/audio/`:

   ```sh
   node tools/audio-import.mjs ~/recordings/signoff
   npm run audio:index
   ```

   `audio:index` lists the files for the game and updates the shot list
   below (what's recorded so far). It fails on a name the game doesn't
   know, so a typo can't slip in.
3. Listen in a match (`npm run dev`). The training dummy set to CPU is a
   quick way to hear hits and pain; a VS CPU match plays the cold open.

Size isn't a worry: the whole list, as AAC, is about 2 MB.

## Recording: setup

- **The room:** small and soft. A closet full of clothes is better than a
  big empty room. Turn off fans, the fridge if it's close, and phones.
- **The mic:** any decent USB or XLR mic. A dynamic mic (an SM58-type)
  forgives an untreated room and loud screams; a condenser catches more
  detail but more room too. Use a pop filter.
- **Distance:** a hand's width to 20 cm for speech and efforts. For screams
  and big shouts, lean back to arm's length or turn the mic slightly away,
  rather than turning the gain down mid-take.
- **Format:** 48 kHz, 24-bit (16 is fine), mono WAV.
- **Levels:** speech peaking around −10 dB, screams never touching 0. A
  clipped take is unusable; a quiet one is fine (the import lifts it).
- **Takes:** record two or three times the takes the list asks for and keep
  the best. Variety matters more than polish: the game never plays the same
  take twice running, so takes that differ a little (pitch, length, breath)
  are what make it sound alive.
- **Rights:** each voice actor signs a short release saying the recordings
  can be used in SIGN-OFF, in any form, on any platform, for good. Keep
  the releases somewhere private, not in the repository. Library sounds:
  write the source and licence of each in `docs/AUDIO-CREDITS.md`.

## Performing: the efforts

The efforts are the hard part and the part that matters most. They aren't
words, they're the sound of a body working.

- **Move while you do them.** Throw a real punch at the air on an
  `effort_heavy`, push against a wall on a `shout`, have someone poke you
  in the ribs for `pain_light`. A still body sounds like reading.
- **Short.** An effort is 0.2–0.5 seconds, a pain sound 0.3–0.8, a scream
  1–2. The game cuts a fighter's last sound when they make a new one, so
  long tails get cut anyway.
- **Light versus heavy** is effort, not volume: a light effort is a breath
  pushed out ("hp!"), a heavy one comes from the gut ("HAAH!").
- **Shouts can be words**, as in the big fighting games: one short word or
  phrase in character (the suggestions below), or a pure yell.
- **Pain** is surprise first: the breath knocked out, then the voice.
- **The scream** is the K.O.: the one time everyone loses control.

## The cast: how each one sounds

**Dale Storm**, the weatherman. Fifties, a warm, smooth baritone, a TV smile
he can't switch off even when it hurts. Efforts are bright and a little
showy ("hup!", "ha-ha!"). Shouts: "Front coming through!", "Batten down!",
"Ha!", "Look out below!". Pain: a polite wince that cracks ("ooh! — ha,
fine"). The scream is the smile finally breaking. Lines are broadcast
patter, always to camera.

**Rox Vega**, the aerobics host. High, breathy, relentless energy, counts
everything. Efforts are workout cues ("Hah!", "Hup!", "And!"). Shouts:
"And PUSH!", "Five, six!", "Feel it!", "Hit it!". Pain: winded gasps, never
quite stopping. The scream is a long breathless shriek. Lines are peppy
1983 and faintly unhinged: she hasn't stopped since.

**Mister Mumbles**, the ventriloquist's dummy with no ventriloquist. High,
squeaky, sing-song, childlike and wrong: perform it, don't pitch it up
afterwards. Efforts are giggles and "hee!"s. Shouts: "Peekaboo!", "Tag!",
"Knock knock!", "Hee hee!". Pain: a squeaky-toy yelp. The scream is a wind-up
toy running down, the pitch sagging at the end. If you can, knock two bits
of wood together right at the start of some takes: his jaw.

**Hollis Bey**, the night guard. Older, deep, rough and tired. Efforts are a
heavy man's grunts, low and short. Shouts: "Hold it!", "Stop right there!",
"Lights!", "Hrrah!". Pain: annoyed growls, a man who has been hit before.
The scream is a bellow. Lines are flat, deadpan, unimpressed.

**Margaret Okafor**, the anchor. Calm, precise, immaculate diction, a
newsreader's measured cadence. Efforts are controlled, a sharp breath
through the nose ("hn."). Shouts: "Breaking!", "Next story.", "Stand by.",
"Correction." Pain: clipped and offended, as if it's an interruption. She
only loses composure at the K.O. Lines are read, not said.

**Chef Gus Lamarre**, the cooking show. Gravelly, loud, a kitchen bark,
sweating. Efforts are "HUP!", "Hah!", pans being lifted. Shouts: "Behind!",
"Hot pan!", "Yes, chef!", "Order up!". Pain: grunts of a man swearing
without swearing. The scream is a big man going down. Lines gruff, rushed:
it's one take, every night, forever.

**Rev. Gideon Price**, the televangelist. Booming, theatrical, a preacher's
tremble on long notes. Efforts are big and breathy ("HAH!"). Shouts:
"Hallelujah!", "Be HEALED!", "Repent!", "Give!". Pain: theatrical ("Lord!",
"Ohh!"). The scream is a sermon going wrong. Lines are sung as much as
spoken.

## Hits and foley: where to get them

Each hit slot is **one layer**, not a finished punch: the game stacks the
layers by how hard the hit is (a jab is a snap and a thud; a launcher is a
snap, thud, crunch and boom). So:

- **Snaps** (`snap_punch`, `snap_kick`, `snap_special`): the sharp front
  only, under 0.1 s. A kick's is duller and bigger than a punch's.
- **Thud:** the low body, no sharp front, 0.1–0.3 s.
- **Crunch:** gristle and texture, the hurt, 0.1–0.3 s.
- **Boom:** a low hit with a tail, 0.5–1 s: the ender.
- **Props** (`metal`, `blade`, `wood`): the pan's ring, the knife's shing,
  the nightstick's knock: they take the snap's place for those moves.
- **Block, bodyfall, throw, whooshes** are whole sounds.

Where to find them:

- **The Sonniss GDC Game Audio Bundles** (sonniss.com/gameaudiogdc): free,
  royalty-free, commercial use allowed (read the bundle's licence). Tens of
  gigabytes; search for punch, body impact, bodyfall, whoosh, cloth.
- **Freesound** (freesound.org): filter by licence. CC0 needs nothing;
  CC-BY needs a credit (`docs/AUDIO-CREDITS.md`); skip anything marked NC.
- **Kenney** (kenney.nl): CC0, a small impact pack.
- **Paid packs:** A Sound Effect (asoundeffect.com) has many punch and
  fighting libraries; BOOM Library and Soundly are the professional end.
- **Record them yourself,** as foley artists do: punch a leather jacket or
  a couch cushion (thud), snap celery or twist a cabbage (crunch), slap a
  forearm on a padded surface (block), drop a duffel bag of clothes on the
  floor (bodyfall), swing a thin stick or a belt past the mic (whooshes),
  tap a real frying pan (metal), draw a knife along a steel (blade), knock
  a broom handle on a table (wood).

## AI tools as a stopgap

Text-to-sound and voice-design tools (ElevenLabs, for example) can fill
slots while waiting for real recordings: fine for trying a character's
voice out. Non-verbal efforts and pain are hit and miss, and the terms vary
by plan: read them before anything ships, and never clone a real person's
voice.

## How the game uses them (for whoever codes)

`src/audio/clips.ts` is the catalogue (slots, takes, when each plays, the
win lines); `src/audio/samples.ts` loads what `index.json` lists once audio
starts; `src/audio/sound.ts` plays a slot's recording where there is one
and the synthesised sound where there isn't, layer by layer for hits. A
fighter has one voice at a time (a new sound cuts the last), takes never
repeat back to back, and each plays a few percent off pitch so repeats
sound less alike. The cold open plays a line's recording instead of the
babble and waits for it to finish. Whooshes and win lines are recorded
only: there's no synthesised version.

## Shot list

Every file the game knows, by fighter, with what's recorded so far.

<!-- shots:start (generated by `npm run audio:index`; do not edit by hand) -->
**Recorded so far: 0 of 283 files.**

#### Dale Storm (`dale/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “And that's the weather.” / “Back to you in the studio!”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | Tonight's forecast: scattered pain, clearing by the second round. | – |
| `line_open_2.m4a` | Stay right where you are. There's a front moving in. | – |
| `line_open_3.m4a` | Smile! We're live. We're always live. | – |
| `line_reply_1.m4a` | Ha! Ha. Back to you. | – |
| `line_reply_2.m4a` | I'd give that a ten percent chance. | – |
| `line_reply_3.m4a` | Not on my map, friend. | – |
| `line_answer_margaret.m4a` | Partly right, Margaret. Partly. *(to Margaret Okafor)* | – |
| `line_to_margaret.m4a` | And now back to Margaret... who's looking stormy. *(to Margaret Okafor)* | – |
| `line_to_rox.m4a` | Clear skies for your morning workout, Rox! *(to Rox Vega)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Rox Vega (`rox/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “And... cool down.” / “Don't forget to stretch!”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | And reach! And reach! And... oh, you're new. Let's warm you up. | – |
| `line_open_2.m4a` | Feel that? That's the burn. It doesn't stop. Mine never has. | – |
| `line_open_3.m4a` | Five, six, seven, eight, and HIT! | – |
| `line_reply_1.m4a` | Less talk, more reps! | – |
| `line_reply_2.m4a` | Keep up, sweetheart. | – |
| `line_reply_3.m4a` | I've been warmed up since 1983. | – |
| `line_to_gus.m4a` | Ugh. Do you ever stop eating? *(to Chef Gus Lamarre)* | – |
| `line_answer_gus.m4a` | Not on my meal plan, Chef. *(to Chef Gus Lamarre)* | – |
| `line_answer_dale.m4a` | Morning? Dale, it's always 3:33. *(to Dale Storm)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Hollis Bey (`hollis/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “Logged.” / “All quiet. For now.”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | Building's closed. Has been since '79. Let's see your badge. | – |
| `line_open_2.m4a` | I do my rounds at three thirty-three. You're on my round. | – |
| `line_open_3.m4a` | Nobody leaves till the sign-off. Nobody. | – |
| `line_reply_1.m4a` | Uh huh. Write it in the log. | – |
| `line_reply_2.m4a` | That's a violation. | – |
| `line_reply_3.m4a` | Lights out in five. | – |
| `line_to_mumbles.m4a` | You. Toy chest. Now. *(to Mister Mumbles)* | – |
| `line_answer_mumbles.m4a` | I've been finding you every night for eight years. *(to Mister Mumbles)* | – |
| `line_to_gideon.m4a` | No preaching in the building after hours. *(to Rev. Gideon Price)* | – |
| `line_answer_gideon.m4a` | Badge first, Reverend. *(to Rev. Gideon Price)* | – |
| `line_to_margaret.m4a` | Ms. Okafor. You on the late shift too? *(to Margaret Okafor)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Mister Mumbles (`mumbles/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “Again! Let's play again!” / “Into the toy chest you go.”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | Wanna be friends? My last friend's in the toy chest. All of him. | – |
| `line_open_2.m4a` | Nobody's got their hand up my back any more. Isn't that wonderful? | – |
| `line_open_3.m4a` | Say the magic word! ...Wrong. | – |
| `line_reply_1.m4a` | Hee hee! You're funny. I'm keeping you. | – |
| `line_reply_2.m4a` | My lips aren't moving. Soon yours won't either. | – |
| `line_reply_3.m4a` | Uh-oh. Somebody's going in the toy chest. | – |
| `line_answer_gideon.m4a` | Possessed by who, mister? Look behind you. *(to Rev. Gideon Price)* | – |
| `line_to_gideon.m4a` | Your hands are glowing. Can I have them? *(to Rev. Gideon Price)* | – |
| `line_answer_hollis.m4a` | Make me, flashlight. *(to Hollis Bey)* | – |
| `line_to_hollis.m4a` | Mister Guard! Play hide and seek with me! *(to Hollis Bey)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Margaret Okafor (`margaret/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “And that was the news.” / “I'm Margaret Okafor. Good night.”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | Good evening. Our top story tonight: you. | – |
| `line_open_2.m4a` | I've read this script before. You don't last. | – |
| `line_open_3.m4a` | We'll go to you live. Briefly. | – |
| `line_reply_1.m4a` | That's not what the teleprompter says. | – |
| `line_reply_2.m4a` | We'll fact-check that after the break. | – |
| `line_reply_3.m4a` | Noted. And dismissed. | – |
| `line_to_dale.m4a` | Dale. You've been wrong every night since 1979. *(to Dale Storm)* | – |
| `line_answer_dale.m4a` | That's enough weather, Dale. *(to Dale Storm)* | – |
| `line_to_gus.m4a` | Kitchen Live. Still in one take? *(to Chef Gus Lamarre)* | – |
| `line_to_gideon.m4a` | We're investigating your ministry, Reverend. *(to Rev. Gideon Price)* | – |
| `line_answer_hollis.m4a` | There is no other shift, Hollis. *(to Hollis Bey)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Chef Gus Lamarre (`gus/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “Order up.” / “Bon appétit.”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | One take, no cuts. Let's not waste it. | – |
| `line_open_2.m4a` | Tonight we're tenderising. Come closer. | – |
| `line_open_3.m4a` | Everything's better with a little heat. | – |
| `line_reply_1.m4a` | Chef's kiss. Then chef's cleaver. | – |
| `line_reply_2.m4a` | Too raw. Let's fix that. | – |
| `line_reply_3.m4a` | Behind! Hot pan! | – |
| `line_answer_rox.m4a` | Do you ever stop moving? *(to Rox Vega)* | – |
| `line_to_rox.m4a` | You want carbs? I got carbs. *(to Rox Vega)* | – |
| `line_answer_margaret.m4a` | Still one take. Tonight you're the special. *(to Margaret Okafor)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Rev. Gideon Price (`gideon/`)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `effort_light_1.m4a` … `_3` | 3 | a light or medium attack starting (now and then, not every jab) | – |
| `effort_heavy_1.m4a` … `_3` | 3 | a heavy attack starting (most of them) | – |
| `shout_1.m4a` … `_4` | 4 | every special, throw and Technical Difficulties | – |
| `pain_light_1.m4a` … `_3` | 3 | hit by a light or medium blow | – |
| `pain_heavy_1.m4a` … `_3` | 3 | hit hard: a heavy blow, a launcher, a crushed guard | – |
| `oof_1.m4a` … `_2` | 2 | landing on the floor after a knockdown | – |
| `scream_1.m4a` … `_2` | 2 | the K.O. | – |
| `win_1.m4a` … `_2` | 2 | winning a round (the lines are in the script) | – |

Win lines (`win_1`, `win_2`): “Hallelujah!” / “Give generously.”

| Cold open line | Says | Recorded |
| --- | --- | --- |
| `line_open_1.m4a` | I can see the darkness in you. For a modest gift, I can take it away. | – |
| `line_open_2.m4a` | The lines are open! Who will be saved tonight? | – |
| `line_open_3.m4a` | Kneel, and be healed. Or stand, and be hurt. | – |
| `line_reply_1.m4a` | Hallelujah. Pass the plate. | – |
| `line_reply_2.m4a` | The Lord forgives. I don't. | – |
| `line_reply_3.m4a` | Can I get an amen? No? A pity. | – |
| `line_to_mumbles.m4a` | This puppet is possessed. Two hundred dollars and I cast it out. *(to Mister Mumbles)* | – |
| `line_answer_mumbles.m4a` | Get thee behind me, splinters. *(to Mister Mumbles)* | – |
| `line_answer_hollis.m4a` | The Lord keeps no hours, officer. *(to Hollis Bey)* | – |
| `line_to_hollis.m4a` | Officer! Come, be blessed. *(to Hollis Bey)* | – |
| `line_answer_margaret.m4a` | Investigate this, sister. *(to Margaret Okafor)* | – |
| `line_mirror_open.m4a` | There's only room in the schedule for one of us. | – |
| `line_mirror_reply.m4a` | Then one of us gets cancelled. | – |

#### Hits (`hits/`, shared)

| File | Takes | When it plays | Recorded |
| --- | --- | --- | --- |
| `snap_punch_1.m4a` … `_4` | 4 | the contact of a punch: the sharp front of every punch | – |
| `snap_kick_1.m4a` … `_4` | 4 | the contact of a kick: duller and bigger than a punch | – |
| `snap_special_1.m4a` … `_3` | 3 | the contact of a special or a finisher blow | – |
| `metal_1.m4a` … `_3` | 3 | a pan, a ladle or the collection plate (instead of the snap): Gus's skillet, Gideon's plate | – |
| `blade_1.m4a` … `_3` | 3 | a cleaver or a knife (instead of the snap): Gus's knives | – |
| `wood_1.m4a` … `_3` | 3 | a nightstick or a rolling pin (instead of the snap): Hollis's stick | – |
| `thud_1.m4a` … `_4` | 4 | the body under every hit: the weight | – |
| `crunch_1.m4a` … `_4` | 4 | on top, for medium hits and up: the hurt | – |
| `boom_1.m4a` … `_2` | 2 | on top of a launcher, knockdown or K.O.: a low hit with a tail | – |
| `block_1.m4a` … `_4` | 4 | a blocked hit: forearms taking it | – |
| `bodyfall_1.m4a` … `_3` | 3 | a body hitting the studio floor | – |
| `throw_1.m4a` … `_2` | 2 | a throw slamming them down | – |
| `whoosh_light_1.m4a` … `_3` | 3 | a fast attack cutting the air | – |
| `whoosh_heavy_1.m4a` … `_3` | 3 | a heavy attack cutting the air | – |

<!-- shots:end -->
