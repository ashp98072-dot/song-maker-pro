/** Curated worship genres for community publish + filters. */
export const COMMUNITY_GENRES = [
  { id: 'adoracion', label: 'Adoración' },
  { id: 'alabanza', label: 'Alabanza' },
  { id: 'contemporaneo', label: 'Contemporáneo' },
  { id: 'himno', label: 'Himno' },
  { id: 'coral', label: 'Coral' },
  { id: 'juvenil', label: 'Juvenil' },
  { id: 'ninos', label: 'Niños' },
  { id: 'instrumental', label: 'Instrumental' },
  { id: 'otro', label: 'Otro' },
] as const;

export type CommunityGenreId = (typeof COMMUNITY_GENRES)[number]['id'];

const LABEL_BY_ID = Object.fromEntries(
  COMMUNITY_GENRES.map((g) => [g.id, g.label])
) as Record<CommunityGenreId, string>;

export function isCommunityGenreId(value: string | null | undefined): value is CommunityGenreId {
  return !!value && value in LABEL_BY_ID;
}

export function genreLabel(id: string | null | undefined): string {
  if (!id) return 'Sin género';
  if (isCommunityGenreId(id)) return LABEL_BY_ID[id];
  return id;
}

export function normalizeGenreId(value: string | null | undefined): CommunityGenreId {
  return isCommunityGenreId(value) ? value : 'adoracion';
}
