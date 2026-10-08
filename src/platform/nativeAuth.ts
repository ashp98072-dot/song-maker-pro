export const NATIVE_AUTH_REDIRECT = 'com.worshiptranspose.app://auth/callback';

/** Only accept the dedicated callback; never treat arbitrary app links as credentials. */
export function parseNativeAuthCallback(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'com.worshiptranspose.app:' || url.hostname !== 'auth' ||
      url.pathname !== '/callback' || url.username || url.password || url.port) return null;
    return url;
  } catch { return null; }
}
