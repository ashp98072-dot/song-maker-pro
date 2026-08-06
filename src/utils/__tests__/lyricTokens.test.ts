import { describe, expect, it } from 'vitest';
import {
  isMusicianNoteOnlyLine,
  parseLyricLine,
  stripMusicianNotesFromLine,
} from '@/utils/lyricTokens';

describe('parseLyricLine', () => {
  it('parses parenthesis notes inline', () => {
    const tokens = parseLyricLine('Gloria (entran pads aquí) al Rey');
    expect(tokens).toEqual([
      { type: 'lyric', text: 'Gloria ' },
      { type: 'musician_note', text: 'entran pads aquí' },
      { type: 'lyric', text: ' al Rey' },
    ]);
  });

  it('parses asterisk notes', () => {
    const tokens = parseLyricLine('*batería suave* en el verso');
    expect(tokens[0]).toEqual({ type: 'musician_note', text: 'batería suave' });
  });

  it('treats whole-line parens as musician note', () => {
    expect(parseLyricLine('(stop)')).toEqual([{ type: 'musician_note', text: 'stop' }]);
    expect(parseLyricLine('(2x coro)')).toEqual([{ type: 'musician_note', text: '2x coro' }]);
  });

  it('does not treat chord-in-parens as note', () => {
    const tokens = parseLyricLine('Toca (Am) suave');
    expect(tokens.some((t) => t.type === 'musician_note')).toBe(false);
  });

  it('keeps plain lyrics', () => {
    expect(parseLyricLine('Santo, santo, santo')).toEqual([
      { type: 'lyric', text: 'Santo, santo, santo' },
    ]);
  });
});

describe('stripMusicianNotesFromLine', () => {
  it('removes notes without leaving gaps for singer', () => {
    expect(stripMusicianNotesFromLine('Gloria (entran pads) al Rey')).toBe('Gloria al Rey');
    expect(stripMusicianNotesFromLine('(entran pads aquí)')).toBe('');
  });

  it('detects note-only lines', () => {
    expect(isMusicianNoteOnlyLine('(ritmo reggae)')).toBe(true);
    expect(isMusicianNoteOnlyLine('Letra normal')).toBe(false);
  });
});
