import { describe, expect, it } from 'vitest';
import {
  isContinuousModeAvailable,
  isContinuousTeleprompterView,
  normalizeViewMode,
  resolveSharedViewMode,
  showChordsForViewMode,
  teleprompterFontBoost,
} from '@/types/music';

describe('view mode helpers', () => {
  it('normalizes legacy stage to continuous', () => {
    expect(normalizeViewMode('stage')).toBe('continuous');
    expect(normalizeViewMode('musician')).toBe('musician');
    expect(normalizeViewMode('bogus', 'singer')).toBe('singer');
  });

  it('showChords only for musician', () => {
    expect(showChordsForViewMode('singer')).toBe(false);
    expect(showChordsForViewMode('continuous')).toBe(false);
    expect(showChordsForViewMode('musician')).toBe(true);
  });

  it('teleprompter detection and font boost', () => {
    expect(isContinuousTeleprompterView('continuous')).toBe(true);
    expect(isContinuousTeleprompterView('musician')).toBe(false);
    expect(teleprompterFontBoost('singer')).toBe(4);
    expect(teleprompterFontBoost('musician')).toBe(0);
  });

  it('continuous availability and shared fallback', () => {
    expect(isContinuousModeAvailable('list-1', ['a'])).toBe(false);
    expect(isContinuousModeAvailable('list-1', ['a', 'b'])).toBe(true);
    expect(isContinuousModeAvailable(null, ['a', 'b'])).toBe(false);
    expect(resolveSharedViewMode('continuous', 'list-1', ['a'])).toBe('musician');
    expect(resolveSharedViewMode('continuous', 'list-1', ['a', 'b'])).toBe('continuous');
  });
});
