const POSITIVE_TAGS = ['official', 'live', 'worship'] as const;
const NEGATIVE_TAGS = ['-karaoke', '-tutorial', '-cover', '-backing', '-instrumental'] as const;

/** Detecta texto probablemente en español para priorizar resultados locales. */
function prefersSpanish(title: string, artist?: string): boolean {
  const sample = `${title} ${artist ?? ''}`;
  return /[áéíóúñ¿¡]/i.test(sample) || /\b(el|la|los|las|de|del|en)\b/i.test(sample);
}

/**
 * Query orientada a ensayo en vivo (oficial, worship, sin karaoke/tutorial).
 * Ej: "No hay nadie como tú Marco Barrientos official live worship español -karaoke …"
 */
export function buildYouTubeSearchQuery(title: string, artist?: string): string {
  const core = [(title ?? '').trim(), artist?.trim()].filter(Boolean).join(' ');
  const tags = [...POSITIVE_TAGS];
  if (prefersSpanish(title, artist)) {
    tags.push('español');
  }
  const positive = [core, ...tags].join(' ');
  const negative = NEGATIVE_TAGS.join(' ');
  return `${positive} ${negative}`.replace(/\s+/g, ' ').trim();
}
