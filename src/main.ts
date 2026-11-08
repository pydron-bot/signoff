// Wiring only: logic lives in modules. For now, a test card behind the
// title: SMPTE-style colour bars on a slowly drifting CRT.
import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';
import { BUILD_ID } from './core/build';
import { VERSION } from './core/changelog';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0f);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
camera.position.set(0, 0, 6);

// The colour bars, dimmed so the title reads over them.
const BARS = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
const bars = new THREE.Group();
const barGeo = new THREE.PlaneGeometry(1, 3);
BARS.forEach((c, i) => {
  const m = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.35) }));
  m.position.x = i - (BARS.length - 1) / 2;
  bars.add(m);
});
scene.add(bars);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setAnimationLoop((t) => {
  if (!reduceMotion) {
    bars.rotation.y = Math.sin(t / 2400) * 0.12;
    bars.position.y = Math.sin(t / 900) * 0.02;
  }
  renderer.render(scene, camera);
});

document.getElementById('version')!.textContent = `v${VERSION} · ${BUILD_ID}`;

// There's no match to interrupt yet, so take updates straight away.
const updateSW = registerSW({ onNeedRefresh: () => void updateSW(true) });
