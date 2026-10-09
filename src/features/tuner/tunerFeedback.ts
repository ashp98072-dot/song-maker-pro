export const IN_TUNE_CENTS = 5;

export function tuningInstruction(cents: number | null, instrument: boolean): string {
  if (cents == null || !Number.isFinite(cents)) return 'Toca una sola nota y deja que suene';
  if (Math.abs(cents) <= IN_TUNE_CENTS) return 'Afinado · mantén este tono';
  if (cents < 0) return instrument ? 'Sube el tono · tensa un poco la cuerda' : 'La nota está baja · sube el tono';
  return instrument ? 'Baja el tono · afloja un poco la cuerda' : 'La nota está alta · baja el tono';
}

export function latinPitchLabel(note: string): string {
  const names: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
  return note.replace(/^([A-G])([#b]?)(-?\d+)$/, (_, letter: string, accidental: string, octave: string) =>
    `${names[letter]}${accidental === '#' ? '♯' : accidental === 'b' ? '♭' : ''}${octave}`);
}
