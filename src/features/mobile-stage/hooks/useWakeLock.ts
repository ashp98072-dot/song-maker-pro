import { useEffect, useRef } from 'react';

/** Mantiene la pantalla encendida en escenario (Screen Wake Lock API). */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      return;
    }

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lockRef.current?.release().catch(() => {});
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        /* no-op: permiso denegado o no soportado */
      }
    };

    acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
