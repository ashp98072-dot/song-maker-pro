import { useCallback, useState } from 'react';
import { mobileUiLog } from '@/features/mobile-worship/utils/mobileUiLog';

const STORAGE_KEY = 'worship-mobile-controls-hidden';

function readHidden(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Preferencia por sesión: ocultar paneles de transposición en móvil. */
export function useMobileControlsChrome() {
  const [controlsHidden, setControlsHidden] = useState(readHidden);

  const hideControls = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setControlsHidden(true);
    mobileUiLog('controls hidden');
  }, []);

  const showControls = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setControlsHidden(false);
  }, []);

  return { controlsHidden, hideControls, showControls };
}
