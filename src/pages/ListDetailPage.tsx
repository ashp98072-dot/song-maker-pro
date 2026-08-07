import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import SongCard from '@/components/SongCard';
import { ArrowLeft, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Share2, PlayCircle, ScrollText, Church, Globe, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { clearManualExitContinuous } from '@/features/director-session/utils/continuousExitGuard';
import { NOTES_SHARP, encodeListShare } from '@/utils/transpose';
import { getUserSemitones } from '@/utils/userTranspositions';
import { getSongPath, getSongPathById } from '@/utils/songSlug';
import { shareNative } from '@/utils/shareNative';
import { publishListAsCadena } from '@/features/community';

function noteIndex(note: string): number {
  return NOTES_SHARP.indexOf(note.replace('b', '').replace('#', ''));
}

function getIntervalName(semitones: number): string {
  const intervals: Record<number, string> = {
    0: 'misma tonalidad', 1: 'semitono arriba', 2: 'un tono arriba', 3: 'tercera menor',
    4: 'tercera mayor', 5: 'cuarta justa', 6: 'tritono', 7: 'quinta justa',
    8: 'sexta menor', 9: 'sexta mayor', 10: 'séptima menor', 11: 'séptima mayor',
  };
  return intervals[((semitones % 12) + 12) % 12] || `${semitones} semitonos`;
}

function getTransitionTip(fromKey: string, toKey: string): { semitones: number; tip: string } | null {
  const fromRoot = fromKey.replace('m', '');
  const toRoot = toKey.replace('m', '');
  const fromIdx = NOTES_SHARP.indexOf(fromRoot);
  const toIdx = NOTES_SHARP.indexOf(toRoot);
  if (fromIdx === -1 || toIdx === -1) return null;
  const semitones = ((toIdx - fromIdx) % 12 + 12) % 12;
  if (semitones === 0) return null;

  const interval = getIntervalName(semitones);
  const direction = semitones <= 6 ? 'Sube' : 'Baja';
  const tip = `Estás en ${fromKey} y la siguiente es ${toKey}. ${direction} una ${interval} para una transición suave.`;

  return { semitones, tip };
}

export default function ListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lists, songs, removeSongFromList } = useApp();
  
  // Memoizamos la búsqueda de la lista para evitar cálculos innecesarios
  const list = useMemo(() => lists.find(l => l.id === id), [lists, id]);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [publishingCadena, setPublishingCadena] = useState(false);

  // Hooks must run unconditionally — keep above any early return.
  const listSongs = useMemo(
    () => (list ? songs.filter(s => list.songIds.includes(s.id)) : []),
    [songs, list]
  );

  if (!list) {
    return (
      <div className="container px-4 py-12 text-center animate-in fade-in">
        <p className="text-muted-foreground mb-4">La lista que buscas no existe o ha sido eliminada.</p>
        <Link to="/listas" className="text-gold hover:underline font-medium inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Mis Listas
        </Link>
      </div>
    );
  }

  // Setlist navigation mode (Modo presentación)
  if (currentIdx !== null && listSongs[currentIdx]) {
    const song = listSongs[currentIdx];
    return (
      <div className="container px-4 py-6 max-w-6xl animate-in slide-in-from-right-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentIdx(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver a la lista
          </button>
          <span className="text-sm font-mono bg-secondary px-3 py-1 rounded-full text-muted-foreground">
            {currentIdx + 1} / {listSongs.length}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} 
            disabled={currentIdx === 0}
            className="p-3 rounded-full bg-secondary text-foreground disabled:opacity-20 hover:bg-gold/20 hover:text-gold transition-all shrink-0"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="flex-1 cursor-pointer transform active:scale-[0.98] transition-transform" onClick={() => navigate(getSongPath(song, songs))}>
            <SongCard song={song} />
          </div>

          <button 
            onClick={() => setCurrentIdx(Math.min(listSongs.length - 1, currentIdx + 1))} 
            disabled={currentIdx === listSongs.length - 1}
            className="p-3 rounded-full bg-secondary text-foreground disabled:opacity-20 hover:bg-gold/20 hover:text-gold transition-all shrink-0"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        <p className="text-center text-[10px] uppercase tracking-tighter text-muted-foreground mt-6 font-bold opacity-50">
          Toca la tarjeta para abrir el visor de acordes
        </p>
      </div>
    );
  }

  const handleShareList = async () => {
    try {
      const transpositions: Record<string, number> = {};
      for (const s of listSongs) {
        const v = await getUserSemitones(s.id);
        if (v !== 0) transpositions[s.id] = v;
      }

      const encoded = encodeListShare({
        name: list.name,
        songIds: list.songIds,
        transpositions,
        createdAt: new Date().toISOString(),
      });

      const url = `${window.location.origin}/listas?share=${encoded}`;
      const count = Object.keys(transpositions).length;
      await shareNative({
        title: `${list.name} — Worship Transpose`,
        text:
          count > 0
            ? `Lista con ${listSongs.length} canciones (${count} tonos personalizados)`
            : `Lista con ${listSongs.length} canciones`,
        url,
      });
    } catch {
      toast.error('No se pudo compartir el enlace');
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await removeSongFromList(list.id, songId);
      toast.success("Canción quitada de la lista");
    } catch (error) {
      toast.error("Error al quitar la canción");
    } finally {
      setIsProcessing(false);
    }
  };

  const startLiveSession = () => {
    if (!list?.id || listSongs.length === 0) return;
    navigate(getSongPath(listSongs[0], songs), {
      state: {
        listId: list.id,
        listSongIds: listSongs.map((s) => s.id),
      },
    });
  };

  /** Modo continuo → ContinuousSetlistPage (`/setlist/:id/live`). */
  const startContinuousMode = () => {
    if (!list?.id || listSongs.length === 0) return;
    clearManualExitContinuous();
    navigate(`/setlist/${list.id}/live`, {
      state: {
        listId: list.id,
        listSongIds: listSongs.map((s) => s.id),
      },
    });
  };

  /** Continuo + live director + teleprompter + compartir unión. */
  const startServiceMode = () => {
    if (!list?.id || listSongs.length === 0) return;
    clearManualExitContinuous();
    navigate(`/setlist/${list.id}/live?culto=1`, {
      state: {
        startServiceMode: true,
        listId: list.id,
        listSongIds: listSongs.map((s) => s.id),
      },
    });
  };

  const publishCadena = async () => {
    if (!list || listSongs.length === 0 || publishingCadena) return;
    setPublishingCadena(true);
    try {
      const result = await publishListAsCadena({
        name: list.name,
        songs: listSongs,
        sourceListId: list.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = `${window.location.origin}/comunidad/cadena/${result.slug}`;
      await shareNative({
        title: `${list.name} — Cadena en Worship Transpose`,
        text: `Cadena con ${listSongs.length} canciones`,
        url,
      });
      toast.success('Cadena publicada / actualizada en Comunidad');
    } finally {
      setPublishingCadena(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-6xl animate-in fade-in duration-500">
      <Link to="/listas" className="flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a Mis Listas
      </Link>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold font-display text-foreground mb-1 truncate">{list.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            {listSongs.length} canciones en el setlist
          </p>
        </div>
        
        {listSongs.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleShareList}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-bold hover:bg-secondary transition-all active:scale-95 shadow-sm"
              title="Copia un enlace con canciones y tonos"
            >
              <Share2 className="w-4 h-4 text-gold" /> Compartir
            </button>
            <button
              type="button"
              onClick={() => void publishCadena()}
              disabled={publishingCadena || !list?.id}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/40 bg-card text-foreground text-sm font-bold hover:bg-gold/10 transition-all active:scale-95 disabled:opacity-40"
              title="Publica o actualiza esta lista en Comunidad (canciones, tonos y enlace)"
            >
              {publishingCadena ? (
                <Loader2 className="w-4 h-4 animate-spin text-gold" />
              ) : (
                <Globe className="w-4 h-4 text-gold" />
              )}
              Publicar / actualizar
            </button>
            <button
              type="button"
              onClick={() => startContinuousMode()}
              disabled={!list?.id}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/50 bg-gold/10 text-gold text-sm font-bold hover:bg-gold/20 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              title="Teleprompter: todas las canciones en un scroll continuo"
            >
              <ScrollText className="w-4 h-4" /> Modo continuo
            </button>
            <button
              type="button"
              onClick={() => startServiceMode()}
              disabled={!list?.id}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/40 bg-card text-foreground text-sm font-bold hover:bg-gold/10 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              title="Continuo + en vivo + teleprompter + enlace para unirse"
            >
              <Church className="w-4 h-4 text-gold" /> Iniciar culto
            </button>
            <button
              onClick={startLiveSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-primary-foreground text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-gold/20"
            >
              <PlayCircle className="w-4 h-4" /> Sesión en Vivo
            </button>
          </div>
        )}
      </div>

      {listSongs.length === 0 ? (
        <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground italic mb-4">Esta lista está vacía.</p>
          <Link to="/" className="text-gold hover:underline text-sm font-bold">Ir a la biblioteca para agregar canciones</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listSongs.map((song, idx) => {
            const nextSong = listSongs[idx + 1];
            const transition = nextSong ? getTransitionTip(song.originalKey, nextSong.originalKey) : null;

            return (
              <div key={`${song.id}-${idx}`} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="relative group">
                  <div className="transform transition-transform group-hover:translate-x-1">
                    <SongCard song={song} />
                  </div>
                  <button 
                    onClick={() => handleRemoveSong(song.id)}
                    disabled={isProcessing}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive lg:opacity-0 group-hover:opacity-100 transition-all border border-border shadow-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Transition suggestion */}
                {transition && (
                  <div className="flex items-center gap-3 px-5 py-2.5 my-2 rounded-xl bg-secondary/30 border border-gold/10 ml-4 mr-4">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gold shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-gold font-bold uppercase tracking-wider mr-2">Transición:</span> {transition.tip}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
