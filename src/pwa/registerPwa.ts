import { registerSW } from 'virtual:pwa-register';

/**
 * registerType `autoUpdate`: Workbox-window llama **onNeedReload** cuando el nuevo SW toma control.
 * (`onNeedRefresh` solo aplica en modo `prompt`.)
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined') return;

  registerSW({
    immediate: true,
    onNeedReload() {
      if (import.meta.env.DEV) {
        console.info('[PWA] nueva versión activa — recargando');
      }
      window.location.reload();
    },
    onOfflineReady() {
      if (import.meta.env.DEV) {
        console.log('[PWA] offline ready');
      }
    },
    onRegisteredSW(_swUrl, registration) {
      if (import.meta.env.DEV && registration) {
        console.info('[PWA] Service worker registrado');
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar service worker:', error);
    },
  });
}
