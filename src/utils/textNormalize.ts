export function normalizeText(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Alias retrocompatible
export const normalizeTitle = (s: string | null | undefined) => normalizeText(s);

export function matchesSearch(haystack: string | null | undefined, query: string): boolean {
  if (!query) return true;
  return normalizeText(haystack).includes(normalizeText(query));
}
