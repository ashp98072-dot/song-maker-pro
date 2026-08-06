import { useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Download, Upload, Database } from 'lucide-react';
import { exportLibrary, parseBackupFile } from '@/utils/libraryBackup';
import { getSongImportProvider } from '@/features/song-import';
import type { Song } from '@/types/music';
import { SAMPLE_SONGS } from '@/data/songs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function BackupPage() {
  const { songs, favorites, lists, importLibrary } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const chordProRef = useRef<HTMLInputElement>(null);

  const customSongs = songs.filter(s => !SAMPLE_SONGS.find(ss => ss.id === s.id));

  const handleExport = () => {
    exportLibrary(customSongs, favorites, lists);
    toast.success(`Backup exportado: ${customSongs.length} canciones, ${lists.length} listas`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseBackupFile(file);
      importLibrary(data.songs, data.favorites, data.lists);
      toast.success(`Importadas ${data.songs.length} canciones, ${data.lists.length} listas`);
    } catch (err: any) {
      toast.error(err.message || 'Error al importar archivo');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleChordProImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const provider = getSongImportProvider('chordpro');
    if (!provider?.parseFiles) return;
    const result = await provider.parseFiles(Array.from(files));
    const fullSongs = result.songs.filter((s): s is Song => !!s.title && !!s.chords) as Song[];
    if (fullSongs.length > 0) {
      importLibrary(fullSongs, [], []);
      toast.success(`Importadas ${fullSongs.length} canción(es) desde ChordPro`);
    }
    if (result.errors.length) {
      toast.error(`${result.errors.length} archivo(s) con error`);
    }
    if (chordProRef.current) chordProRef.current.value = '';
  };

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-gold" />
          <h1 className="text-2xl font-bold font-display text-foreground">Backup y Restauración</h1>
        </div>
        <p className="text-muted-foreground text-sm">Exporta o importa tu biblioteca completa para no perder tus canciones.</p>
      </motion.div>

      <div className="space-y-4">
        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
            <Download className="w-5 h-5 text-gold" /> Exportar Biblioteca
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Descarga un archivo JSON con todas tus canciones personales ({customSongs.length}), favoritos ({favorites.length}) y listas ({lists.length}).
          </p>
          <button onClick={handleExport}
            className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Descargar Backup
          </button>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-gold" /> Importar Biblioteca
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Restaura tus canciones desde un archivo de backup. Las canciones duplicadas no se agregarán dos veces.
          </p>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Seleccionar Archivo
          </button>
        </div>

        <motion.div className="glass-card p-6">
          <h2 className="font-display font-bold text-foreground mb-2">Importación masiva (ChordPro)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sube varios archivos .pro, .chopro o .txt con acordes. Cada archivo se convierte en una canción nueva.
          </p>
          <input
            ref={chordProRef}
            type="file"
            accept=".pro,.chopro,.txt"
            multiple
            onChange={handleChordProImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => chordProRef.current?.click()}
            className="w-full py-3 rounded-xl border border-amber-500/30 text-amber-200 font-semibold text-sm hover:bg-amber-500/10 transition-colors"
          >
            Importar archivos ChordPro
          </button>
        </motion.div>
      </div>
    </div>
  );
}
