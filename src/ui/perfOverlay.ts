/**
 * The performance overlay (Settings → PERFORMANCE, or the ` key): frame
 * rate, frame times, simulation steps a second, draw calls and triangles
 * against the iPhone budget, shaders and the drawing size. Reads what the
 * renderer already counts; redraws its text four times a second. Off, it
 * costs nothing: frame() returns at once.
 */
import * as THREE from 'three';
import { FrameStats, type FrameSummary } from '../game/frameStats';

/** The iPhone profile's budget (CLAUDE.md). */
export const DRAW_CALL_BUDGET = 100;
const REFRESH_MS = 250;

export class PerfOverlay {
  private readonly el: HTMLElement;
  private readonly stats = new FrameStats();
  private readonly sum: FrameSummary = { fps: 0, avgMs: 0, worstMs: 0, steps: 0, calls: 0, triangles: 0 };
  private readonly size = new THREE.Vector2();
  private on = false;
  /** A line of its own at the bottom: how the picture is drawn. */
  note: () => string = () => '';
  private shownAt = 0;

  constructor(
    parent: HTMLElement,
    private readonly renderer: THREE.WebGLRenderer,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'perf';
    this.el.hidden = true;
    parent.append(this.el);
  }

  get shown(): boolean {
    return this.on;
  }

  show(on: boolean): void {
    this.on = on;
    this.el.hidden = !on;
    this.stats.reset();
  }

  /** After each rendered frame: the time, and the simulation steps it ran. */
  frame(now: number, steps: number): void {
    if (!this.on) return;
    const r = this.renderer.info.render;
    this.stats.push(now, steps, r.calls, r.triangles);
    if (now - this.shownAt < REFRESH_MS) return;
    this.shownAt = now;
    const s = this.stats.summary(this.sum);
    this.renderer.getDrawingBufferSize(this.size);
    const programs = this.renderer.info.programs?.length ?? 0;
    this.el.innerHTML =
      `<b class="${grade(s.fps, 55, 45, true)}">${s.fps.toFixed(0)} FPS</b> ` +
      `${s.avgMs.toFixed(1)} ms · worst <span class="${grade(s.worstMs, 20, 34, false)}">${s.worstMs.toFixed(1)}</span><br>` +
      `SIM ${s.steps.toFixed(0)}/s · DRAW <span class="${s.calls > DRAW_CALL_BUDGET ? 'bad' : ''}">${s.calls}</span>/${DRAW_CALL_BUDGET} · TRI ${(s.triangles / 1000).toFixed(1)}k<br>` +
      `SHADERS ${programs} · ${this.size.x}×${this.size.y} @${this.renderer.getPixelRatio()}x<br>${this.note()}`;
  }

  /** After a pause: time jumped, so start counting afresh. */
  reset(): void {
    this.stats.reset();
  }
}

/** 'ok', 'warn' or 'bad', where higher is better or worse. */
function grade(v: number, warn: number, bad: number, higherBetter: boolean): string {
  if (higherBetter) return v < bad ? 'bad' : v < warn ? 'warn' : 'ok';
  return v > bad ? 'bad' : v > warn ? 'warn' : 'ok';
}
