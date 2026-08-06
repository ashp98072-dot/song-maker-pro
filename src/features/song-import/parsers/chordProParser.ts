import type { Song } from '@/types/music';

/**
 * Minimal ChordPro → app format. Supports {title}, {artist}, {key}, {start_of_*} sections.
 * Chord lines: [Am] above lyrics or inline [C]word.
 */
export function parseChordProDocument(text: string, filename?: string): Partial<Song> | null {
  const lines = text.split(/\r?\n/);
  let title = filename?.replace(/\.(pro|chopro|txt)$/i, '') || 'Importada';
  let artist = '';
  let originalKey = 'C';
  const body: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    const meta = line.match(/^\{(\w+):\s*(.+)\}$/i);
    if (meta) {
      const key = meta[1].toLowerCase();
      const val = meta[2].trim();
      if (key === 'title') title = val;
      else if (key === 'artist' || key === 'subtitle') artist = val;
      else if (key === 'key') originalKey = val;
      else if (key.startsWith('start_of')) body.push(`[${val}]`);
      continue;
    }
    if (line.startsWith('#')) continue;
    body.push(line);
  }

  const chords = body.join('\n').trim();
  if (!chords) return null;

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist: artist || 'Desconocido',
    originalKey,
    originalGender: 'male',
    scaleMode: 'major',
    lyrics: '',
    chords,
    key: originalKey,
  };
}
