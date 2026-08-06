import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SessionOriginMismatchDialogProps = {
  open: boolean;
  listLabel: string;
  onVolver: () => void;
  onRedirect: () => void;
  onCerrar: () => void;
  onDismiss: () => void;
};

export function SessionOriginMismatchDialog({
  open,
  listLabel,
  onVolver,
  onRedirect,
  onCerrar,
  onDismiss,
}: SessionOriginMismatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sesión activa en otro lugar</DialogTitle>
          <DialogDescription>
            Hay una sesión activa en:{' '}
            <span className="font-semibold text-foreground">{listLabel}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="w-full sm:w-auto px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold"
          >
            Volver a sesión
          </button>
          <button
            type="button"
            onClick={onRedirect}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-amber-500/40 text-amber-200 text-sm font-semibold hover:bg-amber-500/10"
          >
            Redirigir sesión aquí
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10"
          >
            Cerrar sesión
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
