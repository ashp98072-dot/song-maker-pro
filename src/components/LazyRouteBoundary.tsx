import { Suspense, type ReactNode } from 'react';
import { ChunkLoadErrorBoundary } from '@/components/ChunkLoadErrorBoundary';
import { Loader2 } from 'lucide-react';

function RouteLoadingFallback({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 min-h-[40vh] px-4"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-8 h-8 animate-spin text-gold" aria-hidden />
      <p className="text-sm text-muted-foreground">Cargando {label}…</p>
    </div>
  );
}

export interface LazyRouteBoundaryProps {
  children: ReactNode;
  /** Nombre legible para loading / errores de chunk */
  label: string;
  fallbackTitle?: string;
}

/**
 * Suspense + boundary para rutas con lazy() (SongView, Setlist live, YouTube picker).
 */
export function LazyRouteBoundary({
  children,
  label,
  fallbackTitle,
}: LazyRouteBoundaryProps) {
  return (
    <ChunkLoadErrorBoundary
      fallbackTitle={fallbackTitle ?? `No se pudo cargar ${label}.`}
    >
      <Suspense fallback={<RouteLoadingFallback label={label} />}>{children}</Suspense>
    </ChunkLoadErrorBoundary>
  );
}
