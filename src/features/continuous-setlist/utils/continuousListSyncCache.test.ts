import { describe, it, expect, beforeEach } from 'vitest';
import {
  persistContinuousListSync,
  readContinuousListSync,
  clearContinuousListSyncStorage,
} from '@/features/continuous-setlist/utils/continuousListSyncCache';

describe('continuousListSyncCache', () => {
  beforeEach(() => {
    clearContinuousListSyncStorage();
  });

  it('persists to session and survives clear of session via localStorage', () => {
    persistContinuousListSync('list-1', ['a', 'b', 'c']);
    expect(readContinuousListSync('list-1')).toEqual(['a', 'b', 'c']);

    sessionStorage.clear();
    expect(readContinuousListSync('list-1')).toEqual(['a', 'b', 'c']);
  });

  it('returns null for other list ids', () => {
    persistContinuousListSync('list-1', ['a']);
    expect(readContinuousListSync('list-2')).toBeNull();
  });
});
