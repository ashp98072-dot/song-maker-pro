import { describe, expect, it } from 'vitest';
import { asUuidOrNull } from '@/utils/asUuidOrNull';

describe('asUuidOrNull', () => {
  it('accepts standard uuids', () => {
    expect(asUuidOrNull('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('rejects timestamp list ids', () => {
    expect(asUuidOrNull('1777997829616')).toBeNull();
  });

  it('rejects empty values', () => {
    expect(asUuidOrNull(null)).toBeNull();
    expect(asUuidOrNull('')).toBeNull();
    expect(asUuidOrNull('   ')).toBeNull();
  });
});
