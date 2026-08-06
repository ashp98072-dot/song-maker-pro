export type TeleprompterLiveKind = 'director' | 'follower';
export type TeleprompterLiveTone = 'live' | 'follow' | 'paused' | 'warn' | 'offline';

export type TeleprompterLivePillModel = {
  label: string;
  tone: TeleprompterLiveTone;
  title: string;
};

export function resolveTeleprompterLivePill(input: {
  role: TeleprompterLiveKind | 'idle' | null | undefined;
  /** Realtime channel connected */
  connected: boolean;
  /** Connecting / reconnecting */
  connecting?: boolean;
  followDirector?: boolean;
}): TeleprompterLivePillModel | null {
  const role = input.role;
  if (role !== 'director' && role !== 'follower') return null;

  if (!input.connected && !input.connecting) {
    return {
      label: 'OFFLINE',
      tone: 'offline',
      title: 'Sin conexión a la sesión en vivo',
    };
  }

  if (input.connecting && !input.connected) {
    return {
      label: '…',
      tone: 'warn',
      title: 'Reconectando…',
    };
  }

  if (role === 'director') {
    return {
      label: 'EN VIVO',
      tone: 'live',
      title: 'Transmitiendo como director',
    };
  }

  if (input.followDirector === false) {
    return {
      label: 'PAUSA',
      tone: 'paused',
      title: 'Conectado, sin seguir al director',
    };
  }

  return {
    label: 'SIGUIENDO',
    tone: 'follow',
    title: 'Siguiendo al director',
  };
}
