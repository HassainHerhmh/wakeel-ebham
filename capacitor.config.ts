import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.ebham.merchantapp',
  appName: 'وكيل ابهام',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(liveReloadUrl
      ? {
          url: liveReloadUrl,
          cleartext: true,
        }
      : {}),
  },
};

export default config;
