import type { Song } from '@/types/music';

const DB_NAME = 'worship-transpose-pwa';
const DB_VERSION = 1;
const STORE = 'visited-songs';
/** Enough for a typical Sunday setlist + recent visits. */
const MAX_ENTRIES = 64;

type CachedSong = Song & { visitedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('visitedAt', 'visitedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function trimCache(db: IDBDatabase): Promise<void> {
  const all = await loadVisitedSongsCache();
  if (all.length <= MAX_ENTRIES) return;

  const sorted = [...all].sort((a, b) => (b.visitedAt ?? 0) - (a.visitedAt ?? 0));
  const toRemove = sorted.slice(MAX_ENTRIES);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const s of toRemove) store.delete(s.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheVisitedSong(song: Song): Promise<void> {
  if (!song.id || !song.chords) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const entry: CachedSong = { ...song, visitedAt: Date.now() };
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await trimCache(db);
  } catch (e) {
    console.warn('[PWA] cacheVisitedSong:', e);
  }
}

/** Prefetch a setlist pack for offline worship (chords required). */
export async function cacheSongsForOffline(songs: Song[]): Promise<number> {
  const eligible = songs.filter((s) => s?.id && s.chords);
  if (!eligible.length) return 0;
  try {
    const db = await openDb();
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const song of eligible) {
        store.put({ ...song, visitedAt: now } satisfies CachedSong);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await trimCache(db);
    return eligible.length;
  } catch (e) {
    console.warn('[PWA] cacheSongsForOffline:', e);
    return 0;
  }
}

export async function loadVisitedSongsCache(): Promise<CachedSong[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as CachedSong[]) || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[PWA] loadVisitedSongsCache:', e);
    return [];
  }
}

export function mergeVisitedSongsIntoSongs(prev: Song[], cached: CachedSong[]): Song[] {
  if (!cached.length) return prev;
  const map = new Map(prev.map((s) => [s.id, s]));
  for (const entry of cached) {
    const { visitedAt: _v, ...song } = entry;
    const existing = map.get(song.id);
    map.set(song.id, existing
      ? {
          ...existing,
          ...song,
          chords: song.chords || existing.chords,
          title: song.title || existing.title,
          artist: song.artist || existing.artist,
        }
      : song);
  }
  return Array.from(map.values());
}

export const VISITED_SONGS_MAX_ENTRIES = MAX_ENTRIES;
