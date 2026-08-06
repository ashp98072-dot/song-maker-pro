import { describe, expect, it } from 'vitest';
import {
  anchorIdForSectionLabel,
  buildSectionDescriptors,
  firstAnchorForKind,
  normalizeSectionKind,
} from '@/utils/chordSections';

const SAMPLE = `[Intro]
C G
[Verse]
line
[Coro]
line
[Coro]
line
[Puente]
line
[Final]
end`;

describe('chordSections anchors', () => {
  it('normalizes spanish and english section kinds', () => {
    expect(normalizeSectionKind('[Verse]')).toBe('verse');
    expect(normalizeSectionKind('[Coro 2]')).toBe('chorus');
    expect(normalizeSectionKind('[Puente]')).toBe('bridge');
    expect(normalizeSectionKind('[Final]')).toBe('outro');
  });

  it('generates stable anchor ids with duplicate chorus numbering', () => {
    const descriptors = buildSectionDescriptors(SAMPLE);
    expect(descriptors.map((d) => d.anchorId)).toEqual([
      'intro-1',
      'verse-1',
      'chorus-1',
      'chorus-2',
      'bridge-1',
      'outro-1',
    ]);
  });

  it('maps labels to anchor ids including duplicate labels', () => {
    expect(anchorIdForSectionLabel('[Coro]', SAMPLE)).toBe('chorus-1');
    const twoChoruses = `[Verse]\na\n[Coro]\nb\n[Coro]\nc`;
    expect(anchorIdForSectionLabel('[Coro]', twoChoruses, 0)).toBe('chorus-1');
    expect(anchorIdForSectionLabel('[Coro]', twoChoruses, 1)).toBe('chorus-2');
  });

  it('returns first anchor per quick-nav kind', () => {
    const descriptors = buildSectionDescriptors(SAMPLE);
    expect(firstAnchorForKind(descriptors, 'verse')).toBe('verse-1');
    expect(firstAnchorForKind(descriptors, 'chorus')).toBe('chorus-1');
    expect(firstAnchorForKind(descriptors, 'outro')).toBe('outro-1');
  });
});
