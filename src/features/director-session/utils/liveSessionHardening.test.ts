import { describe, expect, it } from 'vitest';
import {
  releaseJoinInFlight,
  tryAcquireJoinInFlight,
  withJoinInFlight,
} from '@/features/director-session/utils/liveSessionHardening';

describe('joinInFlight guard', () => {
  it('blocks second acquire until release', () => {
    const ref = { current: false };
    expect(tryAcquireJoinInFlight(ref, 'joinWithCode', 'joining')).toBe(true);
    expect(tryAcquireJoinInFlight(ref, 'restorePersistedSession', 'joining')).toBe(false);
    releaseJoinInFlight(ref);
    expect(tryAcquireJoinInFlight(ref, 'volverASesion', 'joining')).toBe(true);
    releaseJoinInFlight(ref);
  });

  it('withJoinInFlight blocks concurrent second call', async () => {
    const ref = { current: false };
    let runs = 0;
    const firstPromise = withJoinInFlight(ref, 'joinWithCode', 'joining', async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 'ok';
    });
    const secondPromise = withJoinInFlight(ref, 'joinWithCode', 'joining', async () => {
      runs += 1;
      return 'blocked';
    });
    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).toBe('ok');
    expect(second).toBeUndefined();
    expect(runs).toBe(1);
  });
});
