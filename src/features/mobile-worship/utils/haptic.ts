/** Vibración suave en dispositivos compatibles (ensayo / escenario). */
export function worshipHaptic(ms = 10): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}
