// Web Share API helper con fallback automático al portapapeles.
import { toast } from 'sonner';

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

export async function shareNative(data: ShareData): Promise<void> {
  // 1) Intentamos usar la API nativa del dispositivo (móviles, Safari, etc.)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return;
    } catch (err: any) {
      // El usuario canceló — no es un error real
      if (err?.name === 'AbortError') return;
      // Cualquier otro error: caemos al fallback
      console.warn('Web Share falló, usando portapapeles:', err);
    }
  }

  // 2) Fallback: copiar URL al portapapeles
  try {
    await navigator.clipboard.writeText(data.url);
    toast.success('Enlace copiado al portapapeles');
  } catch {
    // 3) Último recurso: prompt manual
    window.prompt('Copia este enlace:', data.url);
  }
}
