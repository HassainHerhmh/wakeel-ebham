import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ebham.merchantapp',
  appName: 'نظام التاجر',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;