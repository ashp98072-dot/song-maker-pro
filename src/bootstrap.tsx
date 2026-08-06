import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerPwaServiceWorker } from '@/pwa/registerPwa';

export function mountApp(rootElement: HTMLElement): void {
  registerPwaServiceWorker();
  createRoot(rootElement).render(<App />);
}
