import { describe, expect, it } from 'vitest';
import {
  buildSongJsonLd,
  buildSongSeoDescription,
  buildSongSeoTitle,
  chordsToLyricsPreview,
} from '@/features/seo/songSeo';

describe('songSeo', () => {
  it('builds lyric-oriented titles', () => {
    expect(buildSongSeoTitle('De Gloria en Gloria', 'Marco Barrientos')).toContain('Letra y acordes');
    expect(buildSongSeoTitle('De Gloria en Gloria', 'Marco Barrientos')).toContain('Marco Barrientos');
  });

  it('strips chords for lyrics preview', () => {
    const preview = chordsToLyricsPreview('C   G\nDe gloria en gloria\nAm  F\nTe veo');
    expect(preview.toLowerCase()).toContain('de gloria en gloria');
    expect(preview).not.toMatch(/\bC\b/);
  });

  it('builds MusicComposition JSON-LD', () => {
    const ld = buildSongJsonLd({
      title: 'De Gloria en Gloria',
      artist: 'Marco Barrientos',
      url: 'https://worshiptranspose.com/cancion/de-gloria-en-gloria',
      lyricsPreview: 'De gloria en gloria',
    });
    expect(ld['@type']).toBe('MusicComposition');
    expect(ld.name).toBe('De Gloria en Gloria');
  });

  it('builds description', () => {
    expect(buildSongSeoDescription('Alabaré', 'Juan')).toMatch(/Letra y acordes/);
  });
});
