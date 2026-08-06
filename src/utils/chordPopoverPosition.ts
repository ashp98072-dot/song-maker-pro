export type ChordPopoverPlacement = 'top' | 'bottom';

export const CHORD_POPOVER_ESTIMATE_HEIGHT = 220;
export const CHORD_POPOVER_ESTIMATE_WIDTH = 280;
export const CHORD_POPOVER_GAP = 8;
export const CHORD_POPOVER_MARGIN = 12;

export type AnchorSpaces = {
  spaceTop: number;
  spaceBottom: number;
  spaceLeft: number;
  spaceRight: number;
};

export function measureAnchorSpaces(rect: DOMRect): AnchorSpaces {
  return {
    spaceTop: rect.top,
    spaceBottom: window.innerHeight - rect.bottom,
    spaceLeft: rect.left,
    spaceRight: window.innerWidth - rect.right,
  };
}

export function choosePopoverPlacement(
  spaces: AnchorSpaces,
  popupHeight = CHORD_POPOVER_ESTIMATE_HEIGHT
): ChordPopoverPlacement {
  const needed = popupHeight + CHORD_POPOVER_GAP;
  if (spaces.spaceTop < needed && spaces.spaceBottom >= needed) {
    return 'bottom';
  }
  if (spaces.spaceBottom < needed && spaces.spaceTop >= needed) {
    return 'top';
  }
  if (spaces.spaceTop < needed && spaces.spaceBottom < needed) {
    return spaces.spaceBottom >= spaces.spaceTop ? 'bottom' : 'top';
  }
  return 'top';
}

export function clampPopoverPosition(
  anchorRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number,
  placement: ChordPopoverPlacement
): { top: number; left: number; placement: ChordPopoverPlacement } {
  let top =
    placement === 'top'
      ? anchorRect.top - popoverHeight - CHORD_POPOVER_GAP
      : anchorRect.bottom + CHORD_POPOVER_GAP;

  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  left = Math.max(
    CHORD_POPOVER_MARGIN,
    Math.min(left, window.innerWidth - popoverWidth - CHORD_POPOVER_MARGIN)
  );

  const maxTop = window.innerHeight - popoverHeight - CHORD_POPOVER_MARGIN;
  if (top < CHORD_POPOVER_MARGIN) {
    top = anchorRect.bottom + CHORD_POPOVER_GAP;
    placement = 'bottom';
  } else if (top > maxTop) {
    top = anchorRect.top - popoverHeight - CHORD_POPOVER_GAP;
    placement = 'top';
  }
  top = Math.max(CHORD_POPOVER_MARGIN, Math.min(top, maxTop));

  return { top, left, placement };
}

export function shouldUseChordModal(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 640px)').matches;
}
