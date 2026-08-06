import { useState, useCallback } from 'react';
import {
  DEFAULT_CONTINUOUS_SETTINGS,
  type ContinuousSetlistSettings,
} from '@/features/continuous-setlist/types';
import { mergeContinuousSettings } from '@/features/continuous-setlist/utils/persistence';

export function useContinuousSetlistSettings(initial?: Partial<ContinuousSetlistSettings>) {
  const [settings, setSettings] = useState<ContinuousSetlistSettings>(() =>
    mergeContinuousSettings(initial)
  );

  const patch = useCallback((partial: Partial<ContinuousSetlistSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggle = useCallback((key: keyof ContinuousSetlistSettings) => {
    setSettings((prev) => {
      if (key === 'fontSize') return prev;
      return { ...prev, [key]: !prev[key] };
    });
  }, []);

  return { settings, setSettings, patch, toggle, defaults: DEFAULT_CONTINUOUS_SETTINGS };
}
