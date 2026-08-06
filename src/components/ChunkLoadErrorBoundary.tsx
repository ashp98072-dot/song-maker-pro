import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message ?? '';
  const name = error.name ?? '';
  return (
    name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

/**
 * Captura fallos de render y errores típicos de chunk lazy (network / deploy / SW stale).
 */
export class ChunkLoadErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const chunk = isChunkLoadError(error);
    if (import.meta.env.DEV) {
      console.error(
        chunk ? '[CHUNK LOAD ERROR]' : '[ChunkLoadErrorBoundary]',
        error.message,
        info.componentStack
      );
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { children, fallbackTitle = 'Algo salió mal al cargar esta vista.' } = this.props;
    const { error } = this.state;
    if (error) {
      const chunkStale = isChunkLoadError(error);
      return (
        <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-muted-foreground">
            {chunkStale
              ? 'No se pudo cargar un módulo de la aplicación (posible caché o despliegue antiguo).'
              : fallbackTitle}
          </p>
          {chunkStale && (
            <p className="text-xs text-muted-foreground">
              Prueba recargar. Si persiste, borra datos del sitio o desinstala la PWA instalada.
            </p>
          )}
          <p className="text-xs font-mono text-destructive/80 break-words">{error.message}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2 rounded-lg bg-gold text-primary-foreground text-sm font-medium"
          >
            {chunkStale ? 'Recargar aplicación' : 'Recargar página'}
          </button>
        </div>
      );
    }
    return children;
  }
}
