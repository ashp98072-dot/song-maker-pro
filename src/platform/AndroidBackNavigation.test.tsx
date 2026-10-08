import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
const mocks = vi.hoisted(() => ({ platform: 'android', add: vi.fn(), minimize: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mocks.platform } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.add, minimizeApp: mocks.minimize } }));
import { AndroidBackNavigation } from './AndroidBackNavigation';
function Location() { return <span>{useLocation().pathname}</span>; }
function mount(dialog = false) {
  return render(<MemoryRouter initialEntries={['/', '/favoritos']}><AndroidBackNavigation /><Location />
    {dialog && <Dialog defaultOpen><DialogContent aria-describedby={undefined}><DialogTitle>Prueba</DialogTitle></DialogContent></Dialog>}
  </MemoryRouter>);
}
beforeEach(() => {
  mocks.platform = 'android'; mocks.add.mockReset().mockResolvedValue({ remove: vi.fn() });
  mocks.minimize.mockReset().mockResolvedValue(undefined);
  window.history.replaceState({ idx: 1 }, '');
});
afterEach(cleanup);
it('returns through app history instead of exiting', async () => {
  mount(); await act(async () => {});
  act(() => mocks.add.mock.calls[0][1]({ canGoBack: true }));
  expect(screen.getByText('/')).toBeInTheDocument();
  expect(mocks.minimize).not.toHaveBeenCalled();
});
it('minimizes at the root rather than leaving the WebView', async () => {
  window.history.replaceState({ idx: 0 }, '');
  mount(); await act(async () => {});
  act(() => mocks.add.mock.calls[0][1]({ canGoBack: false }));
  expect(mocks.minimize).toHaveBeenCalledOnce();
});
it('dismisses the open dialog before navigating', async () => {
  mount(true); await act(async () => {});
  act(() => mocks.add.mock.calls[0][1]({ canGoBack: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('/favoritos')).toBeInTheDocument();
  expect(mocks.minimize).not.toHaveBeenCalled();
});
it('does not intercept back on the web', () => {
  mocks.platform = 'web'; mount(); expect(mocks.add).not.toHaveBeenCalled();
});
