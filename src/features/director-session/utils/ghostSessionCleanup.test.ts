import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/features/director-session/utils/liveSessionAuth', () => ({
  resolveAuthenticatedDirector: vi.fn(async () => ({
    ok: true as const,
    userId: 'director-1',
  })),
}));

describe('ghostSessionCleanup protect code', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockResolvedValue({ data: 1, error: null });
  });

  it('keeps protected code even when keepCode arg is omitted', async () => {
    const {
      protectDirectorLiveSessionCode,
      deactivateAllMyPreviousSessions,
    } = await import('@/features/director-session/utils/ghostSessionCleanup');

    protectDirectorLiveSessionCode('ABC123');
    await deactivateAllMyPreviousSessions();

    expect(rpcMock).toHaveBeenCalledWith('deactivate_director_live_sessions', {
      p_keep_code: 'ABC123',
    });

    protectDirectorLiveSessionCode(null);
  });

  it('prefers explicit keepCode over protected code', async () => {
    const {
      protectDirectorLiveSessionCode,
      deactivateAllMyPreviousSessions,
    } = await import('@/features/director-session/utils/ghostSessionCleanup');

    protectDirectorLiveSessionCode('OLD999');
    await deactivateAllMyPreviousSessions('NEW456');

    expect(rpcMock).toHaveBeenCalledWith('deactivate_director_live_sessions', {
      p_keep_code: 'NEW456',
    });

    protectDirectorLiveSessionCode(null);
  });
});
