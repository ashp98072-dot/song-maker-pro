import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worshiptranspose.app',
  appName: 'Worship Transpose',
  webDir: 'dist-android',
  // Bundle the UI locally. Never point production builds at a remote server.url.
  server: { androidScheme: 'https' },
};

export default config;
