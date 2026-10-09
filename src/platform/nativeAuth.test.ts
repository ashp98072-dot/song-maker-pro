import { describe, expect, it } from 'vitest';
import { NATIVE_AUTH_REDIRECT, parseNativeAuthCallback } from './nativeAuth';

describe('native auth callback', () => {
  it('accepts the dedicated callback with a code', () => {
    expect(parseNativeAuthCallback(`${NATIVE_AUTH_REDIRECT}?code=test`)?.searchParams.get('code')).toBe('test');
  });
  it('rejects web URLs and unrelated app links', () => {
    for (const value of ['https://worshiptranspose.com/auth/callback?code=test',
      'com.worshiptranspose.app://other/callback', 'com.worshiptranspose.app://auth/other',
      'com.worshiptranspose.app://user@auth/callback', 'invalid']) {
      expect(parseNativeAuthCallback(value)).toBeNull();
    }
  });
});
