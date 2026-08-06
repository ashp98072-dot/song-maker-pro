import { isSectionLabel } from '@/utils/transpose';

export interface SectionDescriptor {
  /** Etiqueta original en la partitura, p. ej. `[Coro]`. */
  label: string;
  /** Id estable para sync, p. ej. `chorus-1`. */
  anchorId: string;
  /** Tipo normalizado: verse, chorus, bridge, intro, outro, … */
  kind: string;
}

export const SECTION_QUICK_NAV_CHIPS = [
  { kind: 'verse', label: 'Verso' },
  { kind: 'chorus', label: 'Coro' },
  { kind: 'bridge', label: 'Puente' },
  { kind: 'outro', label: 'Final' },
] as const;

const KIND_RULES: { kind: string; patterns: RegExp[] }[] = [
  { kind: 'intro', patterns: [/^intro\b/i, /\bintro\b/i, /^entrada\b/i] },
  { kind: 'verse', patterns: [/^verse\b/i, /\bverse\b/i, /^verso\b/i, /\bverso\b/i, /^v\d+\b/i] },
  { kind: 'pre-chorus', patterns: [/^pre[-\s]?chorus\b/i, /^pre[-\s]?coro\b/i] },
  { kind: 'chorus', patterns: [/^chorus\b/i, /\bchorus\b/i, /^coro\b/i, /\bcoro\b/i, /^c\d+\b/i] },
  { kind: 'bridge', patterns: [/^bridge\b/i, /\bbridge\b/i, /^puente\b/i, /\bpuente\b/i] },
  { kind: 'outro', patterns: [/^outro\b/i, /\boutro\b/i, /^final\b/i, /\bfinal\b/i, /^ending\b/i] },
  { kind: 'tag', patterns: [/^tag\b/i, /\btag\b/i, /^coda\b/i] },
  { kind: 'interlude', patterns: [/^interlude\b/i, /^interludio\b/i, /^instrumental\b/i] },
];

export function listChordSections(chords: string | undefined | null): string[] {
  if (chords == null || typeof chords !== 'string') return [];
  return chords.split('\n').filter(isSectionLabel).map((line) => line.trim());
}

/** Normaliza el texto interno de `[Coro 2]` → tipo semántico (`chorus`). */
export function normalizeSectionKind(sectionLabel: string): string {
  const inner = sectionLabel.replace(/^\[|\]$/g, '').trim();
  if (!inner) return 'section';

  for (const { kind, patterns } of KIND_RULES) {
    if (patterns.some((p) => p.test(inner))) return kind;
  }

  return inner
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

/**
 * Genera anchors estables en orden de aparición.
 * Coros duplicados → chorus-1, chorus-2, etc.
 */
export function buildSectionDescriptors(chords: string | undefined | null): SectionDescriptor[] {
  const labels = listChordSections(chords);
  const counts = new Map<string, number>();

  return labels.map((label) => {
    const kind = normalizeSectionKind(label);
    const index = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, index);
    return {
      label,
      kind,
      anchorId: `${kind}-${index}`,
    };
  });
}

export function anchorIdForSectionLabel(
  sectionLabel: string,
  chords: string | undefined | null,
  occurrence = 0
): string | undefined {
  let seen = 0;
  for (const d of buildSectionDescriptors(chords)) {
    if (d.label === sectionLabel) {
      if (seen === occurrence) return d.anchorId;
      seen += 1;
    }
  }
  return undefined;
}

export function descriptorForAnchorId(
  anchorId: string,
  chords: string | undefined | null
): SectionDescriptor | undefined {
  return buildSectionDescriptors(chords).find((d) => d.anchorId === anchorId);
}

/** Primer anchor de un tipo (p. ej. chorus → chorus-1). */
export function firstAnchorForKind(
  descriptors: SectionDescriptor[],
  kind: string
): string | undefined {
  return descriptors.find((d) => d.kind === kind)?.anchorId;
}
