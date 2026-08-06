import type { SongViewPreference } from '@/features/song-view/preferences/songViewPreference';

export interface SongViewPreferenceToggleProps {
  preference: SongViewPreference;
  onChange: (mode: SongViewPreference) => void;
  className?: string;
}

export function SongViewPreferenceToggle({
  preference,
  onChange,
  className = '',
}: SongViewPreferenceToggleProps) {
  return (
    <div
      className={`flex items-center gap-2 p-1 rounded-xl bg-secondary/50 border border-border w-fit ${className}`}
      role="group"
      aria-label="Preferencia de visualización local"
    >
      <button
        type="button"
        onClick={() => onChange('musician')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          preference === 'musician'
            ? 'bg-gold text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Letra con acordes y notas (solo en esta pantalla)"
      >
        🎵 Músico
      </button>
      <button
        type="button"
        onClick={() => onChange('lyrics-only')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          preference === 'lyrics-only'
            ? 'bg-gold text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Solo letra, sin acordes ni notas de músico"
      >
        📝 Solo letra
      </button>
    </div>
  );
}
