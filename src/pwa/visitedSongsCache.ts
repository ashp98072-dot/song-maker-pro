import type { Song } from '@/types/music';

const DB_NAME = 'worship-transpose-pwa';
const DB_VERSION = 1;
const STORE = 'visited-songs';
const MAX_ENTRIES = 24;

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
  } catch (e) {
    console.warn('[PWA] cacheVisitedSong:', e);
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
