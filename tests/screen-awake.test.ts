import { describe, expect, it } from 'vitest';
import { ScreenAwake } from '../src/core/screenAwake';

/** A stand-in for the browser: wake locks that can be refused, and a page that can be hidden. */
function fakes(refuse = false) {
  const listeners: Record<string, (() => void)[]> = {};
  const page = {
    hidden: false,
    addEventListener: (type: string, fn: () => void) => (listeners[type] ??= []).push(fn),
    fire: (type: string) => listeners[type]?.forEach((fn) => fn()),
  };
  let requests = 0;
  const live: { released: boolean; drop: () => void }[] = [];
  const nav = {
    wakeLock: {
      request: () => {
        requests++;
        if (refuse) return Promise.reject(new Error('NotAllowedError'));
        const on: (() => void)[] = [];
        const l = {
          released: false,
          release: async () => {
            l.released = true;
            on.forEach((fn) => fn());
          },
          addEventListener: (_: string, fn: () => void) => on.push(fn),
          // The browser dropping it (the page hidden).
          drop: () => {
            l.released = true;
            on.forEach((fn) => fn());
          },
        };
        live.push(l);
        return Promise.resolve(l as unknown as WakeLockSentinel);
      },
    },
  };
  return { page, nav, live, requests: () => requests, refuse: (r: boolean) => (refuse = r) };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('screen awake', () => {
  it('holds a lock while wanted, and lets it go after', async () => {
    const f = fakes();
    const s = new ScreenAwake(f.nav, f.page);
    s.want(true);
    s.want(true);
    await settle();
    expect(s.held).toBe(true);
    expect(f.requests()).toBe(1);
    s.want(false);
    await settle();
    expect(s.held).toBe(false);
    expect(f.live[0].released).toBe(true);
  });

  it('takes it again when the page comes back', async () => {
    const f = fakes();
    const s = new ScreenAwake(f.nav, f.page);
    s.want(true);
    await settle();
    f.page.hidden = true;
    f.live[0].drop();
    f.page.fire('visibilitychange');
    await settle();
    expect(s.held).toBe(false);
    f.page.hidden = false;
    f.page.fire('visibilitychange');
    await settle();
    expect(s.held).toBe(true);
    expect(f.requests()).toBe(2);
  });

  it('tries a refused request again on the next tap', async () => {
    const f = fakes(true);
    const s = new ScreenAwake(f.nav, f.page);
    s.want(true);
    await settle();
    expect(s.held).toBe(false);
    f.refuse(false);
    f.page.fire('pointerdown');
    await settle();
    expect(s.held).toBe(true);
  });

  it('a lock that arrives once it is no longer wanted is let go', async () => {
    const f = fakes();
    const s = new ScreenAwake(f.nav, f.page);
    s.want(true);
    s.want(false);
    await settle();
    expect(s.held).toBe(false);
    expect(f.live[0].released).toBe(true);
  });

  it('does nothing where there are no wake locks', () => {
    const f = fakes();
    const s = new ScreenAwake({}, f.page);
    s.want(true);
    expect(s.held).toBe(false);
  });
});
