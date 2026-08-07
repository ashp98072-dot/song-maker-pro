/**
 * Map director continuous index (full listSongIds) to local rendered index
 * (only songs present in the follower catalog / dense entries).
 */
export function mapContinuousRemoteIndexToLocal(input: {
  remoteIndex: number | null | undefined;
  remoteSongId?: string | null;
  remoteListIds: string[];
  localSongIds: string[];
}): number {
  const { remoteIndex, remoteSongId, remoteListIds, localSongIds } = input;
  if (localSongIds.length === 0) return 0;

  const fromRemoteList =
    typeof remoteIndex === 'number' && remoteIndex >= 0
      ? remoteListIds[remoteIndex] ?? null
      : null;
  const songId = fromRemoteList || remoteSongId || null;
  if (songId) {
    const local = localSongIds.indexOf(songId);
    if (local >= 0) return local;
  }

  if (typeof remoteIndex === 'number' && remoteIndex >= 0) {
    return Math.min(remoteIndex, localSongIds.length - 1);
  }

  return 0;
}
