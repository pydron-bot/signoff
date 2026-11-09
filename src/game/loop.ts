/**
 * Fixed-step timing: the display may run at 60 or 120 Hz (or stutter), but
 * the simulation always steps at exactly 60 a second.
 */
export const STEP_MS = 1000 / 60;

export class FixedStep {
  private acc = 0;
  private last = -1;

  constructor(private readonly maxSteps = 4) {}

  /**
   * Steps to run for a frame at time `now` (ms), with time running at
   * `scale` (slow motion below 1). A long stall drops time rather than
   * fast-forwarding.
   */
  advance(now: number, scale = 1): number {
    if (this.last < 0) this.last = now;
    this.acc += Math.min(now - this.last, STEP_MS * this.maxSteps) * scale;
    this.last = now;
    let n = 0;
    while (this.acc >= STEP_MS - 0.01 && n < this.maxSteps) {
      this.acc -= STEP_MS;
      n++;
    }
    if (this.acc < 0) this.acc = 0;
    return n;
  }

  /** Forget elapsed time (after a pause). */
  reset(): void {
    this.last = -1;
    this.acc = 0;
  }
}
