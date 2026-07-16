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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login"    />
        <Stack.Screen name="register" />
        <Stack.Screen name="index"    />
        <Stack.Screen name="(client)"   />
        <Stack.Screen name="(provider)" />
      </Stack>

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
