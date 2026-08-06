/** Mensajes legibles para la UI (evitar "Failed to fetch" crudo). */

interface GoogleApiErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

function parseGoogleErrorBody(body: string): GoogleApiErrorBody['error'] | null {
  try {
    const parsed = JSON.parse(body) as GoogleApiErrorBody;
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

/** Detalle HTTP de YouTube Data API v3 para consola / UI. */
export function formatYouTubeDataApiHttpError(status: number, body: string): string {
  const err = parseGoogleErrorBody(body);
  const reason = err?.errors?.[0]?.reason ?? '';
  const googleMsg = err?.message?.trim() ?? '';

  if (status === 400 && (reason === 'keyInvalid' || reason === 'invalid')) {
    return 'YouTube Data API: clave API inválida. Revisa VITE_YOUTUBE_API_KEY en Vercel/.env.local.';
  }
  if (
    status === 403 &&
    (reason === 'dailyLimitExceeded' ||
      reason === 'quotaExceeded' ||
      reason === 'userRateLimitExceeded')
  ) {
    return 'YouTube Data API: cuota o límite de uso excedido.';
  }
  if (status === 403 && reason === 'accessNotConfigured') {
    return 'YouTube Data API v3 no está habilitada en tu proyecto de Google Cloud.';
  }
  if (status === 403 && reason === 'ipRefererBlocked') {
    return 'YouTube Data API: referrer HTTP bloqueado. Añade tu dominio (y localhost) en restricciones de la API key.';
  }
  if (status === 403) {
    return `YouTube Data API: acceso denegado (403)${googleMsg ? ` — ${googleMsg}` : ''}${reason ? ` [${reason}]` : ''}`;
  }
  if (status === 401) {
    return 'YouTube Data API: no autorizado (401). Clave API incorrecta o restringida.';
  }

  const snippet = googleMsg || body.slice(0, 160);
  return `YouTube Data API ${status}${snippet ? `: ${snippet}` : ''}`;
}

export function isNetworkFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TypeError' && /failed to fetch/i.test(error.message)) return true;
  return /failed to fetch/i.test(error.message);
}

export function formatSearchErrorForUser(error: unknown): string | null {
  if (error instanceof DOMException && error.name === 'AbortError') return null;
  if (!(error instanceof Error)) {
    return 'No se pudo buscar videos en YouTube';
  }

  const msg = error.message.trim();

  if (
    msg.includes('YouTube Data API') ||
    msg.includes('No se pudo conectar con YouTube') ||
    msg.includes('VITE_YOUTUBE_API_KEY')
  ) {
    return msg;
  }

  if (isNetworkFetchFailure(error)) {
    return 'No se pudo conectar con YouTube. Comprueba tu red y las restricciones HTTP referrer de la API key en Google Cloud.';
  }

  return msg || 'No se pudo buscar videos en YouTube';
}
