import { Link } from 'react-router-dom';
import { Library, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChordLibraryPanel } from '@/components/chord-diagram/ChordLibraryPanel';

/**
 * Módulo independiente: explorar voicings de guitarra/piano
 * sin estar dentro de una canción.
 */
export default function ChordLibraryPage() {
  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 sm:mb-6"
      >
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al perfil
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gold/10 text-gold">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Biblioteca de acordes
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Explora diagramas de guitarra y piano. También puedes abrir un acorde tocando la
              letra de cualquier canción.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="glass-card p-4 sm:p-6">
        <ChordLibraryPanel />
      </div>
    </div>
  );
}
