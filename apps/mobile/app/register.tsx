import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '../context/auth'
import { colors } from '../constants/theme'

type Role = 'client' | 'provider'

export default function RegisterScreen() {
  const { register } = useAuth()
  const [phone,    setPhone]    = useState('+27')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [role,     setRole]     = useState<Role>('client')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleRegister = async () => {
    if (!phone || !password) { setError('Please fill in all fields'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    try {
      const user = await register(phone.trim(), password, role)
      router.replace(user.role === 'provider' ? '/(provider)' : '/(client)')
    } catch (e: any) {
      setError('Phone number already registered')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoIcon}><Text style={s.logoEmoji}>🏠</Text></View>
            <Text style={s.logoText}>Home Solutions</Text>
          </View>

          <Text style={s.title}>Create account</Text>
          <Text style={s.sub}>Get started in minutes</Text>

          {/* Role picker */}
          <View style={s.roleRow}>
            {([
              { key: 'client',   label: 'I need a service', emoji: '🏠' },
              { key: 'provider', label: "I'm a tradesperson", emoji: '🔧' },
            ] as { key: Role; label: string; emoji: string }[]).map(r => (
              <TouchableOpacity
                key={r.key}
                style={[s.roleCard, role === r.key && s.roleCardSel]}
                onPress={() => setRole(r.key)}
              >
                <Text style={s.roleEmoji}>{r.emoji}</Text>
                <Text style={[s.roleLabel, role === r.key && s.roleLabelSel]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.textLight}
            />

            <Text style={s.label}>Confirm password</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repeat password"
              placeholderTextColor={colors.textLight}
              onSubmitEditing={handleRegister}
              returnKeyType="done"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={colors.navy} />
                : <Text style={s.btnText}>Create account</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  container:    { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 32 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoIcon:     { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:    { fontSize: 16 },
  logoText:     { fontSize: 17, fontWeight: '600', color: '#fff' },
  title:        { fontSize: 28, fontWeight: '300', color: '#fff', marginBottom: 4 },
  sub:          { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 24 },
  roleRow:      { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleCard:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  roleCardSel:  { borderColor: colors.gold, backgroundColor: 'rgba(200,146,42,0.12)' },
  roleEmoji:    { fontSize: 24 },
  roleLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  roleLabelSel: { color: colors.gold, fontWeight: '600' },
  form:         { gap: 6 },
  label:        { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  input:        { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  error:        { color: '#FF6B6B', fontSize: 13, marginTop: 8 },
  btn:          { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText:      { fontSize: 15, fontWeight: '600', color: colors.navy },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText:   { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  footerLink:   { fontSize: 14, color: colors.gold, fontWeight: '600' },
})
