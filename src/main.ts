// Wiring only: logic lives in modules. Title (with a CPU-vs-CPU demo
// behind it) → a session (vs CPU, training, vs player) → results.
import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';
import type { CpuLevel } from './ai/cpu';
import { Sound, type SoundMode } from './audio/sound';
import { BUILD_ID } from './core/build';
import { VERSION } from './core/changelog';
import { GUIDE_DUMMY } from './game/comboGuides';
import { FixedStep } from './game/loop';
import { SlowMo } from './game/slowMo';
import { parseReplay, type Replay } from './game/replay';
import { DUMMIES, Session, type Mode } from './game/session';
import { initKeyboard, keyboardInput, menuPresses, padCount, padInput } from './input/devices';
import { TouchControls } from './input/touch';
import { Arena } from './render/arena';
import { FIGHTERS, Input, STAGES, STAGE_IDS, TD_HEALTH_PCT, fighterData, type SimEvent } from './sim';
import { propInReach } from './sim/stage';
import { Hud } from './ui/hud';
import { Glitch } from './ui/glitch';
import { Menu } from './ui/menu';
import { ArcadeCard } from './ui/arcadeCard';
import { LABELS, MUSIC_VOLUME, OPTIONS, TOUCH_SCALE, loadSettings, reducedMotion, saveSettings, type Settings } from './game/settings';
import { afterMatch, createLadder, levelFor, opponent, stageFor, type Ladder } from './game/arcade';
import { MoveListPanel } from './ui/moveListPanel';
import { InputDisplay } from './ui/inputDisplay';
import { ReplayBar, SPEEDS, type ReplayAction } from './ui/replayBar';

const FIGHTER_IDS = Object.keys(FIGHTERS);
const LEVELS: CpuLevel[] = ['easy', 'normal', 'hard'];
const SOUND_MODES: SoundMode[] = ['on', 'novoice', 'off'];
const SETUP_KEY = 'signoff.setup';
const REPLAY_KEY = 'signoff.replay';
/** Seconds the replay's back and forward buttons skip. */
const SKIP_STEPS = 5 * 60;

const app = document.getElementById('app')!;
const title = document.getElementById('title')!;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const arena = new Arena();
const systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = loadSettings();
const sound = new Sound();
const glitch = new Glitch(document.body, reducedMotion(settings, systemReduceMotion));
const hud = new Hud(document.body);
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
initKeyboard();

/** Puts the settings into effect everywhere they matter. */
function applySettings(): void {
  const rm = reducedMotion(settings, systemReduceMotion);
  arena.reduceMotion = rm;
  glitch.reduceMotion = rm;
  glitch.censorLevel = settings.censor;
  glitch.vhs = settings.vhs;
  document.body.dataset.vhs = String(settings.vhs);
  sound.setMusicVolume(MUSIC_VOLUME[settings.music]);
  touch.root.style.setProperty('--touch-scale', String(TOUCH_SCALE[settings.touchSize]));
  touch.root.dataset.side = String(settings.touchSide);
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
    if (session && !demo) touch.show(true);
  }
});

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
  // Compile the models' shaders as they arrive, not on their first frame.
  void arena.setFighters(s.match).then(() => renderer.compile(arena.scene, arena.camera));
  clock.reset();
  return s;
}

function startDemo(): void {
  demo = true;
  over = false;
  paused = false;
  // A different pairing behind the title each time.
  const a = Math.floor(Math.random() * FIGHTER_IDS.length);
  const b = (a + 1 + Math.floor(Math.random() * (FIGHTER_IDS.length - 1))) % FIGHTER_IDS.length;
  session = newSession('demo', FIGHTER_IDS[a], FIGHTER_IDS[b], STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)]);
  hud.hide();
  touch.show(false);
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
  title.hidden = true;
  titleMenu.hide();
  hud.start(session.match, session.training);
  touch.show(touchUi);
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
  touch.show(false);
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
  touch.show(false);
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

function showTitle(): void {
  titleMenu.show('', [
    { label: 'ARCADE', id: 'play-arcade', run: startArcade },
    { label: 'VS CPU', id: 'play-cpu', run: () => play('cpu') },
    { label: 'TRAINING', id: 'play-training', run: () => play('training') },
    { label: 'VS PLAYER', id: 'play-versus', run: () => play('versus') },
    ...(lastReplay ? [{ label: 'WATCH LAST MATCH', id: 'watch-replay', run: () => watch(lastReplay!) }] : []),
    { label: 'MOVE LIST', id: 'move-list', run: () => showMoves(FIGHTER_IDS[setup.p1], false, showTitle, true) },
    { label: 'SETTINGS', id: 'settings', run: () => showSettings(showTitle) },
    { label: 'PLAYER 1', options: names, value: setup.p1, onChange: (v) => ((setup.p1 = v), saveSetup()) },
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
  touch.show(false);
  pauseBtn.hidden = false;
  replayBar.show(false);
  document.body.dataset.scene = 'showcase';
}

/** Back from a showcase to the move list it was opened from. */
function leaveShowcase(): void {
  const r = showcaseReturn;
  showcaseReturn = null;
  if (r?.training) {
    session = begin(r.training);
    over = false;
    hud.start(r.training.match, true);
    touch.show(touchUi);
    document.body.dataset.scene = 'fight';
    pause(true);
    showMoves(r.fighter, true, () => pause(true), true);
  } else {
    startDemo();
    showMoves(r?.fighter ?? FIGHTER_IDS[setup.p1], false, showTitle, true);
  }
}

function pause(on: boolean): void {
  if (!session || demo || over) return;
  paused = on;
  sound.pauseMusic(on);
  touch.clear();
  clock.reset();
  if (!on) {
    pauseMenu.hide();
    return;
  }
  const s = session;
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
      { label: 'RESET POSITIONS (R)', run: () => (s.reset(), pause(false)) },
      { label: 'SEGMENT', options: STAGES[s.match.stage].segments.map((g, k) => `${k + 1} ${g.name.toUpperCase()}`), value: s.match.segment, onChange: (v) => s.setSegment(v) },
      { label: 'DUMMY', options: ['STAND', 'BLOCK ALL', 'CROUCH BLOCK', 'CPU'], value: DUMMIES.indexOf(s.dummy), onChange: (v) => (s.dummy = DUMMIES[v]) },
      { label: 'HIT BOXES (B)', options: ['OFF', 'ON'], value: arena.showBoxes ? 1 : 0, onChange: (v) => (arena.showBoxes = v === 1) },
    );
  }
  rows.splice(1, 0, { label: 'MOVE LIST', id: 'move-list', run: () => showMoves(s.match.fighters[0].fighter, s.training, () => pause(true), s.training) });
  rows.push({ label: 'SETTINGS', run: () => showSettings(() => pause(true)) });
  rows.push({ label: 'QUIT TO TITLE', run: startDemo });
  pauseMenu.show('PAUSED', rows);
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
  if (e.code === 'KeyR') session.reset();
  if (e.code === 'KeyB') arena.showBoxes = !arena.showBoxes;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(true);
});

const frame = [0, 0];

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
  arena.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

startDemo();
// Compile every shader now, not mid-fight.
renderer.compile(arena.scene, arena.camera);

renderer.setAnimationLoop((now) => {
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
  if (!paused && !over && !(replaying && replayPaused)) {
    // Replays can run at other speeds: scaled time, reset whenever the speed changes.
    const speed = replaying ? SPEEDS[replaySpeed] : s.options.mode === 'showcase' ? SHOWCASE_SPEEDS[showcaseSpeed] : 1;
    const n = clock.advance(now * speed, slowMo.scale);
    for (let i = 0; i < n; i++) {
      if (demo) frame[0] = frame[1] = 0;
      else readInputs();
      s.tick(frame[0], frame[1], ev);
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
  arena.render(m);
  if (!demo) {
    hud.update(m, s.adv.last, s.training ? `Dummy: ${s.dummy} · R reset · B boxes · Esc menu` : s.guideRun ? showcaseCaption(s) : '');
    const p1 = m.fighters[0];
    touch.setTD(!p1.tdUsed && p1.health > 0 && p1.health * 100 < p1.maxHealth * TD_HEALTH_PCT);
    touch.setInteract(propInReach(m, p1) >= 0);
  }
  inputSides(session);
  for (let i = 0; i < 2; i++) {
    inputDisplays[i].show(sides[i]);
    inputDisplays[i].update();
  }
  if (replaying && session === s) replayBar.update(s.replayFrame, s.replayFrames, replayPaused || over, SPEEDS[replaySpeed]);
  renderer.render(arena.scene, arena.camera);
});

document.getElementById('version')!.textContent = `v${VERSION} · ${BUILD_ID}`;

// Don't reload mid-match for an update: wait for the title screen.
const updateSW = registerSW({
  onNeedRefresh: () => {
    const check = () => (demo ? void updateSW(true) : setTimeout(check, 5000));
    check();
  },
});
