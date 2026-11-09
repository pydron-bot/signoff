/**
 * The recordings: loaded once audio starts, from the list in
 * assets/audio/index.json, so only files that exist are fetched. Each slot
 * (src/audio/clips.ts) holds its takes; asking for one picks a different
 * take from last time. Until a slot has a recording (or while it loads),
 * `has` is false and the caller makes the synthesised sound instead.
 */
import { publicUrl } from '../core/paths';
import { FIGHTERS } from '../sim';
import { scriptOf } from '../game/banter';
import { Takes, parseClip } from './clips';

export const AUDIO_INDEX = 'assets/audio/index.json';

export interface AudioIndex {
  files: string[];
}

export class SampleBank {
  private readonly buffers = new Map<string, AudioBuffer[]>();
  private readonly takes = new Takes();
  private started = false;

  /** Starts loading (once): the index, then every file in it, each slot's takes in file order. */
  load(ctx: BaseAudioContext): void {
    if (this.started) return;
    this.started = true;
    void this.fetchAll(ctx);
  }

  private async fetchAll(ctx: BaseAudioContext): Promise<void> {
    let index: AudioIndex;
    try {
      const r = await fetch(publicUrl(AUDIO_INDEX));
      if (!r.ok) return;
      index = (await r.json()) as AudioIndex;
    } catch {
      return;
    }
    const fighters = Object.keys(FIGHTERS);
    const lines = (f: string) => scriptOf(f).map((l) => l.id);
    const files = [...(index.files ?? [])].sort();
    const loaded = new Map<string, AudioBuffer>();
    await Promise.all(
      files.map(async (file) => {
        if (!parseClip(file, fighters, lines)) return;
        try {
          const r = await fetch(publicUrl(`assets/audio/${file}`));
          if (!r.ok) return;
          loaded.set(file, await ctx.decodeAudioData(await r.arrayBuffer()));
        } catch {
          // A file that won't decode: that take is skipped, the synth covers if it was the only one.
        }
      }),
    );
    for (const file of files) {
      const buf = loaded.get(file);
      const key = buf && parseClip(file, fighters, lines);
      if (!buf || !key) continue;
      const list = this.buffers.get(key) ?? [];
      list.push(buf);
      this.buffers.set(key, list);
    }
  }

  has(key: string): boolean {
    return this.buffers.has(key);
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
