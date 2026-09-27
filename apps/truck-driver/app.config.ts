import type { ExpoConfig } from 'expo/config'

/**
 * Truck Loads — Driver. Separate native app from the Easyfix app in
 * apps/mobile: drivers sign in with the phone number dispatch put on their
 * truck and get Google turn-by-turn truck navigation.
 *
 * Env (EAS secrets / .env):
 *   EXPO_PUBLIC_API_URL        API base, e.g. https://…/api/v1
 *   GOOGLE_NAVIGATION_API_KEY  Navigation SDK + Maps SDK Android/iOS key
 */
const config: ExpoConfig = {
  name: 'Truck Loads Driver',
  slug: 'truck-loads-driver',
  version: '1.0.0',
  scheme: 'truckloads',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    // TODO: replace with your Apple bundle id before the first EAS build
    bundleIdentifier: 'com.truckloads.driver',
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Truck Loads uses your location for turn-by-turn truck navigation to pickups and deliveries.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Truck Loads keeps navigating with the screen off or while you use other apps.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    // TODO: replace with your Play Store package name before the first EAS build
    package: 'com.truckloads.driver',
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Truck Loads uses your location for turn-by-turn truck navigation to pickups and deliveries.',
      },
    ],
    ['expo-build-properties', { android: { minSdkVersion: 24 } }],
    ['./plugins/withGoogleNavigation', { apiKey: process.env.GOOGLE_NAVIGATION_API_KEY }],
  ],
  experiments: {
    typedRoutes: true,
  },
}

export default config
