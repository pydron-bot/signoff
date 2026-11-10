/**
 * The living room at 3:33 a.m. (docs/BLENDER-TODO.md, step 24 C): the title
 * is seen from a sofa, the attract mode on the TV across the room, and
 * starting a match pushes in through the glass. The fight scene is drawn
 * into a 4:3 buffer that the TV's `screen` shows; the room is lit by the
 * screen (a point light the picture's colour) and the streetlight through
 * the blinds (baked). Until room.glb loads, the post pass's shader TV
 * stands in (src/render/post.ts, `crt`).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { publicUrl } from '../core/paths';
import { lambert } from './fighterModel';
import type { Grade } from './post';
import type { SegmentLights } from './stageModel';

/** The TV's picture, 4:3. */
const TV_WIDTH = 512;
const TV_HEIGHT = 384;
export const TV_ASPECT = TV_WIDTH / TV_HEIGHT;
/** The picture past white a little, so the glass glows. */
const SCREEN_GAIN = 1.25;
/** The light the screen throws on the room: candela, and how far it reaches. */
const GLOW = 4;
const GLOW_REACH = 6;
/**
 * Where the title rests, of the way from camera_start to camera_end: far
 * enough in that the TV's picture shows round the menu, with the room
 * still about it.
 */
const REST = 0.45;
/** Of the push, the share spent crossing the room; the rest closes in until the screen fills the width. */
const CROSS = 0.8;
/** The room's grade: cool, a little crushed. */
export const ROOM_GRADE: Readonly<Grade> = { lift: [0, 0.002, 0.01], gain: [0.96, 0.99, 1.06], saturation: 0.95, contrast: 1.12, bloom: 0.7 };

interface Shot {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

const loader = new GLTFLoader();
const textures = new THREE.TextureLoader();

export class Room {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 30);
  /** The TV's picture: the fight scene drawn at 4:3. */
  private readonly tv: THREE.WebGLRenderTarget;
  private readonly glow = new THREE.PointLight(0x8090ff, GLOW, GLOW_REACH, 2);
  private readonly ambient = new THREE.HemisphereLight(0x202838, 0x080608, 0.25);
  private start: Shot | null = null;
  private end: Shot | null = null;
  private aspect = 16 / 9;
  private flicker = 0;
  /** The screen's colour, eased toward the picture's. */
  private readonly tone = new THREE.Color(0x8090ff);

  constructor(hdr: boolean) {
    this.tv = new THREE.WebGLRenderTarget(TV_WIDTH, TV_HEIGHT, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    // glTF's UVs run down the image, a render target's up.
    this.tv.texture.repeat.set(1, -1);
    this.tv.texture.offset.set(0, 1);
    this.scene.background = new THREE.Color(0x020204);
    this.scene.add(this.ambient, this.glow);
  }

  /** Whether the room has loaded: until then the shader TV stands in. */
  get ready(): boolean {
    return this.end !== null;
  }

  /** Loads room.glb and its light map; resolves either way. */
  load(): Promise<void> {
    return loader.loadAsync(publicUrl('assets/stages/room.glb')).then(
      (g) => {
        let rig: SegmentLights | undefined;
        const set: THREE.MeshLambertMaterial[] = [];
        for (const o of [...g.scene.children]) {
          if (o.name === 'lights') {
            rig = (JSON.parse(String(o.userData.segments ?? '[]')) as SegmentLights[])[0];
            continue;
          }
          if (o.name === 'camera_start' || o.name === 'camera_end') {
            const shot = { position: o.position.clone(), quaternion: o.quaternion.clone(), fov: Number(o.userData.fov) || 30 };
            if (o.name === 'camera_start') this.start = shot;
            else this.end = shot;
            continue;
          }
          o.traverse((c) => {
            const m = c as THREE.Mesh;
            if (!m.isMesh) return;
            if (o.name === 'screen') {
              const mat = new THREE.MeshBasicMaterial({ map: this.tv.texture });
              mat.color.setScalar(SCREEN_GAIN);
              m.material = mat;
              this.glow.position.copy(o.position);
              return;
            }
            const mat = lambert(m.material as THREE.MeshStandardMaterial);
            m.material = mat;
            set.push(mat);
          });
          this.scene.add(o);
        }
        if (!this.start || !this.end) {
          this.end = null;
          return;
        }
        // The glow sits a little in front of the glass.
        const toViewer = this.start.position.clone().sub(this.glow.position).setY(0).normalize();
        this.glow.position.addScaledVector(toViewer, 0.3);
        if (!rig?.lightMapFile) return;
        return textures.loadAsync(publicUrl(`assets/stages/${rig.lightMapFile}`)).then((t) => {
          t.flipY = false;
          t.channel = 1;
          t.colorSpace = THREE.SRGBColorSpace;
          for (const m of set) {
            m.lightMap = t;
            m.lightMapIntensity = rig.lightMap ?? 1;
          }
        });
      },
      () => {
        this.end = null;
      },
    );
  }

  resize(w: number, h: number): void {
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
  }

  /** Draws the fight scene into the TV's picture. */
  drawTv(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    const was = renderer.getRenderTarget();
    renderer.setRenderTarget(this.tv);
    renderer.render(scene, camera);
    renderer.setRenderTarget(was);
  }

  /**
   * Places the camera, 0 at the title's rest to 1 through the glass, and
   * lights the room with the screen: `tone` the picture's colour, `flash`
   * a hit's brightness (0 to 1).
   */
  update(push: number, tone: THREE.Color, flash: number, still: boolean): void {
    const a = this.start!;
    const b = this.end!;
    const p = REST + (1 - REST) * push;
    const cross = ease(Math.min(1, p / CROSS));
    const c = this.camera;
    c.position.lerpVectors(a.position, b.position, cross);
    c.quaternion.slerpQuaternions(a.quaternion, b.quaternion, cross);
    // Then in until the 4:3 screen, which fills the height at the end, fills the width too.
    const fill = ((2 * Math.atan((Math.tan(((b.fov / 2) * Math.PI) / 180) * TV_ASPECT) / Math.max(TV_ASPECT, this.aspect))) * 180) / Math.PI;
    c.fov = p <= CROSS ? a.fov + (b.fov - a.fov) * cross : b.fov + (fill - b.fov) * ease((p - CROSS) / (1 - CROSS));
    c.updateProjectionMatrix();
    this.tone.lerp(tone, 0.1);
    // A tube's light never quite sits still.
    if (!still) this.flicker = 0.92 + 0.08 * Math.random();
    else this.flicker = 1;
    this.glow.color.copy(this.tone);
    this.glow.intensity = GLOW * this.flicker * (1 + 1.5 * flash);
  }
}

function ease(t: number): number {
  return t * t * (3 - 2 * t);
}
