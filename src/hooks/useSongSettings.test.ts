import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSongSettings } from './useSongSettings';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  } },
}));

describe('guest song settings', () => {
  beforeEach(() => localStorage.clear());

  it('restores valid preferences including zero delay', async () => {
    localStorage.setItem('worship-font-sizes', JSON.stringify({ song: 24 }));
    localStorage.setItem('worship-gender-shifts', JSON.stringify({ song: 'female' }));
    localStorage.setItem('worship-yt-delays', JSON.stringify({ song: 0 }));
    const { result } = renderHook(() => useSongSettings('song'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toMatchObject({ fontSize: 24, genderShift: 'female', ytDelayMs: 0 });
  });

  it('falls back when storage contains null, arrays or invalid field types', async () => {
    localStorage.setItem('worship-font-sizes', JSON.stringify({ song: 'large' }));
    localStorage.setItem('worship-vocal-registers', 'null');
    localStorage.setItem('worship-gender-shifts', '[]');
    localStorage.setItem('worship-yt-delays', JSON.stringify({ song: {} }));
    const { result } = renderHook(() => useSongSettings('song'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toMatchObject({
      fontSize: 16, vocalRegister: '', genderShift: '', ytDelayMs: 0,
    });
  });

  it('recovers from malformed JSON without blocking settings load', async () => {
    localStorage.setItem('worship-font-sizes', '{broken');
    const { result } = renderHook(() => useSongSettings('song'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings.fontSize).toBe(16);
  });
});
