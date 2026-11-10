/**
 * The super cut-in: as a fighter starts Technical Difficulties (or boosts a
 * special, more briefly), the broadcast cuts to a close-up of their face in
 * a band across the top of the picture, framed in colour bars, sliding in
 * from their side. The close-up is the same scene from a second camera, drawn
 * into the post pass's buffer before the tape effects (src/render/post.ts),
 * so it looks like part of the same signal; the bars are drawn by the
 * composite. About a dozen extra draw calls while it shows, none otherwise.
 * Stepped with the simulation; nothing is allocated per frame.
 */
import * as THREE from 'three';
import type { MatchState, SimEvent } from '../sim';
import { hurtBox } from '../sim/combat';
import { toFloat } from '../sim/fixed';

/** Steps it shows: a super, a boost. */
const SUPER_STEPS = 32;
const BOOST_STEPS = 16;
/** Steps to slide in and out. */
const SLIDE = 4;
/** The band, in uv of the picture: its height range, and its width. */
const BAND_Y0 = 0.58;
const BAND_Y1 = 0.84;
const BAND_W = 0.4;
/** The close-up: lens, and where the camera sits from the face (toward where they look, and toward us). */
const LENS = 18;
const OUT = 0.85;
const TOWARD = 0.75;
/** The face sits this far below the top of the hurtbox (m). */
const FACE_DOWN = 0.15;

/** Where the band is this frame, in uv of the picture (x0, y0, x1, y1), and 0 when there's none. */
export interface CutInRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  on: number;
}

export class CutIn {
  /** No slide in or out. */
  reduceMotion = false;
  readonly camera = new THREE.PerspectiveCamera(LENS, 2.5, 0.1, 40);
  readonly rect: CutInRect = { x0: 0, y0: BAND_Y0, x1: 0, y1: BAND_Y1, on: 0 };
  private player = 0;
  private left = 0;
  private life = 1;
  private readonly face = new THREE.Vector3();

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'superStart') this.show(e.player, SUPER_STEPS);
      // A boost doesn't cut short a super's.
      else if (e.type === 'boost' && !(this.left > BOOST_STEPS && this.player !== e.player)) this.show(e.player, BOOST_STEPS);
    }
  }

  private show(player: number, steps: number): void {
    this.player = player;
    this.life = this.left = steps;
  }

  step(): void {
    if (this.left > 0) this.left--;
  }

  clear(): void {
    this.left = 0;
    this.rect.on = 0;
  }

  /** Whether it shows now. */
  get active(): boolean {
    return this.left > 0;
  }

  /**
   * Each drawn frame: the band's place (sliding in from the fighter's side of
   * the screen) and the close-up camera on their face. `aspect` is the
   * picture's width over height.
   */
  place(m: MatchState, aspect: number): CutInRect {
    const r = this.rect;
    if (this.left <= 0) {
      r.on = 0;
      return r;
    }
    const f = m.fighters[this.player];
    const o = m.fighters[1 - this.player];
    // From the side of the screen the fighter is on.
    const fromLeft = f.x <= o.x;
    const t = this.life - this.left;
    const slide = this.reduceMotion ? 1 : Math.min(1, t / SLIDE, this.left / SLIDE);
    const ease = 1 - (1 - slide) * (1 - slide);
    // Off the edge to its place, a little in from the edge.
    const start = fromLeft ? -BAND_W : 1;
    const end = fromLeft ? 0.04 : 0.96 - BAND_W;
    r.x0 = start + (end - start) * ease;
    r.x1 = r.x0 + BAND_W;
    r.y0 = BAND_Y0;
    r.y1 = BAND_Y1;
    r.on = 1;
    // The face: near the top of the hurtbox, looked at from where they face, a little toward us.
    const box = hurtBox(f);
    this.face.set(toFloat(f.x), toFloat(f.y) + toFloat(box.y + box.h) - FACE_DOWN, 0);
    this.camera.aspect = (BAND_W * aspect) / (BAND_Y1 - BAND_Y0);
    this.camera.position.set(this.face.x + f.facing * OUT, this.face.y + 0.05, TOWARD);
    this.camera.lookAt(this.face);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    return r;
  }
}
