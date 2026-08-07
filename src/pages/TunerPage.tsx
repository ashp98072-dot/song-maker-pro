import { Link } from 'react-router-dom';
import { ArrowLeft, AudioLines } from 'lucide-react';
import { motion } from 'framer-motion';
import { InstrumentTunerPanel } from '@/features/tuner/InstrumentTunerPanel';

export default function TunerPage() {
  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-lg animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al perfil
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gold/10 text-gold">
            <AudioLines className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Afinador
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Guitarra, bajo y violín · micrófono del dispositivo
            </p>
          </div>
        </div>
      </motion.div>

      <div className="glass-card p-4 sm:p-6">
        <InstrumentTunerPanel />
      </div>
    </div>
  );
}
