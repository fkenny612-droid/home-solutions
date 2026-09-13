import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from '../context/auth'
import SplashScreen from '../components/SplashScreen'

function RootLayoutNav() {
  const { token, user, isLoading, activeMode } = useAuth()
  const segments = useSegments()
  const router   = useRouter()
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    if (isLoading || !splashDone) return

    const inAuth = segments[0] === 'login' || segments[0] === 'register'

    if (!token && !inAuth) {
      router.replace('/login')
    } else if (token && inAuth) {
      router.replace(activeMode === 'provider' ? '/(provider)' : '/(client)')
    }
  }, [token, isLoading, segments, splashDone])

  // Deep-link when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { bookingId?: string; type?: string }
      if (!data?.bookingId || !token) return
      if (data.type === 'new_job') {
        router.push('/(provider)/jobs')
      } else {
        router.push(`/(client)/booking-detail?id=${data.bookingId}` as any)
      }
    })
    return () => sub.remove()
  }, [token])

  return (
    <>
      {/*
       * Don't mount the routed screens until session restore finishes. Every screen's
       * child effects fire (in React's bottom-up commit order) before this component's
       * own effects — including AuthProvider's async session-restore effect that calls
       * api.setToken(). So a screen that fetches on mount (most of them do) would
       * otherwise always issue its first request with no auth token on a cold load —
       * silently failing with a 401 that gets swallowed, leaving the screen looking
       * empty or "not found". Delaying the mount until isLoading is false means no
       * screen effect can run before the token is set. The splash screen already
       * covers this the whole time, so nothing changes visually.
       */}
      {!isLoading && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login"    />
          <Stack.Screen name="register" />
          <Stack.Screen name="index"    />
          <Stack.Screen name="(client)"   />
          <Stack.Screen name="(provider)" />
        </Stack>
      )}

      {!splashDone && (
        <SplashScreen onDone={() => setSplashDone(true)} />
      )}
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
