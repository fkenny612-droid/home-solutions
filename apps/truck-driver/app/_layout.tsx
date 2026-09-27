import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationProvider, TaskRemovedBehavior } from '@googlemaps/react-native-navigation-sdk'
import { AuthProvider, useAuth } from '../lib/auth'

function RootStack() {
  const { signedIn, isLoading } = useAuth()
  // Don't mount screens until the stored session is restored, so no screen
  // fetches before the token is set
  if (isLoading) return null
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="load/[id]" />
        <Stack.Screen name="navigate/[id]" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Google requires drivers to accept its navigation terms before guidance */}
      <NavigationProvider
        termsAndConditionsDialogOptions={{ title: 'Truck Loads navigation', companyName: 'Truck Loads' }}
        taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
      >
        <AuthProvider>
          <StatusBar style="dark" />
          <RootStack />
        </AuthProvider>
      </NavigationProvider>
    </SafeAreaProvider>
  )
}
