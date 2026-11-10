// Wiring only: logic lives in modules. Title (with a CPU-vs-CPU demo
// behind it) → a session (vs CPU, training, vs player) → results.
import { humanSide, loadFound, markFound } from './game/found';
import { banter } from './game/banter';
import { ColdOpen } from './ui/coldOpen';
import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';
import type { CpuLevel } from './ai/cpu';
import { Sound, type SoundMode } from './audio/sound';
import { BUILD_ID } from './core/build';
import { VERSION } from './core/changelog';
import { GUIDE_DUMMY, guides } from './game/comboGuides';
import { Cleared } from './game/cleared';
import { ANSWERS, GUARDS, METER_LEVELS, PLAYBACKS, SLOTS, STANCES, WAKEUPS, dummySummary } from './game/dummy';
import { LESSONS, LESSONS_KEY, lessonLine } from './game/lessons';
import { TRIALS_KEY, trialCount, trialId, trialLine } from './game/trials';
import { FixedStep } from './game/loop';
import { SlowMo } from './game/slowMo';
import { parseReplay, type Replay } from './game/replay';
import { CONTROLS, POSITIONS, PRACTICES, Session, type Mode } from './game/session';
import { initKeyboard, keyboardInput, menuPresses, padCount, padInput } from './input/devices';
import { TouchControls } from './input/touch';
import { Arena } from './render/arena';
import { powerOn } from './render/look';
import { setOutlineSize } from './render/outline';
import { Post } from './render/post';
import { ROOM_GRADE, Room, TV_ASPECT } from './render/room';
import { FIGHTERS, Input, STAGES, STAGE_IDS, canTD, fighterData, type SimEvent } from './sim';
import { propInReach } from './sim/stage';
import { Hud } from './ui/hud';
import { Glitch } from './ui/glitch';
import { Menu } from './ui/menu';
import { ArcadeCard } from './ui/arcadeCard';
import { LABELS, MUSIC_VOLUME, touchShown, OPTIONS, TOUCH_SCALE, loadSettings, reducedMotion, saveSettings, type Settings } from './game/settings';
import { afterMatch, beaten, createLadder, levelFor, opponent, stageFor, type Ladder } from './game/arcade';
import { MoveListPanel } from './ui/moveListPanel';
import { InputDisplay } from './ui/inputDisplay';
import { PerfOverlay } from './ui/perfOverlay';
import { ReplayBar, SPEEDS, type ReplayAction } from './ui/replayBar';

const FIGHTER_IDS = Object.keys(FIGHTERS);
// The menu's levels; the DIRECTOR plays only Arcade's last fight (arcade.ts).
const LEVELS: CpuLevel[] = ['easy', 'normal', 'hard'];
const SOUND_MODES: SoundMode[] = ['on', 'novoice', 'off'];
/** Cancellations players have found (signoff.found). */
const found = loadFound();
/** Trials and lessons cleared (signoff.trials, signoff.lessons). */
const trialsDone = new Cleared(TRIALS_KEY);
const lessonsDone = new Cleared(LESSONS_KEY);
/** The trial being played, as trialsDone keeps it. */
let trialKey = '';
/** Training's frame meter, on or off. */
let frameMeterOn = true;
const SETUP_KEY = 'signoff.setup';
const REPLAY_KEY = 'signoff.replay';
/** Seconds the replay's back and forward buttons skip. */
const SKIP_STEPS = 5 * 60;
/** Settings → VHS LOOK (off, low, full): how much tape the post pass puts on the picture. */
const VHS_AMOUNT = [0, 0.5, 1] as const;

const app = document.getElementById('app')!;
const title = document.getElementById('title')!;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// The post pass renders several times a frame: the overlay counts them all.
renderer.info.autoReset = false;
app.appendChild(renderer.domElement);
const post = new Post(renderer);

const arena = new Arena();
post.grade = arena.grade;
/** The title's living room; the shader TV stands in until it loads. */
const room = new Room(post.hdr);
void room.load().then(() => room.ready && post.compileScene(room.scene, room.camera));
/** The title's TV, 0 off to 1 on (the push in through the glass runs it down), and whether the fight is drawn onto it. */
let tvView = 0;
let onTv = false;
const screenTone = new THREE.Color();
const systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = loadSettings();
const sound = new Sound();
const glitch = new Glitch(document.body, reducedMotion(settings, systemReduceMotion));
const hud = new Hud(document.body);
/** The cold open before round 1: the fighters' lines (any button skips). */
const coldOpen = new ColdOpen(
  document.body,
  (side, fighter) => sound.babble(side, fighter),
  (side, clip) => sound.line(side, clip),
  () => endColdOpen(),
);
/** What skips the cold open: an attack, Block, Special or Throw. */
const SKIP_BITS = Input.FP | Input.BP | Input.FK | Input.BK | Input.BLOCK | Input.SPECIAL | Input.THROW;
let coldOpenHeld = 0;

function endColdOpen(): void {
  if (coldOpen.active) sound.hush();
  coldOpen.end();
  arena.idling = false;
  // The match starts now, not with the time the lines took.
  clock.reset();
}

const inputDisplays = [new InputDisplay(document.body, 0), new InputDisplay(document.body, 1)] as const;
const touch = new TouchControls(document.body);
touch.bindHold(hud.p1Meter, Input.METER);
const titleMenu = new Menu(title, 'menu-title-screen');
const pauseMenu = new Menu(document.body, 'menu-overlay');
const pauseBtn = document.createElement('button');
pauseBtn.className = 'pause-btn';
pauseBtn.type = 'button';
pauseBtn.textContent = 'II';
pauseBtn.hidden = true;
document.body.append(pauseBtn);
const replayBar = new ReplayBar(document.body);
const moveListPanel = new MoveListPanel(document.body);
const arcadeCard = new ArcadeCard(document.body);
const perf = new PerfOverlay(document.body, renderer);
perf.note = () => `POST ${post.hdr ? 'HDR' : '8-BIT'} ×${post.drawScale}`;
initKeyboard();

/** The touch buttons moved, resized or came and went: the camera frames the fight beside them. */
function layoutTouch(): void {
  touch.relayout();
  arena.buttons = touch.share();
}

/** Puts the settings into effect everywhere they matter. */
function applySettings(): void {
  const rm = reducedMotion(settings, systemReduceMotion);
  arena.reduceMotion = rm;
  glitch.reduceMotion = rm;
  glitch.censorLevel = settings.censor;
  glitch.vhs = settings.vhs;
  post.vhs = VHS_AMOUNT[settings.vhs];
  arena.tape = VHS_AMOUNT[settings.vhs];
  post.stillGrain = rm;
  document.body.dataset.vhs = String(settings.vhs);
  sound.setMusicVolume(MUSIC_VOLUME[settings.music]);
  touch.root.style.setProperty('--touch-scale', String(TOUCH_SCALE[settings.touchSize]));
  touch.root.dataset.side = String(settings.touchSide);
  layoutTouch();
  if (perf.shown !== (settings.perf === 1)) perf.show(settings.perf === 1);
}
applySettings();

/** The settings screen; `back` reopens whatever menu it came from. */
function showSettings(back: () => void): void {
  titleMenu.hide();
  const rows: Parameters<Menu['show']>[1] = (Object.keys(LABELS) as (keyof Settings)[]).map((k) => ({
    label: LABELS[k],
    options: OPTIONS[k],
    value: settings[k],
    onChange: (v: number) => {
      settings[k] = v;
      saveSettings(settings);
      applySettings();
      refreshTouch();
    },
  }));
  rows.push(
    {
      label: 'FIGHTERS',
      options: ['3D MODELS', 'GREY BOXES'],
      value: setup.models,
      onChange: (v) => {
        setup.models = v;
        arena.models = v === 0;
        saveSetup();
      },
    },
    {
      label: 'SOUND',
      options: ['ON', 'NO ANNOUNCER', 'OFF'],
      value: setup.sound,
      onChange: (v) => {
        setup.sound = v;
        sound.mode = SOUND_MODES[v];
        if (sound.mode === 'off') sound.stopMusic(0);
        sound.unlock();
        saveSetup();
      },
    },
  );
  rows.push({ label: 'BACK', id: 'settings-back', run: () => (pauseMenu.hide(), back()) });
  pauseMenu.show('SETTINGS', rows);
}

// Audio may only start from a gesture (iOS Safari). A touch's pointerdown
// doesn't count as one, its pointerup and touchend do, so listen to them all.
for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) window.addEventListener(t, () => sound.unlock(), { capture: true, passive: true });

let touchUi = window.matchMedia('(pointer: coarse)').matches;
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && !touchUi) {
    touchUi = true;
    refreshTouch();
  }
});
/** The touch buttons are up for a match (and should show, if touchShown agrees). */
let touchInMatch = false;
function setTouch(inMatch: boolean): void {
  touchInMatch = inMatch;
  refreshTouch();
}
/** Shows or hides the touch buttons for the screen, the settings and the pads connected now. */
function refreshTouch(): void {
  touch.show(touchInMatch && touchShown(settings, touchUi, padCount(), session?.options.mode === 'versus'));
  layoutTouch();
}
// A pad plugged in or out mid-match: the buttons follow.
window.addEventListener('gamepadconnected', refreshTouch);
window.addEventListener('gamepaddisconnected', refreshTouch);

// The chosen fighters and CPU level, remembered between visits.
const setup = { p1: 0, p2: 1, stage: 0, level: 1, sound: 0, studio: 0, models: 0 };
try {
  Object.assign(setup, JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}'));
} catch {
  // private mode or bad data: defaults
}
sound.mode = SOUND_MODES[setup.sound] ?? 'on';
arena.models = setup.models === 0;
const saveSetup = () => {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    // not fatal
  }
};

let session: Session | null = null;
let demo = true;
let paused = false;
let over = false;

// The last finished match, kept for watching again (this version's only:
// another version's moves may play it out differently).
let lastReplay: Replay | null = null;
try {
  const r = parseReplay(JSON.parse(localStorage.getItem(REPLAY_KEY) ?? 'null'));
  if (r?.version === VERSION) lastReplay = r;
} catch {
  // none, or unreadable
}
let replayPaused = false;
let replaySpeed = 0;
/** Combo showcases can run slowed down, to follow the presses. */
const SHOWCASE_SPEEDS = [1, 0.5, 0.25] as const;
let showcaseSpeed = 0;
/** Where a showcase goes back to: the training session it was opened from (or the title), on this fighter's move list. */
let showcaseReturn: { training: Session | null; fighter: string } | null = null;
/** The showcase caption, rebuilt only when the step changes. */
let caption = { step: -2, text: '' };

function keepReplay(r: Replay | null): void {
  if (!r) return;
  lastReplay = r;
  try {
    localStorage.setItem(REPLAY_KEY, JSON.stringify(r));
  } catch {
    // too big or private mode: it's still here until reload
  }
}
const ev: SimEvent[] = [];
const clock = new FixedStep();
/** A KO runs in slow motion for a moment. */
const slowMo = new SlowMo();

function newSession(mode: Mode, p1: string, p2: string, stage: string, level: CpuLevel = LEVELS[setup.level]): Session {
  const s = new Session({ mode, p1, p2, stage, level, seed: (Date.now() & 0x7fffffff) || 1, studio: mode !== 'demo' && setup.studio === 1, version: VERSION });
  return begin(s);
}

/** Which sides' inputs the input display shows now (the setting, and what's on screen), into a shared pair. */
const sides = [false, false];
function inputSides(s: Session | null): boolean[] {
  const on = !!s && !demo && settings.inputs > 0;
  const mode = s?.options.mode;
  sides[0] = on && (settings.inputs === 2 || !!s?.training || mode === 'showcase');
  sides[1] = on && settings.inputs === 2 && (mode === 'versus' || mode === 'replay');
  return sides;
}

function begin(s: Session): Session {
  for (const d of inputDisplays) d.clear();
  // Arcade's beaten fighters watch from the bleachers.
  const seated = ladder && s.options.mode === 'cpu' ? beaten(ladder) : [];
  // Compile the models' shaders as they arrive, not on their first frame.
  void Promise.all([arena.setFighters(s.match), arena.setAudience(seated)]).then(() => post.compileScene(arena.scene, arena.camera));
  clock.reset();
  return s;
}

function startDemo(): void {
  demo = true;
  over = false;
  paused = false;
  endColdOpen();
  // A different pairing behind the title each time.
  const a = Math.floor(Math.random() * FIGHTER_IDS.length);
  const b = (a + 1 + Math.floor(Math.random() * (FIGHTER_IDS.length - 1))) % FIGHTER_IDS.length;
  session = newSession('demo', FIGHTER_IDS[a], FIGHTER_IDS[b], STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)]);
  hud.hide();
  setTouch(false);
  pauseBtn.hidden = true;
  pauseMenu.hide();
  arcadeCard.hide();
  ladder = null;
  replayBar.show(false);
  sound.stopMusic();
  title.hidden = false;
  glitch.clear();
  slowMo.clear();
  document.body.dataset.scene = 'title';
  showTitle();
}

/** The arcade run in progress, or null. */
let ladder: Ladder | null = null;

function play(mode: Mode): void {
  ladder = null;
  start(mode, FIGHTER_IDS[setup.p2], STAGE_IDS[setup.stage] ?? STAGE_IDS[0]);
}

function start(mode: Mode, p2: string, stage: string, level?: CpuLevel): void {
  demo = false;
  over = false;
  paused = false;
  arcadeCard.hide();
  session = newSession(mode, FIGHTER_IDS[setup.p1], p2, stage, level);
  // A match against someone opens on the two of them trading a line.
  if (mode === 'cpu' || mode === 'versus') {
    const o = session.options;
    const ex = banter(o.p1, o.p2, o.seed);
    coldOpen.begin(o.p1, o.p2, ex, [sound.lineSeconds(ex.clips[0]), sound.lineSeconds(ex.clips[1])]);
    arena.idling = true;
    coldOpenHeld = ~0;
  } else endColdOpen();
  title.hidden = true;
  titleMenu.hide();
  hud.start(session.match, session.training);
  setTouch(true);
  pauseBtn.hidden = false;
  replayBar.show(false);
  document.body.dataset.scene = 'fight';
}

function startArcade(): void {
  ladder = createLadder(FIGHTER_IDS[setup.p1]);
  title.hidden = true;
  titleMenu.hide();
  sound.stopMusic();
  arcadeCard.listings(ladder, "TONIGHT ON CHANNEL 0", [{ label: 'ON AIR', id: 'arcade-next', run: nextShow }, { label: 'TITLE', run: startDemo }]);
}

/** The next fight on the arcade ladder. */
function nextShow(): void {
  if (ladder) start('cpu', opponent(ladder), stageFor(ladder), levelFor(ladder));
}

/** After an arcade match: on to the next show, the continue screen, or the ending. */
function arcadeResult(winner: number): void {
  const l = afterMatch(ladder!, winner === 0);
  ladder = l;
  pauseMenu.hide();
  setTouch(false);
  hud.hide();
  if (l.state === 'won') arcadeCard.ending(l.fighter, [{ label: 'THE END', id: 'arcade-end', run: startDemo }]);
  else if (l.state === 'over') arcadeCard.listings(l, 'OFF THE AIR · GAME OVER', [{ label: 'TITLE', id: 'arcade-end', run: startDemo }]);
  else if (winner === 0) arcadeCard.listings(l, 'UP NEXT ON CHANNEL 0', [{ label: 'ON AIR', id: 'arcade-next', run: nextShow }, { label: 'TITLE', run: startDemo }]);
  else arcadeCard.listings(l, 'CONTINUE?', [{ label: `CONTINUE (${l.continues} LEFT)`, id: 'arcade-next', run: nextShow }, { label: 'TITLE', run: startDemo }]);
}

function watch(r: Replay): void {
  ladder = null;
  demo = false;
  over = false;
  paused = false;
  replayPaused = false;
  replaySpeed = 0;
  const o = r.options;
  session = begin(new Session({ mode: 'replay', p1: o.p1, p2: o.p2, stage: o.stage, level: 'normal', seed: o.seed, studio: o.studio, replay: r }));
  title.hidden = true;
  titleMenu.hide();
  pauseMenu.hide();
  hud.start(session.match, false);
  setTouch(false);
  pauseBtn.hidden = true;
  replayBar.show(true);
  document.body.dataset.scene = 'replay';
}

/** After a jump in a replay: the presentation starts clean from the new step. */
function seekReplay(frame: number): void {
  const s = session;
  if (!s || s.options.mode !== 'replay') return;
  if (over) {
    over = false;
    pauseMenu.hide();
  }
  s.seek(frame);
  sound.stopMusic(0.1);
  arena.resync();
  hud.start(s.match, false);
  glitch.clear();
  slowMo.clear();
  clock.reset();
}

function replayAction(a: ReplayAction): void {
  const s = session;
  if (!s || s.options.mode !== 'replay') return;
  switch (a) {
    case 'restart':
      seekReplay(0);
      break;
    case 'back':
      seekReplay(s.replayFrame - SKIP_STEPS);
      break;
    case 'forward':
      seekReplay(s.replayFrame + SKIP_STEPS);
      break;
    case 'toggle':
      if (over) seekReplay(0);
      replayPaused = !replayPaused && !over;
      clock.reset();
      break;
    case 'speed':
      replaySpeed = (replaySpeed + 1) % SPEEDS.length;
      clock.reset();
      break;
    case 'exit':
      startDemo();
      break;
  }
}
replayBar.onAction = replayAction;
replayBar.onSeek = (f) => seekReplay(f);

const names = FIGHTER_IDS.map((id) => `${fighterData(id).name} · ${fighterData(id).style}`);
/** Player 1's choices, with the trials each has cleared. */
function playerNames(): string[] {
  return FIGHTER_IDS.map((id, k) => {
    const [n, of] = trialCount(trialsDone, id);
    return `${names[k]} · trials ${n}/${of}`;
  });
}

/** The lessons, as the player's fighter (from the title). */
function showLessons(): void {
  titleMenu.show(`LESSONS · AS ${fighterData(FIGHTER_IDS[setup.p1]).name.toUpperCase()}`, [
    ...LESSONS.map((l) => ({ label: `${lessonsDone.has(l.id) ? '✓ ' : ''}${l.name.toUpperCase()}`, id: `lesson-${l.id}`, run: () => startLesson(l.id) })),
    { label: 'BACK', run: showTitle },
  ]);
}

function showTitle(): void {
  titleMenu.show('', [
    { label: 'ARCADE', id: 'play-arcade', run: startArcade },
    { label: 'VS CPU', id: 'play-cpu', run: () => play('cpu') },
    { label: 'TRAINING', id: 'play-training', run: () => play('training') },
    { label: 'LESSONS', id: 'lessons', run: showLessons },
    { label: 'VS PLAYER', id: 'play-versus', run: () => play('versus') },
    ...(lastReplay ? [{ label: 'WATCH LAST MATCH', id: 'watch-replay', run: () => watch(lastReplay!) }] : []),
    { label: 'MOVE LIST', id: 'move-list', run: () => showMoves(FIGHTER_IDS[setup.p1], false, showTitle, true) },
    { label: 'SETTINGS', id: 'settings', run: () => showSettings(showTitle) },
    { label: 'PLAYER 1', options: playerNames(), value: setup.p1, onChange: (v) => ((setup.p1 = v), saveSetup()) },
    { label: 'PLAYER 2', options: names, value: setup.p2, onChange: (v) => ((setup.p2 = v), saveSetup()) },
    { label: 'STAGE', options: STAGE_IDS.map((id) => STAGES[id].name.toUpperCase()), value: setup.stage, onChange: (v) => ((setup.stage = v), saveSetup()) },
    { label: 'CPU', options: ['EASY', 'NORMAL', 'HARD'], value: setup.level, onChange: (v) => ((setup.level = v), saveSetup()) },
    { label: 'RULES', options: ['LIVE BROADCAST', 'STUDIO'], value: setup.studio, onChange: (v) => ((setup.studio = v), saveSetup()) },
  ]);
}

/**
 * The move list, starting on one fighter (the others a swipe away); `back`
 * reopens whatever menu it came from. `watch` offers to play the combo
 * guides (from the title and training, where leaving the fight costs nothing).
 */
function showMoves(first: string, frames: boolean, back: () => void, watch = false): void {
  titleMenu.hide();
  pauseMenu.hide();
  moveListPanel.onClose = back;
  moveListPanel.onWatch = showcase;
  moveListPanel.onTry = startTrial;
  moveListPanel.show(FIGHTER_IDS, Math.max(0, FIGHTER_IDS.indexOf(first)), frames, watch);
}

/** Plays one of a fighter's combo guides on a loop, against a standing dummy. */
function showcase(fighter: string, guide: number): void {
  showcaseReturn = { training: session?.training ? session : null, fighter };
  ladder = null;
  demo = false;
  over = false;
  paused = false;
  showcaseSpeed = 0;
  caption = { step: -2, text: '' };
  session = begin(new Session({ mode: 'showcase', p1: fighter, p2: GUIDE_DUMMY, level: 'normal', seed: 1, studio: true, guide }));
  title.hidden = true;
  titleMenu.hide();
  pauseMenu.hide();
  hud.start(session.match, true);
  setTouch(false);
  pauseBtn.hidden = false;
  replayBar.show(false);
  document.body.dataset.scene = 'showcase';
}

/** Trials and lessons: a training session of their own, straight from a menu. */
function drill(s: Session): void {
  ladder = null;
  demo = false;
  over = false;
  paused = false;
  arcadeCard.hide();
  endColdOpen();
  session = begin(s);
  trialKey = s.tracker ? trialId(s.options.p1, s.tracker.trial.name) : '';
  title.hidden = true;
  titleMenu.hide();
  pauseMenu.hide();
  hud.start(s.match, true);
  setTouch(true);
  pauseBtn.hidden = false;
  replayBar.show(false);
  document.body.dataset.scene = 'fight';
}

/** A combo guide as a trial: its start, against its dummy. */
function startTrial(fighter: string, guide: number): void {
  drill(new Session({ mode: 'training', p1: fighter, p2: GUIDE_DUMMY, level: 'normal', seed: 1, studio: true, guide, trial: true }));
}

/** Steps before each lesson attempt begins. */
const LESSON_LEAD = 45;

/** A lesson, as player 1's fighter. */
function startLesson(id: string): void {
  const s = new Session({ mode: 'training', p1: FIGHTER_IDS[setup.p1], p2: GUIDE_DUMMY, level: 'normal', seed: 1, studio: true, lesson: id });
  // A moment to read the caption before each attempt.
  s.lesson!.lead = LESSON_LEAD;
  s.lesson!.restart();
  drill(s);
}

/** Back from a showcase to the move list it was opened from (or the trial it was watched from). */
function leaveShowcase(): void {
  const r = showcaseReturn;
  showcaseReturn = null;
  if (r?.training) {
    session = begin(r.training);
    over = false;
    hud.start(r.training.match, true);
    setTouch(true);
    document.body.dataset.scene = 'fight';
    pause(true);
    if (r.training.freePlay) showMoves(r.fighter, true, () => pause(true), true);
  } else {
    startDemo();
    showMoves(r?.fighter ?? FIGHTER_IDS[setup.p1], false, showTitle, true);
  }
}

function pause(on: boolean): void {
  if (!session || demo || over) return;
  paused = on;
  menuEpoch++;
  sound.pauseMusic(on);
  touch.clear();
  clock.reset();
  if (!on) {
    pauseMenu.hide();
    return;
  }
  const s = session;
  // Pausing ends a recording and keeps it.
  s.dummy.stopRecording();
  if (s.tracker) {
    const t = s.tracker.trial;
    const next = (t.guide + 1) % guides(t.fighter).length;
    pauseMenu.show(`TRIAL · ${t.name.toUpperCase()}`, [
      { label: 'RESUME', run: () => pause(false) },
      { label: 'TRY AGAIN (R)', run: () => (s.reset(), hud.start(s.match, true), pause(false)) },
      { label: 'WATCH IT', run: () => showcase(t.fighter, t.guide) },
      { label: 'NEXT TRIAL', id: 'next-trial', run: () => startTrial(t.fighter, next) },
      { label: 'MOVE LIST', id: 'move-list', run: () => showMoves(t.fighter, true, () => pause(true), true) },
      { label: 'SETTINGS', run: () => showSettings(() => pause(true)) },
      { label: 'QUIT TO TITLE', run: startDemo },
    ]);
    return;
  }
  if (s.lesson) {
    const l = s.lesson.lesson;
    const next = LESSONS[(LESSONS.indexOf(l) + 1) % LESSONS.length];
    pauseMenu.show(`LESSON · ${l.name.toUpperCase()}`, [
      { label: 'RESUME', run: () => pause(false) },
      { label: 'TRY AGAIN (R)', run: () => (s.reset(), hud.start(s.match, true), pause(false)) },
      { label: `NEXT: ${next.name.toUpperCase()}`, id: 'next-lesson', run: () => startLesson(next.id) },
      { label: 'ALL LESSONS', run: () => (startDemo(), showLessons()) },
      { label: 'SETTINGS', run: () => showSettings(() => pause(true)) },
      { label: 'QUIT TO TITLE', run: startDemo },
    ]);
    return;
  }
  if (s.options.mode === 'showcase') {
    pauseMenu.show(s.guide?.name.toUpperCase() ?? 'COMBO', [
      { label: 'RESUME', run: () => pause(false) },
      { label: 'SPEED', options: ['FULL', 'HALF', 'QUARTER'], value: showcaseSpeed, onChange: (v) => ((showcaseSpeed = v), clock.reset()) },
      { label: 'FROM THE START', run: () => (s.reset(), (s.guideFrame = 0), arena.resync(), pause(false)) },
      { label: 'BACK TO MOVE LIST', id: 'showcase-back', run: leaveShowcase },
      { label: 'QUIT TO TITLE', run: startDemo },
    ]);
    return;
  }
  const rows: Parameters<Menu['show']>[1] = [
    { label: 'RESUME', run: () => pause(false) },
    s.options.mode === 'replay'
      ? { label: 'FROM THE START', run: () => (seekReplay(0), pause(false)) }
      : { label: 'RESTART', run: () => (ladder ? nextShow() : play(s.options.mode)) },
  ];
  if (s.training) {
    rows.push(
      { label: 'RESET POSITIONS (R)', run: () => (s.reset(), hud.start(s.match, true), pause(false)) },
      { label: 'RESET TO', options: ['ROUND START', 'MIDDLE', 'DUMMY AT LEFT WALL', 'DUMMY AT RIGHT WALL', s.hasSaved ? 'SAVED MOMENT' : 'SAVED (NONE YET)'], value: POSITIONS.indexOf(s.position), onChange: (v) => (s.setPosition(POSITIONS[v]), hud.start(s.match, true)) },
      { label: 'SAVE THIS MOMENT', run: () => (s.saveMoment(), pause(true)) },
      { label: 'DUMMY', id: 'dummy-settings', run: () => showDummy(s) },
      { label: 'SEGMENT', options: STAGES[s.match.stage].segments.map((g, k) => `${k + 1} ${g.name.toUpperCase()}`), value: s.match.segment, onChange: (v) => s.setSegment(v) },
      // Finisher practice: one hit wins the match, then Stay tuned with no time limit (or a cancellation), and again.
      { label: 'FINISHERS', options: ['OFF', 'PRACTISE', 'AT THE WALL'], value: PRACTICES.indexOf(s.practice), onChange: (v) => (s.setPractice(PRACTICES[v]), hud.start(s.match, true)) },
      { label: 'HIT BOXES (B)', options: ['OFF', 'ON'], value: arena.showBoxes ? 1 : 0, onChange: (v) => (arena.showBoxes = v === 1) },
      { label: 'FRAME METER', options: ['OFF', 'ON'], value: frameMeterOn ? 1 : 0, onChange: (v) => (frameMeterOn = v === 1) },
    );
  }
  rows.splice(1, 0, { label: 'MOVE LIST', id: 'move-list', run: () => showMoves(s.match.fighters[0].fighter, s.training, () => pause(true), s.training) });
  rows.push({ label: 'SETTINGS', run: () => showSettings(() => pause(true)) });
  rows.push({ label: 'QUIT TO TITLE', run: startDemo });
  pauseMenu.show('PAUSED', rows);
}

/** One menu choice over a list of values: the row shows `names`, and changing it sets the value. */
function pick<T>(label: string, values: readonly T[], names: readonly string[], value: T, set: (v: T) => void): Parameters<Menu['show']>[1][number] {
  return { label, options: names, value: Math.max(0, values.indexOf(value)), onChange: (v) => set(values[v]) };
}

const ANSWER_NAMES = ['NOTHING', 'JAB', 'THROW', 'REVERSAL', 'BOOSTED SPECIAL', 'JUMP', 'BACKDASH', 'RECORDING'];

/** Training's dummy: how it guards, answers, spends meter, and what it plays back. */
function showDummy(s: Session): void {
  const d = s.dummy.settings;
  const slots = Array.from({ length: SLOTS }, (_, k) => `${k + 1}${s.dummy.slots[k] ? ` (${(s.dummy.slots[k]!.frames / 60).toFixed(1)} S)` : ' (EMPTY)'}`);
  pauseMenu.show('DUMMY', [
    pick('PLAYED BY', CONTROLS, ['DUMMY', 'CPU'], s.control, (v) => (s.control = v)),
    pick('GUARD', GUARDS, ['NONE', 'ALL', 'AFTER FIRST HIT', 'RANDOM', 'FLAWLESS'], d.guard, (v) => (d.guard = v)),
    pick('STANCE', STANCES, ['STAND', 'CROUCH', 'DUCK'], d.stance, (v) => (d.stance = v)),
    pick('AFTER BLOCK', ANSWERS, ANSWER_NAMES, d.afterBlock, (v) => (d.afterBlock = v)),
    pick('AFTER HIT', ANSWERS, ANSWER_NAMES, d.afterHit, (v) => (d.afterHit = v)),
    pick('GETTING UP', WAKEUPS, [...ANSWER_NAMES, 'STAY DOWN'], d.wakeup, (v) => (d.wakeup = v)),
    pick('METER', METER_LEVELS, ['EMPTY', '1 BAR', 'FULL', 'REFILL AT REST'], d.meter, (v) => (d.meter = v)),
    pick('CUT AWAY', [false, true], ['OFF', 'ON'], d.cutAway, (v) => (d.cutAway = v)),
    pick('SLOT', [0, 1, 2], slots, d.slot, (v) => (d.slot = v)),
    { label: 'RECORD (UP TO 10 S)', id: 'dummy-record', run: () => (s.dummy.startRecording(), pause(false)) },
    pick('PLAYBACK', PLAYBACKS, ['OFF', 'LOOP', 'ON RESET'], d.playback, (v) => ((d.playback = v), s.reset())),
    { label: 'BACK', run: () => pause(true) },
  ]);
}

/** Training's readout line, rebuilt only when what it says has changed. */
const line = { s: null as Session | null, key: 0, text: '' };
/** Counts pauses: the dummy's settings only change in a menu. */
let menuEpoch = 0;
function trainingLine(s: Session): string {
  const d = s.dummy;
  const key = s.tracker ? s.tracker.version : s.lesson ? s.lesson.version : d.recording ? 1e6 + Math.floor(d.recorded / 6) : s.practice !== 'off' ? -2 : -10 - menuEpoch;
  if (line.s === s && line.key === key) return line.text;
  line.s = s;
  line.key = key;
  if (s.tracker) line.text = trialLine(s.tracker);
  else if (s.lesson) line.text = lessonLine(s.lesson);
  else if (d.recording)
    line.text = d.recorded ? `● REC ${(d.recorded / 60).toFixed(1)} s of 10 · Esc stops` : `Recording slot ${d.settings.slot + 1}: you play the dummy, from your first press · Esc stops`;
  else if (s.practice !== 'off') line.text = 'Finishers: one hit wins, then take your time · R reset · Esc menu';
  else line.text = `${s.control === 'cpu' ? 'Dummy: the CPU' : dummySummary(d.settings)} · R reset · B boxes · Esc menu`;
  return line.text;
}

function results(winner: number): void {
  over = true;
  touch.clear();
  const m = session!.match;
  const label = winner >= 0 && winner < 2 ? `${fighterData(m.fighters[winner].fighter).name.toUpperCase()} WINS` : 'DRAW';
  if (session!.options.mode === 'replay') {
    pauseMenu.show(label, [
      { label: 'WATCH AGAIN', id: 'watch-again', run: () => (pauseMenu.hide(), seekReplay(0)) },
      { label: 'TITLE', run: startDemo },
    ]);
    return;
  }
  if (ladder) {
    arcadeResult(winner);
    return;
  }
  const r = lastReplay;
  pauseMenu.show(label, [
    { label: 'REMATCH', id: 'rematch', run: () => (pauseMenu.hide(), play(session!.options.mode)) },
    ...(r ? [{ label: 'WATCH REPLAY', id: 'watch-replay', run: () => watch(r) }] : []),
    { label: 'TITLE', run: startDemo },
  ]);
}

pauseBtn.addEventListener('click', () => pause(!paused));
window.addEventListener('keydown', (e) => {
  // The performance overlay, anywhere.
  if (e.code === 'Backquote' && !e.repeat) {
    settings.perf = settings.perf ? 0 : 1;
    saveSettings(settings);
    applySettings();
    return;
  }
  if (session?.options.mode === 'replay' && !paused && !e.repeat) {
    const a: ReplayAction | null =
      e.code === 'Space' ? 'toggle' : e.code === 'ArrowLeft' ? 'back' : e.code === 'ArrowRight' ? 'forward' : e.code === 'Home' ? 'restart' : e.code === 'KeyS' ? 'speed' : null;
    if (a) {
      e.preventDefault();
      replayAction(a);
    }
    return;
  }
  if (!session?.training || paused) return;
  if (e.code === 'KeyR') {
    session.reset();
    hud.start(session.match, true);
  }
  if (e.code === 'KeyB') arena.showBoxes = !arena.showBoxes;
});
document.addEventListener('visibilitychange', () => {
  // Time jumps while hidden: the overlay starts counting afresh.
  perf.reset();
  if (document.hidden) pause(true);
});

const frame = [0, 0];
/** Both fighters on screen, for fading the touch buttons over them. */
const bodyRects = new Float32Array(8);

/** This step's input frames for both players, into `frame`. */
function readInputs(): void {
  const kb = keyboardInput();
  const t = touch.input();
  if (session?.options.mode !== 'versus') {
    frame[0] = kb | t | padInput(0) | padInput(1);
    frame[1] = 0;
  } else if (padCount() >= 2) {
    // Two pads: one each (keyboard and touch join player 1).
    frame[0] = kb | t | padInput(0);
    frame[1] = padInput(1);
  } else {
    // One pad: it's player 2's.
    frame[0] = kb | t;
    frame[1] = padInput(0);
  }
}

/** The showcase's line: the presses, the one just made in brackets, and the move it brought out. */
function showcaseCaption(s: Session): string {
  const k = s.guideStep;
  if (k !== caption.step) {
    const steps = s.guideRun!.steps;
    const presses = steps.map((st, i) => (st.wait ? 'wait ' : '') + (i === k ? `[${st.input}]` : st.input)).join(' › ');
    caption = { step: k, text: `${presses}${k >= 0 ? ` · ${steps[k].move}` : ''} · Esc menu` };
  }
  return caption.text;
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  // A phone's 2x screen is drawn at 1.5x: the tape's softness hides it, and the fill it saves pays for the glow.
  const pr = renderer.getPixelRatio();
  post.setSize(w * pr, h * pr, pr >= 2 ? 0.75 : 1);
  setOutlineSize(h * pr * post.drawScale);
  arena.setPixelHeight(h * pr * post.drawScale);
  if (!onTv) arena.resize(w, h);
  room.resize(w, h);
  layoutTouch();
}
window.addEventListener('resize', resize);
resize();

startDemo();
// Compile every shader now, not mid-fight.
post.compileScene(arena.scene, arena.camera);
post.compile();

let lastFrame = 0;
renderer.setAnimationLoop((now) => {
  let stepped = 0;
  for (const k of menuPresses()) {
    if (arcadeCard.open) arcadeCard.key(k);
    else if (moveListPanel.open) moveListPanel.key(k);
    else if (pauseMenu.open) {
      if (k === 'pause' && !over) pause(false);
      else pauseMenu.key(k);
    } else if (titleMenu.open && demo) titleMenu.key(k);
    else if (k === 'pause') pause(true);
  }
  const s = session;
  if (!s) return;
  const replaying = s.options.mode === 'replay';
  if (coldOpen.active && !paused) {
    // Any new press skips it (not one still held from the menu).
    readInputs();
    const bits = frame[0] | frame[1];
    if (bits & ~coldOpenHeld & SKIP_BITS) endColdOpen();
    else if (!coldOpen.update(Math.min(0.1, (now - lastFrame) / 1000))) endColdOpen();
    coldOpenHeld = bits;
  } else if (!paused && !over && !(replaying && replayPaused)) {
    // Replays can run at other speeds: scaled time, reset whenever the speed changes.
    const speed = replaying ? SPEEDS[replaySpeed] : s.options.mode === 'showcase' ? SHOWCASE_SPEEDS[showcaseSpeed] : 1;
    const n = clock.advance(now * speed, slowMo.scale);
    stepped = n;
    for (let i = 0; i < n; i++) {
      if (demo) frame[0] = frame[1] = 0;
      else readInputs();
      const resets = s.resets;
      s.tick(frame[0], frame[1], ev);
      // Finisher practice, a trial or a lesson started over: a clean picture for the next one.
      if (s.resets !== resets) hud.start(s.match, true);
      if (s.tracker?.state === 'cleared') trialsDone.mark(trialKey);
      if (s.lesson?.result === 'pass') lessonsDone.mark(s.lesson.lesson.id);
      arena.step(s.match, ev);
      inputSides(s);
      for (let i = 0; i < 2; i++) if (sides[i]) inputDisplays[i].log.push(s.inputs[i], s.match.fighters[i].facing);
      if (!demo) {
        hud.onEvents(s.match, ev);
        hud.step();
        sound.onEvents(s.match, ev);
        glitch.onEvents(ev);
      }
      glitch.step();
      slowMo.step(s.match, ev);
      for (const e of ev) {
        // A cancellation a player landed is found: the move list shows it from now on.
        if (e.type === 'finisher' && e.kind === 'cancellation' && humanSide(s.options.mode, e.player)) markFound(found, s.match.fighters[e.player].fighter, e.id);
        if (e.type !== 'matchOver') continue;
        if (demo) startDemo();
        else {
          if (!replaying) keepReplay(s.recording());
          results(e.winner);
        }
      }
      ev.length = 0;
      if (session !== s || over) break;
    }
    // A replay that stops short of its match's end (it shouldn't) still ends.
    if (replaying && session === s && !over && s.replayFrame >= s.replayFrames) results(s.match.matchWinner < 2 ? s.match.matchWinner : -1);
  }
  const m = session!.match;
  const title = document.body.dataset.scene === 'title';
  // The title's TV: settles in, and a match starting pushes in through the glass (cut with Reduce Motion).
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const still = reducedMotion(settings, systemReduceMotion);
  if (still) tvView = title ? 1 : 0;
  else tvView = title ? Math.min(1, tvView + dt / 0.5) : Math.max(0, tvView - dt / (room.ready ? 0.8 : 0.55));
  // On the room's TV the fight is framed 4:3.
  const tv = room.ready && tvView > 0;
  if (tv !== onTv) {
    onTv = tv;
    if (tv) arena.resize(TV_ASPECT, 1);
    else arena.resize(window.innerWidth, window.innerHeight);
  }
  arena.render(m);
  if (!demo) {
    hud.update(m, s.adv.last, s.training ? trainingLine(s) : s.guideRun ? showcaseCaption(s) : '', !s.training || s.freePlay);
    hud.frames(s.training && frameMeterOn ? s.frames : null);
    const p1 = m.fighters[0];
    touch.setTD(canTD(p1));
    touch.setInteract(propInReach(m, p1) >= 0);
    if (touch.shown) {
      arena.screenRects(m, window.innerWidth, window.innerHeight, bodyRects);
      touch.fadeOver(bodyRects);
    }
  }
  inputSides(session);
  for (let i = 0; i < 2; i++) {
    inputDisplays[i].show(sides[i]);
    inputDisplays[i].update();
  }
  if (replaying && session === s) replayBar.update(s.replayFrame, s.replayFrames, replayPaused || over, SPEEDS[replaySpeed]);
  post.crt = room.ready ? 0 : tvView;
  // The cold open plays in the studio before the lights bang on: half lit.
  // The shader TV dims the demo behind the menu; the room is dark enough already.
  post.dim = title ? (room.ready ? 1 : 0.8) : coldOpen.active ? 0.55 : powerOn(m);
  post.saturation = title ? 0.85 : 1;
  post.tear = glitch.tear;
  post.split = glitch.split;
  post.impact = glitch.impact;
  renderer.info.reset();
  if (onTv) {
    // The fight on the TV, the room round it; leaving, the push ends in a burst of static as the picture takes the screen.
    room.drawTv(renderer, arena.scene, arena.camera);
    room.update(1 - tvView, arena.tone(screenTone), glitch.impact, still);
    if (!title && !still) post.tear = Math.max(post.tear, 0.5 * Math.max(0, 1 - tvView / 0.15));
    post.grade = ROOM_GRADE;
    post.render(room.scene, room.camera, now);
    post.grade = arena.grade;
  } else post.render(arena.scene, arena.camera, now);
  perf.frame(now, stepped);
});

document.getElementById('version')!.textContent = `v${VERSION} · ${BUILD_ID}`;

// Don't reload mid-match for an update: wait for the title screen.
const updateSW = registerSW({
  onNeedRefresh: () => {
    const check = () => (demo ? void updateSW(true) : setTimeout(check, 5000));
    check();
  },
});
