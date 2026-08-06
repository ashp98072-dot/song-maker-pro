import { useState } from 'react';
import { Radio } from 'lucide-react';
import { useSimpleLiveSyncOptional } from './SimpleLiveSyncContext';

/** Manual rejoin only — never auto-connects. */
export function SimpleLiveResumeBanner() {
  const live = useSimpleLiveSyncOptional();
  const [busy, setBusy] = useState(false);

  if (!live) return null;
  if (live.role !== 'idle') return null;
  if (!live.resumable) return null;

  const { code, role } = live.resumable;
  const label =
    role === 'director'
      ? `Sesión detectada: ${code} (director)`
      : `Sesión detectada: ${code} (espectador)`;

  const onResume = async () => {
    setBusy(true);
    try {
      await live.resumeSession();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 border-b border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-emerald-50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Radio className="h-4 w-4 shrink-0 text-emerald-300" />
          {label}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onResume()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? 'Conectando…' : 'Reingresar'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => live.dismissResumable()}
            className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-900/60 disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
