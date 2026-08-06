// Persistencia local de las transposiciones personalizadas del usuario por canción.
// Permite que al volver a abrir una canción se cargue automáticamente su tono guardado.
const STORAGE_KEY = 'worship-user-transpositions';

type Store = Record<string, number>;

function readAll(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getUserSemitones(songId: string): number {
  const store = readAll();
  const v = store[songId];
  return typeof v === 'number' ? v : 0;
}

export function setUserSemitones(songId: string, semitones: number) {
  const store = readAll();
  if (semitones === 0) {
    delete store[songId];
  } else {
    store[songId] = semitones;
  }
  writeAll(store);
}

export function clearUserSemitones(songId: string) {
  const store = readAll();
  delete store[songId];
  writeAll(store);
}

export function getAllUserTranspositions(): Store {
  return readAll();
}

export function bulkSetUserTranspositions(map: Record<string, number>) {
  const store = readAll();
  for (const [id, st] of Object.entries(map)) {
    if (typeof st === 'number' && st !== 0) store[id] = st;
  }
  writeAll(store);
}
