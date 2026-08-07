/** Query helpers so SongView keeps list context after refresh / share. */

export function buildSongListSearch(opts: {
  listId?: string | null;
  listSongIds?: string[] | null;
}): string {
  const params = new URLSearchParams();
  if (opts.listId) params.set('lista', opts.listId);
  if (opts.listSongIds && opts.listSongIds.length > 0) {
    params.set('ids', opts.listSongIds.join(','));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function parseSongListSearch(search: string): {
  listId?: string;
  listSongIds?: string[];
} {
  const raw = search.startsWith('?') ? search : search ? `?${search}` : '';
  const params = new URLSearchParams(raw);
  const listId = params.get('lista')?.trim() || undefined;
  const idsRaw = params.get('ids');
  const listSongIds = idsRaw
    ? idsRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : undefined;
  return {
    listId,
    listSongIds: listSongIds && listSongIds.length > 0 ? listSongIds : undefined,
  };
}

/** Merge lista/ids into an existing search string without dropping other params. */
export function mergeSongListIntoSearch(
  currentSearch: string,
  opts: { listId?: string | null; listSongIds?: string[] | null }
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch
  );
  if (opts.listId) params.set('lista', opts.listId);
  else params.delete('lista');
  if (opts.listSongIds && opts.listSongIds.length > 0) {
    params.set('ids', opts.listSongIds.join(','));
  } else {
    params.delete('ids');
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
