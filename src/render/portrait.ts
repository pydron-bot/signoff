/**
 * A fighter's face as a small picture (the select screen, the versus card,
 * the results), rendered from their GLB in three.js with the game's own
 * shading: the model posed (neutral, hurt or winning), a camera on the head
 * bone from where they face, a key, a fill and the rim. For
 * tools/portraits.mjs only (through the ?shots hook): the game shows the
 * files it writes and never runs this.
 */
import * as THREE from 'three';
import { FighterModel, loadFighterArt } from './fighterModel';

export type Mood = 'neutral' | 'hurt' | 'win';

/** Each mood's clip and frame (a stand-in plays where a GLB hasn't the clip). */
const POSES: Readonly<Record<Mood, readonly [string, number, boolean]>> = {
  neutral: ['idle', 1, true],
  hurt: ['hit_head_heavy', 4, false],
  win: ['win', 40, false],
};

/** Renders fighter `id`'s face, `size` pixels square, as a webp data URL. */
export async function renderPortrait(id: string, mood: Mood, size = 192): Promise<string> {
  const art = await loadFighterArt(id);
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11131f);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x302830, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(3, 3, 4);
  scene.add(key);
  const model = new FighterModel(art);
  model.showReflections(false, false);
  scene.add(model.root);
  const [clip, frame, loop] = POSES[mood];
  model.pose(clip, frame, loop);
  const face = new THREE.Vector3(0, 1.6, 0);
  model.facePosition(face);
  // The model faces +x: look at the face from in front of it, turned a little toward us.
  const camera = new THREE.PerspectiveCamera(20, 1, 0.05, 20);
  camera.position.set(face.x + 1.05, face.y + 0.06, face.z + 0.75);
  camera.lookAt(face.x, face.y - 0.02, face.z);
  renderer.render(scene, camera);
  // Onto an opaque canvas: the fighters write 0 into alpha (the tape's mask, fighterLight.ts).
  const flat = document.createElement('canvas');
  flat.width = flat.height = size;
  const g = flat.getContext('2d', { alpha: false })!;
  g.fillStyle = '#11131f';
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';
  const img = renderer.getContext();
  const px = new Uint8Array(size * size * 4);
  img.readPixels(0, 0, size, size, img.RGBA, img.UNSIGNED_BYTE, px);
  const data = g.createImageData(size, size);
  // Upside down (GL's rows start at the bottom), and opaque.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = ((size - 1 - y) * size + x) * 4;
      const o = (y * size + x) * 4;
      data.data[o] = px[i];
      data.data[o + 1] = px[i + 1];
      data.data[o + 2] = px[i + 2];
      data.data[o + 3] = 255;
    }
  g.putImageData(data, 0, 0);
  const url = flat.toDataURL('image/webp', 0.86);
  model.dispose();
  renderer.dispose();
  return url;
}
