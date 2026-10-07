import type { Song } from '@/types/music';
import { isLikelyChord } from '@/utils/smartPaste';

function convertChordProLine(line: string): string[] {
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)].filter(match => isLikelyChord(match[1]));
  if (!matches.length) return [line];
  let lyrics = '';
  let chords = '';
  let end = 0;
  for (const match of matches) {
    lyrics += line.slice(end, match.index);
    const column = Math.max(lyrics.length, chords.length ? chords.trimEnd().length + 1 : 0);
    chords = chords.padEnd(column, ' ') + match[1];
    end = match.index! + match[0].length;
  }
  lyrics += line.slice(end);
  return lyrics.trim() ? [chords, lyrics] : [chords];
}

/**
 * Minimal ChordPro → app format. Supports {title}, {artist}, {key}, {start_of_*} sections.
 * Chord lines: [Am] above lyrics or inline [C]word.
 */
export function parseChordProDocument(text: string, filename?: string): Partial<Song> | null {
  const lines = text.split(/\r?\n/);
  let title = filename?.replace(/\.(pro|chopro|chordpro|cho|crd|txt)$/i, '') || 'Importada';
  let artist = '';
  let originalKey = 'C';
  let bpm: number | undefined;
  const body: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    const meta = line.trim().match(/^\{(\w+)(?:\s*:\s*(.*))?\}$/i);
    if (meta) {
      const key = meta[1].toLowerCase();
      const val = (meta[2] ?? '').trim();
      if (key === 'title') title = val;
      else if (key === 'artist' || key === 'subtitle') artist = val;
      else if (key === 'key') originalKey = val;
      else if (key === 'tempo' || key === 'bpm') {
        const n = parseInt(val, 10);
        if (!Number.isNaN(n) && n > 0) bpm = n;
      } else if (key === 'comment' || key === 'c') {
        if (val) body.push(`[${val}]`);
      } else if (key.startsWith('start_of') || key === 'soc') {
        body.push(`[${val || (key === 'soc' ? 'Coro' : key.slice('start_of_'.length))}]`);
      }
      continue;
    }
    if (line.startsWith('#')) continue;
    body.push(...convertChordProLine(line));
  }

  const chords = body.join('\n').trim();
  if (!chords) return null;

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist: artist || 'Desconocido',
    originalKey,
    originalGender: 'male',
    scaleMode: /m$/i.test(originalKey) && !/maj/i.test(originalKey) ? 'minor' : 'major',
    lyrics: '',
    chords,
    key: originalKey,
    bpm,
  };
}
