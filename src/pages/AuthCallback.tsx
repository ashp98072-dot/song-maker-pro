import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Music } from 'lucide-react';

/**
 * AuthCallback
 * Procesa el retorno de OAuth (Google) de forma reactiva.
 * Elimina la dependencia de tiempos manuales para evitar bucles de redirección.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let failureTimer: ReturnType<typeof setTimeout> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthCallback] Evento detectado: ${event}`);

      // SIGNED_IN ocurre cuando el token en la URL se procesa con éxito
      if (event === 'SIGNED_IN' && session) {
        if (failureTimer) {
          clearTimeout(failureTimer);
          failureTimer = null;
        }
        navigate('/', { replace: true });
        return;
      }

      // INITIAL_SESSION ocurre cuando Supabase termina de revisar la URL
      // Si llegamos aquí y no hay sesión, es que el login falló o no había token
      if (event === 'INITIAL_SESSION' && !session) {
        if (failureTimer) clearTimeout(failureTimer);
        failureTimer = setTimeout(() => {
          navigate('/login?error=auth_callback_failed', { replace: true });
        }, 1000);
      }
    });

    // Temporizador de seguridad (Timeout global de 10 segundos)
    const timeout = setTimeout(() => {
      navigate('/login?error=timeout', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      if (failureTimer) clearTimeout(failureTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo con animación de carga */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center animate-pulse">
            <Music className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="absolute -inset-2 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Verificando sesión</h2>
          <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
            Estamos sincronizando tu biblioteca y preferencias...
          </p>
        </div>

        {/* Spinner adicional discreto */}
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
