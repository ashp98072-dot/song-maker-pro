import { describe, expect, it, afterEach } from 'vitest';
import {
  isAppDebugEnabled,
  isDebugPanelVisible,
  isDebugQueryParam,
} from '@/debug/appDebugMode';

describe('appDebugMode', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('isDebugQueryParam false without param', () => {
    window.history.replaceState({}, '', '/');
    expect(isDebugQueryParam()).toBe(false);
    expect(isDebugPanelVisible()).toBe(false);
  });

  it('isDebugQueryParam true with ?debug=1', () => {
    window.history.replaceState({}, '', '/?debug=1');
    expect(isDebugQueryParam()).toBe(true);
    expect(isDebugPanelVisible()).toBe(true);
  });

  it('isAppDebugEnabled in vitest (DEV)', () => {
    expect(isAppDebugEnabled()).toBe(import.meta.env.DEV);
  });
});
