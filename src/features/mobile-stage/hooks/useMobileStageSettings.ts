import { useState, useCallback } from 'react';
import type { MobileStageSettings } from '@/features/mobile-stage/types';

const STORAGE_KEY = 'worship-mobile-stage-settings';

const DEFAULTS: MobileStageSettings = {
  mobileStageMode: false,
  autoHideControls: true,
};

function load(): MobileStageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<MobileStageSettings>;
    return {
      mobileStageMode: Boolean(parsed.mobileStageMode),
      autoHideControls: parsed.autoHideControls !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useMobileStageSettings() {
  const [settings, setSettings] = useState<MobileStageSettings>(load);

  const patch = useCallback((partial: Partial<MobileStageSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  return {
    mobileStageMode: settings.mobileStageMode,
    autoHideControls: settings.autoHideControls,
    setMobileStageMode: (mobileStageMode: boolean) => patch({ mobileStageMode }),
    setAutoHideControls: (autoHideControls: boolean) => patch({ autoHideControls }),
  };
}
