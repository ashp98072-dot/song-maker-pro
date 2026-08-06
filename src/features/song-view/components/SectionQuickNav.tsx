import {
  buildSectionDescriptors,
  firstAnchorForKind,
  SECTION_QUICK_NAV_CHIPS,
} from '@/utils/chordSections';

export interface SectionQuickNavProps {
  chords: string;
  activeAnchorId?: string;
  onSelectAnchor: (anchorId: string) => void;
}

export function SectionQuickNav({ chords, activeAnchorId, onSelectAnchor }: SectionQuickNavProps) {
  const descriptors = buildSectionDescriptors(chords);
  if (descriptors.length === 0) return null;

  const chips = SECTION_QUICK_NAV_CHIPS.map((chip) => ({
    ...chip,
    anchorId: firstAnchorForKind(descriptors, chip.kind),
  })).filter((c) => c.anchorId);

  if (chips.length === 0) return null;

  return (
    <nav
      className="section-quick-nav sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md px-3 py-2"
      aria-label="Navegación rápida de secciones"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-none max-w-4xl mx-auto">
        {chips.map((chip) => {
          const isActive = chip.anchorId === activeAnchorId;
          return (
            <button
              key={chip.kind}
              type="button"
              onClick={() => chip.anchorId && onSelectAnchor(chip.anchorId)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide border transition-colors ${
                isActive
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-border text-muted-foreground hover:border-gold/40 hover:text-foreground'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
