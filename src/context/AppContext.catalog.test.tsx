import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Song } from '@/types/music';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/data/songs', () => ({ SAMPLE_SONGS: [] }));
vi.mock('@/features/community/publicSongsApi', () => ({ fetchAllPublicSongs: mocks.fetch }));
vi.mock('@/utils/songSlug', () => ({ fetchSongsViaSeoCatalog: async () => [] }));
vi.mock('@/pwa/visitedSongsCache', () => ({ loadVisitedSongsCache: async () => [], mergeVisitedSongsIntoSongs: (songs: Song[]) => songs }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: async () => ({ data: [], error: null }),
  from: () => ({ select: async () => ({ data: [], error: null }) }),
  auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
import { AppProvider } from './AppContext';
import { useApp } from './useApp';
const song: Song = { id: 'public-1', title: 'Original', artist: 'Artist', chords: 'C', lyrics: '', originalKey: 'C', scaleMode: 'major', originalGender: 'male' };
function Probe() {
  const app = useApp();
  return <><span>{app.songs[0]?.title}</span><button onClick={() => app.updateSong(song.id, { title: 'Personal' })}>Edit</button></>;
}
beforeEach(() => { localStorage.clear(); mocks.fetch.mockReset().mockResolvedValue([song]); });
afterEach(cleanup);
it('refreshes an existing public song on focus and reconnect while preserving local edits', async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText('Original');
  mocks.fetch.mockResolvedValue([{ ...song, title: 'Updated' }]);
  act(() => window.dispatchEvent(new Event('focus')));
  await screen.findByText('Updated');
  mocks.fetch.mockResolvedValue([{ ...song, title: 'Reconnected' }]);
  act(() => window.dispatchEvent(new Event('online')));
  await screen.findByText('Reconnected');
  act(() => screen.getByText('Edit').click());
  await screen.findByText('Personal');
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
  expect(screen.getByText('Personal')).toBeInTheDocument();
});
it('removes lifecycle listeners after unmount', async () => {
  const view = render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText('Original');
  view.unmount();
  mocks.fetch.mockClear();
  act(() => window.dispatchEvent(new Event('online')));
  expect(mocks.fetch).not.toHaveBeenCalled();
});
