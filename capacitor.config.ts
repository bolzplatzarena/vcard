import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.bolzplatzarena.vcard',
  appName: 'vcard',
  webDir: 'dist/vcard/browser',
  plugins: {
    // Dark status bar icons: the app is always light, so the system's dark mode must not turn them white.
    SystemBars: { style: 'LIGHT' },
  },
};

export default config;
