/**
 * SA ID verification gate for Marketplace listings.
 * Validates the 13-digit SA ID number client-side (format + Luhn + age ≥ 18)
 * before sending to the server. The ID number itself is never stored — only
 * the verified flag and timestamp.
 */
import { useState } from 'react'
import { Linking } from 'react-native'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'

// ─── SA ID validation ─────────────────────────────────────────────────────────

/** Extract the DoB embedded in an SA ID and return age in years, or null if invalid format. */
function parseSaId(id: string): { valid: boolean; age: number | null; error: string | null } {
  const digits = id.replace(/\s/g, '')

  if (!/^\d{13}$/.test(digits)) {
    return { valid: false, age: null, error: 'Must be exactly 13 digits' }
  }

  // Date of birth: positions 0-5 → YYMMDD
  const yy  = parseInt(digits.slice(0, 2), 10)
  const mm  = parseInt(digits.slice(2, 4), 10)
  const dd  = parseInt(digits.slice(4, 6), 10)

  // Century heuristic: if YY ≤ current 2-digit year, treat as 2000s; else 1900s
  const currentYY = new Date().getFullYear() % 100
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy

  const dob = new Date(year, mm - 1, dd)

  if (
    isNaN(dob.getTime()) ||
    dob.getMonth() !== mm - 1 ||   // catches invalid dates like 31 Feb
    mm < 1 || mm > 12 ||
    dd < 1 || dd > 31
  ) {
    return { valid: false, age: null, error: 'ID contains an invalid date of birth' }
  }

  // Gender digit: position 6 (0–4 = female, 5–9 = male) — valid either way
  // SA citizen / resident: position 10 (0 = SA, 1 = permanent resident)
  // Race digit: position 11 — legacy, always present

  // Luhn check (mod-10) on all 13 digits
  let sum = 0
  for (let i = 0; i < 13; i++) {
    let d = parseInt(digits[i], 10)
    if (i % 2 !== 0) {          // odd positions (0-indexed) → double
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  if (sum % 10 !== 0) {
    return { valid: false, age: null, error: 'ID number is not valid (checksum failed)' }
  }

  // Age
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--

  return { valid: true, age, error: null }
}

function formatIdInput(raw: string) {
  // Strip non-digits and cap at 13
  return raw.replace(/\D/g, '').slice(0, 13)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyIdScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()

  const [idNumber,   setIdNumber]   = useState('')
  const [checked,    setChecked]    = useState(false) // age consent checkbox
  const [submitting, setSubmitting] = useState(false)

  const parsed    = idNumber.length === 13 ? parseSaId(idNumber) : null
  const ageOk     = parsed?.valid && (parsed.age ?? 0) >= 18
  const tooYoung  = parsed?.valid && (parsed.age ?? 0) < 18
  const hasError  = idNumber.length === 13 && parsed && !parsed.valid
  const canSubmit = ageOk && checked && !submitting

  const handleChange = (text: string) => {
    setIdNumber(formatIdInput(text))
  }

  const handleSubmit = async () => {
    if (!canSubmit || !parsed) return
    setSubmitting(true)
    try {
      await api.auth.verifyId(idNumber)
      Alert.alert(
        '✅ Identity verified',
        `Welcome! Your ID has been verified (age ${parsed.age}).`,
        [{
          text: 'Continue',
          onPress: () => {
            if (returnTo) router.replace(returnTo as any)
            else          router.back()
          },
        }]
      )
    } catch {
      Alert.alert('Verification failed', 'We could not verify your ID at this time. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Derive status colour for the ID input border
  const inputBorderColor = idNumber.length === 0
    ? colors.gray200
    : hasError || tooYoung
      ? colors.red
      : ageOk
        ? colors.green
        : colors.gray200

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Identity verification</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={s.heroCard}>
            <View style={s.heroIconWrap}>
              <Ionicons name="shield-checkmark" size={36} color={colors.gold} />
            </View>
            <Text style={s.heroTitle}>Verify your identity</Text>
            <Text style={s.heroSub}>
              All Marketplace sellers must be verified South African residents aged 18 or older.
              Your ID number is used only to confirm your age and is never stored.
            </Text>
          </View>

          {/* ID number input */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>SOUTH AFRICAN ID NUMBER</Text>
            <View style={[s.inputWrap, { borderColor: inputBorderColor }]}>
              <Ionicons
                name={ageOk ? 'checkmark-circle' : hasError || tooYoung ? 'close-circle' : 'card-outline'}
                size={20}
                color={ageOk ? colors.green : hasError || tooYoung ? colors.red : colors.gray400}
              />
              <TextInput
                style={s.input}
                value={idNumber}
                onChangeText={handleChange}
                placeholder="0000000000000"
                placeholderTextColor={colors.gray300}
                keyboardType="numeric"
                maxLength={13}
                autoCorrect={false}
              />
              <Text style={s.digitCount}>{idNumber.length}/13</Text>
            </View>

            {/* Inline feedback */}
            {idNumber.length === 13 && (
              <View style={[s.feedback, { backgroundColor: ageOk ? colors.greenBg : colors.redBg }]}>
                <Ionicons
                  name={ageOk ? 'checkmark-circle-outline' : 'warning-outline'}
                  size={15}
                  color={ageOk ? colors.green : colors.red}
                />
                <Text style={[s.feedbackText, { color: ageOk ? colors.green : colors.red }]}>
                  {tooYoung
                    ? `You must be at least 18 to use the Marketplace (age ${parsed?.age})`
                    : hasError
                      ? parsed?.error ?? 'Invalid ID number'
                      : `Verified — age ${parsed?.age}`
                  }
                </Text>
              </View>
            )}
          </View>

          {/* What we check */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>WHAT WE CHECK</Text>
            {[
              { icon: 'calendar-outline', text: 'Date of birth (embedded in your ID number)' },
              { icon: 'checkmark-done-outline', text: 'Valid 13-digit SA ID format' },
              { icon: 'lock-closed-outline', text: 'Your ID number is not stored on our servers' },
            ].map((row, i) => (
              <View key={i} style={s.checkRow}>
                <Ionicons name={row.icon as any} size={16} color={colors.gray400} />
                <Text style={s.checkText}>{row.text}</Text>
              </View>
            ))}
          </View>

          {/* Age consent checkbox */}
          <TouchableOpacity style={s.consentRow} onPress={() => setChecked(c => !c)} activeOpacity={0.7}>
            <View style={[s.checkbox, checked && s.checkboxOn]}>
              {checked && <Ionicons name="checkmark" size={13} color={colors.white} />}
            </View>
            <Text style={s.consentText}>
              I confirm that I am 18 years of age or older and that the ID number entered belongs to me.
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity activeOpacity={0.8}
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting
              ? <ActivityIndicator color={colors.black} />
              : <>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.black} />
                  <Text style={s.submitBtnText}>Verify &amp; continue</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={s.legalNote}>
            Easyfix uses your ID only to confirm your age. We comply with POPIA and do not share your information with third parties.{' '}
            <Text style={{ color: colors.brand, fontWeight: '600' }} onPress={() => Linking.openURL('https://easyfix.co.za/privacy')}>Privacy Policy →</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.gray50 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:          { padding: 2 },
  headerTitle:      { fontSize: 17, fontWeight: '700', color: colors.white },

  body:             { padding: 16, paddingBottom: 40 },

  heroCard:         { backgroundColor: colors.black, borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroIconWrap:     { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.gold + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle:        { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: 10 },
  heroSub:          { fontSize: 13, color: colors.gray400, textAlign: 'center', lineHeight: 20 },

  card:             { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 14 },
  fieldLabel:       { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 12 },

  inputWrap:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input:            { flex: 1, fontSize: 22, fontWeight: '600', color: colors.black, letterSpacing: 2 },
  digitCount:       { fontSize: 11, color: colors.gray400, fontWeight: '600' },

  feedback:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginTop: 12 },
  feedbackText:     { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  checkRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkText:        { flex: 1, fontSize: 13, color: colors.gray600, lineHeight: 18 },

  consentRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxOn:       { backgroundColor: colors.black, borderColor: colors.black },
  consentText:      { flex: 1, fontSize: 13, color: colors.gray600, lineHeight: 20 },

  submitBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.gold, borderRadius: 14, padding: 18, marginBottom: 14 },
  submitBtnDisabled:{ opacity: 0.4 },
  submitBtnText:    { fontSize: 16, fontWeight: '700', color: colors.black },

  legalNote:        { fontSize: 11, color: colors.gray400, textAlign: 'center', lineHeight: 17, paddingHorizontal: 10 },
})
