/**
 * A list of things a player has cleared (trials, lessons), kept in
 * localStorage under one signoff.* key as a list of ids. No DOM here
 * beyond storage, which may be missing (private browsing, tests).
 */
export class Cleared {
  private readonly ids: Set<string>;

  constructor(readonly key: string) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(globalThis.localStorage?.getItem(key) ?? 'null');
    } catch {
      // unreadable: start empty
    }
    this.ids = new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /** How many cleared ids start with `prefix`. */
  count(prefix: string): number {
    let n = 0;
    for (const id of this.ids) if (id.startsWith(prefix)) n++;
    return n;
  }

  /** Remembers one; true if it's new. */
  mark(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);
    try {
      globalThis.localStorage?.setItem(this.key, JSON.stringify([...this.ids]));
    } catch {
      // Private browsing: it's remembered until the page closes.
    }
    return true;
  }
}
