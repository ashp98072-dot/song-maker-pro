import { useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileMusic,
  Loader2,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import {
  findLibraryDuplicate,
  getSongImportProvider,
  normalizeImportedSong,
} from '@/features/song-import';
import {
  COMMUNITY_GENRES,
  publishSongToPublicLibrary,
  type CommunityGenreId,
} from '@/features/community';
import type { Song } from '@/types/music';

type ReviewRow = {
  localId: string;
  song: Song;
  selected: boolean;
  genre: CommunityGenreId;
  fileName?: string;
  expanded: boolean;
};

/**
 * Admin: ChordPro batch → review → library and/or public_songs.
 * Rights: files must be yours or licensed; no scraping.
 */
export default function AdminCatalogImportPage() {
  const { isAdmin, isGuest, songs, addSong } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ file?: string; message: string }[]>([]);
  const [defaultGenre, setDefaultGenre] = useState<CommunityGenreId>('adoracion');
  const [busy, setBusy] = useState<'library' | 'publish' | null>(null);
  const [parsing, setParsing] = useState(false);

  const selected = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const dupCount = useMemo(
    () =>
      rows.filter((r) => findLibraryDuplicate(songs, r.song.title, r.song.artist)).length,
    [rows, songs]
  );

  if (isGuest || !isAdmin) {
    return <Navigate to="/perfil" replace />;
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setParsing(true);
    try {
      const provider = getSongImportProvider('chordpro');
      if (!provider?.parseFiles) {
        toast.error('Proveedor ChordPro no disponible');
        return;
      }
      const result = await provider.parseFiles(Array.from(files));
      const next: ReviewRow[] = [];
      result.songs.forEach((partial, i) => {
        const song = normalizeImportedSong(partial, i);
        if (!song) return;
        next.push({
          localId: `${song.id}-${i}-${Date.now()}`,
          song,
          selected: true,
          genre: defaultGenre,
          fileName: undefined,
          expanded: false,
        });
      });
      if (next.length && next.length <= files.length) {
        Array.from(files).forEach((f, i) => {
          if (next[i]) next[i].fileName = f.name;
        });
      }
      setRows((prev) => [...next, ...prev]);
      setParseErrors(result.errors);
      if (next.length) toast.success(`${next.length} canción(es) listas para revisar`);
      if (result.errors.length) toast.error(`${result.errors.length} archivo(s) con error`);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
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
  };

  const runImport = async (mode: 'library' | 'publish') => {
    if (!selected.length) {
      toast.error('Selecciona al menos una canción');
      return;
    }
    setBusy(mode);
    const succeeded = new Set<string>();
    let fail = 0;
    try {
      for (const row of selected) {
        const song: Song = { ...row.song, genre: row.genre, isNew: true };
        try {
          await addSong(song);
          if (mode === 'publish') {
            const published = await publishSongToPublicLibrary({
              song,
              genre: row.genre,
              isCover: false,
            });
            if (!published.ok) {
              fail += 1;
              console.error(published.error);
              continue;
            }
          }
          succeeded.add(row.localId);
        } catch (err) {
          fail += 1;
          console.error(err);
        }
      }
      if (succeeded.size) {
        toast.success(
          mode === 'publish'
            ? `${succeeded.size} publicada(s) en comunidad`
            : `${succeeded.size} guardada(s) en tu biblioteca`
        );
        setRows((prev) => prev.filter((r) => !succeeded.has(r.localId)));
      }
      if (fail) toast.error(`${fail} no se pudieron procesar`);
    } finally {
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
          Sube un lote ChordPro (.pro / .chopro / .txt), revisa título y acordes, y publica en la
          biblioteca comunitaria. Solo material propio o con licencia — sin scrapear la web.
        </p>
      </header>

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
            accept=".pro,.chopro,.txt,text/plain"
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
            Subir ChordPro
          </button>
        </div>

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
                  {dupCount} posible(s) duplicado(s) en biblioteca
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

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
          Aún no hay canciones en la cola. Sube uno o varios archivos ChordPro.
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
              const dup = findLibraryDuplicate(songs, row.song.title, row.song.artist);
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
                            value={row.song.originalKey}
                            onChange={(e) => {
                              const v = e.target.value;
                              patchRow(row.localId, (r) => ({
                                ...r,
                                song: { ...r.song, originalKey: v, key: v },
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
                        {row.fileName ? (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[12rem]">
                            {row.fileName}
                          </span>
                        ) : null}
                        {dup ? (
                          <span className="text-[10px] font-semibold text-amber-500">
                            Ya en biblioteca
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
                              Acordes <ChevronDown className="w-3.5 h-3.5" />
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

          <div className="sticky bottom-3 z-10 flex flex-col sm:flex-row gap-2 p-3 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg">
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
        </>
      )}
    </div>
  );
}
