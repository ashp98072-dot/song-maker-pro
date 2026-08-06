import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  readIsMobileViewport,
  MOBILE_VIEWPORT_MAX_PX,
  syncMobileViewport,
} from '@/features/mobile-stage/hooks/mobileViewportSync';

describe('mobile viewport sync', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes(String(MOBILE_VIEWPORT_MAX_PX)),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    vi.unstubAllGlobals();
  });

  it('uses innerWidth fallback when matchMedia is false', () => {
    vi.mocked(window.matchMedia).mockImplementation(
      () =>
        ({
          matches: false,
          media: '',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList
    );

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });

    expect(readIsMobileViewport()).toBe(true);
    expect(syncMobileViewport()).toBe(true);
  });

  it('detects standalone PWA with phone screen short side', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    Object.defineProperty(window, 'screen', {
      writable: true,
      configurable: true,
      value: { width: 390, height: 844 },
    });

    expect(readIsMobileViewport()).toBe(true);
  });
});
