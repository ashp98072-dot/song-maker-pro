import { Capacitor } from '@capacitor/core';

export function microphoneErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return Capacitor.getPlatform() === 'android'
      ? 'No se autorizó el micrófono. Revisa el permiso de esta app en Ajustes de Android y vuelve a intentarlo.'
      : 'No se autorizó el micrófono. Permite el acceso en tu navegador y vuelve a intentarlo.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'No se pudo iniciar el micrófono. Cierra otras apps que lo estén usando y comprueba que el acceso al micrófono esté activado en el dispositivo.';
  }
  if (name === 'NotFoundError') return 'No se encontró un micrófono disponible en el dispositivo.';
  return 'No se pudo iniciar el audio. Cierra la herramienta y vuelve a intentarlo.';
}
