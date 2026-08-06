import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileControlsChrome } from '@/features/mobile-worship/hooks/useMobileControlsChrome';

describe('useMobileControlsChrome', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists hide preference in sessionStorage', () => {
    const { result } = renderHook(() => useMobileControlsChrome());

    expect(result.current.controlsHidden).toBe(false);

    act(() => {
      result.current.hideControls();
    });

    expect(result.current.controlsHidden).toBe(true);
    expect(sessionStorage.getItem('worship-mobile-controls-hidden')).toBe('1');

    act(() => {
      result.current.showControls();
    });

    expect(result.current.controlsHidden).toBe(false);
    expect(sessionStorage.getItem('worship-mobile-controls-hidden')).toBeNull();
  });
});
