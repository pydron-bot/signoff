interface Locks {
  wakeLock?: Pick<WakeLock, 'request'>;
}

interface Page {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange' | 'pointerdown' | 'keydown', fn: () => void): void;
}

/**
 * Keeps the screen on while wanted, through the Screen Wake Lock API
 * (Safari 16.4+, Chrome); where there's none, it does nothing. The browser
 * drops the lock whenever the page is hidden, so it's taken again on the
 * way back, and a refused request (some browsers want a tap first) is
 * tried again on the next tap or key.
 */
export class ScreenAwake {
  private wanted = false;
  private lock: WakeLockSentinel | null = null;
  private asking = false;

  constructor(
    private readonly nav: Locks = navigator,
    private readonly page: Page = document,
  ) {
    const retry = () => this.sync();
    page.addEventListener('visibilitychange', retry);
    page.addEventListener('pointerdown', retry);
    page.addEventListener('keydown', retry);
  }

  /** Whether the screen should stay on; cheap to call every frame. */
  want(on: boolean): void {
    if (on === this.wanted) return;
    this.wanted = on;
    this.sync();
  }

  /** Whether a lock is held now. */
  get held(): boolean {
    return this.lock !== null;
  }

  private sync(): void {
    if (!this.wanted) {
      const l = this.lock;
      this.lock = null;
      if (l) void l.release().catch(() => {});
      return;
    }
    if (this.lock || this.asking || this.page.hidden || !this.nav.wakeLock) return;
    this.asking = true;
    this.nav.wakeLock.request('screen').then(
      (l) => {
        this.asking = false;
        // No longer wanted by the time it came: let it go.
        if (!this.wanted) {
          void l.release().catch(() => {});
          return;
        }
        this.lock = l;
        l.addEventListener('release', () => {
          if (this.lock === l) this.lock = null;
        });
      },
      () => {
        this.asking = false;
      },
    );
  }
}
