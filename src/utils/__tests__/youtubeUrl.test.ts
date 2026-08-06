import { describe, expect, it } from 'vitest';
import {
  buildYouTubeEmbedSrc,
  extractYouTubeVideoId,
  isValidYouTubeVideoId,
} from '@/features/youtube-search/utils/youtubeUrl';

describe('youtubeUrl embed', () => {
  it('validates 11-char video ids', () => {
    expect(isValidYouTubeVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeVideoId('short')).toBe(false);
  });

  it('builds embed URL without enablejsapi', () => {
    const src = buildYouTubeEmbedSrc('dQw4w9WgXcQ', { autoplay: true });
    expect(src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(src).toContain('autoplay=1');
    expect(src).toContain('rel=0');
    expect(src).toContain('modestbranding=1');
    expect(src).not.toContain('enablejsapi');
  });

  it('extracts id from watch URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
  });
});
