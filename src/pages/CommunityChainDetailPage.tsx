import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, ListMusic, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import {
  fetchListComments,
  fetchPublicListBySlug,
  postListComment,
  snapshotToSong,
  type PublicListComment,
  type PublicListRow,
} from '@/features/community';
import { bulkSetUserTranspositions } from '@/utils/userTranspositions';
import { normalizeTitle } from '@/utils/textNormalize';

export default function CommunityChainDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { songs, addSong, createList, setListSongs } = useApp();
  const [list, setList] = useState<PublicListRow | null>(null);
  const [comments, setComments] = useState<PublicListComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const row = await fetchPublicListBySlug(slug);
      setList(row);
      if (row) {
        const c = await fetchListComments(row.id);
        setComments(c);
      } else {
        setComments([]);
      }
    } catch {
      toast.error('No se pudo cargar la cadena');
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleImport = async () => {
    if (!list || importing) return;
    setImporting(true);
    try {
      const songIds: string[] = [];
      const transpositions: Record<string, number> = {};

      for (const snap of list.songs) {
        const asSong = snapshotToSong(snap);
        const existing = songs.find(
          (s) =>
            s.id === asSong.id ||
            (normalizeTitle(s.title) === normalizeTitle(asSong.title) &&
              normalizeTitle(s.artist) === normalizeTitle(asSong.artist))
        );
        const id = existing?.id ?? asSong.id;
        if (!existing) {
          await addSong(asSong);
        }
        songIds.push(id);
        if (snap.semitones) transpositions[id] = snap.semitones;
      }

      const newId = await createList(list.name);
      if (!newId) {
        toast.error('No se pudo crear la lista');
        return;
      }
      await setListSongs(newId, songIds);
      if (Object.keys(transpositions).length) {
        await bulkSetUserTranspositions(transpositions);
      }
      toast.success(`Cadena importada · ${songIds.length} canciones`);
      navigate(`/lista/${newId}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al importar la cadena');
    } finally {
      setImporting(false);
    }
  };

  const handleComment = async () => {
    if (!list || posting) return;
    setPosting(true);
    try {
      const result = await postListComment(list.id, commentBody);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setComments((prev) => [...prev, result.comment]);
      setCommentBody('');
      toast.success('Comentario publicado');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-20 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando cadena…
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Esta cadena no existe o ya no está pública.</p>
        <Link to="/comunidad" className="text-gold hover:underline font-medium inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Comunidad
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-3xl animate-in fade-in">
      <Link
        to="/comunidad"
        className="flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Comunidad
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-gold mb-2">
          <ListMusic className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wide">Cadena pública</span>
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground mb-1">{list.name}</h1>
        <p className="text-sm text-muted-foreground">
          Por {list.owner_name || 'Músico'} · {list.song_count} canciones
        </p>
        {list.description && (
          <p className="text-sm text-foreground/80 mt-3">{list.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={importing}
        className="w-full mb-8 py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {importing ? 'Importando…' : 'Importar a Mis Listas'}
      </button>

      <div className="space-y-2 mb-10">
        {list.songs.map((snap, idx) => (
          <div
            key={`${snap.song_id}-${idx}`}
            className="glass-card px-4 py-3 flex items-center gap-3"
          >
            <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{snap.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {snap.artist} · {snap.original_key}
                {snap.semitones ? ` · ${snap.semitones > 0 ? '+' : ''}${snap.semitones}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-gold" />
          <h2 className="font-display font-bold text-foreground">
            Comentarios ({comments.length})
          </h2>
        </div>

        <div className="space-y-3 mb-4">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Sé el primero en comentar esta cadena.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{c.author_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {c.created_at
                    ? new Date(c.created_at).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ''}
                </span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Escribe un comentario…"
            maxLength={1000}
            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleComment();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleComment()}
            disabled={posting || !commentBody.trim()}
            className="px-4 rounded-xl gold-gradient text-primary-foreground disabled:opacity-50"
            aria-label="Enviar comentario"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Requiere sesión iniciada.</p>
      </section>
    </div>
  );
}
