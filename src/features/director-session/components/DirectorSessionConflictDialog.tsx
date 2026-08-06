import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';

export function DirectorSessionConflictDialog() {
  const {
    directorConflictOpen,
    directorConflictCode,
    closeDirectorConflict,
    continuarSesionFromConflict,
    cerrarSesionFromConflict,
  } = useSpectatorSession();

  return (
    <Dialog open={directorConflictOpen} onOpenChange={(open) => !open && closeDirectorConflict()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ya tienes una sesión activa</DialogTitle>
          <DialogDescription>
            {directorConflictCode ? (
              <>
                Código de sesión:{' '}
                <span className="font-mono font-semibold text-foreground">{directorConflictCode}</span>
              </>
            ) : (
              'Solo puedes dirigir una sesión a la vez. Continúa la actual o ciérrala para crear otra.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            type="button"
            onClick={continuarSesionFromConflict}
            className="w-full sm:w-auto px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold"
          >
            Continuar sesión
          </button>
          <button
            type="button"
            onClick={cerrarSesionFromConflict}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10"
          >
            Cerrar sesión actual
          </button>
          <button
            type="button"
            onClick={closeDirectorConflict}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
