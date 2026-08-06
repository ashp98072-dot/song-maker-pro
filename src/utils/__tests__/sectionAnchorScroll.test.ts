import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  querySectionAnchorElement,
  scrollToSectionAnchor,
} from '@/utils/sectionAnchorScroll';

describe('sectionAnchorScroll', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    root = document.createElement('div');
    const verse = document.createElement('div');
    verse.dataset.songAnchor = 'verse-1';
    verse.textContent = 'Verse';
    const chorus = document.createElement('div');
    chorus.dataset.songAnchor = 'chorus-1';
    chorus.textContent = 'Chorus';
    root.append(verse, chorus);
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('finds elements by data-song-anchor', () => {
    const el = querySectionAnchorElement('chorus-1', root);
    expect(el?.textContent).toBe('Chorus');
  });

  it('scrolls matching anchor into view', () => {
    const el = querySectionAnchorElement('verse-1', root)!;
    const spy = vi.spyOn(el, 'scrollIntoView');
    expect(scrollToSectionAnchor('verse-1', root)).toBe(true);
    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('returns false when anchor is missing', () => {
    expect(scrollToSectionAnchor('bridge-9', root)).toBe(false);
  });
});
