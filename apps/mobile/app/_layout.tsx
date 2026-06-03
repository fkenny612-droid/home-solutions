import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../context/auth'

function RootLayoutNav() {
  const { token, user, isLoading } = useAuth()
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuth = segments[0] === 'login' || segments[0] === 'register'

    if (!token && !inAuth) {
      // Not signed in — go to login
      router.replace('/login')
    } else if (token && inAuth) {
      // Signed in but on auth screen — go to correct app
      router.replace(user?.role === 'provider' ? '/(provider)' : '/(client)')
    }
  }, [token, isLoading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"    />
      <Stack.Screen name="register" />
      <Stack.Screen name="index"    />
      <Stack.Screen name="(client)"   />
      <Stack.Screen name="(provider)" />
    </Stack>
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
