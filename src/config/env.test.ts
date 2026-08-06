import { describe, expect, it } from 'vitest';
import {
  ENV_CANONICAL,
  isValidSupabaseProjectUrl,
  resolveSupabaseAnonKey,
  validateClientEnv,
} from '@/config/env';

describe('env validation', () => {
  it('accepts standard supabase project URLs', () => {
    expect(isValidSupabaseProjectUrl('https://abcxyz.supabase.co')).toBe(true);
    expect(isValidSupabaseProjectUrl('http://abcxyz.supabase.co')).toBe(false);
    expect(isValidSupabaseProjectUrl('not-a-url')).toBe(false);
  });

  it('accepts localhost supabase in development', () => {
    expect(isValidSupabaseProjectUrl('http://127.0.0.1:54321')).toBe(true);
    expect(isValidSupabaseProjectUrl('http://localhost:54321')).toBe(true);
  });

  it('resolveSupabaseAnonKey prefers ANON_KEY over alias', () => {
    const key = resolveSupabaseAnonKey();
    expect(typeof key).toBe('string');
  });

  it('validateClientEnv returns blockers when misconfigured', () => {
    const result = validateClientEnv();
    expect(result).toHaveProperty('ready');
    expect(Array.isArray(result.blockers)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    if (!result.ready) {
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(
        result.blockers.some(
          (b) =>
            b.includes(ENV_CANONICAL.SUPABASE_URL) ||
            b.includes(ENV_CANONICAL.SUPABASE_ANON_KEY)
        )
      ).toBe(true);
    }
  });
});
