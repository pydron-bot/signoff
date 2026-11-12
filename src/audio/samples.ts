/**
 * The recordings, from the list in assets/audio/index.json, so only files
 * that exist are fetched. The bytes start downloading as soon as the page
 * asks (`prefetch`, no gesture needed); they're decoded once audio starts
 * (`load`), and each recording can play the moment it's decoded. The cold
 * open's lines go first: they're the first thing a match says. Each slot
 * (src/audio/clips.ts) holds its takes in file order; asking for one picks
 * a different take from last time. Until a slot has a recording, `has` is
 * false and the caller makes the synthesised sound instead.
 */
import { publicUrl } from '../core/paths';
import { FIGHTERS } from '../sim';
import { scriptOf } from '../game/banter';
import { Takes, parseClip } from './clips';

export const AUDIO_INDEX = 'assets/audio/index.json';

/** Downloads at once: enough to keep the line busy, few enough not to starve the models loading beside them. */
const PARALLEL = 6;

export interface AudioIndex {
  files: string[];
}

export class SampleBank {
  private readonly buffers = new Map<string, AudioBuffer[]>();
  private readonly takes = new Takes();
  /** Each slot's files, in file order. */
  private readonly files = new Map<string, string[]>();
  private readonly decoded = new Map<string, AudioBuffer>();
  /** Each slot's files not yet decoded (or failed). */
  private readonly waiting = new Map<string, number>();
  /** Each file's bytes, once the index is in. */
  private bytes: Promise<Map<string, Promise<ArrayBuffer | null>>> | null = null;
  private decoding = false;
  /** The index is in: `waiting` knows every slot. */
  private indexed = false;

  /** Starts downloading (once): the index, then every file in it, the lines first. */
  prefetch(): void {
    this.bytes ??= this.fetchAll();
  }

  /** Decodes (once) everything downloaded or downloading; each slot fills in as its takes decode. */
  load(ctx: BaseAudioContext): void {
    if (this.decoding) return;
    this.decoding = true;
    this.prefetch();
    void this.decodeAll(ctx);
  }

  private async fetchAll(): Promise<Map<string, Promise<ArrayBuffer | null>>> {
    const out = new Map<string, Promise<ArrayBuffer | null>>();
    let index: AudioIndex;
    try {
      const r = await fetch(publicUrl(AUDIO_INDEX));
      if (!r.ok) return out;
      index = (await r.json()) as AudioIndex;
    } catch {
      return out;
    } finally {
      this.indexed = true;
    }
    const fighters = Object.keys(FIGHTERS);
    const lines = (f: string) => scriptOf(f).map((l) => l.id);
    const known: [string, string][] = [];
    for (const file of [...(index.files ?? [])].sort()) {
      const key = parseClip(file, fighters, lines);
      if (!key) continue;
      known.push([file, key]);
      this.files.set(key, [...(this.files.get(key) ?? []), file]);
      this.waiting.set(key, (this.waiting.get(key) ?? 0) + 1);
    }
    // The cold open's lines first, then the rest.
    const queue = [...known.filter(([f]) => /\/line_/.test(f)), ...known.filter(([f]) => !/\/line_/.test(f))].map(([f]) => f);
    const ready = new Map<string, (b: ArrayBuffer | null) => void>();
    for (const file of queue) out.set(file, new Promise((res) => ready.set(file, res)));
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < queue.length) {
        const file = queue[next++];
        let buf: ArrayBuffer | null = null;
        try {
          const r = await fetch(publicUrl(`assets/audio/${file}`));
          if (r.ok) buf = await r.arrayBuffer();
        } catch {
          // Not downloaded: the synth covers that take.
        }
        ready.get(file)!(buf);
      }
    };
    void Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    return out;
  }

  private async decodeAll(ctx: BaseAudioContext): Promise<void> {
    const bytes = await this.bytes!;
    const keyOf = new Map<string, string>();
    for (const [key, files] of this.files) for (const f of files) keyOf.set(f, key);
    // In download order, so the lines decode first too.
    for (const [file, pending] of bytes) {
      void pending.then(async (b) => {
        let buf: AudioBuffer | null = null;
        if (b) {
          try {
            buf = await ctx.decodeAudioData(b);
          } catch {
            // A file that won't decode: that take is skipped, the synth covers if it was the only one.
          }
        }
        this.settle(keyOf.get(file)!, file, buf);
      });
    }
  }

  private settle(key: string, file: string, buf: AudioBuffer | null): void {
    this.waiting.set(key, (this.waiting.get(key) ?? 1) - 1);
    if (!buf) return;
    this.decoded.set(file, buf);
    const list = (this.files.get(key) ?? []).flatMap((f) => this.decoded.get(f) ?? []);
    this.buffers.set(key, list);
  }

  has(key: string): boolean {
    return this.buffers.has(key);
  }

  /** True while the slot has a recording on its way (listed, not yet decoded): worth a moment's wait. */
  pending(key: string): boolean {
    if (!this.decoding || this.buffers.has(key)) return false;
    return !this.indexed || (this.waiting.get(key) ?? 0) > 0;
  }

  /** A take of this slot, not the same as last time; null if there are none. */
  take(key: string, rand: () => number = Math.random): AudioBuffer | null {
    const list = this.buffers.get(key);
    if (!list) return null;
    return list[this.takes.pick(key, list.length, rand)];
  }

  /** How long the slot's first take lasts (seconds), or 0 without one: the cold open waits for a recorded line. */
  seconds(key: string): number {
    return this.buffers.get(key)?.[0].duration ?? 0;
  }
}
