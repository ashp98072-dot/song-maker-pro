import { useSearchParams } from 'react-router-dom';
import { AudioLines, Library, Mic2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChordLibraryPanel } from '@/components/chord-diagram/ChordLibraryPanel';
import { InstrumentTunerPanel } from '@/features/tuner/InstrumentTunerPanel';
import { VocalRangeTestPanel } from '@/features/vocal-test';

type HubTab = 'acordes' | 'afinador' | 'registro';

const TABS: { id: HubTab; label: string; hint: string; icon: typeof Library }[] = [
  { id: 'acordes', label: 'Acordes', hint: 'Biblioteca de diagramas', icon: Library },
  { id: 'afinador', label: 'Afinador', hint: 'Afinación por micrófono', icon: AudioLines },
  { id: 'registro', label: 'Mi voz', hint: 'Test de registro vocal', icon: Mic2 },
];

function tabFromParams(raw: string | null): HubTab {
  if (raw === 'afinador') return 'afinador';
  if (raw === 'registro' || raw === 'voz') return 'registro';
  return 'acordes';
}

/**
 * Hub de herramientas: acordes, afinador y test de registro vocal.
 */
export default function ChordLibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = tabFromParams(params.get('tab'));

  const setTab = (next: HubTab) => {
    if (next === 'acordes') setParams({}, { replace: true });
    else setParams({ tab: next }, { replace: true });
  };

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.12),transparent_60%)]"
      />

      <div
        className={`relative container px-3 sm:px-4 py-4 sm:py-6 animate-in fade-in ${
          tab === 'acordes' ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold mb-1.5">
            Práctica
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground leading-tight">
            Herramientas
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            {active.hint}. En una canción también puedes tocar un acorde de la letra o aplicar “Mi
            voz” al transponer.
          </p>
        </motion.header>

        <div
          role="tablist"
          aria-label="Herramientas"
          className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm mb-5 sm:mb-6 shadow-sm"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(id)}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  selected
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {selected ? (
                  <motion.span
                    layoutId="tools-tab-pill"
                    className="absolute inset-0 rounded-xl bg-background shadow-sm border border-border/60"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Icon className="relative w-4 h-4 shrink-0" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'acordes' ? <ChordLibraryPanel hideHeader /> : null}
            {tab === 'afinador' ? (
              <div className="max-w-lg mx-auto rounded-2xl border border-border/80 bg-card/50 p-4 sm:p-5">
                <InstrumentTunerPanel />
              </div>
            ) : null}
            {tab === 'registro' ? (
              <div className="max-w-lg mx-auto rounded-2xl border border-border/80 bg-card/50 p-4 sm:p-5">
                <VocalRangeTestPanel />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
