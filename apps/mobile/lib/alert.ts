/**
 * Cross-platform Alert.
 *
 * react-native-web ships Alert.alert() as a no-op stub (see
 * react-native-web/dist/exports/Alert), so on the web build every call to
 * RN's Alert.alert — error messages, destructive-action confirmations like
 * "Remove this address?" — silently did nothing: no message shown, and for
 * multi-button alerts, the confirm button's onPress (often the actual delete
 * / submit action) never ran. Native platforms keep using the real Alert;
 * web falls back to window.alert/confirm so the same call sites work.
 */
import { Alert as RNAlert, Platform } from 'react-native'

export interface AlertButton {
  text?: string
  onPress?: () => void
  style?: 'default' | 'cancel' | 'destructive'
}

function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons as any)
    return
  }

  const text = [title, message].filter(Boolean).join('\n\n')

  if (!buttons || buttons.length === 0) {
    window.alert(text)
    return
  }
  if (buttons.length === 1) {
    window.alert(text)
    buttons[0].onPress?.()
    return
  }

  const cancelBtn  = buttons.find(b => b.style === 'cancel')
  const confirmBtn = buttons.find(b => b !== cancelBtn) ?? buttons[buttons.length - 1]

  if (window.confirm(text)) {
    confirmBtn.onPress?.()
  } else {
    cancelBtn?.onPress?.()
  }
}

export const Alert = { alert }
