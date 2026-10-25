import type { CapacitorConfig } from '@capacitor/cli';

// Configuration de l'application mobile (Android) générée à partir du site Angular
const config: CapacitorConfig = {
  appId: 'sn.keurpapadjibrilkor.app',
  appName: 'Keur Papa Djibril Kor',
  webDir: 'dist/keur-papa-djibril-kor/browser',
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;
