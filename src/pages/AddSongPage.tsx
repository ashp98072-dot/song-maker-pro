import { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Gender, ScaleMode } from '@/types/music';
import { processSmartPaste, processInlineChords } from '@/utils/smartPaste';
import { publishSongToPublicLibrary, COMMUNITY_GENRES, type CommunityGenreId } from '@/features/community';
import { findInvalidBrackets } from '@/utils/chordValidator';
import { normalizeTitle } from '@/utils/textNormalize';
import { Wand2, Camera, Loader2, Globe, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUICK_CHORDS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'B7'];

export default function AddSongPage() {
  const { addSong, songs } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('C');
  const [originalGender, setOriginalGender] = useState<Gender>('male');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('major');
  const [lyrics, setLyrics] = useState('');
  const [chords, setChords] = useState('');
  const [smartPasteText, setSmartPasteText] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [genre, setGenre] = useState<CommunityGenreId>('adoracion');
  const [isCover, setIsCover] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState<{ title: string; artist: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chordsTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Invalid chords detection
  const invalidBrackets = useMemo(() => findInvalidBrackets(chords), [chords]);

  const insertChordAtCursor = (chord: string) => {
    const textarea = chordsTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newChords = chords.substring(0, start) + chord + chords.substring(end);
    setChords(newChords);
    // Restore cursor position after chord
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + chord.length;
    }, 0);
  };

  const handleClearAll = () => {
    setTitle('');
    setArtist('');
    setOriginalKey('C');
    setOriginalGender('male');
    setScaleMode('major');
    setLyrics('');
    setChords('');
    setSmartPasteText('');
    setIsPublic(false);
    setGenre('adoracion');
    toast.success('🧹 Lienzo limpio');
  };

  const handleSmartPaste = () => {
    if (!smartPasteText.trim()) return;
    let processed = processInlineChords(smartPasteText);
    const result = processSmartPaste(processed);
    setChords(result.chords);
    if (result.detectedKey) {
      const keyRoot = result.detectedKey.replace('m', '');
      if (KEYS.includes(keyRoot)) {
        setOriginalKey(keyRoot);
        if (result.detectedKey.endsWith('m')) setScaleMode('minor');
      }
    }
    setSmartPasteText('');
    toast.success('✨ Acordes detectados e importados automáticamente');
  };

  const handleOCRScan = async (file: File) => {
    setIsScanning(true);
    toast.info('📷 Escaneando imagen... esto puede tomar unos segundos');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('spa+eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      if (text.trim()) {
        setSmartPasteText(text);
        toast.success('✅ Texto extraído correctamente. Presiona "Detectar Acordes" para procesarlo.');
      } else {
        toast.error('No se pudo extraer texto de la imagen');
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('Error al escanear. Intenta con una imagen más clara.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleOCRScan(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !chords.trim() || saving) return;

    // Detección de duplicados (mismo título + artista normalizados)
    const normTitle = normalizeTitle(title);
    const normArtist = normalizeTitle(artist);
    const duplicate = songs.find(
      s => normalizeTitle(s.title) === normTitle && normalizeTitle(s.artist) === normArtist
    );

    if (duplicate && !isCover) {
      setDuplicateFound({ title: duplicate.title, artist: duplicate.artist });
      toast.error('Esta canción ya existe en la biblioteca');
      return;
    }

    const finalTitle = isCover && duplicate ? `${title.trim()} (Cover)` : title.trim();

    const newSong = {
      id: Date.now().toString(),
      title: finalTitle,
      artist: artist.trim(),
      originalKey: scaleMode === 'minor' ? originalKey + 'm' : originalKey,
      originalGender,
      scaleMode,
      lyrics: lyrics.trim(),
      chords: chords.trim(),
      genre: isPublic ? genre : undefined,
      createdAt: new Date().toLocaleDateString(),
      isNew: true,
    };

    setSaving(true);
    try {
      await addSong(newSong);

      if (isPublic) {
        const published = await publishSongToPublicLibrary({
          song: newSong,
          genre,
          isCover,
        });
        if (!published.ok) {
          toast.error(published.error);
        } else {
          toast.success('Publicada en la biblioteca comunitaria');
        }
      }
      toast.success('Canción agregada');
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Agregar Canción</h1>
          <p className="text-muted-foreground text-sm">Agrega una nueva canción a tu biblioteca</p>
        </div>
        <button type="button" onClick={handleClearAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors">
          <Trash2 className="w-4 h-4" /> Lienzo Limpio
        </button>
      </div>

      {/* Smart Paste Area */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-gold" />
          <h2 className="font-display font-bold text-foreground text-sm">Pegado Rápido Inteligente</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Pega texto con letras y acordes (de LaCuerda, Ultimate Guitar, etc.) y la IA detectará los acordes automáticamente.
        </p>
        <textarea 
          value={smartPasteText}
          onChange={e => setSmartPasteText(e.target.value)}
          placeholder={`Pega aquí el texto con acordes, por ejemplo:\n\nVerso 1:\n   G            D\nPreciosa sangre de Jesús\n   Em           C\nQue nunca perderá su poder\n\nO formato inline:\nPreciosa [G]sangre de [D]Jesús`}
          rows={6}
          className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
        />
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={handleSmartPaste} disabled={!smartPasteText.trim()}
            className="flex-1 py-2.5 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            <Wand2 className="w-4 h-4" /> Detectar Acordes Automáticamente
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning}
            className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-gold text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {isScanning ? 'Escaneando...' : 'Escanear Foto/PDF'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre de la canción" required
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Artista *</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Nombre del artista" required
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tono Original *</label>
            <select value={originalKey} onChange={e => setOriginalKey(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Género voz original *</label>
            <select value={originalGender} onChange={e => setOriginalGender(e.target.value as Gender)} required
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Escala *</label>
            <div className="flex items-center gap-3 h-[42px]">
              <button type="button" onClick={() => setScaleMode('major')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${scaleMode === 'major' ? 'gold-gradient text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                Mayor
              </button>
              <button type="button" onClick={() => setScaleMode('minor')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${scaleMode === 'minor' ? 'magic-gradient text-foreground' : 'bg-secondary text-muted-foreground'}`}>
                Menor
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Acordes *</label>
          <p className="text-xs text-muted-foreground mb-2">Escribe los acordes encima de las líneas de la letra. Usa la barra rápida para insertar acordes.</p>
          
          {/* Floating chord bar */}
          <div className="flex flex-wrap gap-1.5 mb-2 p-2 rounded-lg bg-secondary/60 border border-border">
            {QUICK_CHORDS.map(chord => (
              <button key={chord} type="button" onClick={() => insertChordAtCursor(chord)}
                className="px-3 py-1.5 rounded-md bg-card border border-border text-gold font-mono text-sm font-bold hover:bg-gold/10 hover:border-gold transition-colors">
                {chord}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea ref={chordsTextareaRef} value={chords} onChange={e => setChords(e.target.value)}
              placeholder={"[Verso 1]\nG            D\nPrimera línea de la canción\nEm           C\nSegunda línea...\n\n[Coro]\nG    D\nEstribillo..."} required rows={10}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono" />
          </div>
          
          {/* Invalid chord warnings */}
          {invalidBrackets.length > 0 && (
            <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs font-medium text-destructive mb-1">⚠️ Acordes inválidos detectados:</p>
              <div className="flex flex-wrap gap-1">
                {invalidBrackets.map((inv, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-mono font-bold">
                    {inv.text}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estos no serán reconocidos por el transponedor.</p>
            </div>
          )}
        </div>

        {/* Public toggle */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
            <Globe className="w-4 h-4 text-gold" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Publicar en Biblioteca Comunitaria</p>
              <p className="text-xs text-muted-foreground">Otros músicos podrán encontrar y usar esta canción</p>
            </div>
            <button type="button" onClick={() => setIsPublic(!isPublic)}
              className={`w-10 h-5 rounded-full transition-colors ${isPublic ? 'bg-gold' : 'bg-muted'}`}>
              <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {isPublic && (
            <div className="p-3 rounded-lg border border-border bg-card">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Género
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as CommunityGenreId)}
                className="mt-2 w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {COMMUNITY_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-2">
                Requiere sesión iniciada. Sin cuenta solo se guarda en tu repertorio.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')} className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Guardando…' : 'Guardar Canción'}
          </button>
        </div>

        {duplicateFound && (
          <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-400">Esta canción ya existe en la biblioteca</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Encontramos: <span className="font-medium text-foreground">{duplicateFound.title}</span> — {duplicateFound.artist}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isCover} onChange={e => setIsCover(e.target.checked)}
                className="w-4 h-4 accent-gold" />
              <span className="text-foreground">¿Es un cover o versión diferente?</span>
            </label>
            {isCover && (
              <p className="text-xs text-muted-foreground pl-6">
                Se agregará "(Cover)" automáticamente al título. Vuelve a presionar "Guardar Canción".
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
