import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'

const BANKS = [
  'ABSA', 'FNB', 'Nedbank', 'Standard Bank', 'Capitec', 'African Bank',
  'Investec', 'TymeBank', 'Discovery Bank', 'Old Mutual', 'Bidvest',
]

const ACCOUNT_TYPES = ['Cheque / Current', 'Savings', 'Transmission']

export default function BankAccountScreen() {
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName,      setBankName]      = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [branchCode,    setBranchCode]    = useState('')
  const [accountType,   setAccountType]   = useState('cheque')
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [showBanks,     setShowBanks]     = useState(false)

  useEffect(() => {
    api.auth.getBankAccount()
      .then(b => {
        if (b) {
          setAccountHolder(b.accountHolder)
          setBankName(b.bankName)
          setAccountNumber(b.accountNumber)
          setBranchCode(b.branchCode)
          setAccountType(b.accountType)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!accountHolder.trim() || !bankName || !accountNumber.trim() || !branchCode.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    setSaving(true)
    try {
      await api.auth.saveBankAccount({ accountHolder: accountHolder.trim(), bankName, accountNumber: accountNumber.trim(), branchCode: branchCode.trim(), accountType })
      Alert.alert('Saved', 'Bank account details saved successfully.', [{ text: 'OK', onPress: () => router.back() }])
    } catch { Alert.alert('Error', 'Could not save bank details. Please try again.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Bank Account</Text>
      </View>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Bank Account</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          <View style={s.infoBox}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.gold} />
            <Text style={s.infoText}>Your details are encrypted and only used for Peach Payments withdrawals.</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Account details</Text>

            <View style={s.fieldGroup}>
              <View style={s.field}>
                <Text style={s.label}>Account holder name</Text>
                <TextInput
                  style={s.input} value={accountHolder} onChangeText={setAccountHolder}
                  placeholder="As it appears on your bank card"
                  placeholderTextColor={colors.gray400} autoCapitalize="words"
                />
              </View>

              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.label}>Bank</Text>
                <TouchableOpacity style={s.picker} onPress={() => setShowBanks(p => !p)}>
                  <Text style={[s.pickerText, !bankName && s.pickerPlaceholder]}>
                    {bankName || 'Select your bank'}
                  </Text>
                  <Ionicons name={showBanks ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray400} />
                </TouchableOpacity>
                {showBanks && (
                  <View style={s.dropdown}>
                    {BANKS.map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[s.dropdownItem, b === bankName && s.dropdownItemActive]}
                        onPress={() => { setBankName(b); setShowBanks(false) }}
                      >
                        <Text style={[s.dropdownText, b === bankName && s.dropdownTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.label}>Account number</Text>
                <TextInput
                  style={s.input} value={accountNumber} onChangeText={setAccountNumber}
                  placeholder="e.g. 62012345678"
                  placeholderTextColor={colors.gray400} keyboardType="number-pad"
                />
              </View>

              <View style={[s.field, s.fieldBorder]}>
                <Text style={s.label}>Branch code</Text>
                <TextInput
                  style={s.input} value={branchCode} onChangeText={setBranchCode}
                  placeholder="e.g. 632005"
                  placeholderTextColor={colors.gray400} keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Account type</Text>
            <View style={s.typeRow}>
              {ACCOUNT_TYPES.map((t, i) => {
                const val = t.toLowerCase().split(' ')[0]
                const active = accountType === val
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.typeBtn, active && s.typeBtnActive]}
                    onPress={() => setAccountType(val)}
                  >
                    <Text style={[s.typeBtnText, active && s.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.black} /> : <Text style={s.saveBtnText}>Save bank details</Text>}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.gray50 },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:            { padding: 2 },
  title:              { fontSize: 18, fontWeight: '700', color: colors.white },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:               { padding: 16, gap: 16 },

  infoBox:            { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.gold + '15', borderRadius: 12, padding: 14 },
  infoText:           { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 18 },

  section:            { gap: 10 },
  sectionTitle:       { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, textTransform: 'uppercase' },

  fieldGroup:         { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 },
  field:              { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder:        { borderTopWidth: 1, borderTopColor: colors.gray100 },
  label:              { fontSize: 11, fontWeight: '600', color: colors.gray400, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:              { fontSize: 15, color: colors.black },

  picker:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText:         { fontSize: 15, color: colors.black },
  pickerPlaceholder:  { color: colors.gray400 },
  dropdown:           { marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  dropdownItem:       { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  dropdownItemActive: { backgroundColor: colors.gold + '15' },
  dropdownText:       { fontSize: 14, color: colors.black },
  dropdownTextActive: { color: colors.gold, fontWeight: '700' },

  typeRow:            { flexDirection: 'row', gap: 8 },
  typeBtn:            { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', borderWidth: 1, borderColor: colors.gray100 },
  typeBtnActive:      { backgroundColor: colors.black, borderColor: colors.black },
  typeBtnText:        { fontSize: 11, fontWeight: '600', color: colors.gray400 },
  typeBtnTextActive:  { color: colors.white },

  saveBtn:            { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:        { fontSize: 15, fontWeight: '700', color: colors.black },
})
