import { Alert } from './alert'
import { api, ApiError } from './api'

/**
 * Confirms, then permanently deletes the signed-in account (required by Google Play).
 * `onDeleted` runs after the server has deleted it — callers sign out and leave the screen.
 * The server refuses while bookings are in progress or earnings are unpaid; its message is shown as-is.
 */
export function confirmDeleteAccount(onDeleted: () => Promise<void> | void) {
  Alert.alert(
    'Delete your account?',
    'This permanently deletes your profile, saved cards, addresses and marketplace listings. Booking records are kept for legal and tax reasons. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.auth.deleteAccount()
            await onDeleted()
          } catch (e) {
            const message = e instanceof ApiError && e.status !== 0
              ? e.message
              : 'Check your connection and try again.'
            Alert.alert('Could not delete account', message)
          }
        },
      },
    ],
  )
}
