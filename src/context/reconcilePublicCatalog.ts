import type { Song } from '@/types/music';

/** IDs are stable references from lists/favorites; title matches are not identity. */
export function reconcilePublicCatalog(current: Song[], incoming: Song[], protectedIds: ReadonlySet<string>): Song[] {
  const updates = new Map(incoming.map(song => [song.id, song]));
  const seen = new Set<string>();
  const result = current.map(song => {
    seen.add(song.id);
    const update = updates.get(song.id);
    return update && !protectedIds.has(song.id) ? { ...song, ...update } : song;
  });
  for (const song of updates.values()) if (!seen.has(song.id)) result.push(song);
  return result;
}
