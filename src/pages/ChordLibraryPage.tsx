import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AudioLines, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChordLibraryPanel } from '@/components/chord-diagram/ChordLibraryPanel';
import { InstrumentTunerPanel } from '@/features/tuner/InstrumentTunerPanel';

type HubTab = 'acordes' | 'afinador';

/**
 * Hub de herramientas musicales: biblioteca + afinador en un solo lugar,
 * sin amontonar controles.
 */
export default function ChordLibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab: HubTab = params.get('tab') === 'afinador' ? 'afinador' : 'acordes';

  const setTab = (next: HubTab) => {
    if (next === 'afinador') setParams({ tab: 'afinador' }, { replace: true });
    else setParams({}, { replace: true });
  };

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl animate-in fade-in">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al perfil
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-1">
          Herramientas
        </h1>
        <p className="text-muted-foreground text-sm mb-5 max-w-xl">
          Acordes y afinador en un solo módulo. En una canción también puedes tocar un acorde de la
          letra.
        </p>

        {/* Primary switch — Acordes | Afinador */}
        <div className="flex gap-1 p-1 rounded-2xl bg-secondary/70 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setTab('acordes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'acordes'
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="w-4 h-4" />
            Acordes
          </button>
          <button
            type="button"
            onClick={() => setTab('afinador')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'afinador'
                ? 'bg-background text-gold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AudioLines className="w-4 h-4" />
            Afinador
          </button>
        </div>

        {tab === 'acordes' ? (
          <div className="border-t border-border pt-5">
            <ChordLibraryPanel hideHeader />
          </div>
        ) : (
          <div className="border-t border-border pt-5 max-w-lg">
            <InstrumentTunerPanel />
          </div>
        )}
      </motion.div>
    </div>
  );
}
