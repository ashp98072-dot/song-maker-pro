import { useEffect } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

/** Adapt Android resume/network to the catalog's existing browser refresh events. */
export function NativeLifecycle() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const track = (pending: Promise<PluginListenerHandle>) => {
      void pending.then(handle => {
        if (disposed) void handle.remove();
        else handles.push(handle);
      }).catch(error => console.warn('[Android lifecycle]', error));
    };
    track(App.addListener('appStateChange', ({ isActive }) => {
      if (!disposed && isActive) window.dispatchEvent(new Event('focus'));
    }));
    track(Network.addListener('networkStatusChange', ({ connected }) => {
      if (!disposed && connected) window.dispatchEvent(new Event('online'));
    }));
    return () => {
      disposed = true;
      for (const handle of handles) void handle.remove();
    };
  }, []);
  return null;
}
