import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Song } from '@/types/music';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), rpc: vi.fn() }));
vi.mock('@/data/songs', () => ({ SAMPLE_SONGS: [] }));
vi.mock('@/features/community/publicSongsApi', () => ({ fetchAllPublicSongs: mocks.fetch }));
vi.mock('@/utils/songSlug', () => ({ fetchSongsViaSeoCatalog: async () => [] }));
vi.mock('@/pwa/visitedSongsCache', () => ({ loadVisitedSongsCache: async () => [], mergeVisitedSongsIntoSongs: (songs: Song[]) => songs }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
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
  return <><span>{app.songs[0]?.title}</span><span>{app.songs[0]?.chords}</span><button onClick={() => app.updateSong(song.id, { title: 'Personal' })}>Edit</button><button onClick={() => void app.saveSongCorrection(song.id, 'Fixed').catch(() => undefined)}>Correct</button></>;
}
beforeEach(() => { localStorage.clear(); mocks.fetch.mockReset().mockResolvedValue([song]); mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null }); });
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
it('refreshes stale cached chords and local edits with the administrator correction', async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText('Original');
  act(() => screen.getByText('Edit').click());
  await screen.findByText('Personal');
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'catalog_song_corrections_read' ? [{ song_id: song.id, chords: 'Fixed' }] : [], error: null }));
  act(() => window.dispatchEvent(new Event('online')));
  await screen.findByText('Fixed');
  expect(screen.getByText('Personal')).toBeInTheDocument();
});
it('does not change local chords when saving the correction fails', async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText('Original');
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
  act(() => screen.getByText('Correct').click());
  await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('admin_correct_catalog_song', { p_song_id: song.id, p_chords: 'Fixed' }));
  expect(screen.getByText('C')).toBeInTheDocument();
  expect(screen.queryByText('Fixed')).not.toBeInTheDocument();
});
it('keeps a just-saved correction when an earlier refresh finishes late', async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText('Original');
  let resolveRead!: (value: { data: []; error: null }) => void;
  mocks.rpc.mockImplementation((name: string) => name === 'catalog_song_corrections_read'
    ? new Promise(resolve => { resolveRead = resolve; }) : Promise.resolve({ data: null, error: null }));
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(resolveRead).toBeDefined());
  act(() => screen.getByText('Correct').click());
  await screen.findByText('Fixed');
  await act(async () => resolveRead({ data: [], error: null }));
  expect(screen.getByText('Fixed')).toBeInTheDocument();
});
