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
    } catch (e: any) {
      setError('Incorrect phone number or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.container}>
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoIcon}><Text style={s.logoEmoji}>🏠</Text></View>
            <Text style={s.logoText}>Home Solutions</Text>
          </View>

          <Text style={s.title}>Welcome back</Text>
          <Text style={s.sub}>Sign in to continue</Text>

          <View style={s.form}>
            <Text style={s.label}>Phone number</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+27 82 123 4567"
              placeholderTextColor={colors.textLight}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={colors.navy} />
                : <Text style={s.btnText}>Sign in</Text>}
            </TouchableOpacity>

            {/* Quick test logins */}
            <View style={s.quickRow}>
              <Text style={s.quickLabel}>Test accounts:</Text>
              <TouchableOpacity onPress={() => { setPhone('+27821234567'); setPassword('pass123') }}>
                <Text style={s.quickBtn}>Client</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setPhone('+27831234567'); setPassword('pass123') }}>
                <Text style={s.quickBtn}>Provider</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={s.footerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.navy },
  container:  { flex: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoIcon:   { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:  { fontSize: 16 },
  logoText:   { fontSize: 17, fontWeight: '600', color: '#fff' },
  title:      { fontSize: 28, fontWeight: '300', color: '#fff', marginBottom: 4 },
  sub:        { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 32 },
  form:       { gap: 6 },
  label:      { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  input:      { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  error:      { color: '#FF6B6B', fontSize: 13, marginTop: 8 },
  btn:        { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText:    { fontSize: 15, fontWeight: '600', color: colors.navy },
  quickRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, justifyContent: 'center' },
  quickLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  quickBtn:   { fontSize: 12, color: colors.gold, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.gold + '40', borderRadius: 6 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 20 },
  footerText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  footerLink: { fontSize: 14, color: colors.gold, fontWeight: '600' },
})
