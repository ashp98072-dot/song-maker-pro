import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';

export function AndroidBackNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    void App.addListener('backButton', () => {
      if (disposed) return;
      const overlay = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [data-native-fullscreen="true"]',
      );
      if (overlay) {
        // Radix dialogs and song fullscreen already expose Escape dismissal.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        return;
      }
      // BrowserRouter keeps an index for app-owned history entries.
      if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
      else void App.minimizeApp().catch(error => console.warn('[Android back]', error));
    }).then(handle => {
      if (disposed) void handle.remove();
      else listener = handle;
    }).catch(error => console.warn('[Android back]', error));
    return () => { disposed = true; void listener?.remove(); };
  }, [navigate]);
  return null;
}
