import { Link, useSearchParams } from 'react-router-dom';
import { AudioLines, Library, Mic2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChordLibraryPanel } from '@/components/chord-diagram/ChordLibraryPanel';
import { InstrumentTunerPanel } from '@/features/tuner/InstrumentTunerPanel';
import { VocalRangeTestPanel } from '@/features/vocal-test';

type HubTab = 'acordes' | 'afinador' | 'registro';

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

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl animate-in fade-in">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-1">
          Herramientas
        </h1>
        <p className="text-muted-foreground text-sm mb-5 max-w-xl">
          Acordes, afinador y test de voz. En una canción también puedes tocar un acorde de la letra
          o aplicar “Mi voz” al transponer.
        </p>

        <div className="flex gap-1 p-1 rounded-2xl bg-secondary/70 mb-6">
          <button
            type="button"
            onClick={() => setTab('acordes')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'acordes'
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="w-4 h-4 shrink-0" />
            Acordes
          </button>
          <button
            type="button"
            onClick={() => setTab('afinador')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'afinador'
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AudioLines className="w-4 h-4 shrink-0" />
            Afinador
          </button>
          <button
            type="button"
            onClick={() => setTab('registro')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'registro'
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic2 className="w-4 h-4 shrink-0" />
            Mi voz
          </button>
        </div>

        {tab === 'acordes' ? (
          <div className="border-t border-border pt-5">
            <ChordLibraryPanel hideHeader />
          </div>
        ) : null}
        {tab === 'afinador' ? (
          <div className="border-t border-border pt-5 max-w-lg">
            <InstrumentTunerPanel />
          </div>
        ) : null}
        {tab === 'registro' ? (
          <div className="border-t border-border pt-5 max-w-lg">
            <p className="text-sm text-muted-foreground mb-4">
              Descubre tu registro (soprano, tenor, etc.) y úsalo en canciones con el botón “Mi voz”.
            </p>
            <VocalRangeTestPanel />
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
