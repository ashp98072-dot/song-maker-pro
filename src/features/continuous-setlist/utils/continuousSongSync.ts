const SONG_SELECTORS = [
  '[data-continuous-song-id="{id}"]',
  '[data-song-id="{id}"]',
] as const;

function escapeAttr(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id);
  }
  return id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function queryContinuousSongElement(
  root: ParentNode,
  songId: string
): HTMLElement | null {
  if (!songId) return null;
  const escaped = escapeAttr(songId);
  for (const pattern of SONG_SELECTORS) {
    const sel = pattern.replace('{id}', escaped);
    const el = root.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}
