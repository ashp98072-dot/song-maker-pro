import type { Song } from '@/types/music';
import { isChordLine } from '@/utils/transpose';
import { CHORD_TOKEN_RE, CHORD_TOKEN_TEST } from '@/utils/chordNormalize';
import { songDedupeKey } from '@/features/song-import/utils/normalizeImportedSong';

export function countSongChords(text: string) {
  return text.split(/\r?\n/).reduce((count, line) => {
    if (isChordLine(line)) return count + [...line.matchAll(CHORD_TOKEN_RE)].length;
    return count + [...line.matchAll(/\[([^\]]+)\]/g)].filter(match => CHORD_TOKEN_TEST.test(match[1])).length;
  }, 0);
}
export function analyzeCatalog(songs: Song[]) {
  const groups = new Map<string, { song: Song; chordCount: number }[]>();
  for (const song of songs) {
    const key = songDedupeKey(song.title, song.artist);
    const group = groups.get(key) ?? [];
    group.push({song, chordCount: countSongChords(song.chords)});
    groups.set(key, group);
  }
  return [...groups.values()].flatMap(group => {
    const ranked = [...group].sort((a,b) => b.chordCount - a.chordCount || a.song.id.localeCompare(b.song.id));
    return ranked.flatMap((entry,index) => {
      if (group.length < 2 && entry.chordCount > 0) return [];
      return [{...entry, duplicate:group.length > 1, suggestedKeep:index === 0 && group.length > 1,
        identical:group.length > 1 && group.every(item => item.song.chords.trim() === entry.song.chords.trim())}];
    });
  });
}
