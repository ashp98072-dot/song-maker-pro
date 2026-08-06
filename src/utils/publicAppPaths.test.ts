import { describe, it, expect } from 'vitest';
import { isPublicAppPath } from '@/utils/publicAppPaths';

describe('isPublicAppPath', () => {
  it('allows song and community deep links', () => {
    expect(isPublicAppPath('/cancion/ya-no-soy-esclavo')).toBe(true);
    expect(isPublicAppPath('/cancion/123')).toBe(true);
    expect(isPublicAppPath('/comunidad')).toBe(true);
    expect(isPublicAppPath('/comunidad/foo')).toBe(true);
    expect(isPublicAppPath('/unirse/AB12')).toBe(true);
    expect(isPublicAppPath('/perfil')).toBe(true);
    expect(isPublicAppPath('/perfil/abc')).toBe(true);
    expect(isPublicAppPath('/')).toBe(true);
  });

  it('blocks private app routes', () => {
    expect(isPublicAppPath('/login')).toBe(false);
    expect(isPublicAppPath('/favoritos')).toBe(false);
    expect(isPublicAppPath('/listas')).toBe(false);
    expect(isPublicAppPath('/cancion')).toBe(false);
    expect(isPublicAppPath('/unirse')).toBe(false);
  });
});
