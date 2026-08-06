import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSongViewPreference,
  setSongViewPreference,
} from '@/features/song-view/preferences/songViewPreference';

describe('songViewPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('defaults to musician', () => {
    expect(getSongViewPreference()).toBe('musician');
  });

  it('persists lyrics-only', () => {
    setSongViewPreference('lyrics-only');
    expect(localStorage.getItem('song_view_preference')).toBe('lyrics-only');
    expect(getSongViewPreference()).toBe('lyrics-only');
  });

  it('persists musician after toggle back', () => {
    setSongViewPreference('lyrics-only');
    setSongViewPreference('musician');
    expect(getSongViewPreference()).toBe('musician');
  });
});
