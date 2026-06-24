import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'

interface SavedCard {
  id: string
  brand: 'VISA' | 'MASTERCARD' | 'AMEX'
  last4: string
  expiry: string
  isDefault: boolean
}

const MOCK_CARDS: SavedCard[] = [
  { id: '1', brand: 'VISA', last4: '4242', expiry: '12/26', isDefault: true },
]

const BRAND_COLOR: Record<string, string> = {
  VISA: '#1A1F71',
  MASTERCARD: '#EB001B',
  AMEX: '#007BC1',
}

const BRAND_ICON: Record<string, string> = {
  VISA: 'VISA',
  MASTERCARD: 'MC',
  AMEX: 'AMEX',
}

function fmtNumber(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function fmtExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export default function PaymentMethodsScreen() {
  const [cards, setCards]       = useState<SavedCard[]>(MOCK_CARDS)
  const [adding, setAdding]     = useState(false)
  const [number, setNumber]     = useState('')
  const [holder, setHolder]     = useState('')
  const [expiry, setExpiry]     = useState('')
  const [cvv,    setCvv]        = useState('')
  const [saving, setSaving]     = useState(false)

  const detectedBrand = (): 'VISA' | 'MASTERCARD' | 'AMEX' | null => {
    const d = number.replace(/\s/g, '')
    if (d.startsWith('4')) return 'VISA'
    if (d.startsWith('5') || d.startsWith('2')) return 'MASTERCARD'
    if (d.startsWith('3')) return 'AMEX'
    return null
  }

  const handleAdd = async () => {
    const raw = number.replace(/\s/g, '')
    if (raw.length < 16) { Alert.alert('Invalid card', 'Please enter a valid 16-digit card number.'); return }
    if (!holder.trim())  { Alert.alert('Invalid card', 'Please enter the cardholder name.'); return }
    if (expiry.length < 5) { Alert.alert('Invalid card', 'Please enter a valid expiry (MM/YY).'); return }
    if (cvv.length < 3)   { Alert.alert('Invalid card', 'Please enter the CVV.'); return }

    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    const brand = detectedBrand() ?? 'VISA'
    const newCard: SavedCard = {
      id: Date.now().toString(),
      brand,
      last4: raw.slice(-4),
      expiry,
      isDefault: cards.length === 0,
    }
    setCards(prev => [...prev, newCard])
    setAdding(false)
    setNumber(''); setHolder(''); setExpiry(''); setCvv('')
    setSaving(false)
    Alert.alert('Card added', `${brand} •••• ${newCard.last4} has been saved.`)
  }

  const handleSetDefault = (id: string) => {
    setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === id })))
  }

  const handleDelete = (card: SavedCard) => {
    Alert.alert(
      'Remove card',
      `Remove ${card.brand} •••• ${card.last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => setCards(prev => prev.filter(c => c.id !== card.id)),
        },
      ]
    )
  }

  const brand = detectedBrand()

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Payment methods</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Saved cards */}
          {cards.map(card => (
            <View key={card.id} style={[s.cardChip, card.isDefault && s.cardChipDefault]}>
              <View style={[s.cardBrand, { backgroundColor: BRAND_COLOR[card.brand] }]}>
                <Text style={s.cardBrandText}>{BRAND_ICON[card.brand]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNum}>{card.brand} •••• {card.last4}</Text>
                <Text style={s.cardExp}>Expires {card.expiry}</Text>
              </View>
              {card.isDefault
                ? <View style={s.defaultBadge}><Text style={s.defaultText}>DEFAULT</Text></View>
                : (
                  <TouchableOpacity onPress={() => handleSetDefault(card.id)} style={s.setDefaultBtn}>
                    <Text style={s.setDefaultText}>Set default</Text>
                  </TouchableOpacity>
                )
              }
              <TouchableOpacity onPress={() => handleDelete(card)} style={s.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}

          {cards.length === 0 && !adding && (
            <View style={s.empty}>
              <Ionicons name="card-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>No cards saved</Text>
              <Text style={s.emptySub}>Add a card to pay for services quickly and securely.</Text>
            </View>
          )}

          {/* Add card form */}
          {adding ? (
            <View style={s.form}>
              <Text style={s.formTitle}>Add new card</Text>

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Card number</Text>
                <View style={s.fieldRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={colors.gray300}
                    value={number}
                    onChangeText={v => setNumber(fmtNumber(v))}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  {brand && (
                    <View style={[s.miniChip, { backgroundColor: BRAND_COLOR[brand] }]}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{BRAND_ICON[brand]}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Cardholder name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Name as on card"
                  placeholderTextColor={colors.gray300}
                  value={holder}
                  onChangeText={setHolder}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.row}>
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Expiry</Text>
                  <TextInput
                    style={s.input}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.gray300}
                    value={expiry}
                    onChangeText={v => setExpiry(fmtExpiry(v))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>CVV</Text>
                  <TextInput
                    style={s.input}
                    placeholder="123"
                    placeholderTextColor={colors.gray300}
                    value={cvv}
                    onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={s.secureNote}>
                <Ionicons name="lock-closed" size={12} color={colors.green} />
                <Text style={s.secureText}>Payments processed securely via Peach Payments. Card details are not stored on our servers.</Text>
              </View>

              <View style={s.formBtns}>
                <TouchableOpacity style={s.cancelFormBtn} onPress={() => setAdding(false)}>
                  <Text style={s.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                  <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save card'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.gold} />
              <Text style={s.addBtnText}>Add new card</Text>
            </TouchableOpacity>
          )}

          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gray400} />
            <Text style={s.infoText}>Your card is held securely and charged only when you release payment after a job is completed.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { padding: 2 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  cardChip:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  cardChipDefault: { borderColor: colors.gold + '50', backgroundColor: '#FFFBF0' },
  cardBrand:     { width: 40, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardBrandText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  cardNum:       { fontSize: 13, fontWeight: '600', color: colors.black },
  cardExp:       { fontSize: 11, color: colors.gray400, marginTop: 2 },
  defaultBadge:  { backgroundColor: colors.gold + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  defaultText:   { fontSize: 8, fontWeight: '700', color: colors.gold, letterSpacing: 0.5 },
  setDefaultBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  setDefaultText:{ fontSize: 11, color: colors.gray400, fontWeight: '600' },
  deleteBtn:     { padding: 6 },

  empty:         { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:      { fontSize: 12, color: colors.gray400, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  form:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  formTitle:     { fontSize: 15, fontWeight: '700', color: colors.black, marginBottom: 16 },
  fieldWrap:     { marginBottom: 14 },
  fieldLabel:    { fontSize: 11, color: colors.gray400, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input:         { backgroundColor: colors.gray50, borderRadius: 10, padding: 13, fontSize: 14, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  miniChip:      { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  row:           { flexDirection: 'row', gap: 12 },
  secureNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.greenBg, borderRadius: 8, padding: 10, marginBottom: 16 },
  secureText:    { flex: 1, fontSize: 11, color: colors.gray600, lineHeight: 16 },
  formBtns:      { flexDirection: 'row', gap: 10 },
  cancelFormBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelFormText:{ fontSize: 14, fontWeight: '600', color: colors.gray400 },
  saveBtn:       { flex: 2, backgroundColor: colors.gold, borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText:   { fontSize: 14, fontWeight: '700', color: colors.black },

  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.gold + '60', borderStyle: 'dashed', borderRadius: 14, padding: 14, marginBottom: 16 },
  addBtnText:    { fontSize: 14, fontWeight: '600', color: colors.gold },

  infoBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.gray100 },
  infoText:      { flex: 1, fontSize: 11, color: colors.gray400, lineHeight: 17 },
})
