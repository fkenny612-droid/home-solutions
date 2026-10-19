import { Alert } from './alert'
import { api, ApiError } from './api'

/**
 * Confirms, then blocks a user. `onBlocked` runs once the server has recorded it (callers usually leave the screen).
 * Blocking hides you and them from each other in chat, the marketplace and provider search. It does not cancel or
 * refund a booking that is already underway.
 */
export function confirmBlock(user: { id: string; name: string }, onBlocked?: () => void) {
  Alert.alert(
    `Block ${user.name}?`,
    'You will no longer see each other in chat, the marketplace or provider search, and they will not be able to message you. You can unblock them any time from Profile → Blocked users. A booking already in progress is not cancelled.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.blocks.block(user.id)
            onBlocked?.()
            Alert.alert('User blocked', `${user.name} has been blocked.`)
          } catch (e) {
            const message = e instanceof ApiError && e.status !== 0 ? e.message : 'Check your connection and try again.'
            Alert.alert('Could not block', message)
          }
        },
      },
    ],
  )
}
