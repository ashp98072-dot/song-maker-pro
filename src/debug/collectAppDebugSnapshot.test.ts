import { describe, expect, it } from 'vitest';
import { collectAppDebugSnapshot } from '@/debug/collectAppDebugSnapshot';

describe('collectAppDebugSnapshot', () => {
  it('returns snapshot shape when debug enabled in test env', async () => {
    const snap = await collectAppDebugSnapshot({
      pathname: '/cancion/test',
      search: '?debug=1',
      hash: '',
    });
    expect(snap.route.pathname).toBe('/cancion/test');
    expect(snap.youtube.provider).toBeDefined();
    expect(snap.diagnostics.renderDiagStage).toBeTypeOf('number');
    expect(snap.pwa.serviceWorkerSupported).toBeTypeOf('boolean');
  });
});
