import { useEffect } from 'react';
import type { Song } from '@/types/music';
import { getSongPath } from '@/utils/songSlug';

const SITE_NAME = 'Worship Transpose';
const DEFAULT_OG_IMAGE = '/favicon.png';

function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string): void {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Updates document title + meta description + Open Graph for song pages.
 */
export function useSongPageSeo(
  song: Song | undefined,
  allSongs?: Pick<Song, 'id' | 'title'>[]
): void {
  useEffect(() => {
    if (!song) return;

    const title = song.title?.trim() || 'Canción';
    const artist = song.artist?.trim();
    const pageTitle = artist ? `${title} — ${artist} | ${SITE_NAME}` : `${title} | ${SITE_NAME}`;
    const description = artist
      ? `Letra y acordes de «${title}» por ${artist}. Transpone, ensaya y comparte en ${SITE_NAME}.`
      : `Letra y acordes de «${title}». Transpone, ensaya y comparte en ${SITE_NAME}.`;

    const path = getSongPath(song, allSongs);
    const url = `${window.location.origin}${path}`;

    document.title = pageTitle;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:url', url);
    setMetaTag('property', 'og:site_name', SITE_NAME);
    setMetaTag('property', 'og:image', `${window.location.origin}${DEFAULT_OG_IMAGE}`);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', description);
    setCanonical(url);

    return () => {
      document.title = SITE_NAME;
    };
  }, [song, allSongs]);
}
