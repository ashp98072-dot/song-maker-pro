import { describe, expect, it } from 'vitest';
import { errorMessage } from '../errorMessage';

describe('errorMessage', () => {
  it('reads Error and API error messages', () => {
    expect(errorMessage(new Error('offline'), 'fallback')).toBe('offline');
    expect(errorMessage({ message: 'denied', code: '403' }, 'fallback')).toBe('denied');
  });

  it.each([null, undefined, 1, 'failure', {}, { message: 123 }, { message: '' }])(
    'uses a safe fallback for %j', (value) => {
      expect(errorMessage(value, 'fallback')).toBe('fallback');
    },
  );
});
