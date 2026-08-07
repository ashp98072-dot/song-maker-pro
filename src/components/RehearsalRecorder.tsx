import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  blob: Blob;
  url: string;
  date: string;
  duration: number;
}

interface RehearsalRecorderProps {
  songId: string;
  /** Inside a parent card/tab — skip outer chrome */
  embedded?: boolean;
}

export default function RehearsalRecorder({ songId, embedded = false }: RehearsalRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load recordings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`recordings-${songId}`);
    if (saved) {
      try {
        const parsed: { id: string; date: string; duration: number; data: string }[] = JSON.parse(saved);
        const loaded = parsed.map(r => {
          const byteString = atob(r.data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: 'audio/webm' });
          return { ...r, blob, url: URL.createObjectURL(blob) };
        });
        setRecordings(loaded);
      } catch { /* ignore */ }
    }
  }, [songId]);

  const saveRecordings = (recs: Recording[]) => {
    const toSave = recs.map(r => {
      return new Promise<{ id: string; date: string; duration: number; data: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ id: r.id, date: r.date, duration: r.duration, data: base64 });
        };
        reader.readAsDataURL(r.blob);
      });
    });
    Promise.all(toSave).then(data => {
      try {
        localStorage.setItem(`recordings-${songId}`, JSON.stringify(data));
      } catch {
        toast.error('No hay espacio para guardar más grabaciones');
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newRec: Recording = {
          id: Date.now().toString(),
          blob, url,
          date: new Date().toLocaleString(),
          duration: recordingTime,
        };
        const updated = [...recordings, newRec];
        setRecordings(updated);
        saveRecordings(updated);
        stream.getTracks().forEach(t => t.stop());
        setRecordingTime(0);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      toast.success('🎙️ Grabando...');
    } catch {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success('✅ Grabación guardada');
    }
  };

  const playRecording = (rec: Recording) => {
    if (audioRef.current) { audioRef.current.pause(); }
    if (playingId === rec.id) { setPlayingId(null); return; }
    const audio = new Audio(rec.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(rec.id);
  };

  const deleteRecording = (id: string) => {
    const updated = recordings.filter(r => r.id !== id);
    setRecordings(updated);
    saveRecordings(updated);
    if (playingId === id && audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
  };

  const downloadRecording = (rec: Recording) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `ensayo-${rec.date.replace(/[/:]/g, '-')}.webm`;
    a.click();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={embedded ? '' : 'glass-card p-4 mt-4'}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-gold flex items-center gap-1">
          <Mic className="w-3 h-3" /> Grabadora de Ensayos
        </label>
        {isRecording && (
          <span className="text-xs text-destructive animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          isRecording
            ? 'bg-destructive text-destructive-foreground'
            : 'border border-border text-muted-foreground hover:text-foreground hover:border-gold'
        }`}
      >
        {isRecording ? <><Square className="w-4 h-4" /> Detener Grabación</> : <><Mic className="w-4 h-4" /> Grabar Ensayo</>}
      </button>

      {recordings.length > 0 && (
        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
          {recordings.map(rec => (
            <div key={rec.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs">
              <button onClick={() => playRecording(rec)}
                className={`p-1.5 rounded-lg transition-colors ${playingId === rec.id ? 'text-gold' : 'text-muted-foreground hover:text-foreground'}`}>
                {playingId === rec.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{rec.date}</p>
                <p className="text-muted-foreground">{formatTime(rec.duration)}</p>
              </div>
              <button onClick={() => downloadRecording(rec)} className="text-muted-foreground hover:text-foreground p-1">
                <Download className="w-3 h-3" />
              </button>
              <button onClick={() => deleteRecording(rec.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
