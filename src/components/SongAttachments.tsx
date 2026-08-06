// Adjunta y muestra partituras PDF asociadas a una canción.
// - Usa Lovable Cloud Storage (bucket `song-pdfs`).
// - Cada usuario sube en su carpeta `userId/songId/filename.pdf`.
// - Para visualizarlos generamos una URL firmada (1 hora) y la mostramos en un <iframe>.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, Eye, Loader2, X } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  user_id: string;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  songId: string;
}

export default function SongAttachments({ songId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);

    const { data, error } = await supabase
      .from('song_attachments')
      .select('id, file_name, file_path, user_id, size_bytes, created_at')
      .eq('song_id', songId)
      .order('created_at', { ascending: false });

    if (!error && data) setAttachments(data);
    setLoading(false);
  }, [songId]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo supera 10MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Debes iniciar sesión para subir partituras');
        return;
      }
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${session.user.id}/${songId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('song-pdfs')
        .upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('song_attachments').insert({
        user_id: session.user.id,
        song_id: songId,
        file_path: path,
        file_name: file.name,
        mime_type: 'application/pdf',
        size_bytes: file.size,
        is_public: true,
      });
      if (dbErr) throw dbErr;

      toast.success('Partitura subida');
      loadAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al subir: ' + (err?.message || 'desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (att: Attachment) => {
    const { data, error } = await supabase.storage
      .from('song-pdfs')
      .createSignedUrl(att.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error('No se pudo abrir el archivo');
      return;
    }
    setPreviewUrl(data.signedUrl);
    setPreviewName(att.file_name);
  };

  const handleDelete = async (att: Attachment) => {
    if (!confirm(`¿Eliminar "${att.file_name}"?`)) return;
    await supabase.storage.from('song-pdfs').remove([att.file_path]);
    await supabase.from('song_attachments').delete().eq('id', att.id);
    toast.success('Partitura eliminada');
    loadAttachments();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gold" />
          <h3 className="font-display font-bold text-foreground text-sm">Partituras (PDF)</h3>
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" disabled={uploading} />
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15 transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? 'Subiendo…' : 'Adjuntar PDF'}
          </span>
        </label>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aún no hay partituras. Sube un PDF para verlo aquí mismo.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{att.file_name}</span>
              <button onClick={() => handleView(att)} className="p-1 text-muted-foreground hover:text-gold" title="Ver">
                <Eye className="w-3.5 h-3.5" />
              </button>
              {currentUserId === att.user_id && (
                <button onClick={() => handleDelete(att)} className="p-1 text-muted-foreground hover:text-destructive" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Visor PDF en modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
            <p className="text-sm text-foreground truncate">{previewName}</p>
            <button onClick={() => setPreviewUrl(null)} className="p-2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full bg-white" title="PDF preview" />
        </div>
      )}
    </div>
  );
}
