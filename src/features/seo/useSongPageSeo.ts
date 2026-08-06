import { useEffect } from 'react';
import type { Song } from '@/types/music';
import { getSongPath } from '@/utils/songSlug';
import {
  SITE_NAME,
  buildSongJsonLd,
  buildSongSeoDescription,
  buildSongSeoTitle,
  chordsToLyricsPreview,
} from '@/features/seo/songSeo';

const DEFAULT_OG_IMAGE = '/favicon.png';
const JSON_LD_ID = 'song-json-ld';

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

function setJsonLd(data: Record<string, unknown>): void {
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = JSON_LD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(): void {
  document.getElementById(JSON_LD_ID)?.remove();
}

/**
 * Updates document title + meta + Open Graph + JSON-LD for song pages.
 */
export function useSongPageSeo(
  song: Song | undefined,
  allSongs?: Pick<Song, 'id' | 'title'>[]
): void {
  useEffect(() => {
    if (!song) return;

    const title = song.title?.trim() || 'Canción';
    const artist = song.artist?.trim() || null;
    const pageTitle = buildSongSeoTitle(title, artist);
    const description = buildSongSeoDescription(title, artist);
    const path = getSongPath(song, allSongs);
    const url = `${window.location.origin}${path}`;
    const lyricsPreview = chordsToLyricsPreview(song.chords || '');

    document.title = pageTitle;
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', `${title}, letra, acordes, ${artist || 'adoración'}, transpose`);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'music.song');
    setMetaTag('property', 'og:url', url);
    setMetaTag('property', 'og:site_name', SITE_NAME);
    setMetaTag('property', 'og:locale', 'es_ES');
    setMetaTag('property', 'og:image', `${window.location.origin}${DEFAULT_OG_IMAGE}`);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', description);
    setCanonical(url);
    setJsonLd(
      buildSongJsonLd({
        title,
        artist,
        url,
        lyricsPreview,
      })
    );

    return () => {
      document.title = SITE_NAME;
      removeJsonLd();
    };
  }, [song, allSongs]);
}
