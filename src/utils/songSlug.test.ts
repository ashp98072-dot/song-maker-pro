import { describe, expect, it } from 'vitest';
import {
  buildSongSlug,
  getSongPath,
  getSongPathById,
  resolveSongIdFromRouteParam,
  slugifySongTitle,
} from '@/utils/songSlug';

describe('songSlug', () => {
  it('slugifies accents and spaces', () => {
    expect(slugifySongTitle('Alabaré a Mi Señor')).toBe('alabare-a-mi-senor');
  });

  it('resolves numeric id route', () => {
    const songs = [{ id: '123', title: 'Test' }];
    expect(resolveSongIdFromRouteParam('123', songs)).toBe('123');
  });

  it('resolves slug route', () => {
    const songs = [{ id: '123', title: 'Mi Canción' }];
    expect(resolveSongIdFromRouteParam('mi-cancion', songs)).toBe('123');
  });

  it('disambiguates duplicate titles', () => {
    const songs = [
      { id: '1', title: 'Gloria' },
      { id: '2', title: 'Gloria' },
    ];
    expect(buildSongSlug(songs[0], songs)).toBe('gloria-1');
    expect(buildSongSlug(songs[1], songs)).toBe('gloria-2');
  });

  it('builds friendly song path', () => {
    const song = { id: '1778269978611', title: 'Alabaré a Mi Señor' };
    expect(getSongPath(song)).toBe('/cancion/alabare-a-mi-senor');
  });

  it('getSongPathById uses slug when song is in catalog', () => {
    const songs = [{ id: '99', title: 'Aleluya' }];
    expect(getSongPathById('99', songs)).toBe('/cancion/aleluya');
  });

  it('getSongPathById falls back to id when catalog missing', () => {
    expect(getSongPathById('1778269978611')).toBe('/cancion/1778269978611');
  });
});
