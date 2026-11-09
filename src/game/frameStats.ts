/**
 * Frame timing for the performance overlay: the last second of frames,
 * summed up on demand. Pure and allocation-free (rings of numbers), so
 * measuring doesn't disturb what it measures.
 */

/** Frames kept: a second at 240 Hz. */
const RING = 240;

export interface FrameSummary {
  /** Display frames a second. */
  fps: number;
  /** Mean and worst frame time, ms. */
  avgMs: number;
  worstMs: number;
  /** Simulation steps a second (60 at full speed; fewer in slow motion or when the device can't keep up). */
  steps: number;
  /** Draw calls and triangles: the most in any frame of the window. */
  calls: number;
  triangles: number;
}

export class FrameStats {
  private readonly dt = new Float64Array(RING);
  private readonly steps = new Uint8Array(RING);
  private readonly calls = new Uint32Array(RING);
  private readonly tris = new Uint32Array(RING);
  private next = 0;
  private count = 0;
  private last = -1;

  /** One display frame at time `now` (ms), with the steps it ran and what it drew. */
  push(now: number, steps: number, calls: number, triangles: number): void {
    if (this.last < 0) {
      this.last = now;
      return;
    }
    const i = this.next;
    this.dt[i] = now - this.last;
    this.steps[i] = Math.min(255, steps);
    this.calls[i] = calls;
    this.tris[i] = triangles;
    this.last = now;
    this.next = (i + 1) % RING;
    this.count = Math.min(RING, this.count + 1);
  }

  /** Forget the past (after a pause, when time jumps). */
  reset(): void {
    this.count = 0;
    this.last = -1;
  }

  /** The last `windowMs` of frames, into `out`. */
  summary(out: FrameSummary, windowMs = 1000): FrameSummary {
    let time = 0;
    let n = 0;
    let worst = 0;
    let steps = 0;
    let calls = 0;
    let tris = 0;
    for (let k = 1; k <= this.count && time < windowMs; k++) {
      const i = (this.next - k + RING) % RING;
      time += this.dt[i];
      n++;
      worst = Math.max(worst, this.dt[i]);
      steps += this.steps[i];
      calls = Math.max(calls, this.calls[i]);
      tris = Math.max(tris, this.tris[i]);
    }
    const secs = time / 1000;
    out.fps = secs > 0 ? n / secs : 0;
    out.avgMs = n > 0 ? time / n : 0;
    out.worstMs = worst;
    out.steps = secs > 0 ? steps / secs : 0;
    out.calls = calls;
    out.triangles = tris;
    return out;
  }
}
