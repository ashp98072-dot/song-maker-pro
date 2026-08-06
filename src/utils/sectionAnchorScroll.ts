const ANCHOR_SELECTOR = '[data-song-anchor]';

export function querySectionAnchorElement(
  anchorId: string,
  root: ParentNode = document
): HTMLElement | null {
  if (!anchorId) return null;
  const escaped =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(anchorId)
      : anchorId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return root.querySelector<HTMLElement>(
    `${ANCHOR_SELECTOR}[data-song-anchor="${escaped}"]`
  );
}

export function scrollToSectionAnchor(
  anchorId: string,
  root: ParentNode = document,
  opts?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition }
): boolean {
  const el = querySectionAnchorElement(anchorId, root);
  if (!el) return false;
  el.scrollIntoView({
    behavior: opts?.behavior ?? 'smooth',
    block: opts?.block ?? 'start',
  });
  return true;
}
