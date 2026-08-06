import { createRoot } from 'react-dom/client';
import { applyThemeToDocument, readStoredTheme } from '@/lib/theme';
import './index.css';

applyThemeToDocument(readStoredTheme());
import './styles/safe-area.css';
import './styles/mobile-deploy.css';
import './features/mobile-stage/mobile-stage.css';
import { validateClientEnv, logEnvValidationInDev, logEnvValidationAlways } from '@/config/env';
import EnvironmentErrorScreen from '@/components/EnvironmentErrorScreen';

function isChunkStaleMessage(text: string): boolean {
  const msg = text ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

window.addEventListener('error', (event) => {
  const msg = String(event?.message || '');
  const errMsg =
    event.error instanceof Error ? String(event.error.message || '') : '';

  if (isChunkStaleMessage(msg) || isChunkStaleMessage(errMsg)) {
    if (import.meta.env.DEV) {
      console.warn('[Chunk Reload] forcing reload (window.error)');
    }
    window.location.reload();
    return;
  }
  console.error('[GLOBAL ERROR]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg =
    typeof reason === 'string'
      ? reason
      : reason instanceof Error
        ? String(reason.message || '')
        : String(reason ?? '');

  if (isChunkStaleMessage(msg)) {
    if (import.meta.env.DEV) {
      console.warn('[Chunk Reload] forcing reload (unhandledrejection)');
    }
    window.location.reload();
    return;
  }
  console.error('[PROMISE ERROR]', reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    "No se encontró el elemento raíz. Asegúrate de que index.html tenga un <div id='root'></div>"
  );
}

const { ready, blockers } = validateClientEnv();

if (!ready) {
  logEnvValidationInDev();
  createRoot(rootElement).render(<EnvironmentErrorScreen missing={blockers} />);
} else {
  logEnvValidationAlways();
  void import('./bootstrap.tsx').then(({ mountApp }) => mountApp(rootElement));
}
