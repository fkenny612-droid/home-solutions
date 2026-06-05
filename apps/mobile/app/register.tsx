import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '../context/auth'
import { colors } from '../constants/theme'

type Role = 'client' | 'provider'
type Step = 1 | 2 | 3  // 1=role, 2=personal, 3=business (provider only)

const KZN_AREAS = [
  'Durban CBD', 'Umhlanga', 'Ballito', 'Glenwood', 'Berea',
  'Morningside', 'Westville', 'Pinetown', 'Hillcrest', 'Kloof',
  'La Lucia', 'Musgrave', 'Overport', 'Phoenix', 'Umlazi',
]

export default function RegisterScreen() {
  const { register } = useAuth()
  const [step,    setStep]    = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Step 1
  const [role, setRole] = useState<Role>('client')

  // Step 2 — personal info
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('+27')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')

  // Step 3 — provider business info
  const [companyName,         setCompanyName]         = useState('')
  const [companyRegistration, setCompanyRegistration] = useState('')
  const [vatNumber,           setVatNumber]           = useState('')
  const [serviceArea,         setServiceArea]         = useState('')

  const validateStep2 = () => {
    if (!firstName.trim())  return 'First name is required'
    if (!lastName.trim())   return 'Last name is required'
    if (!email.includes('@')) return 'Enter a valid email address'
    if (phone.length < 10)  return 'Enter a valid phone number'
    if (password.length < 6) return 'Password must be at least 6 characters'
    if (password !== confirm) return 'Passwords do not match'
    return null
  }

  const validateStep3 = () => {
    if (!companyName.trim())         return 'Company name is required'
    if (!companyRegistration.trim()) return 'Company registration number is required'
    if (!serviceArea)                return 'Select your primary service area'
    return null
  }

  const handleNext = () => {
    setError('')
    if (step === 1) { setStep(2); return }
    if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
      if (role === 'provider') { setStep(3); return }
      handleSubmit()
    }
    if (step === 3) {
      const err = validateStep3()
      if (err) { setError(err); return }
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const user = await register({
        phone:               phone.trim(),
        email:               email.trim().toLowerCase(),
        password,
        firstName:           firstName.trim(),
        lastName:            lastName.trim(),
        role,
        companyName:         companyName.trim() || undefined,
        companyRegistration: companyRegistration.trim() || undefined,
        vatNumber:           vatNumber.trim() || undefined,
        serviceArea:         serviceArea || undefined,
      })
      router.replace(user.role === 'provider' ? '/(provider)' : '/(client)')
    } catch (e: any) {
      setError(e.message?.includes('Phone') ? 'Phone number already registered' :
               e.message?.includes('Email') ? 'Email already registered' :
               'Registration failed — please try again')
      if (role === 'provider') setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const progress = step === 1 ? 0.33 : step === 2 ? 0.66 : 1

  return (
    <SafeAreaView style={s.safe}>
      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoIcon}><Text style={s.logoEmoji}>🏠</Text></View>
            <Text style={s.logoText}>Home Solutions</Text>
          </View>

          {/* ── STEP 1: Role ── */}
          {step === 1 && (
            <>
              <Text style={s.title}>Create account</Text>
              <Text style={s.sub}>How will you use Home Solutions?</Text>
              <View style={s.roleRow}>
                {([
                  { key: 'client',   label: 'I need a service',   emoji: '🏠', desc: 'Book vetted tradespeople' },
                  { key: 'provider', label: "I'm a tradesperson",  emoji: '🔧', desc: 'Earn by completing jobs' },
                ] as { key: Role; label: string; emoji: string; desc: string }[]).map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[s.roleCard, role === r.key && s.roleCardSel]}
                    onPress={() => setRole(r.key)}
                  >
                    <Text style={s.roleEmoji}>{r.emoji}</Text>
                    <Text style={[s.roleLabel, role === r.key && s.roleLabelSel]}>{r.label}</Text>
                    <Text style={[s.roleDesc, role === r.key && s.roleDescSel]}>{r.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── STEP 2: Personal info ── */}
          {step === 2 && (
            <>
              <Text style={s.title}>Personal details</Text>
              <Text style={s.sub}>{role === 'provider' ? 'Step 1 of 2' : 'Almost there'}</Text>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>First name</Text>
                  <TextInput style={s.input} value={firstName} onChangeText={setFirstName}
                    placeholder="Priya" placeholderTextColor={colors.textLight} autoComplete="given-name" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Last name</Text>
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName}
                    placeholder="Govender" placeholderTextColor={colors.textLight} autoComplete="family-name" />
                </View>
              </View>

              <Text style={s.label}>Email address</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail}
                placeholder="priya@email.com" placeholderTextColor={colors.textLight}
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

              <Text style={s.label}>Phone number</Text>
              <TextInput style={s.input} value={phone} onChangeText={setPhone}
                placeholder="+27 82 123 4567" placeholderTextColor={colors.textLight}
                keyboardType="phone-pad" autoComplete="tel" />

              <Text style={s.label}>Password</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword}
                placeholder="Min. 6 characters" placeholderTextColor={colors.textLight}
                secureTextEntry autoComplete="new-password" />

              <Text style={s.label}>Confirm password</Text>
              <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
                placeholder="Repeat password" placeholderTextColor={colors.textLight}
                secureTextEntry returnKeyType="done" onSubmitEditing={handleNext} />
            </>
          )}

          {/* ── STEP 3: Provider business info ── */}
          {step === 3 && (
            <>
              <Text style={s.title}>Business details</Text>
              <Text style={s.sub}>Step 2 of 2 · All fields required except VAT</Text>

              <Text style={s.label}>Company / trading name</Text>
              <TextInput style={s.input} value={companyName} onChangeText={setCompanyName}
                placeholder="Pillay Plumbing Services" placeholderTextColor={colors.textLight} />

              <Text style={s.label}>Company registration number</Text>
              <TextInput style={s.input} value={companyRegistration} onChangeText={setCompanyRegistration}
                placeholder="e.g. 2023/123456/07" placeholderTextColor={colors.textLight}
                autoCapitalize="characters" />

              <Text style={s.label}>VAT number <Text style={s.optional}>(optional)</Text></Text>
              <TextInput style={s.input} value={vatNumber} onChangeText={setVatNumber}
                placeholder="e.g. 4123456789" placeholderTextColor={colors.textLight}
                keyboardType="numeric" />

              <Text style={s.label}>Primary service area</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.areaScroll}>
                {KZN_AREAS.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[s.areaChip, serviceArea === area && s.areaChipSel]}
                    onPress={() => setServiceArea(area)}
                  >
                    <Text style={[s.areaChipText, serviceArea === area && s.areaChipTextSel]}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {serviceArea ? <Text style={s.areaSelected}>📍 {serviceArea}</Text> : null}
            </>
          )}

          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* CTA */}
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleNext} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.navy} />
              : <Text style={s.btnText}>
                  {step === 1 ? 'Continue' :
                   step === 2 && role === 'provider' ? 'Next — Business details' :
                   'Create account'}
                </Text>}
          </TouchableOpacity>

          {step > 1 && (
            <TouchableOpacity style={s.back} onPress={() => { setError(''); setStep(s => (s - 1) as Step) }}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
          )}

          {step === 1 && (
            <View style={s.footer}>
              <Text style={s.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={s.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.navy },
  progressTrack:   { height: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  progressFill:    { height: 3, backgroundColor: colors.gold },
  container:       { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },
  logoRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon:        { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:       { fontSize: 16 },
  logoText:        { fontSize: 17, fontWeight: '600', color: '#fff' },
  title:           { fontSize: 26, fontWeight: '300', color: '#fff', marginBottom: 4 },
  sub:             { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24 },
  roleRow:         { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  roleCardSel:     { borderColor: colors.gold, backgroundColor: 'rgba(200,146,42,0.12)' },
  roleEmoji:       { fontSize: 28 },
  roleLabel:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  roleLabelSel:    { color: colors.gold },
  roleDesc:        { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  roleDescSel:     { color: 'rgba(200,146,42,0.7)' },
  row:             { flexDirection: 'row', gap: 10 },
  label:           { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  optional:        { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input:           { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 13, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  areaScroll:      { marginTop: 4, marginBottom: 4 },
  areaChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 },
  areaChipSel:     { borderColor: colors.gold, backgroundColor: 'rgba(200,146,42,0.15)' },
  areaChipText:    { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  areaChipTextSel: { color: colors.gold, fontWeight: '600' },
  areaSelected:    { fontSize: 12, color: colors.gold, marginTop: 8 },
  error:           { color: '#FF6B6B', fontSize: 13, marginTop: 12, textAlign: 'center' },
  btn:             { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText:         { fontSize: 15, fontWeight: '600', color: colors.navy },
  back:            { alignItems: 'center', padding: 14 },
  backText:        { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  footer:          { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText:      { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  footerLink:      { fontSize: 14, color: colors.gold, fontWeight: '600' },
})
