import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useIsMobileViewport } from '@/features/mobile-stage/hooks/useIsMobileViewport';

const DISMISS_KEY = 'wt_pwa_install_dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Soft “Install app” banner for mobile Chrome/Edge (beforeinstallprompt).
 */
export function PwaInstallBanner() {
  const isMobile = useIsMobileViewport();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!isMobile || !visible || !deferred) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    dismiss();
  };

  return (
    <div
      data-pwa-install-banner
      className="sticky top-0 z-40 border-b border-gold/30 bg-background/95 px-3 py-2 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Instala Worship Transpose en tu teléfono para culto con WiFi flojo.
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex items-center gap-1 rounded-lg gold-gradient px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
