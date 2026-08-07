import { useApp } from '@/context/AppContext';
import { useState, useMemo, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Pencil, Check, X, Download, Music2, RefreshCw } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { decodeListShare, type SharedListPayload } from '@/utils/transpose';
import { bulkSetUserTranspositions } from '@/utils/userTranspositions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ListsPage() {
  // Asegúrate de que useApp esté configurado para leer de la tabla 'user_lists'
  const { lists, createList, deleteList, renameList, songs, setListSongs } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lista compartida entrante (?share=...)
  const incomingShared: SharedListPayload | null = useMemo(() => {
    const raw = searchParams.get('share');
    if (!raw) return null;
    try {
      return decodeListShare(raw);
    } catch (e) {
      console.error("Error decodificando lista:", e);
      return null;
    }
  }, [searchParams]);

  // Cuenta cuántas canciones existen ya en la biblioteca local
  const matchedCount = useMemo(() => {
    if (!incomingShared) return 0;
    const existing = new Set(songs.map(s => s.id));
    return incomingShared.songIds.filter(id => existing.has(id)).length;
  }, [incomingShared, songs]);

  const handleImportShared = async () => {
    if (!incomingShared || isImporting) return;
    
    setIsImporting(true);
    const existingIds = new Set(songs.map(s => s.id));
    const validSongIds = incomingShared.songIds.filter(id => existingIds.has(id));

    if (validSongIds.length === 0) {
      toast.error('Ninguna de las canciones de esta lista está en tu biblioteca todavía');
      setIsImporting(false);
      return;
    }

    try {
      // 1. Crear la lista en Supabase
      const newId = await createList(incomingShared.name);
      
      if (newId) {
        // 2. Set atómico de todas las canciones (evita race conditions de closure)
        await setListSongs(newId, validSongIds);

        // 3. Aplicar transposiciones personalizadas
        if (incomingShared.transpositions) {
          await bulkSetUserTranspositions(incomingShared.transpositions);
        }

        toast.success(`Lista "${incomingShared.name}" importada con ${validSongIds.length} canciones`);
        setSearchParams({});
        // Navegar a la lista recién creada para confirmación visual
        setTimeout(() => navigate(`/lista/${newId}`), 400);
      }
    } catch (error) {
      console.error("Error en la importación:", error);
      toast.error("Hubo un problema al importar la lista");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreate = async () => {
    if (newName.trim()) {
      const id = await createList(newName.trim());
      if (id) {
        setNewName('');
        setShowNew(false);
        toast.success("Lista creada correctamente");
      }
    }
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await renameList(id, editName.trim());
      setEditingId(null);
      toast.success("Lista renombrada");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar lista y todo su contenido? Esta acción no se puede deshacer.')) {
      await deleteList(id);
      toast.success("Lista eliminada");
    }
  };

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      {/* Banner de lista compartida entrante */}
      {incomingShared && (
        <div className="glass-card p-4 mb-4 sm:mb-6 border border-gold/40 bg-gold/5 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center shrink-0">
              <Music2 className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gold/80 font-bold">Lista compartida detectada</p>
              <h3 className="font-bold text-foreground truncate">{incomingShared.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {incomingShared.songIds.length} canciones en total
                {matchedCount !== incomingShared.songIds.length && ` · ${matchedCount} disponibles para importar`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button 
                onClick={() => setSearchParams({})}
                disabled={isImporting}
                className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Descartar
              </button>
              <button 
                onClick={handleImportShared}
                disabled={isImporting || matchedCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:grayscale disabled:opacity-50"
              >
                {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isImporting ? 'Importando...' : 'Importar lista'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Mis Listas</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Tus listas se sincronizan automáticamente en la nube</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold text-gold hover:bg-gold/10 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva Lista
        </button>
      </div>

      {showNew && (
        <div className="glass-card p-4 mb-6 flex items-center gap-3 animate-in zoom-in-95">
          <input 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre de la lista..." 
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50" 
          />
          <button onClick={handleCreate} className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90">Crear</button>
          <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-16 bg-secondary/20 rounded-3xl border border-dashed border-border">
          <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground italic">No se encontraron listas vinculadas a tu cuenta</p>
          <button onClick={() => setShowNew(true)} className="mt-4 text-gold hover:underline text-sm font-medium">Comenzar una lista nueva</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <div key={list.id} className="glass-card p-4 group hover:border-gold/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                {editingId === list.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleRename(list.id)}
                      autoFocus 
                      className="flex-1 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" 
                    />
                    <button onClick={() => handleRename(list.id)} className="text-emerald-500 hover:scale-110 transition-transform"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <Link to={`/lista/${list.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                        <ListMusic className="w-5 h-5 text-gold" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-gold transition-colors">{list.name}</h3>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-tighter font-medium">
                          {list.songIds?.length || 0} canciones
                          <span className="opacity-30">•</span>
                          {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : 'Reciente'}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setEditingId(list.id); setEditName(list.name); }} 
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md"
                        title="Renombrar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(list.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
