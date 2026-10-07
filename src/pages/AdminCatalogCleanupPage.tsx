import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/context/useApp';
import { supabase } from '@/integrations/supabase/client';
import { analyzeCatalog, countSongChords } from '@/features/catalog-cleanup/analyzeCatalog';
import { getSongPath } from '@/utils/songSlug';

export default function AdminCatalogCleanupPage() {
  const { songs, isAdmin, isGuest, archivedSongIds, refreshCatalogArchives } = useApp();
  const [filter, setFilter] = useState('duplicates');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(100);
  const hidden = useMemo(() => new Set(archivedSongIds), [archivedSongIds]);
  const active = useMemo(() => songs.filter(song => !hidden.has(song.id)), [songs, hidden]);
  const findings = useMemo(() => analyzeCatalog(active), [active]);
  const rows = useMemo(() => filter === 'archived'
    ? songs.filter(song => hidden.has(song.id)).map(song => ({song,chordCount:countSongChords(song.chords),duplicate:false,suggestedKeep:false,identical:false}))
    : findings.filter(row => filter === 'duplicates' ? row.duplicate : row.chordCount === 0), [filter, songs, hidden, findings]);
  if (!isAdmin || isGuest) return <Navigate to="/perfil" replace />;
  const changeFilter = (value: string) => { setFilter(value); setSelected([]); setLimit(100); };
  const apply = async () => {
    if (busy || selected.length < 1 || selected.length > 200) return;
    setBusy(true);
    try {
      const {error} = await supabase.rpc('admin_archive_catalog_songs', {p_ids:selected,p_archive:filter !== 'archived'});
      if (error) throw new Error(error.code === 'PGRST202' ? 'Aplica la migración 20261007120000_catalog_archive.sql primero' : error.message);
      setSelected([]);
      await refreshCatalogArchives();
      toast.success(filter === 'archived' ? 'Canciones restauradas' : 'Canciones archivadas; puedes restaurarlas');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo completar la limpieza'); }
    finally { setBusy(false); }
  };
  return <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
    <Link to="/perfil" className="text-sm text-gold">← Volver al perfil</Link>
    <h1 className="text-2xl font-bold">Limpiar catálogo</h1>
    <p className="text-sm text-muted-foreground">Revisa antes de seleccionar. Archivar oculta canciones del inicio y de comunidad; conserva sus datos, listas y favoritos. Puedes restaurarlas. El análisis usa el catálogo cargado en este dispositivo.</p>
    <p className="text-sm text-muted-foreground">Mismo título y artista puede significar otro arreglo. La recomendación conserva la versión con más acordes detectados; no certifica su calidad musical. Sin acordes detectados también puede requerir revisión de formato.</p>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block">Mostrar <select aria-label="Mostrar canciones" value={filter} onChange={e => changeFilter(e.target.value)} className="bg-secondary rounded p-2 ml-2">
        <option value="duplicates">Posibles duplicadas</option><option value="no-chords">Sin acordes detectados</option><option value="archived">Archivadas</option>
      </select></label>
      <p>{rows.length} canciones · {selected.length} seleccionadas (máximo 200)</p>
      {filter === 'duplicates' ? <button onClick={() => setSelected(rows.filter(row => row.identical && !row.suggestedKeep).slice(0,200).map(row => row.song.id))} className="border rounded px-3 py-2 mr-2">Seleccionar copias idénticas adicionales</button> : filter === 'no-chords' ? <button onClick={() => setSelected(rows.slice(0,200).map(row => row.song.id))} className="border rounded px-3 py-2 mr-2">Seleccionar hasta 200 sin acordes</button> : null}
      <button onClick={() => setSelected([])} className="border rounded px-3 py-2">Deseleccionar todas</button>
      <button onClick={() => void apply()} disabled={!selected.length || selected.length > 200} className="bg-gold text-black rounded px-3 py-2 ml-2 disabled:opacity-40">
        {busy ? 'Guardando…' : filter === 'archived' ? 'Restaurar seleccionadas' : 'Archivar seleccionadas'}
      </button>
      <ul className="space-y-3">{rows.slice(0,limit).map(row => <li key={row.song.id} className="border border-border rounded-xl p-4">
        <label className="flex gap-3 items-start"><input type="checkbox" checked={selected.includes(row.song.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev,row.song.id] : prev.filter(id => id !== row.song.id))} />
          <span><strong>{row.song.title}</strong> · {row.song.artist}<br /><span className="text-xs text-muted-foreground">{row.chordCount} acordes detectados · {row.song.id}</span></span>
        </label>
        <p className="text-xs text-amber-500 mt-2">{row.duplicate ? row.identical ? 'Mismo título, artista y contenido idéntico.' : 'Mismo título y artista; contenido diferente: revisa las versiones.' : row.chordCount === 0 ? 'No se identificaron acordes.' : ''} {row.suggestedKeep ? 'Recomendación: conservar esta versión.' : ''}</p>
        <Link className="text-sm text-gold underline" to={getSongPath(row.song,songs)} target="_blank" rel="noreferrer">Revisar canción</Link>
      </li>)}</ul>
      {rows.length === 0 ? <p>No hay canciones en esta categoría.</p> : null}
      {rows.length > limit ? <button onClick={() => setLimit(prev => prev + 100)} className="border rounded p-2">Mostrar otras 100</button> : null}
    </fieldset>
  </main>;
}
