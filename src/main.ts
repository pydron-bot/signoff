// Wiring only: logic lives in modules. Title (with a CPU-vs-CPU demo
// behind it) → a session (vs CPU, training, vs player) → results.
import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';
import type { CpuLevel } from './ai/cpu';
import { Sound, type SoundMode } from './audio/sound';
import { BUILD_ID } from './core/build';
import { VERSION } from './core/changelog';
import { FixedStep } from './game/loop';
import { DUMMIES, Session, type Mode } from './game/session';
import { initKeyboard, keyboardInput, menuPresses, padCount, padInput } from './input/devices';
import { TouchControls } from './input/touch';
import { Arena } from './render/arena';
import { FIGHTERS, Input, TD_HEALTH_PCT, fighterData, type SimEvent } from './sim';
import { propInReach } from './sim/stage';
import { Hud } from './ui/hud';
import { Glitch } from './ui/glitch';
import { Menu } from './ui/menu';

const FIGHTER_IDS = Object.keys(FIGHTERS);
const LEVELS: CpuLevel[] = ['easy', 'normal', 'hard'];
const SOUND_MODES: SoundMode[] = ['on', 'novoice', 'off'];
const SETUP_KEY = 'signoff.setup';

const app = document.getElementById('app')!;
const title = document.getElementById('title')!;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const arena = new Arena();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
arena.reduceMotion = reduceMotion;
const sound = new Sound();
const glitch = new Glitch(document.body, reduceMotion);
const hud = new Hud(document.body);
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
initKeyboard();
// Audio may only start from a gesture (iOS Safari).
for (const t of ['pointerdown', 'keydown'] as const) window.addEventListener(t, () => sound.unlock());

let touchUi = window.matchMedia('(pointer: coarse)').matches;
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && !touchUi) {
    touchUi = true;
    if (session && !demo) touch.show(true);
  }
});

// The chosen fighters and CPU level, remembered between visits.
const setup = { p1: 0, p2: 1, level: 1, sound: 0, studio: 0, models: 0 };
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
const ev: SimEvent[] = [];
const clock = new FixedStep();

function newSession(mode: Mode, p1: string, p2: string): Session {
  const s = new Session({ mode, p1, p2, level: LEVELS[setup.level], seed: (Date.now() & 0x7fffffff) || 1, studio: mode !== 'demo' && setup.studio === 1 });
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
  session = newSession('demo', FIGHTER_IDS[a], FIGHTER_IDS[b]);
  hud.hide();
  touch.show(false);
  pauseBtn.hidden = true;
  pauseMenu.hide();
  title.hidden = false;
  glitch.clear();
  document.body.dataset.scene = 'title';
  showTitle();
}

function play(mode: Mode): void {
  demo = false;
  over = false;
  paused = false;
  session = newSession(mode, FIGHTER_IDS[setup.p1], FIGHTER_IDS[setup.p2]);
  title.hidden = true;
  titleMenu.hide();
  hud.start(session.match, session.training);
  touch.show(touchUi);
  pauseBtn.hidden = false;
  document.body.dataset.scene = 'fight';
}

const names = FIGHTER_IDS.map((id) => `${fighterData(id).name} · ${fighterData(id).style}`);

function showTitle(): void {
  titleMenu.show('', [
    { label: 'VS CPU', id: 'play-cpu', run: () => play('cpu') },
    { label: 'TRAINING', id: 'play-training', run: () => play('training') },
    { label: 'VS PLAYER', id: 'play-versus', run: () => play('versus') },
    { label: 'PLAYER 1', options: names, value: setup.p1, onChange: (v) => ((setup.p1 = v), saveSetup()) },
    { label: 'PLAYER 2', options: names, value: setup.p2, onChange: (v) => ((setup.p2 = v), saveSetup()) },
    { label: 'CPU', options: ['EASY', 'NORMAL', 'HARD'], value: setup.level, onChange: (v) => ((setup.level = v), saveSetup()) },
    { label: 'RULES', options: ['LIVE BROADCAST', 'STUDIO'], value: setup.studio, onChange: (v) => ((setup.studio = v), saveSetup()) },
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
        saveSetup();
      },
    },
  ]);
}

function pause(on: boolean): void {
  if (!session || demo || over) return;
  paused = on;
  touch.clear();
  clock.reset();
  if (!on) {
    pauseMenu.hide();
    return;
  }
  const s = session;
  const rows: Parameters<Menu['show']>[1] = [
    { label: 'RESUME', run: () => pause(false) },
    { label: 'RESTART', run: () => play(s.options.mode) },
  ];
  if (s.training) {
    rows.push(
      { label: 'RESET POSITIONS (R)', run: () => (s.reset(), pause(false)) },
      { label: 'SEGMENT', options: ['1 THE STUDIO', '2 THE FORECAST', '3 FLOOD WARNING'], value: s.match.segment, onChange: (v) => s.setSegment(v) },
      { label: 'DUMMY', options: ['STAND', 'BLOCK ALL', 'CROUCH BLOCK', 'CPU'], value: DUMMIES.indexOf(s.dummy), onChange: (v) => (s.dummy = DUMMIES[v]) },
      { label: 'HIT BOXES (B)', options: ['OFF', 'ON'], value: arena.showBoxes ? 1 : 0, onChange: (v) => (arena.showBoxes = v === 1) },
    );
  }
  rows.push({ label: 'QUIT TO TITLE', run: startDemo });
  pauseMenu.show('PAUSED', rows);
}

function results(winner: number): void {
  over = true;
  touch.clear();
  const m = session!.match;
  const label = winner >= 0 && winner < 2 ? `${fighterData(m.fighters[winner].fighter).name.toUpperCase()} WINS` : 'DRAW';
  pauseMenu.show(label, [
    { label: 'REMATCH', id: 'rematch', run: () => (pauseMenu.hide(), play(session!.options.mode)) },
    { label: 'TITLE', run: startDemo },
  ]);
}

pauseBtn.addEventListener('click', () => pause(!paused));
window.addEventListener('keydown', (e) => {
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
    if (pauseMenu.open) {
      if (k === 'pause' && !over) pause(false);
      else pauseMenu.key(k);
    } else if (titleMenu.open && demo) titleMenu.key(k);
    else if (k === 'pause') pause(true);
  }
  const s = session;
  if (!s) return;
  if (!paused && !over) {
    const n = clock.advance(now);
    for (let i = 0; i < n; i++) {
      if (demo) frame[0] = frame[1] = 0;
      else readInputs();
      s.tick(frame[0], frame[1], ev);
      arena.step(s.match, ev);
      if (!demo) {
        hud.onEvents(s.match, ev);
        hud.step();
        sound.onEvents(s.match, ev);
        glitch.onEvents(ev);
      }
      glitch.step();
      for (const e of ev) {
        if (e.type !== 'matchOver') continue;
        if (demo) startDemo();
        else results(e.winner);
      }
      ev.length = 0;
      if (session !== s || over) break;
    }
  }
  const m = session!.match;
  arena.render(m);
  if (!demo) {
    hud.update(m, s.adv.last, s.training ? `Dummy: ${s.dummy} · R reset · B boxes · Esc menu` : '');
    const p1 = m.fighters[0];
    touch.setTD(!p1.tdUsed && p1.health > 0 && p1.health * 100 < p1.maxHealth * TD_HEALTH_PCT);
    touch.setInteract(propInReach(m, p1) >= 0);
  }
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
