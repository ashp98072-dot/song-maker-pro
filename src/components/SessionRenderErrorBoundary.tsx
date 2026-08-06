import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/** Dev-friendly boundary for session subtree crashes (blank screen diagnosis). */
export class SessionRenderErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[SessionRenderErrorBoundary]', this.props.label ?? 'session', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="border-b border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-100"
        >
          <p className="font-semibold">Error de sesión en vivo</p>
          <p className="mt-1 font-mono text-xs opacity-90">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
