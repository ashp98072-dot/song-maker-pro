import { describe, expect, it } from 'vitest';
import {
  formatSearchErrorForUser,
  formatYouTubeDataApiHttpError,
  isNetworkFetchFailure,
} from '@/features/youtube-search/api/searchErrors';

describe('searchErrors', () => {
  it('maps Failed to fetch to friendly message', () => {
    const msg = formatSearchErrorForUser(new TypeError('Failed to fetch'));
    expect(msg).toContain('No se pudo conectar con YouTube');
  });

  it('parses quota exceeded', () => {
    const body = JSON.stringify({
      error: {
        code: 403,
        message: 'The request cannot be completed because you have exceeded your quota.',
        errors: [{ reason: 'quotaExceeded' }],
      },
    });
    expect(formatYouTubeDataApiHttpError(403, body)).toContain('cuota');
  });

  it('detects network fetch failure', () => {
    expect(isNetworkFetchFailure(new TypeError('Failed to fetch'))).toBe(true);
  });
});
