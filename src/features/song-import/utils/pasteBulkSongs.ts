import type { Song } from '@/types/music';
import { parseChordProDocument } from '@/features/song-import/parsers/chordProParser';
import { processInlineChords, processSmartPaste } from '@/utils/smartPaste';

/** Split a pasted dump into song chunks (--- / === / blank+{title}). */
export function splitBulkSongText(raw: string): string[] {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const byFence = text
    .split(/\n[ \t]*(?:-{3,}|={3,})[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byFence.length > 1) return byFence;

  // Multiple ChordPro docs glued together
  const titleHits = [...text.matchAll(/\{title\s*:/gi)];
  if (titleHits.length > 1) {
    const parts: string[] = [];
    const indices = titleHits.map((m) => m.index!).filter((i) => i >= 0);
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : text.length;
      const chunk = text.slice(start, end).trim();
      if (chunk) parts.push(chunk);
    }
    if (parts.length > 1) return parts;
  }

  return [text];
}

function extractMetaFromPlain(chunk: string): {
  title: string;
  artist: string;
  body: string;
} {
  const lines = chunk.split(/\r?\n/);
  let title = '';
  let artist = '';
  let start = 0;

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim();
    if (!line) {
      if (title) {
        start = i + 1;
        break;
      }
      continue;
    }
    const titleMatch = line.match(/^(?:t[ií]tulo|title)\s*[:\-]\s*(.+)$/i);
    const artistMatch = line.match(/^(?:artista|artist|autor|author)\s*[:\-]\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      start = i + 1;
      continue;
    }
    if (artistMatch) {
      artist = artistMatch[1].trim();
      start = i + 1;
      continue;
    }
    if (!title && /^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, '').trim();
      start = i + 1;
      continue;
    }
    if (!title && line.length <= 80 && !/[\[\]]/.test(line) && !isMostlyChords(line)) {
      title = line;
      start = i + 1;
      // next non-empty short line may be artist
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const next = lines[j].trim();
        if (!next) continue;
        if (
          next.length <= 60 &&
          !isMostlyChords(next) &&
          !/^(verso|coro|verse|chorus|puente|bridge)/i.test(next)
        ) {
          artist = next;
          start = j + 1;
        }
        break;
      }
      break;
    }
    break;
  }

  return {
    title: title || 'Importada',
    artist: artist || 'Desconocido',
    body: lines.slice(start).join('\n').trim() || chunk,
  };
}

function isMostlyChords(line: string): boolean {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const chordish = words.filter((w) =>
    /^[A-G][#b]?(?:m(?:aj)?7?|dim|aug|sus[24]|add\d+|maj\d*|\d+)?(?:\/[A-G][#b]?)?$/i.test(w)
  );
  return chordish.length / words.length >= 0.5;
}

/** One pasted chunk → partial song (ChordPro or smart-paste). */
export function parsePastedSongChunk(chunk: string, index = 0): Partial<Song> | null {
  const trimmed = chunk.trim();
  if (!trimmed) return null;

  if (/\{title\s*:/i.test(trimmed) || /\{artist\s*:/i.test(trimmed)) {
    return parseChordProDocument(trimmed, `paste-${index + 1}.txt`);
  }

  const meta = extractMetaFromPlain(trimmed);
  const inline = processInlineChords(meta.body);
  const { chords, detectedKey } = processSmartPaste(inline);
  if (!chords.trim()) return null;

  const key = detectedKey || 'C';
  return {
    title: meta.title,
    artist: meta.artist,
    originalKey: key,
    key,
    originalGender: 'male',
    scaleMode: /m$/i.test(key) && !/maj/i.test(key) ? 'minor' : 'major',
    lyrics: '',
    chords,
  };
}

export function parseBulkPastedSongs(raw: string): {
  songs: Partial<Song>[];
  errors: { message: string }[];
  skipped: number;
} {
  const chunks = splitBulkSongText(raw);
  const songs: Partial<Song>[] = [];
  const errors: { message: string }[] = [];
  let skipped = 0;

  chunks.forEach((chunk, i) => {
    const parsed = parsePastedSongChunk(chunk, i);
    if (parsed?.chords?.trim() && parsed.title) {
      songs.push(parsed);
    } else {
      skipped += 1;
      errors.push({
        message: `Bloque ${i + 1}: no se detectaron acordes o título`,
      });
    }
  });

  return { songs, errors, skipped };
}
