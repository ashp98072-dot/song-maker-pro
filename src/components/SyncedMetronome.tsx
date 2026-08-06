// Metrónomo sincronizado: emite y escucha el "tick" del director vía un canal
// de Supabase Realtime independiente del de la sesión, para que cualquier
// dispositivo en la misma sesión sienta el mismo pulso.

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playClick } from '@/utils/metronomeAudio';

interface Props {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  // Si se provee, se sincroniza por este código (igual al de la sesión)
  syncCode?: string;
  // true = es director (emite); false = es seguidor (recibe)
  isDirector: boolean;
}

export default function SyncedMetronome({ bpm, onBpmChange, syncCode, isDirector }: Props) {
  const [active, setActive] = useState(false);
  const [beat, setBeat] = useState(0);
  const [synced, setSynced] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const channelRef = useRef<any>(null);

  // Director: maneja el intervalo y emite cada tick
  useEffect(() => {
    if (!active || !isDirector) return;
    const period = 60000 / bpm;
    let count = 0;
    playClick(true);
    setBeat(1);
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast', event: 'tick',
        payload: { count: 1, bpm, ts: Date.now() },
      });
    }
    intervalRef.current = setInterval(() => {
      count = (count + 1) % 4;
      const accent = count === 0;
      playClick(accent);
      setBeat(count + 1);
      if (channelRef.current?.state === 'joined') {
        channelRef.current.send({
          type: 'broadcast', event: 'tick',
          payload: { count: count + 1, bpm, ts: Date.now() },
        });
      }
    }, period);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, bpm, isDirector]);

  // Canal Realtime (compartido entre director y seguidor)
  useEffect(() => {
    if (!syncCode) { setSynced(false); return; }
    const ch = supabase.channel(`metronome-${syncCode}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'tick' }, ({ payload }) => {
      if (isDirector) return;
      // Seguidor: reproduce el click recibido
      const accent = payload?.count === 1;
      playClick(accent);
      setBeat(payload?.count || 0);
      if (typeof payload?.bpm === 'number' && payload.bpm !== bpm) {
        onBpmChange(payload.bpm);
      }
    }).on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isDirector) return;
      setActive(!!payload?.active);
      if (!payload?.active) setBeat(0);
    }).subscribe(status => {
      if (status === 'SUBSCRIBED') setSynced(true);
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setSynced(false);
    });

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      setSynced(false);
    };
  }, [syncCode, isDirector, bpm, onBpmChange]);

  // Director emite cambios de estado on/off
  useEffect(() => {
    if (!isDirector || !channelRef.current || channelRef.current.state !== 'joined') return;
    channelRef.current.send({ type: 'broadcast', event: 'state', payload: { active, bpm } });
  }, [active, bpm, isDirector]);

  const toggle = () => {
    if (!isDirector && syncCode) return; // los seguidores no controlan
    if (active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setActive(false);
      setBeat(0);
    } else {
      setActive(true);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={toggle}
        disabled={!isDirector && !!syncCode}
        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          active ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted-foreground'
        } ${!isDirector && syncCode ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {active ? <Pause className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
        {active ? 'Detener' : 'Iniciar'}
      </button>

      <input type="range" min={40} max={220} value={bpm}
        disabled={!isDirector && !!syncCode}
        onChange={e => onBpmChange(Number(e.target.value))}
        className="flex-1 min-w-[120px] accent-gold disabled:opacity-50" />
      <span className="text-sm font-mono w-16 text-right text-foreground">{bpm} BPM</span>

      {active && (
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(b => (
            <div key={b} className={`w-3 h-3 rounded-full transition-colors ${
              beat === b ? (b === 1 ? 'bg-gold' : 'bg-foreground') : 'bg-muted'
            }`} />
          ))}
        </div>
      )}

      {syncCode && (
        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${synced ? 'text-green-500' : 'text-muted-foreground'}`}>
          {synced ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isDirector ? 'Emitiendo' : synced ? 'Sincronizado' : 'Buscando…'}
        </span>
      )}
    </div>
  );
}
