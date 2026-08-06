import { useEffect, useRef, useState } from 'react';
import { Copy, Radio, Users, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeSessionCode } from '@/features/director-session/types';
import type { ViewMode } from '@/types/music';
import { useSimpleLiveSync } from './SimpleLiveSyncContext';
import type { SimpleLiveState } from './types';

type Props = {
  songId: string;
  semitones?: number;
  viewMode?: ViewMode;
  genderShift?: 'original' | 'male' | 'female' | '';
  currentIndex?: number;
  listId?: string | null;
  listSongIds?: string[];
  sharedSectionAnchor?: string | null;
  onRemoteState?: (state: SimpleLiveState) => void;
};

function mapGender(
  g: 'original' | 'male' | 'female' | '' | undefined
): 'original' | 'male' | 'female' {
  if (g === 'male' || g === 'female') return g;
  return 'original';
}

export function SimpleLiveSyncPanel({
  songId,
  semitones = 0,
  viewMode = 'musician',
  genderShift = 'original',
  currentIndex = 0,
  listId = null,
  listSongIds = [],
  sharedSectionAnchor = null,
  onRemoteState,
}: Props) {
  const {
    role,
    status,
    code,
    connectedCount,
    followDirector,
    lastState,
    createAsDirector,
    joinAsFollower,
    leave,
    publish,
    setFollowDirector,
  } = useSimpleLiveSync();

  const [joinInput, setJoinInput] = useState('');
  const [busy, setBusy] = useState(false);
  const lastAppliedRef = useRef('');

  // Director: publish local song/view changes
  useEffect(() => {
    if (role !== 'director' || status !== 'connected') return;
    publish({
      songId,
      listId: listId ?? null,
      listSongIds: listSongIds ?? [],
      currentIndex: currentIndex ?? 0,
      viewMode,
      semitones,
      genderShift: mapGender(genderShift),
      sectionAnchor: sharedSectionAnchor ?? null,
    });
  }, [
    role,
    status,
    songId,
    listId,
    listSongIds,
    currentIndex,
    viewMode,
    semitones,
    genderShift,
    sharedSectionAnchor,
    publish,
  ]);

  // Follower: apply remote state when following
  useEffect(() => {
    if (role !== 'follower' || !followDirector || !lastState) return;
    const key = [
      lastState.songId,
      lastState.viewMode,
      lastState.currentIndex,
      lastState.semitones,
      lastState.genderShift,
      lastState.sectionAnchor,
      lastState.listId,
      lastState.listSongIds?.join(',') ?? '',
    ].join('|');
    if (key === lastAppliedRef.current) return;
    lastAppliedRef.current = key;
    onRemoteState?.(lastState);
  }, [role, followDirector, lastState, onRemoteState]);

  const onCreate = async () => {
    setBusy(true);
    try {
      await createAsDirector({
        songId,
        listId,
        listSongIds,
        currentIndex,
        viewMode,
        semitones,
        genderShift: mapGender(genderShift),
        sectionAnchor: sharedSectionAnchor,
      });
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    const normalized = normalizeSessionCode(joinInput);
    if (normalized.length < 4) {
      toast.error('Código inválido');
      return;
    }
    setBusy(true);
    try {
      await joinAsFollower(normalized);
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async () => {
    setBusy(true);
    try {
      await leave();
      setJoinInput('');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast.success('Código copiado');
  };

  const isDirector = role === 'director';
  const isFollower = role === 'follower';
  const connecting = status === 'connecting' || busy;

  return (
    <div className="glass-card p-4 mt-4 border-t border-white/10 bg-black/10">
      <label className="text-[10px] font-black text-gold flex items-center gap-1.5 mb-3 uppercase tracking-[0.2em]">
        <Radio className={`w-3.5 h-3.5 ${isDirector ? 'animate-pulse text-red-500' : 'text-gold'}`} />
        {isDirector ? 'Transmitiendo en Vivo' : isFollower ? 'Modo Escucha Activo' : 'Sincronización'}
      </label>

      {!isDirector && !isFollower && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={connecting}
            className="w-full py-3 rounded-xl gold-gradient text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Wifi className="w-4 h-4" />
            {connecting ? 'Conectando…' : 'Ser el Director'}
          </button>
          <div className="relative flex items-center">
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              placeholder="CÓDIGO..."
              maxLength={6}
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-secondary/40 border border-white/10 text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none uppercase font-mono tracking-[0.2em]"
            />
            <button
              type="button"
              onClick={() => void onJoin()}
              disabled={joinInput.length < 4 || connecting}
              className="absolute right-1.5 p-2 rounded-lg bg-gold text-primary-foreground disabled:opacity-30 transition-all"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isDirector && (
        <div className="space-y-3">
          {status === 'connecting' && (
            <p className="text-xs text-amber-300/90 text-center py-1">Conectando sesión…</p>
          )}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gold/5 border border-gold/20">
            <div>
              <p className="text-[9px] text-gold/60 uppercase font-black">Tu código:</p>
              <p className="text-3xl font-mono font-black text-gold tracking-widest">{code}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="p-3 bg-gold/10 rounded-full text-gold hover:bg-gold/20 transition-all"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold px-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4 text-gold" />
              {connectedCount} conectado{connectedCount === 1 ? '' : 's'}
            </span>
            <span className={status === 'connected' ? 'text-emerald-400' : 'text-amber-300'}>
              {status === 'connected' ? 'Conectado' : 'Conectando…'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onLeave()}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold hover:bg-red-500/25 transition-all"
          >
            Detener sesión
          </button>
        </div>
      )}

      {isFollower && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-muted-foreground font-mono tracking-widest">{code}</span>
            </span>
            <span className={status === 'connected' ? 'text-emerald-400' : 'text-amber-300'}>
              {status === 'connected' ? 'Siguiendo' : 'Conectando…'}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={followDirector}
              onChange={(e) => setFollowDirector(e.target.checked)}
              className="rounded border-white/20"
            />
            Seguir al director
          </label>
          <button
            type="button"
            onClick={() => void onLeave()}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-secondary/50 border border-white/10 text-sm font-bold hover:bg-secondary transition-all"
          >
            Salir sesión
          </button>
        </div>
      )}
    </div>
  );
}
