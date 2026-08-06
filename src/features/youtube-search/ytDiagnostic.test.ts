import { describe, expect, it } from 'vitest';
import {
  getYtDiagStage,
  isYoutubeQuickPickerAvailable,
} from '@/features/youtube-search/ytDiagnostic';

describe('ytDiagnostic picker availability', () => {
  it('production default stage allows picker', () => {
    const stage = getYtDiagStage();
    if (stage === 99) {
      expect(isYoutubeQuickPickerAvailable()).toBe(true);
    }
  });
});
