import { act, cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ add: vi.fn(), launch: vi.fn(), exchange: vi.fn(), close: vi.fn(), error: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.add, getLaunchUrl: mocks.launch } }));
vi.mock('@capacitor/browser', () => ({ Browser: { close: mocks.close } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { exchangeCodeForSession: mocks.exchange } } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
import { NativeAuthCallback } from './NativeAuthCallback';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.add.mockResolvedValue({ remove: vi.fn() }); mocks.launch.mockResolvedValue(undefined);
  mocks.exchange.mockResolvedValue({ data: { session: {} }, error: null }); mocks.close.mockResolvedValue(undefined);
});
afterEach(cleanup);
it('exchanges a callback code once even if launch and event repeat it', async () => {
  const url = 'com.worshiptranspose.app://auth/callback?code=one';
  mocks.launch.mockResolvedValue({ url });
  render(<MemoryRouter><NativeAuthCallback /></MemoryRouter>);
  await waitFor(() => expect(mocks.exchange).toHaveBeenCalledWith('one'));
  await act(async () => mocks.add.mock.calls[0][1]({ url }));
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
});
it('rejects unrelated URLs and handles OAuth errors without exchanging', async () => {
  render(<MemoryRouter><NativeAuthCallback /></MemoryRouter>);
  await act(async () => {});
  await act(async () => mocks.add.mock.calls[0][1]({ url: 'https://example.com/?code=one' }));
  expect(mocks.exchange).not.toHaveBeenCalled();
  await act(async () => mocks.add.mock.calls[0][1]({ url: 'com.worshiptranspose.app://auth/callback?error=denied' }));
  expect(mocks.error).toHaveBeenCalledOnce();
  expect(mocks.exchange).not.toHaveBeenCalled();
});
it('returns password recovery to the reset form instead of home', async () => {
  const url = 'com.worshiptranspose.app://auth/callback?recovery=1&code=reset';
  mocks.launch.mockResolvedValue({ url });
  function Location() { return <div data-testid="location">{useLocation().pathname}</div>; }
  const view = render(<MemoryRouter><NativeAuthCallback /><Location /></MemoryRouter>);
  await waitFor(() => expect(view.getByTestId('location')).toHaveTextContent('/auth/restablecer'));
  expect(mocks.exchange).toHaveBeenCalledWith('reset');
});
