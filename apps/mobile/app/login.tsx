import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '../context/auth'
import { colors } from '../constants/theme'

export default function LoginScreen() {
  const { login } = useAuth()
  const [phone,    setPhone]    = useState('+27')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!phone || !password) { setError('Please fill in all fields'); return }
    setError('')
    setLoading(true)
    try {
      const user = await login(phone.trim(), password)
      router.replace(user.role === 'provider' ? '/(provider)' : '/(client)')
    } catch {
      setError('Incorrect phone number or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.container}>

          {/* Logo mark */}
          <View style={s.logoMark}>
            <Text style={s.logoText}>EF</Text>
          </View>

          <Text style={s.title}>Sign in</Text>
          <Text style={s.sub}>Easy-Fix · Nationwide South Africa</Text>

          <View style={s.form}>
            <Text style={s.label}>Phone number</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+27 82 123 4567"
              placeholderTextColor={colors.gray400}
            />

            <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={colors.gray400}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>Continue</Text>}
            </TouchableOpacity>

            {/* Quick test logins */}
            <View style={s.quickRow}>
              <Text style={s.quickLabel}>Test:</Text>
              <TouchableOpacity onPress={() => { setPhone('+27821234567'); setPassword('pass123') }}>
                <Text style={s.quickBtn}>Client</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setPhone('+27831234567'); setPassword('pass123') }}>
                <Text style={s.quickBtn}>Provider</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={s.footerLink}>Register →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.white },
  container:  { flex: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 24 },
  logoMark:   { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  logoText:   { fontSize: 13, fontWeight: '800', color: colors.gold, letterSpacing: 0.5 },
  title:      { fontSize: 32, fontWeight: '700', color: colors.black, letterSpacing: -0.5, marginBottom: 4 },
  sub:        { fontSize: 14, color: colors.gray400, marginBottom: 36 },
  form:       { gap: 4 },
  label:      { fontSize: 12, fontWeight: '600', color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input:      { backgroundColor: colors.gray50, borderRadius: 10, padding: 15, fontSize: 16, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  error:      { color: colors.red, fontSize: 13, marginTop: 10 },
  btn:        { backgroundColor: colors.black, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 24 },
  btnText:    { fontSize: 16, fontWeight: '600', color: colors.white },
  quickRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, justifyContent: 'center' },
  quickLabel: { fontSize: 12, color: colors.gray400 },
  quickBtn:   { fontSize: 12, color: colors.gray600, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.gray200, borderRadius: 6 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 20 },
  footerText: { fontSize: 14, color: colors.gray400 },
  footerLink: { fontSize: 14, color: colors.black, fontWeight: '600' },
})
