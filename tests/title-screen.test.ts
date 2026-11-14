import { describe, expect, it } from 'vitest';
import { titleLists } from '../src/ui/screens/title';

describe('the title’s lists', () => {
  it('four rows, each list short, and everything the old title reached is still there', () => {
    const lists = titleLists(true);
    expect(lists.map((l) => l.label)).toEqual(['FIGHT', 'LEARN', 'WATCH', 'SETTINGS']);
    for (const l of lists) expect(l.items.length).toBeLessThanOrEqual(4);
    const ids = new Set(lists.flatMap((l) => [l.id, ...l.items.map((i) => i.id)]));
    // The old title's rows (fighters, stage, CPU and rules now live on the fighter select).
    for (const old of ['play-arcade', 'play-cpu', 'play-training', 'lessons', 'school', 'play-versus', 'play-watch', 'watch-replay', 'move-list', 'title-settings']) expect(ids.has(old)).toBe(true);
  });

  it('the last match shows only when there is one', () => {
    expect(titleLists(false).flatMap((l) => l.items.map((i) => i.id))).not.toContain('watch-replay');
  });
});
