import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { YouTubeQuickPicker } from '@/features/youtube-search/components/YouTubeQuickPicker';
import * as youtubeSearchApi from '@/features/youtube-search/api/youtubeSearchApi';

describe('YouTubeQuickPicker', () => {
  it('renders results when open without throwing', async () => {
    vi.spyOn(youtubeSearchApi, 'searchYouTubeVideos').mockResolvedValue({
      provider: 'piped',
      results: [
        {
          id: 'jfKfPfyJRdk',
          title: 'Test video',
          channelTitle: 'Channel',
          duration: '4:00',
          thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
          url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        },
      ],
    });

    render(
      <YouTubeQuickPicker
        open
        onOpenChange={() => {}}
        songTitle="Amazing Grace"
        onSelect={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Test video')).toBeInTheDocument();
    });
  });

  it('shows fallback UI when search fails', async () => {
    vi.spyOn(youtubeSearchApi, 'searchYouTubeVideos').mockRejectedValue(
      new Error('network fail')
    );

    render(
      <YouTubeQuickPicker
        open
        onOpenChange={() => {}}
        songTitle="Amazing Grace"
        onSelect={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/network fail/i)).toBeInTheDocument();
    });
  });
});
