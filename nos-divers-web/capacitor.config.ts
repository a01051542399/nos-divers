import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nosdivers.app',
  appName: 'NoS Divers',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
      '*.kakao.com',
      'kauth.kakao.com',
      'accounts.kakao.com',
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#E6F4FE',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
