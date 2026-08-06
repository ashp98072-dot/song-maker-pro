const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

function noteIndex(note: string): number {
  const n = note.replace('♯', '#').replace('♭', 'b');
  let idx = NOTES_SHARP.indexOf(n);
  if (idx === -1) idx = NOTES_FLAT.indexOf(n);
  return idx;
}

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return useFlats ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
}

function parseChord(chord: string): { root: string; suffix: string } | null {
  const match = chord.match(/^([A-G][#b♯♭]?)(.*)/);
  if (!match) return null;
  return { root: match[1], suffix: match[2] };
}

export function transposeChord(chord: string, semitones: number, useFlats: boolean): string {
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return transposeChord(main, semitones, useFlats) + '/' + transposeChord(bass, semitones, useFlats);
  }
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const newRoot = transposeNote(parsed.root, semitones, useFlats);
  return newRoot + parsed.suffix;
}

export function transposeText(text: string, semitones: number, useFlats: boolean): string {
  // Patrón ampliado: soporta bemoles (Bb, Eb, Ab, Db, Gb), sus2/sus4, add9/add11/add13,
  // dim7, m7b5, m9, maj9, etc. Solo se transpone la nota base; los sufijos se conservan.
  const chordRegex =
    /\b([A-G][#b♯♭]?(?:(?:maj|min|m|dim|aug|sus|add|alt|ø)\d*)*\d*(?:[#b]\d+)*(?:\/[A-G][#b♯♭]?)?)\b/g;
  return text.replace(chordRegex, (match) => transposeChord(match, semitones, useFlats));
}

export function getGenderTransposeSemitones(fromGender: string, toGender: string): number {
  if (fromGender === 'male' && toGender === 'female') return 5;
  if (fromGender === 'female' && toGender === 'male') return -5;
  return 0;
}

export function getKeyFromSemitones(originalKey: string, semitones: number): string {
  const isMinor = originalKey.endsWith('m') && !originalKey.endsWith('dim');
  const root = isMinor ? originalKey.slice(0, -1) : originalKey;
  const useFlats = FLAT_KEYS.has(originalKey);
  const newRoot = transposeNote(root, semitones, useFlats);
  return isMinor ? newRoot + 'm' : newRoot;
}

export function toggleMajorMinor(key: string): string {
  const isMinor = key.endsWith('m') && !key.endsWith('dim');
  if (isMinor) {
    const root = key.slice(0, -1);
    return transposeNote(root, 3, FLAT_KEYS.has(key));
  } else {
    return transposeNote(key, -3, FLAT_KEYS.has(key)) + 'm';
  }
}

// Get semitones between two keys for relative major/minor conversion
export function getRelativeModeSemitones(fromKey: string, toMinor: boolean): number {
  return toMinor ? -3 : 3;
}

export function convertChordQuality(chord: string, toMinor: boolean): string {
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return convertChordQuality(main, toMinor) + '/' + bass;
  }
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  
  const { root, suffix } = parsed;
  
  if (toMinor) {
    if (suffix === '' || suffix === 'maj7') {
      return root + (suffix === '' ? 'm' : 'm7');
    }
  } else {
    if (suffix === 'm') return root;
    if (suffix === 'm7') return root + 'maj7';
  }
  return chord;
}

export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('[')) return false;
  const tokens = trimmed.split(/\s+/);
  const chordPattern =
    /^[A-G][#b♯♭]?(?:(?:maj|min|m|dim|aug|sus|add|alt|ø)\d*)*\d*(?:[#b]\d+)*(?:\/[A-G][#b♯♭]?)?$/;
  const chordCount = tokens.filter(t => chordPattern.test(t)).length;
  return chordCount / tokens.length >= 0.5;
}

export function isSectionLabel(line: string): boolean {
  return /^\[.*\]$/.test(line.trim());
}

// Calculate capo position: given original key and target key, find capo
export function calculateCapo(originalKey: string, targetKey: string): { capo: number; playAs: string } | null {
  const origRoot = originalKey.replace('m', '');
  const targetRoot = targetKey.replace('m', '');
  const origIdx = noteIndex(origRoot);
  const targetIdx = noteIndex(targetRoot);
  if (origIdx === -1 || targetIdx === -1) return null;
  
  const semitones = ((targetIdx - origIdx) % 12 + 12) % 12;
  if (semitones === 0) return null;
  
  // Capo on fret = semitones, play as original shape
  return { capo: semitones, playAs: originalKey };
}

// Encode share config to URL-safe string (unicode-safe via encodeURIComponent)
export function encodeShareConfig(config: { songId: string; semitones: number; capo: number | null; tips: string; targetGender: string }): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config))));
}

export function decodeShareConfig(encoded: string): { songId: string; semitones: number; capo: number | null; tips: string; targetGender: string } | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    try {
      // Legacy ASCII-only shares
      return JSON.parse(atob(encoded));
    } catch {
      return null;
    }
  }
}

// ============= LIST SHARING =============
// Comparte una lista completa con sus transposiciones personalizadas por canción.
export interface SharedListPayload {
  name: string;
  songIds: string[];
  // Mapa songId -> semitonos personalizados aplicados por el director
  transpositions: Record<string, number>;
  createdAt: string;
}

// Codificación URL-safe (base64url) para soportar payloads grandes en query params.
function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeListShare(payload: SharedListPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeListShare(encoded: string): SharedListPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || !Array.isArray(parsed.songIds)) return null;
    return {
      name: String(parsed.name || 'Lista compartida'),
      songIds: parsed.songIds.map(String),
      transpositions: parsed.transpositions || {},
      createdAt: String(parsed.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export { NOTES_SHARP, NOTES_FLAT, FLAT_KEYS };
