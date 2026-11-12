import { afterEach, describe, expect, it, vi } from 'vitest';
import { SampleBank } from '../src/audio/samples';

/** A promise resolved from outside. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** A bank whose index lists `files`; each file decodes when the test says so. */
function setup(files: string[]) {
  const fetched: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('index.json')) return { ok: true, json: async () => ({ files }) };
    const name = url.split('assets/audio/')[1];
    fetched.push(name);
    const bytes = new TextEncoder().encode(name).buffer;
    return { ok: true, arrayBuffer: async () => bytes };
  });
  const decodes = new Map<string, ReturnType<typeof deferred<AudioBuffer>>>();
  const ctx = {
    decodeAudioData: (b: ArrayBuffer) => {
      const name = new TextDecoder().decode(b);
      const d = deferred<AudioBuffer>();
      decodes.set(name, d);
      return d.promise;
    },
  } as unknown as BaseAudioContext;
  const decode = async (name: string, duration: number) => {
    decodes.get(name)!.resolve({ duration } as AudioBuffer);
    await flush();
  };
  return { bank: new SampleBank(), ctx, fetched, decodes, decode };
}

afterEach(() => vi.unstubAllGlobals());

describe('the recordings', () => {
  it('download the cold open lines first, and skip names the game does not know', async () => {
    const { bank, fetched } = setup(['dale/shout_1.m4a', 'hits/thud_1.m4a', 'dale/line_open_1.m4a', 'nobody/shout_1.m4a']);
    bank.prefetch();
    for (let i = 0; i < 5; i++) await flush();
    expect(fetched[0]).toBe('dale/line_open_1.m4a');
    expect(fetched).not.toContain('nobody/shout_1.m4a');
    expect(fetched).toHaveLength(3);
  });

  it('are not waited for before audio starts', async () => {
    const { bank } = setup(['dale/line_open_1.m4a']);
    bank.prefetch();
    await flush();
    expect(bank.pending('dale/line_open_1')).toBe(false);
  });

  it('play as each one decodes, not once they all have, takes in file order', async () => {
    const { bank, ctx, decode } = setup(['dale/line_open_1.m4a', 'dale/shout_1.m4a', 'dale/shout_2.m4a']);
    bank.load(ctx);
    for (let i = 0; i < 5; i++) await flush();
    expect(bank.pending('dale/line_open_1')).toBe(true);
    expect(bank.has('dale/line_open_1')).toBe(false);
    await decode('dale/line_open_1.m4a', 2.5);
    expect(bank.has('dale/line_open_1')).toBe(true);
    expect(bank.pending('dale/line_open_1')).toBe(false);
    expect(bank.seconds('dale/line_open_1')).toBe(2.5);
    expect(bank.has('dale/shout')).toBe(false);
    // The second take first: the slot plays it at once, and the first take still goes ahead of it.
    await decode('dale/shout_2.m4a', 0.8);
    expect(bank.seconds('dale/shout')).toBe(0.8);
    await decode('dale/shout_1.m4a', 0.6);
    expect(bank.seconds('dale/shout')).toBe(0.6);
  });

  it('stop being waited for when a file will not decode', async () => {
    const { bank, ctx, decodes } = setup(['dale/line_open_1.m4a']);
    bank.load(ctx);
    for (let i = 0; i < 5; i++) await flush();
    expect(bank.pending('dale/line_open_1')).toBe(true);
    decodes.get('dale/line_open_1.m4a')!.reject(new Error('bad file'));
    await flush();
    await flush();
    expect(bank.pending('dale/line_open_1')).toBe(false);
    expect(bank.has('dale/line_open_1')).toBe(false);
  });

  it('a slot with no recording is never waited for', async () => {
    const { bank, ctx } = setup(['dale/line_open_1.m4a']);
    bank.load(ctx);
    for (let i = 0; i < 5; i++) await flush();
    expect(bank.pending('rox/line_open_1')).toBe(false);
  });
});
