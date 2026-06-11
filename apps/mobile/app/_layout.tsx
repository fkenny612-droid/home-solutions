import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
