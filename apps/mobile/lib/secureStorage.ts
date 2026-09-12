/**
 * Cross-platform key/value storage for auth persistence.
 *
 * expo-secure-store has no web implementation (its ExpoSecureStore.web.js
 * module is an empty stub), so calling it on web throws and was being
 * mis-surfaced by callers as "Incorrect phone number or password" after a
 * perfectly successful login. Native platforms keep using the real Keychain/
 * Keystore-backed SecureStore; web falls back to localStorage, which is not
 * as secure but keeps the web build usable.
 */
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return window.localStorage.getItem(key) } catch { return null }
  }
  return SecureStore.getItemAsync(key)
}

async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.setItem(key, value) } catch {}
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.removeItem(key) } catch {}
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export const secureStorage = { getItemAsync, setItemAsync, deleteItemAsync }
