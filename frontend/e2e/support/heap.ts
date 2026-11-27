import { type Page } from '@playwright/test';

/** What the heap holds: the bytes of every object, and the bytes and count by kind. */
export interface Heap {
  bytes: number;
  byKind: Map<string, { count: number; bytes: number }>;
}

/**
 * The page's heap after the browser has collected its garbage (L2-048 criterion 4), from a
 * heap snapshot taken through the DevTools protocol. Compiled code is left out: V8 compiles
 * and optimises the game's functions as they run again and again, which settles by itself
 * and is not memory the game holds (docs/adr/0038).
 */
export async function heapAfterGarbageCollection(page: Page): Promise<Heap> {
  const devTools = await page.context().newCDPSession(page);
  try {
    // Twice: the first pass can leave what only a finalizer of the first released.
    await devTools.send('HeapProfiler.collectGarbage');
    await devTools.send('HeapProfiler.collectGarbage');
    const chunks: string[] = [];
    devTools.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
    await devTools.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    return weigh(JSON.parse(chunks.join('')) as Snapshot);
  } finally {
    await devTools.detach();
  }
}

/** How far above the first the last heap is, as a fraction: 0.1 is 10% above. */
export function growth(first: Heap, last: Heap): number {
  return (last.bytes - first.bytes) / first.bytes;
}

/** The kinds of object that grew most between two heaps, for the report. */
export function grownMost(first: Heap, last: Heap, how = 8): string {
  return [...last.byKind]
    .map(([kind, now]) => {
      const then = first.byKind.get(kind) ?? { count: 0, bytes: 0 };
      return { kind, count: now.count - then.count, bytes: now.bytes - then.bytes };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, how)
    .map(({ kind, count, bytes }) => `${kind} +${count} (+${bytes} bytes)`)
    .join('; ');
}

interface Snapshot {
  snapshot: { meta: { node_fields: string[]; node_types: [string[], ...unknown[]] } };
  nodes: number[];
  strings: string[];
}

function weigh({ snapshot, nodes, strings }: Snapshot): Heap {
  const fields = snapshot.meta.node_fields;
  const width = fields.length;
  const type = fields.indexOf('type');
  const name = fields.indexOf('name');
  const size = fields.indexOf('self_size');
  const types = snapshot.meta.node_types[0];
  const byKind = new Map<string, { count: number; bytes: number }>();
  let bytes = 0;
  for (let node = 0; node < nodes.length; node += width) {
    const kind = types[nodes[node + type]];
    if (kind === 'code') continue;
    const self = nodes[node + size];
    bytes += self;
    const key = `${kind} ${strings[nodes[node + name]].slice(0, 60)}`;
    const entry = byKind.get(key) ?? { count: 0, bytes: 0 };
    entry.count += 1;
    entry.bytes += self;
    byKind.set(key, entry);
  }
  return { bytes, byKind };
}
