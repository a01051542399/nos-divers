import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.diveon.app',
  appName: 'Dive ON',
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
      'localhost',
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#FFFFFF',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
