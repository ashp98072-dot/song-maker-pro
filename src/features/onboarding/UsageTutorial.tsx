import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Music2, ListMusic, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { initialProgress, ONBOARDING_KEY, TUTORIAL_EVENT, tutorialForUser, type TutorialProgress } from './onboardingState';

const steps = [
  { title: 'Encuentra tu primera canción', icon: BookOpen, description: 'Tu biblioteca es el punto de partida.',
    instructions: ['En Inicio, usa el buscador para encontrar una canción por su título o artista.', 'Abre una canción para ver su letra. Puedes marcarla como favorita para encontrarla después.'] },
  { title: 'Adapta la canción a tu voz', icon: Music2, description: 'Lee y canta en el tono que necesitas.',
    instructions: ['Dentro de una canción, usa los controles de tonalidad para subir o bajar el tono.', 'Elige Cantante para leer la letra o Músico para ver también los acordes. La transposición necesita una canción con acordes.'] },
  { title: 'Prepara una lista', icon: ListMusic, description: 'Organiza las canciones de tu próxima reunión.',
    instructions: ['Abre Listas y crea una lista con un nombre que reconozcas.', 'Añade las canciones y ordénalas. Con dos o más canciones puedes usar la vista continua para seguir la lista.'] },
  { title: 'Comparte una sesión en vivo', icon: Radio, description: 'Director y participantes pueden seguir la misma reunión.',
    instructions: ['Desde una canción o lista, abre la opción de sesión en vivo. El director crea la sesión y comparte su código.', 'Los participantes se unen con ese código y activan Seguir al director. Necesitan conexión a internet.'] },
];
const safePaths = new Set(['/', '/perfil', '/listas', '/favoritos', '/comunidad']);

export function UsageTutorial() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const saving = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidateRequests = () => ++generation.current;
    const load = async () => {
      const request = invalidateRequests();
      const { data, error: authError } = await supabase.auth.getUser();
      if (!mounted || request !== generation.current) return;
      identity.current = data.user?.id ?? null;
      setError('');
      setProgress(!authError && data.user ? tutorialForUser(data.user) : null);
    };
    void load().catch(() => { /* No tutorial when account cannot be verified. */ });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (identity.current && session?.user.id !== identity.current)) {
        invalidateRequests();
        identity.current = null;
        setProgress(null);
        setBusy(false);
        saving.current = false;
      }
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user.id !== identity.current) {
        clearTimeout(timer);
        timer = setTimeout(() => { void load().catch(() => {}); }, 0);
      }
    });
    const replay = () => {
      if (!identity.current || saving.current) return;
      setError(''); setProgress({ ...initialProgress });
    };
    window.addEventListener(TUTORIAL_EVENT, replay);
    return () => {
      mounted = false; invalidateRequests(); clearTimeout(timer);
      listener.subscription.unsubscribe(); window.removeEventListener(TUTORIAL_EVENT, replay);
    };
  }, []);

  const save = async (next: TutorialProgress) => {
    if (!identity.current || saving.current) return;
    const accountId = identity.current;
    const request = generation.current;
    saving.current = true; setBusy(true); setError('');
    try {
      const { data: verified, error: authError } = await supabase.auth.getUser();
      if (authError || verified.user?.id !== accountId || request !== generation.current) throw new Error('La sesión cambió. Vuelve a iniciar sesión.');
      const { error: saveError } = await supabase.auth.updateUser({ data: { [ONBOARDING_KEY]: next } });
      if (saveError) throw saveError;
      if (request === generation.current) setProgress(next);
    } catch {
      if (request === generation.current) setError('No se pudo guardar el avance. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (request === generation.current) { saving.current = false; setBusy(false); }
    }
  };
  const open = progress?.status === 'active' && (safePaths.has(pathname) || pathname.startsWith('/perfil/'));
  const index = progress?.step ?? 0;
  const step = steps[index];
  const Icon = step.icon;
  return <Dialog.Root open={open} onOpenChange={value => { if (!value && progress) void save({ ...progress, status: 'skipped' }); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
      <Dialog.Content onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
        className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 sm:p-7 shadow-xl max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center gap-3 text-gold mb-4"><Icon aria-hidden className="h-7 w-7" /><span className="text-sm">Guía de inicio · {index + 1} de {steps.length}</span></div>
        <Dialog.Title className="text-xl font-semibold pr-4">{step.title}</Dialog.Title>
        <Dialog.Description className="text-muted-foreground mt-2">{step.description}</Dialog.Description>
        <ol className="list-decimal pl-5 space-y-3 my-6 text-sm leading-relaxed">{step.instructions.map(text => <li key={text}>{text}</li>)}</ol>
        <p className="text-xs text-muted-foreground mb-4">Puedes repetir esta guía desde Perfil → Tutorial de uso.</p>
        {error && <div className="mb-4">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" onClick={() => setProgress(null)}>Cerrar por ahora (sin guardar)</Button>
        </div>}
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" disabled={busy} onClick={() => void save({step:index,status:'skipped'})}>Omitir</Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" disabled={busy || index === 0} onClick={() => void save({step:index-1,status:'active'})}>Atrás</Button>
            <Button disabled={busy} onClick={() => void save(index === 3 ? {step:3,status:'completed'} : {step:index+1,status:'active'})}>
              {busy ? 'Guardando…' : index === 3 ? 'Comenzar' : 'Siguiente'}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
