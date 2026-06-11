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
type Step = 1 | 2 | 3

const KZN_AREAS = [
  // KZN
  'Durban CBD', 'Umhlanga', 'Ballito', 'Glenwood', 'Westville', 'Hillcrest', 'Pinetown',
  // Gauteng
  'Johannesburg', 'Sandton', 'Randburg', 'Roodepoort', 'Soweto',
  'Pretoria', 'Centurion', 'Midrand', 'Fourways',
  // Cape Town
  'Cape Town CBD', 'Bellville', 'Brackenfell', 'Claremont', 'Constantia',
  'Paarl', 'Stellenbosch', 'Somerset West', 'Strand',
  // Other metros
  'Port Elizabeth', 'East London', 'Bloemfontein', 'Nelspruit', 'Polokwane',
]

export default function RegisterScreen() {
  const { register } = useAuth()
  const [step,    setStep]    = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [role, setRole] = useState<Role>('client')

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('+27')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')

  const [companyName,         setCompanyName]         = useState('')
  const [companyRegistration, setCompanyRegistration] = useState('')
  const [vatNumber,           setVatNumber]           = useState('')
  const [serviceArea,         setServiceArea]         = useState('')

  const validateStep2 = () => {
    if (!firstName.trim())   return 'First name is required'
    if (!lastName.trim())    return 'Last name is required'
    if (!email.includes('@')) return 'Enter a valid email address'
    if (phone.length < 10)   return 'Enter a valid phone number'
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
        phone: phone.trim(), email: email.trim().toLowerCase(), password,
        firstName: firstName.trim(), lastName: lastName.trim(), role,
        companyName: companyName.trim() || undefined,
        companyRegistration: companyRegistration.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        serviceArea: serviceArea || undefined,
      })
      router.replace(user.role === 'provider' ? '/(provider)' : '/(client)')
    } catch (e: any) {
      setError(
        e.message?.includes('Phone') ? 'Phone number already registered' :
        e.message?.includes('Email') ? 'Email already registered' :
        'Registration failed — please try again'
      )
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
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

          <View style={s.logoMark}>
            <Text style={s.logoText}>EF</Text>
          </View>

          {/* ── STEP 1: Role ── */}
          {step === 1 && (
            <>
              <Text style={s.title}>Create account</Text>
              <Text style={s.sub}>How will you use Easy-Fix?</Text>
              <View style={s.roleRow}>
                {([
                  { key: 'client',   label: 'I need a service',  desc: 'Book vetted tradespeople' },
                  { key: 'provider', label: "I'm a tradesperson", desc: 'Earn by completing jobs'  },
                ] as { key: Role; label: string; desc: string }[]).map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[s.roleCard, role === r.key && s.roleCardSel]}
                    onPress={() => setRole(r.key)}
                  >
                    <Text style={[s.roleLabel, role === r.key && s.roleLabelSel]}>{r.label}</Text>
                    <Text style={[s.roleDesc, role === r.key && s.roleDescSel]}>{r.desc}</Text>
                    {role === r.key && <View style={s.roleDot} />}
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
                    placeholder="Priya" placeholderTextColor={colors.gray400} autoComplete="given-name" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Last name</Text>
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName}
                    placeholder="Govender" placeholderTextColor={colors.gray400} autoComplete="family-name" />
                </View>
              </View>

              <Text style={[s.label, { marginTop: 14 }]}>Email address</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail}
                placeholder="priya@email.com" placeholderTextColor={colors.gray400}
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

              <Text style={[s.label, { marginTop: 14 }]}>Phone number</Text>
              <TextInput style={s.input} value={phone} onChangeText={setPhone}
                placeholder="+27 82 123 4567" placeholderTextColor={colors.gray400}
                keyboardType="phone-pad" autoComplete="tel" />

              <Text style={[s.label, { marginTop: 14 }]}>Password</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword}
                placeholder="Min. 6 characters" placeholderTextColor={colors.gray400}
                secureTextEntry autoComplete="new-password" />

              <Text style={[s.label, { marginTop: 14 }]}>Confirm password</Text>
              <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
                placeholder="Repeat password" placeholderTextColor={colors.gray400}
                secureTextEntry returnKeyType="done" onSubmitEditing={handleNext} />
            </>
          )}

          {/* ── STEP 3: Provider business info ── */}
          {step === 3 && (
            <>
              <Text style={s.title}>Business details</Text>
              <Text style={s.sub}>Step 2 of 2 · VAT number is optional</Text>

              <Text style={s.label}>Company / trading name</Text>
              <TextInput style={s.input} value={companyName} onChangeText={setCompanyName}
                placeholder="Pillay Plumbing Services" placeholderTextColor={colors.gray400} />

              <Text style={[s.label, { marginTop: 14 }]}>Company registration number</Text>
              <TextInput style={s.input} value={companyRegistration} onChangeText={setCompanyRegistration}
                placeholder="e.g. 2023/123456/07" placeholderTextColor={colors.gray400}
                autoCapitalize="characters" />

              <Text style={[s.label, { marginTop: 14 }]}>VAT number <Text style={s.optional}>(optional)</Text></Text>
              <TextInput style={s.input} value={vatNumber} onChangeText={setVatNumber}
                placeholder="e.g. 4123456789" placeholderTextColor={colors.gray400}
                keyboardType="numeric" />

              <Text style={[s.label, { marginTop: 14 }]}>Primary service area</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 4 }}>
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
              {serviceArea ? <Text style={s.areaSelected}>— {serviceArea}</Text> : null}
            </>
          )}

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleNext} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
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
                <Text style={s.footerLink}>Sign in →</Text>
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
  safe:            { flex: 1, backgroundColor: colors.white },
  progressTrack:   { height: 3, backgroundColor: colors.gray100 },
  progressFill:    { height: 3, backgroundColor: colors.gold },
  container:       { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },
  logoMark:        { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoText:        { fontSize: 14, fontWeight: '700', color: colors.gold, letterSpacing: 1 },
  title:           { fontSize: 28, fontWeight: '700', color: colors.black, letterSpacing: -0.5, marginBottom: 4 },
  sub:             { fontSize: 14, color: colors.gray400, marginBottom: 24 },
  roleRow:         { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard:        { flex: 1, backgroundColor: colors.gray50, borderWidth: 1.5, borderColor: colors.gray100, borderRadius: 12, padding: 16, gap: 6 },
  roleCardSel:     { borderColor: colors.black, backgroundColor: colors.white },
  roleLabel:       { fontSize: 13, fontWeight: '600', color: colors.gray400 },
  roleLabelSel:    { color: colors.black },
  roleDesc:        { fontSize: 11, color: colors.gray400, lineHeight: 16 },
  roleDescSel:     { color: colors.gray600 },
  roleDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 4 },
  row:             { flexDirection: 'row', gap: 10 },
  label:           { fontSize: 11, fontWeight: '600', color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  optional:        { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input:           { backgroundColor: colors.gray50, borderRadius: 10, padding: 14, fontSize: 15, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  areaChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50, marginRight: 8 },
  areaChipSel:     { borderColor: colors.black, backgroundColor: colors.black },
  areaChipText:    { fontSize: 13, color: colors.gray600 },
  areaChipTextSel: { color: colors.white, fontWeight: '600' },
  areaSelected:    { fontSize: 12, color: colors.gray600, marginTop: 8, fontWeight: '500' },
  error:           { color: colors.red, fontSize: 13, marginTop: 12 },
  btn:             { backgroundColor: colors.black, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 24 },
  btnText:         { fontSize: 15, fontWeight: '600', color: colors.white },
  back:            { alignItems: 'center', padding: 14 },
  backText:        { fontSize: 14, color: colors.gray400 },
  footer:          { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText:      { fontSize: 14, color: colors.gray400 },
  footerLink:      { fontSize: 14, color: colors.black, fontWeight: '600' },
})
