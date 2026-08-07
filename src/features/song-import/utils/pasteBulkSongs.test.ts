import { describe, expect, it } from 'vitest';
import {
  parseBulkPastedSongs,
  parsePastedSongChunk,
  splitBulkSongText,
} from '@/features/song-import/utils/pasteBulkSongs';

describe('splitBulkSongText', () => {
  it('splits on --- fences', () => {
    const parts = splitBulkSongText('Uno\n\n[C]a\n---\nDos\n\n[G]b');
    expect(parts).toHaveLength(2);
  });

  it('splits multiple {title:} docs', () => {
    const parts = splitBulkSongText('{title: A}\n[C]x\n{title: B}\n[G]y');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('{title: A}');
  });
});

describe('parsePastedSongChunk', () => {
  it('parses ChordPro meta', () => {
    const song = parsePastedSongChunk('{title: Santo}\n{artist: Hillsong}\n{key: G}\n[G]Santo');
    expect(song?.title).toBe('Santo');
    expect(song?.artist).toBe('Hillsong');
    expect(song?.chords).toContain('[G]Santo');
  });

  it('parses plain title + chord lines', () => {
    const song = parsePastedSongChunk('Gracia\nTradicional\n\nG     C\nAmazing grace');
    expect(song?.title).toBe('Gracia');
    expect(song?.artist).toBe('Tradicional');
    expect(song?.chords).toBeTruthy();
  });
});

describe('parseBulkPastedSongs', () => {
  it('imports two fenced songs', () => {
    const result = parseBulkPastedSongs(
      'Título: Uno\nArtista: A\n\nC  G\nletra\n---\nTítulo: Dos\nArtista: B\n\nD  A\notra'
    );
    expect(result.songs).toHaveLength(2);
    expect(result.songs[0].title).toBe('Uno');
    expect(result.songs[1].title).toBe('Dos');
  });
});
