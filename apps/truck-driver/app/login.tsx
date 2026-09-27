import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { Button } from '../components/ui'
import { colors } from '../lib/theme'

export default function Login() {
  const { signIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    try {
      await signIn(phone, password)
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? 'Wrong phone number or password' : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        <Text style={s.title}>Truck Loads</Text>
        <Text style={s.subtitle}>Sign in with the phone number your dispatcher has on your truck.</Text>
        <View style={s.form}>
          <TextInput
            style={s.input} placeholder="Phone" placeholderTextColor={colors.faint}
            keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
            value={phone} onChangeText={setPhone}
          />
          <TextInput
            style={s.input} placeholder="Password" placeholderTextColor={colors.faint}
            secureTextEntry autoComplete="password" textContentType="password"
            value={password} onChangeText={setPassword} onSubmitEditing={submit}
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Button title="Sign in" onPress={submit} busy={busy} disabled={!phone || !password} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 28 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, color: colors.text,
  },
  error: { color: colors.red, fontSize: 14 },
})
