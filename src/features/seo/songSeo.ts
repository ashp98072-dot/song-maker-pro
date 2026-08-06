/**
 * Shared SEO helpers for song pages (client + docs).
 * Keep titles aligned with api/song-prerender and useSongPageSeo.
 */

export const SITE_NAME = 'Worship Transpose';
export const SITE_URL = 'https://worshiptranspose.com';

export function buildSongSeoTitle(title: string, artist?: string | null): string {
  const t = title.trim() || 'Canción';
  const a = artist?.trim();
  return a
    ? `${t} - Letra y acordes | ${a} | ${SITE_NAME}`
    : `${t} - Letra y acordes | ${SITE_NAME}`;
}

export function buildSongSeoDescription(title: string, artist?: string | null): string {
  const t = title.trim() || 'Canción';
  const a = artist?.trim();
  return a
    ? `Letra y acordes de «${t}» de ${a}. Transpone el tono, ensaya y comparte en vivo con ${SITE_NAME}.`
    : `Letra y acordes de «${t}». Transpone el tono, ensaya y comparte en vivo con ${SITE_NAME}.`;
}

/** Rough plain-text preview from chord sheet (for crawlers / JSON-LD). */
export function chordsToLyricsPreview(chords: string, maxLen = 1200): string {
  const lines = (chords || '')
    .split('\n')
    .map((line) =>
      line
        // Common chord tokens like Am, C#m, Bb/D
        .replace(/\b[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G](#|b)?)?\b/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean);
  const text = lines.join('\n').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

export function buildSongJsonLd(opts: {
  title: string;
  artist?: string | null;
  url: string;
  lyricsPreview?: string;
}): Record<string, unknown> {
  const { title, artist, url, lyricsPreview } = opts;
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicComposition',
    name: title,
    ...(artist ? { composer: { '@type': 'Person', name: artist } } : {}),
    ...(artist ? { lyricist: { '@type': 'Person', name: artist } } : {}),
    inLanguage: 'es',
    url,
    ...(lyricsPreview
      ? {
          lyrics: {
            '@type': 'CreativeWork',
            text: lyricsPreview,
            inLanguage: 'es',
          },
        }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
