import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ native: false, register: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock('virtual:pwa-register', () => ({ registerSW: mocks.register }));
import { registerPwaServiceWorker } from './registerPwa';
beforeEach(() => { mocks.native = false; mocks.register.mockClear(); });
it('registers offline web support on the web', () => {
  registerPwaServiceWorker(); expect(mocks.register).toHaveBeenCalledOnce();
});
it('does not register a web service worker inside Android', () => {
  mocks.native = true; registerPwaServiceWorker(); expect(mocks.register).not.toHaveBeenCalled();
});
