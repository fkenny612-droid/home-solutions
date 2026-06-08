/**
 * AuthContext — JWT auth with SecureStore persistence + push token registration
 */
import { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api'
import { registerForPushNotifications } from '../lib/notifications'

const TOKEN_KEY = 'hs_token'
const USER_KEY  = 'hs_user'

export interface AuthUser {
  id:        string
  phone:     string
  role:      'client' | 'provider' | 'admin'
  firstName?: string
  lastName?:  string
}

interface AuthCtx {
  user:      AuthUser | null
  token:     string | null
  isLoading: boolean
  login:     (phone: string, password: string) => Promise<AuthUser>
  register:  (data: Parameters<typeof import('../lib/api').api.auth.register>[0]) => Promise<AuthUser>
  logout:    () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null)
  const [token,     setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on boot
  useEffect(() => {
    ;(async () => {
      try {
        const [t, u] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ])
        if (t && u) {
          setToken(t)
          setUser(JSON.parse(u))
          api.setToken(t)
        }
      } catch {}
      finally { setIsLoading(false) }
    })()
  }, [])

  const persist = async (token: string, user: AuthUser) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ])
    api.setToken(token)
    setToken(token)
    setUser(user)
  }

  const registerPushToken = async () => {
    try {
      const pushToken = await registerForPushNotifications()
      if (pushToken) await api.auth.savePushToken(pushToken)
    } catch {}
  }

  const login = async (phone: string, password: string) => {
    const res = await api.auth.login(phone, password)
    await persist(res.accessToken, res.user as AuthUser)
    registerPushToken() // fire and forget
    return res.user as AuthUser
  }

  const register = async (data: Parameters<typeof api.auth.register>[0]) => {
    const res = await api.auth.register(data)
    await persist(res.accessToken, res.user as AuthUser)
    registerPushToken() // fire and forget
    return res.user as AuthUser
  }

  const logout = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ])
    api.setToken(null)
    setToken(null)
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
