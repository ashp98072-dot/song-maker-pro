import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSpectatorSession } from '@/features/director-session/context/SpectatorSessionContext';

export function JoinSessionConflictDialog() {
  const {
    joinConflictOpen,
    joinConflictCurrentCode,
    joinConflictTargetCode,
    closeJoinConflict,
    confirmLeaveSessionAndJoin,
  } = useSpectatorSession();

  return (
    <Dialog open={joinConflictOpen} onOpenChange={(open) => !open && closeJoinConflict()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ya estás conectado</DialogTitle>
          <DialogDescription>
            Ya estás conectado a una sesión en vivo. ¿Deseas salir de la sesión actual para
            unirte a otra?
            {joinConflictCurrentCode && joinConflictTargetCode ? (
              <>
                {' '}
                (<span className="font-mono text-foreground">{joinConflictCurrentCode}</span>
                {' → '}
                <span className="font-mono text-foreground">{joinConflictTargetCode}</span>)
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            type="button"
            onClick={confirmLeaveSessionAndJoin}
            className="w-full sm:w-auto px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold"
          >
            Salir y unirme
          </button>
          <button
            type="button"
            onClick={closeJoinConflict}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
