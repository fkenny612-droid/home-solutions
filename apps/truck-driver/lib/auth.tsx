/**
 * Session: JWT kept in the device keychain / keystore.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { api, setAuthToken, setOnUnauthorized } from './api'

const TOKEN_KEY = 'truck_loads_driver_token'

interface AuthCtx {
  signedIn: boolean
  isLoading: boolean
  signIn: (phone: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const signOut = useCallback(async () => {
    setAuthToken(null)
    setSignedIn(false)
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {})
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => { signOut() })
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(t => { if (t) { setAuthToken(t); setSignedIn(true) } })
      .catch(() => {})
      .finally(() => setIsLoading(false))
    return () => setOnUnauthorized(null)
  }, [signOut])

  const signIn = useCallback(async (phone: string, password: string) => {
    const { accessToken } = await api.login(phone.trim(), password)
    setAuthToken(accessToken)
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
    setSignedIn(true)
  }, [])

  return <Ctx.Provider value={{ signedIn, isLoading, signIn, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
