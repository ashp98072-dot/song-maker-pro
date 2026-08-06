import { memo } from 'react';
import { musicianNoteIcon } from '@/utils/lyricTokens';

export interface MusicianNoteProps {
  text: string;
  /** inline within lyrics vs own line */
  variant?: 'inline' | 'block';
}

function MusicianNoteComponent({ text, variant = 'inline' }: MusicianNoteProps) {
  const icon = musicianNoteIcon(text);

  if (variant === 'block') {
    return (
      <div
        className="musician-note musician-note--block my-1.5 flex items-center gap-2 rounded-md border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sky-200/90"
        role="note"
        aria-label={`Nota para músicos: ${text}`}
      >
        <span className="shrink-0 text-sm opacity-90" aria-hidden>
          {icon}
        </span>
        <span className="text-xs sm:text-sm italic font-medium tracking-wide">{text}</span>
      </div>
    );
  }

  return (
    <span
      className="musician-note musician-note--inline mx-0.5 inline-flex items-baseline gap-0.5 rounded px-1 py-px text-[0.92em] italic font-medium text-amber-200/85 bg-amber-500/10 border border-amber-500/20 align-baseline"
      role="note"
      aria-label={`Nota: ${text}`}
    >
      <span className="text-[0.85em] opacity-80 not-italic" aria-hidden>
        {icon}
      </span>
      <span>{text}</span>
    </span>
  );
}

export default memo(MusicianNoteComponent);
