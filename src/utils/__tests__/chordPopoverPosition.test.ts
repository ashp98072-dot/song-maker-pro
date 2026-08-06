import { describe, expect, it } from 'vitest';
import {
  choosePopoverPlacement,
  clampPopoverPosition,
} from '@/utils/chordPopoverPosition';

describe('choosePopoverPlacement', () => {
  it('opens below when not enough space above', () => {
    expect(
      choosePopoverPlacement({ spaceTop: 40, spaceBottom: 400, spaceLeft: 100, spaceRight: 100 })
    ).toBe('bottom');
  });

  it('opens above when not enough space below', () => {
    expect(
      choosePopoverPlacement({ spaceTop: 400, spaceBottom: 40, spaceLeft: 100, spaceRight: 100 })
    ).toBe('top');
  });

  it('prefers above when both sides have room', () => {
    expect(
      choosePopoverPlacement({ spaceTop: 300, spaceBottom: 300, spaceLeft: 100, spaceRight: 100 })
    ).toBe('top');
  });
});

function mockRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as DOMRect;
}

describe('clampPopoverPosition', () => {
  it('keeps popover inside horizontal viewport', () => {
    const anchor = mockRect(10, 100, 40, 20);
    const pos = clampPopoverPosition(anchor, 280, 200, 'top');
    expect(pos.left).toBeGreaterThanOrEqual(12);
    expect(pos.left + 280).toBeLessThanOrEqual(window.innerWidth - 12);
  });

  it('flips below when clamped top would clip', () => {
    const anchor = mockRect(100, 20, 30, 18);
    const pos = clampPopoverPosition(anchor, 240, 200, 'top');
    expect(pos.top).toBeGreaterThanOrEqual(12);
  });
});
