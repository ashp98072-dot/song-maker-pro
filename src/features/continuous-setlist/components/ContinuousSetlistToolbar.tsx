import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Contrast,
  Maximize,
  Minimize,
  Radio,
  Rows3,
  Sun,
  Type,
} from 'lucide-react';

export interface ContinuousSetlistToolbarProps {
  listId: string;
  listName: string;
  /** Modo sync continuo: solo lista + pantalla completa. */
  syncMode?: boolean;
  hideChrome: boolean;
  stageMode: boolean;
  ultraContrast: boolean;
  largeSpacing: boolean;
  isFullscreen: boolean;
  showSession: boolean;
  onToggleStage: () => void;
  onToggleUltraContrast: () => void;
  onToggleLargeSpacing: () => void;
  onToggleHideChrome: () => void;
  onToggleFullscreen: () => void;
  onToggleSession: () => void;
  onFontSmaller: () => void;
  onFontLarger: () => void;
  /** Si se define, el botón atrás sale de continuo hacia la canción (no a /lista). */
  onBack?: () => void;
}

export function ContinuousSetlistToolbar({
  listId,
  listName,
  syncMode = false,
  hideChrome,
  stageMode,
  ultraContrast,
  largeSpacing,
  isFullscreen,
  showSession,
  onToggleStage,
  onToggleUltraContrast,
  onToggleLargeSpacing,
  onToggleHideChrome,
  onToggleFullscreen,
  onToggleSession,
  onFontSmaller,
  onFontLarger,
  onBack,
}: ContinuousSetlistToolbarProps) {
  if (hideChrome && isFullscreen) return null;

  return (
    <header className="continuous-toolbar sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md px-3 py-2 continuous-toolbar-safe">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {!hideChrome && <span className="hidden sm:inline">Canción</span>}
          </button>
        ) : (
          <Link
            to={`/lista/${listId}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {!hideChrome && <span className="hidden sm:inline">Lista</span>}
          </Link>
        )}
        {!hideChrome && (
          <h1 className="text-sm font-bold truncate flex-1 min-w-0">{listName}</h1>
        )}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {!syncMode && (
          <>
          <button
            type="button"
            onClick={onFontSmaller}
            className="p-2 rounded-lg border border-border text-xs"
            title="Texto más pequeño"
          >
            A-
          </button>
          <button
            type="button"
            onClick={onFontLarger}
            className="p-2 rounded-lg border border-border text-xs"
            title="Texto más grande"
          >
            A+
          </button>
          <button
            type="button"
            onClick={onToggleLargeSpacing}
            className={`p-2 rounded-lg border ${largeSpacing ? 'border-gold text-gold' : 'border-border'}`}
            title="Espaciado grande"
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleUltraContrast}
            className={`p-2 rounded-lg border ${ultraContrast ? 'border-amber-500 text-amber-400' : 'border-border'}`}
            title="Alto contraste"
          >
            <Contrast className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleStage}
            className={`p-2 rounded-lg border ${stageMode ? 'border-gold text-gold' : 'border-border'}`}
            title="Modo escenario"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSession}
            className={`p-2 rounded-lg border ${showSession ? 'border-gold text-gold' : 'border-border'}`}
            title="Sesión en vivo"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleHideChrome}
            className="p-2 rounded-lg border border-border text-[10px] font-bold uppercase"
            title="Ocultar barra"
          >
            UI
          </button>
          </>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg border border-border"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
