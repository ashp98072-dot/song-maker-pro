export interface YouTubeVideoResult {
  id: string;
  title: string;
  channelTitle: string;
  /** Duración legible, ej. "4:32" */
  duration: string;
  thumbnail: string;
  publishedAt?: string;
  views?: string;
  url: string;
}

export type YouTubeSearchProvider = 'youtube-api' | 'piped' | 'mock';

export interface YouTubeSearchResponse {
  results: YouTubeVideoResult[];
  provider: YouTubeSearchProvider;
}
