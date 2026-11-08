// Art viewer (dev server only, not part of the game build): loads a fighter
// GLB the way the game will (facing along x, clips played by sim frame) and
// draws the hurtbox and each move's hitboxes on its active frames, so a clip
// can be checked against its data. http://hive1:5174/tools/viewer/?f=dale
// Playwright drives it through window.__viewer (tools/art-check.mjs).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { publicUrl } from '../../src/core/paths';
import { FIGHTERS, type MoveData } from '../../src/sim';
import { toFloat } from '../../src/sim/fixed';

const FPS = 60;
const params = new URLSearchParams(location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15161c);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xdde4ff, 0x30281e, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(-3, 6, 8);
scene.add(key);
const floor = new THREE.GridHelper(12, 24, 0x4a4f7a, 0x2a2d44);
scene.add(floor);

// Sim boxes are drawn in the fighter's frame: x forward, y up.
const boxes = new THREE.Group();
scene.add(boxes);
const hurtMat = new THREE.LineBasicMaterial({ color: 0x4ad0ff });
const hitMat = new THREE.LineBasicMaterial({ color: 0xff4a3a });
const unit = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

function addBox(x0: number, x1: number, y0: number, y1: number, mat: THREE.LineBasicMaterial): void {
  const b = new THREE.LineSegments(unit, mat);
  const f = facing;
  b.scale.set(x1 - x0, y1 - y0, 0.6);
  b.position.set(f * (x0 + x1) / 2, (y0 + y1) / 2, 0);
  boxes.add(b);
}

let facing = 1;
// Facing left mirrors the model rather than turning it round, so the same
// side (the chest, in an open stance) stays toward the camera.
const holder = new THREE.Group();
scene.add(holder);
let model: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let clips: THREE.AnimationClip[] = [];
let action: THREE.AnimationAction | null = null;
let frame = 1;
let playing = params.get('frame') === null;
let acc = 0;
let fighterId = params.get('f') ?? 'dale';
let view = params.get('view') ?? 'game';
let showBoxes = params.get('boxes') !== '0';

const clipFrames = (c: THREE.AnimationClip) => Math.round(c.duration * FPS) + (isLoop(c) ? 0 : 1);
const isLoop = (c: THREE.AnimationClip) => !moveFor(c.name) && ['idle', 'walk_fwd', 'walk_back', 'crouch_idle'].includes(c.name);
function moveFor(name: string): MoveData | undefined {
  return FIGHTERS[fighterId]?.moves[name];
}

async function load(id: string): Promise<void> {
  fighterId = id;
  if (model) holder.remove(model);
  const gltf = await new GLTFLoader().loadAsync(publicUrl(`assets/fighters/${id}.glb`));
  model = gltf.scene;
  // The model faces glTF +Z: a quarter turn faces it along +x, and the holder's mirror flips it.
  model.rotation.y = Math.PI / 2;
  holder.add(model);
  mixer = new THREE.AnimationMixer(model);
  clips = gltf.animations;
  const sel = $<HTMLSelectElement>('clip');
  sel.innerHTML = clips.map((c) => `<option>${c.name}</option>`).join('');
  const want = params.get('clip');
  setClip(want && clips.some((c) => c.name === want) ? want : (clips[0]?.name ?? ''));
  const f = params.get('frame');
  if (f) setFrame(Number(f));
}

function setClip(name: string): void {
  const c = clips.find((k) => k.name === name);
  if (!c || !mixer) return;
  mixer.stopAllAction();
  action = mixer.clipAction(c);
  action.play();
  action.paused = true;
  $<HTMLSelectElement>('clip').value = name;
  setFrame(1);
}

/** Move frame n (1-based) is clip time (n - 1) / 60, as the game will sample it. */
function setFrame(n: number): void {
  if (!action) return;
  const total = clipFrames(action.getClip());
  frame = ((n - 1 + total) % total) + 1;
  action.time = (frame - 1) / FPS;
  mixer!.update(0);
  drawBoxes();
}

function drawBoxes(): void {
  boxes.clear();
  if (!showBoxes || !action) return;
  const f = FIGHTERS[fighterId];
  const mv = moveFor(action.getClip().name);
  const stance = mv?.stance === 'crouch' ? 'crouch' : 'stand';
  const h = f?.hurt[stance];
  if (h) addBox(toFloat(h.x), toFloat(h.x + h.w), toFloat(h.y), toFloat(h.y + h.h), hurtMat);
  for (const hit of mv?.hits ?? []) {
    if (frame >= hit.frames[0] && frame <= hit.frames[1]) {
      addBox(toFloat(hit.box.x), toFloat(hit.box.x + hit.box.w), toFloat(hit.box.y), toFloat(hit.box.y + hit.box.h), hitMat);
    }
  }
}

function setView(v: string): void {
  view = v;
  $<HTMLSelectElement>('view').value = v;
  if (v === 'game') camera.position.set(0, 2.1, 9);
  else if (v === 'three') camera.position.set(facing * 3.2, 1.9, 3.6);
  else camera.position.set(facing * 4.5, 1.2, 0);
  controls.target.set(0, 1, 0);
  controls.update();
}

function stats() {
  const box = model ? new THREE.Box3().setFromObject(model) : null;
  let tris = 0;
  const mats = new Set<string>();
  model?.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat.name);
  });
  return {
    fighter: fighterId,
    clip: action?.getClip().name ?? '',
    frame,
    frames: action ? clipFrames(action.getClip()) : 0,
    height: box ? box.max.y - box.min.y : 0,
    minY: box ? box.min.y : 0,
    triangles: tris,
    materials: [...mats],
    drawCalls: renderer.info.render.calls,
    clips: clips.map((c) => ({ name: c.name, frames: clipFrames(c), seconds: c.duration })),
  };
}

function info(): void {
  const s = stats();
  $('info').textContent = `${s.fighter}  ${s.clip}  frame ${s.frame}/${s.frames}\n${s.triangles} tris · ${s.materials.length} materials · ${s.drawCalls} draw calls · ${s.height.toFixed(2)} m tall`;
}

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (playing && action) {
    acc += dt;
    while (acc >= 1 / FPS) {
      acc -= 1 / FPS;
      setFrame(frame + 1);
    }
  }
  controls.update();
  renderer.render(scene, camera);
  info();
});

const fsel = $<HTMLSelectElement>('fighter');
fsel.innerHTML = Object.keys(FIGHTERS).map((id) => `<option>${id}</option>`).join('');
fsel.value = fighterId;
fsel.onchange = () => void load(fsel.value).catch((e) => ($('info').textContent = `no GLB for ${fsel.value} yet (${e})`));
$<HTMLSelectElement>('clip').onchange = (e) => setClip((e.target as HTMLSelectElement).value);
$<HTMLSelectElement>('view').onchange = (e) => setView((e.target as HTMLSelectElement).value);
$('play').onclick = () => {
  playing = !playing;
  $('play').textContent = playing ? 'PAUSE' : 'PLAY';
};
$('play').textContent = playing ? 'PAUSE' : 'PLAY';
$('prev').onclick = () => ((playing = false), ($('play').textContent = 'PLAY'), setFrame(frame - 1));
$('next').onclick = () => ((playing = false), ($('play').textContent = 'PLAY'), setFrame(frame + 1));
$('boxes').onclick = () => {
  showBoxes = !showBoxes;
  $('boxes').classList.toggle('on', showBoxes);
  drawBoxes();
};
$('facing').onclick = () => {
  facing = -facing;
  $('facing').textContent = facing > 0 ? 'FACING RIGHT' : 'FACING LEFT';
  holder.scale.x = facing;
  setView(view);
  drawBoxes();
};
setView(view);
if (params.get('facing') === 'left') $('facing').click();

declare global {
  interface Window {
    __viewerFirstActive: (clip: string) => number | undefined;
    __viewer: { ready: Promise<void>; stats: typeof stats; setClip: typeof setClip; setFrame: typeof setFrame; setView: typeof setView };
  }
}
window.__viewerFirstActive = (clip) => moveFor(clip)?.hits[0]?.frames[0];
window.__viewer = { ready: load(fighterId), stats, setClip, setFrame, setView };
