import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), getSession: vi.fn() }));
vi.mock('./sessionRecovery', () => ({ resolveLiveSessionForReconnect: mocks.resolve }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
import { loadSessionRecovery } from './loadSessionRecovery';

describe('session recovery cancellation', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it('stops before fallback and authentication when cancelled during lookup', async () => {
    let cancelled = false;
    mocks.resolve.mockImplementation(async () => { cancelled = true; return null; });
    expect(await loadSessionRecovery('ABCD', 'EFGH', () => cancelled)).toBeNull();
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
  it('discards a result cancelled while authentication was pending', async () => {
    let cancelled = false;
    mocks.resolve.mockResolvedValue({ directorId: 'owner' });
    mocks.getSession.mockImplementation(async () => {
      cancelled = true;
      return { data: { session: { user: { id: 'owner' } } } };
    });
    expect(await loadSessionRecovery('ABCD', undefined, () => cancelled)).toBeNull();
  });
  it('retains fallback recovery and identity when the operation remains current', async () => {
    const recovery = { directorId: 'owner' };
    const session = { user: { id: 'owner' } };
    mocks.resolve.mockResolvedValueOnce(null).mockResolvedValueOnce(recovery);
    mocks.getSession.mockResolvedValue({ data: { session } });
    expect(await loadSessionRecovery('ABCD', 'efgh', () => false)).toEqual({ code: 'EFGH', recovery, session });
    expect(mocks.resolve).toHaveBeenNthCalledWith(2, 'efgh');
  });
});
