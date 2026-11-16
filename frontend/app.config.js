import { existsSync } from 'node:fs';

const androidFirebaseConfig = './google-services.json';
const iosFirebaseConfig = './GoogleService-Info.plist';

const androidGoogleServices =
  process.env.GOOGLE_SERVICES_JSON ??
  (existsSync(androidFirebaseConfig) ? androidFirebaseConfig : undefined);

export default {
  expo: {
    name: 'Dinesh-Farms',
    slug: 'Dinesh-Farms',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',

    ios: {
      icon: './assets/images/icon.png',
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.Dineshfarms',
      ...(existsSync(iosFirebaseConfig)
        ? { googleServicesFile: iosFirebaseConfig }
        : {}),
    },

    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-secure-store',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      './plugins/withFirebaseManifestFix',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#2E7D32',
          defaultChannel: 'alerts',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow Dinesh Farms to use your location to set your delivery address.',
        },
      ],
      './plugins/withGoogleMaps',
    ],

    experiments: {
      typedRoutes: true,
    },

    android: {
      package: 'com.anonymous.Dineshfarms',
      permissions: ['android.permission.POST_NOTIFICATIONS'],
      icon: './assets/images/icon.png',
      ...(androidGoogleServices
        ? { googleServicesFile: androidGoogleServices }
        : {}),

      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_MAPS_API_KEY,
        },
      },
    },

    extra: {
      eas: {
        projectId: '95597f47-dd1e-4691-851c-9a833c629233',
      },
    },
  },
};