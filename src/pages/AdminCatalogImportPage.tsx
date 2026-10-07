import { useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  FileMusic,
  ListMusic,
  Loader2,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/useApp';
import {
  getSongImportProvider,
  normalizeImportedSong,
} from '@/features/song-import';
import {
  COMMUNITY_GENRES,
  publishListAsCadena,
  type CommunityGenreId,
} from '@/features/community';
import { estimateSongKey } from '@/features/song-import/utils/estimateSongKey';
import type { Song } from '@/types/music';
import { saveAdminImportBatch } from '@/features/song-import/adminImport';
import { songDedupeKey } from '@/features/song-import/utils/normalizeImportedSong';

type ReviewRow = {
  localId: string;
  song: Song;
  selected: boolean;
  genre: CommunityGenreId;
  fileName?: string;
  expanded: boolean;
  keySuggestion?: ReturnType<typeof estimateSongKey>;
};

type ImportMode = 'library' | 'publish' | 'cadena';

/**
 * Admin: Holyrics / ChordPro / paste → review → server-checked bulk save.
 * Rights: files/paste must be yours or licensed; no scraping.
 */
export default function AdminCatalogImportPage() {
  const { isAdmin, isGuest, songs, importLibrary, createList, setListSongs } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const importInFlight = useRef(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [hasHolyrics, setHasHolyrics] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ file?: string; message: string }[]>([]);
  const [defaultGenre, setDefaultGenre] = useState<CommunityGenreId>('adoracion');
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [cadenaName, setCadenaName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState<ImportMode | null>(null);
  const [parsing, setParsing] = useState(false);

  const selected = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const duplicateRows = useMemo(() => {
    const seen = new Set(songs.map(song => songDedupeKey(song.title, song.artist)));
    const duplicates = new Set<string>();
    for (const row of rows) {
      const key = songDedupeKey(row.song.title, row.song.artist);
      if (seen.has(key)) duplicates.add(row.localId);
      seen.add(key);
    }
    return duplicates;
  }, [rows, songs]);
  const dupCount = duplicateRows.size;

  if (isGuest || !isAdmin) {
    return <Navigate to="/perfil" replace />;
  }

  const enqueuePartials = (
    partials: Parameters<typeof normalizeImportedSong>[0][],
    fileNames?: string[]
  ) => {
    const next: ReviewRow[] = [];
    const seen = new Set([...songs, ...rows.map(row => row.song)].map(song => songDedupeKey(song.title, song.artist)));
    partials.forEach((partial, i) => {
      const song = normalizeImportedSong(partial, i);
      if (!song) return;
      const missingKey = partial.originalKey === '' || (!partial.originalKey && !partial.key);
      if (missingKey) { song.originalKey = ''; song.key = ''; }
      const key = songDedupeKey(song.title, song.artist);
      const duplicate = seen.has(key);
      seen.add(key);
      next.push({
        localId: `${song.id}-${i}-${Date.now()}`,
        song,
        keySuggestion: missingKey ? estimateSongKey(song.chords) : null,
        selected: updateExisting || !duplicate,
        genre: defaultGenre,
        fileName: fileNames?.[i],
        expanded: false,
      });
    });
    if (!next.length) return 0;
    setRows((prev) => [...prev, ...next]);
    return next.length;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setParsing(true);
    try {
      const partials: Partial<Song>[] = [];
      const names: string[] = [];
      const errors: { file?: string; message: string }[] = [];
      if (files.length > 20) throw new Error('Selecciona como máximo 20 archivos por carga');
      for (const file of Array.from(files)) {
        if (/\.zip$/i.test(file.name)) throw new Error('Extrae el ZIP primero y selecciona hasta 20 archivos .chopro de un lote');
        const holyrics = /\.mufl?$/i.test(file.name);
        const provider = getSongImportProvider(holyrics ? 'holyrics' : 'chordpro');
        if (!provider?.parseFiles) throw new Error('Formato no disponible');
        if (file.size > 10 * 1024 * 1024) throw new Error('Máximo 10 MB por archivo');
        const result = await provider.parseFiles([file]);
        partials.push(...result.songs);
        names.push(...result.songs.map(() => file.name));
        errors.push(...result.errors);
        if (holyrics && result.songs.length) setHasHolyrics(true);
        if (partials.length + rows.length > 5000) throw new Error('Máximo 5000 canciones en la cola');
      }
      const n = enqueuePartials(partials, names);
      setParseErrors(errors);
      if (n) toast.success(`${n} canción(es) listas para revisar`);
      if (errors.length) toast.error(`${errors.length} error(es) de lectura`);
    } catch (error) {
      setParseErrors([{ message: error instanceof Error ? error.message : 'Error de lectura' }]);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      toast.error('Pega al menos un canto');
      return;
    }
    setParsing(true);
    try {
      const provider = getSongImportProvider('ai-ingest');
      if (!provider?.parseText) {
        toast.error('Pegado inteligente no disponible');
        return;
      }
      const result = await provider.parseText(pasteText);
      const n = enqueuePartials(result.songs);
      setParseErrors(result.errors);
      if (n) {
        toast.success(`${n} canción(es) desde pegado`);
        setPasteText('');
        setShowPaste(false);
      } else {
        toast.error('No se detectaron cantos en el texto');
      }
      if (result.errors.length && !n) {
        toast.error(result.errors[0]?.message || 'Error al interpretar');
      }
    } finally {
      setParsing(false);
    }
  };

  const patchRow = (localId: string, patch: Partial<ReviewRow> | ((r: ReviewRow) => ReviewRow)) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.localId !== localId) return r;
        return typeof patch === 'function' ? patch(r) : { ...r, ...patch };
      })
    );
  };

  const updateSongField = (localId: string, field: keyof Song, value: string) => {
    patchRow(localId, (r) => ({
      ...r,
      song: { ...r.song, [field]: value },
    }));
  };

  const selectAll = (value: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: value })));
  };

  const applyDefaultGenreToSelected = () => {
    setRows((prev) =>
      prev.map((r) => (r.selected ? { ...r, genre: defaultGenre } : r))
    );
    toast.success('Género aplicado a la selección');
  };

  const clearQueue = () => {
    setRows([]);
    setParseErrors([]);
    setImportErrors([]);
    setHasHolyrics(false);
    setProgress(null);
  };

  const runImport = async (mode: ImportMode) => {
    if (importInFlight.current || parsing || !isAdmin || isGuest) return;
    if (!selected.length) {
      toast.error('Selecciona al menos una canción');
      return;
    }
    if (selected.some(row => !/^[A-G][#b]?(?:m)?$/.test(row.song.originalKey))) {
      toast.error('Confirma una tonalidad válida en todas las canciones seleccionadas (por ejemplo C, F# o Am)');
      return;
    }
    if (mode === 'cadena' && !cadenaName.trim()) {
      toast.error('Pon un nombre para la cadena');
      return;
    }
    importInFlight.current = true;
    setBusy(mode);
    setProgress({ done: 0, total: selected.length });
    setImportErrors([]);
    const succeeded = new Set<string>();
    const publishedSongs: Song[] = [];
    let fail = 0;
    try {
      for (let offset = 0; offset < selected.length; offset += 10) {
        const batch = selected.slice(offset, offset + 10);
        const batchSongs = batch.map(row => ({ ...row.song, genre: row.genre, isNew: true }));
        const results = await saveAdminImportBatch(batchSongs, mode !== 'library', updateExisting);
        const imported: Song[] = [];
        results.forEach((result, index) => {
          const row = batch[index];
          if (result.status === 'imported' || result.status === 'updated') {
            const savedSong = { ...batchSongs[index], id: result.target_id || batchSongs[index].id };
            succeeded.add(row.localId);
            publishedSongs.push(savedSong);
            imported.push(savedSong);
          } else {
            if (result.status === 'skipped') {
              setRows(prev => prev.map(item => item.localId === row.localId ? { ...item, selected: false } : item));
            } else fail += 1;
            setImportErrors(prev => [...prev, `${row.song.title}: ${result.message}`]);
          }
        });
        importLibrary(imported, [], [], updateExisting);
        setRows(prev => prev.filter(row => !succeeded.has(row.localId)));
        setProgress({ done: Math.min(offset + batch.length, selected.length), total: selected.length });
      }

      if (mode === 'cadena' && publishedSongs.length) {
        const listId = await createList(cadenaName.trim());
        if (listId) {
          await setListSongs(
            listId,
            publishedSongs.map((s) => s.id)
          );
          const cadena = await publishListAsCadena({
            name: cadenaName.trim(),
            description: `Importación admin · ${publishedSongs.length} cantos`,
            songs: publishedSongs,
            sourceListId: listId,
          });
          if (cadena.ok === true) {
            toast.success(
              `${publishedSongs.length} publicadas y cadena “${cadenaName.trim()}” creada`
            );
          } else {
            toast.error(cadena.error);
            toast.success(`${publishedSongs.length} publicadas (cadena falló)`);
          }
        } else {
          toast.success(`${publishedSongs.length} publicadas (no se pudo crear lista)`);
        }
      } else if (succeeded.size) {
        toast.success(
          mode === 'publish'
            ? `${succeeded.size} guardada(s) o actualizada(s) en comunidad`
            : `${succeeded.size} guardada(s) o actualizada(s) en tu biblioteca`
        );
      }

      if (succeeded.size) {
        setRows((prev) => prev.filter((r) => !succeeded.has(r.localId)));
        if (mode === 'cadena') setCadenaName('');
      }
      if (fail) toast.error(`${fail} no se pudieron procesar`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la carga';
      setImportErrors(prev => [...prev, message]);
      toast.error(message);
    } finally {
      importInFlight.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
      <Link
        to="/perfil"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-4"
      >
        ← Volver al perfil
      </Link>

      <header className="mb-5 sm:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold mb-1">
          Admin
        </p>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <FileMusic className="w-6 h-6 text-gold" />
          Importar catálogo
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Importa Holyrics (.muf / .mufl), ChordPro o pega varios cantos (sepáralos con ---), revisa y publica. Solo material
          propio o con licencia — sin scrapear la web.
        </p>
        <details className="mt-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer">¿Tienes un ZIP? Cómo cargarlo en Windows</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Haz clic derecho en el ZIP y elige Extraer todo → Extraer.</li>
            <li>Abre la carpeta extraída y entra en un lote. Los casos dudosos están en para-revisar.</li>
            <li>Pulsa Subir canciones, abre ese lote y selecciona sus archivos .chopro con Ctrl+A (máximo 20).</li>
            <li>Revisa título, artista, letra y tonalidad. Confirma la sugerencia o escribe el tono.</li>
            <li>Para actualizar las existentes, activa Actualizar canciones existentes y selecciona las filas.</li>
            <li>Pulsa Publicar en comunidad. Cuando termine, continúa con el siguiente lote.</li>
          </ol>
        </details>
      </header>

      <fieldset disabled={!!busy || parsing} className="min-w-0">
      <div className="rounded-2xl border border-border/80 bg-card/50 p-4 sm:p-5 mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Género por defecto
            </span>
            <select
              value={defaultGenre}
              onChange={(e) => setDefaultGenre(e.target.value as CommunityGenreId)}
              className="mt-1 w-full h-10 rounded-xl bg-secondary border border-border text-foreground text-sm px-3"
            >
              {COMMUNITY_GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".muf,.mufl,.pro,.chopro,.chordpro,.cho,.crd,.txt"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            disabled={parsing}
            onClick={() => fileRef.current?.click()}
            className="h-10 px-4 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir canciones
          </button>
          <button
            type="button"
            disabled={parsing}
            onClick={() => setShowPaste((v) => !v)}
            className="h-10 px-4 rounded-xl border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary disabled:opacity-60"
          >
            <ClipboardPaste className="w-4 h-4" />
            Pegar texto
          </button>
        </div>

        {showPaste ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pega uno o varios cantos. Separa con una línea <code className="text-gold">---</code>.
              También acepta bloques ChordPro con {'{title: …}'}.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              placeholder={`Título: Santo Espíritu\nArtista: Hillsong\n\nG     C\nletra…\n---\nTítulo: Otro canto\n…`}
              className="w-full rounded-xl bg-background/70 border border-border p-3 font-mono text-xs leading-relaxed"
            />
            <button
              type="button"
              disabled={parsing || !pasteText.trim()}
              onClick={() => void handlePasteImport()}
              className="h-10 px-4 rounded-xl border border-gold/40 text-gold font-semibold text-sm hover:bg-gold/10 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
              Detectar y añadir a la cola
            </button>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm my-4">
          <input type="checkbox" checked={updateExisting} disabled={!!busy || parsing}
            onChange={e => setUpdateExisting(e.target.checked)} />
          Actualizar canciones existentes por título y artista (reemplaza letra, acordes y tono).
          Selecciona las canciones que quieras actualizar.
        </label>
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            <span>
              Cola: <strong className="text-foreground">{rows.length}</strong>
            </span>
            <span>·</span>
            <span>
              Seleccionadas: <strong className="text-foreground">{selected.length}</strong>
            </span>
            {dupCount > 0 ? (
              <>
                <span>·</span>
                <span className="text-amber-500">
                  {dupCount} posible(s) duplicado(s) en biblioteca o cola
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasHolyrics && <p className="mb-4 text-sm text-muted-foreground">
        Holyrics: se conserva la letra y sus saltos de línea. Esta versión del archivo no incluye tonalidad;
        se asigna C como valor inicial editable. No se generan acordes ni se importan fondos o formatos de proyección.
        Los posibles duplicados se dejan sin seleccionar.
      </p>}
      {progress && <div role="status" className="mb-4 text-sm">
        Procesadas {progress.done} de {progress.total}
        <progress className="block w-full" value={progress.done} max={progress.total} />
      </div>}
      {importErrors.length > 0 && <div className="mb-4 rounded-xl border border-border p-3 text-sm">
        <p>Resultado de la carga (omitidas o con error):</p>
        <ul>{importErrors.map((message, index) => <li key={index}>{message}</li>)}</ul>
      </div>}
      {parseErrors.length > 0 ? (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-semibold text-destructive mb-1">Errores de lectura</p>
          <ul className="space-y-0.5 text-muted-foreground text-xs">
            {parseErrors.map((err, i) => (
              <li key={`${err.file}-${i}`}>
                {err.file ? `${err.file}: ` : ''}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Aún no hay canciones en la cola. Sube archivos Holyrics o ChordPro.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => selectAll(true)}
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-secondary inline-flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Todas
            </button>
            <button
              type="button"
              onClick={() => selectAll(false)}
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-secondary inline-flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> Ninguna
            </button>
            <button
              type="button"
              onClick={applyDefaultGenreToSelected}
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-secondary"
            >
              Aplicar género a selección
            </button>
            <button
              type="button"
              onClick={clearQueue}
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" /> Vaciar cola
            </button>
          </div>

          <ul className="space-y-2.5 mb-6">
            {rows.map((row) => {
              const dup = duplicateRows.has(row.localId);
              return (
                <li
                  key={row.localId}
                  className={`rounded-2xl border p-3 sm:p-4 transition-colors ${
                    row.selected
                      ? 'border-gold/35 bg-card/60'
                      : 'border-border/60 bg-card/30 opacity-70'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <button
                      type="button"
                      aria-label={row.selected ? 'Quitar de selección' : 'Seleccionar'}
                      className="mt-1 text-gold"
                      onClick={() => patchRow(row.localId, { selected: !row.selected })}
                    >
                      {row.selected ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <label className="text-xs">
                          <span className="text-muted-foreground">Título</span>
                          <input
                            value={row.song.title}
                            onChange={(e) => updateSongField(row.localId, 'title', e.target.value)}
                            className="mt-0.5 w-full h-9 px-2.5 rounded-lg bg-secondary border border-border text-sm font-semibold"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="text-muted-foreground">Artista</span>
                          <input
                            value={row.song.artist}
                            onChange={(e) => updateSongField(row.localId, 'artist', e.target.value)}
                            className="mt-0.5 w-full h-9 px-2.5 rounded-lg bg-secondary border border-border text-sm"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="text-xs flex items-center gap-1.5">
                          <span className="text-muted-foreground">Tono</span>
                          <input
                            aria-label={`Tonalidad de ${row.song.title}`}
                            placeholder="Tono"
                            value={row.song.originalKey}
                            onChange={(e) => {
                              const v = e.target.value;
                              patchRow(row.localId, (r) => ({
                                ...r,
                                song: { ...r.song, originalKey: v, key: v, scaleMode: /m$/.test(v) ? 'minor' : 'major' },
                              }));
                            }}
                            className="w-16 h-8 px-2 rounded-lg bg-secondary border border-border text-sm"
                          />
                        </label>
                        <label className="text-xs flex items-center gap-1.5">
                          <span className="text-muted-foreground">Género</span>
                          <select
                            value={row.genre}
                            onChange={(e) =>
                              patchRow(row.localId, {
                                genre: e.target.value as CommunityGenreId,
                              })
                            }
                            className="h-8 px-2 rounded-lg bg-secondary border border-border text-sm"
                          >
                            {COMMUNITY_GENRES.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {row.keySuggestion ? (
                          <div className="text-xs text-amber-500">
                            Estimación: {row.keySuggestion.key} · confianza {row.keySuggestion.confidence}.
                            Alternativas: {row.keySuggestion.alternatives.join(', ')}.
                            <button type="button" className="ml-2 underline" onClick={() => patchRow(row.localId, r => ({
                              ...r, song: { ...r.song, originalKey: r.keySuggestion!.key, key: r.keySuggestion!.key,
                                scaleMode: /m$/.test(r.keySuggestion!.key) ? 'minor' : 'major' },
                            }))}>Usar sugerencia</button>
                          </div>
                        ) : !row.song.originalKey ? <span className="text-xs text-amber-500">Sin evidencia suficiente: indica el tono manualmente.</span> : null}
                        {row.fileName ? (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[12rem]">
                            {row.fileName}
                          </span>
                        ) : null}
                        {dup ? (
                          <span className="text-[10px] font-semibold text-amber-500">
                            Coincidencia existente
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          onClick={() => patchRow(row.localId, { expanded: !row.expanded })}
                        >
                          {row.expanded ? (
                            <>
                              Ocultar <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Letra / acordes <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() =>
                            setRows((prev) => prev.filter((r) => r.localId !== row.localId))
                          }
                        >
                          Quitar
                        </button>
                      </div>
                      {row.expanded ? (
                        <textarea
                          value={row.song.chords}
                          onChange={(e) => updateSongField(row.localId, 'chords', e.target.value)}
                          rows={8}
                          className="w-full rounded-xl bg-background/70 border border-border p-3 font-mono text-xs leading-relaxed"
                        />
                      ) : (
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {row.song.chords.split('\n').slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-3 z-10 flex flex-col gap-2 p-3 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={!!busy || selected.length === 0}
                onClick={() => void runImport('library')}
                className="flex-1 h-11 rounded-xl border border-border font-semibold text-sm hover:bg-secondary disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy === 'library' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Solo biblioteca ({selected.length})
              </button>
              <button
                type="button"
                disabled={!!busy || selected.length === 0}
                onClick={() => void runImport('publish')}
                className="flex-1 h-11 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Publicar en comunidad ({selected.length})
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                value={cadenaName}
                onChange={(e) => setCadenaName(e.target.value)}
                placeholder="Nombre de cadena (opcional)"
                className="flex-1 h-11 px-3 rounded-xl bg-secondary border border-border text-sm"
              />
              <button
                type="button"
                disabled={!!busy || selected.length === 0 || !cadenaName.trim()}
                onClick={() => void runImport('cadena')}
                className="h-11 px-4 rounded-xl border border-gold/40 text-gold font-semibold text-sm hover:bg-gold/10 disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
              >
                {busy === 'cadena' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ListMusic className="w-4 h-4" />
                )}
                Publicar + cadena
              </button>
            </div>
          </div>
        </>
      )}
      </fieldset>
    </div>
  );
}
