import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerPwaServiceWorker } from '@/pwa/registerPwa';
import { NativeLifecycle } from '@/platform/NativeLifecycle';

export function mountApp(rootElement: HTMLElement): void {
  registerPwaServiceWorker();
  createRoot(rootElement).render(<><App /><NativeLifecycle /></>);
}
