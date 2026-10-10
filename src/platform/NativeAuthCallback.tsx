import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseNativeAuthCallback } from './nativeAuth';

export function NativeAuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let handle: PluginListenerHandle | undefined;
    const seen = new Set<string>();
    const receive = async (value: string) => {
      const url = parseNativeAuthCallback(value);
      if (disposed || !url || seen.has(value)) return;
      seen.add(value);
      try {
        const code = url.searchParams.get('code');
        if (url.searchParams.has('error') || !code) throw new Error('OAuth callback failed');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) throw new Error('OAuth exchange failed');
        if (!disposed) navigate(url.searchParams.get('recovery') === '1' ? '/auth/restablecer' : '/', { replace: true });
      } catch {
        if (!disposed) {
          toast.error('No se pudo validar el enlace de acceso. Solicita uno nuevo o vuelve a intentarlo.');
          navigate('/login', { replace: true });
        }
      }
      // Android closes the custom tab when the deep link returns to the activity.
      void Browser.close().catch(() => {});
    };
    void App.addListener('appUrlOpen', ({ url }) => { void receive(url); })
      .then(listener => {
        if (disposed) void listener.remove();
        else handle = listener;
      }).catch(() => {});
    void App.getLaunchUrl().then(result => {
      if (result?.url) void receive(result.url);
    }).catch(() => {});
    return () => { disposed = true; void handle?.remove(); };
  }, [navigate]);
  return null;
}
