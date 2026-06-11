import { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../constants/theme'
import { CardDetails } from '../lib/api'

interface Props {
  onChange: (card: CardDetails | null) => void
}

function detectBrand(num: string): CardDetails['brand'] {
  const n = num.replace(/\s/g, '')
  if (/^4/.test(n))          return 'VISA'
  if (/^5[1-5]/.test(n))     return 'MASTER'
  if (/^3[47]/.test(n))      return 'AMEX'
  return 'VISA'
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export default function CardInput({ onChange }: Props) {
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv,    setCvv]    = useState('')
  const [showCvv, setShowCvv] = useState(false)

  const holderRef = useRef<TextInput>(null)
  const expiryRef = useRef<TextInput>(null)
  const cvvRef    = useRef<TextInput>(null)

  const notify = (n: string, h: string, e: string, c: string) => {
    const clean = n.replace(/\s/g, '')
    if (clean.length === 16 && h.length >= 2 && e.length === 5 && c.length >= 3) {
      onChange({ number: clean, holder: h.toUpperCase(), expiry: e, cvv: c, brand: detectBrand(n) })
    } else {
      onChange(null)
    }
  }

  const brand = detectBrand(number)
  const brandIcon = brand === 'VISA' ? '💳' : brand === 'MASTER' ? '🟠' : '💳'

  return (
    <View style={s.wrap}>
      {/* Card number */}
      <View style={s.field}>
        <Text style={s.label}>Card number</Text>
        <View style={s.inputRow}>
          <Text style={s.brandIcon}>{number.length > 0 ? brandIcon : '💳'}</Text>
          <TextInput
            style={s.input}
            value={number}
            onChangeText={v => {
              const fmt = formatCardNumber(v)
              setNumber(fmt)
              notify(fmt, holder, expiry, cvv)
              if (fmt.replace(/\s/g, '').length === 16) holderRef.current?.focus()
            }}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor={colors.gray400}
            keyboardType="number-pad"
            maxLength={19}
            returnKeyType="next"
            onSubmitEditing={() => holderRef.current?.focus()}
          />
        </View>
      </View>

      {/* Card holder */}
      <View style={s.field}>
        <Text style={s.label}>Name on card</Text>
        <TextInput
          ref={holderRef}
          style={[s.input, s.inputPadded]}
          value={holder}
          onChangeText={v => { setHolder(v); notify(number, v, expiry, cvv) }}
          placeholder="FULL NAME"
          placeholderTextColor={colors.gray400}
          autoCapitalize="characters"
          returnKeyType="next"
          onSubmitEditing={() => expiryRef.current?.focus()}
        />
      </View>

      {/* Expiry + CVV side by side */}
      <View style={s.row}>
        <View style={[s.field, { flex: 1, marginRight: 10 }]}>
          <Text style={s.label}>Expiry</Text>
          <TextInput
            ref={expiryRef}
            style={[s.input, s.inputPadded]}
            value={expiry}
            onChangeText={v => {
              const fmt = formatExpiry(v)
              setExpiry(fmt)
              notify(number, holder, fmt, cvv)
              if (fmt.length === 5) cvvRef.current?.focus()
            }}
            placeholder="MM/YY"
            placeholderTextColor={colors.gray400}
            keyboardType="number-pad"
            maxLength={5}
            returnKeyType="next"
            onSubmitEditing={() => cvvRef.current?.focus()}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>CVV</Text>
          <View style={s.inputRow}>
            <TextInput
              ref={cvvRef}
              style={[s.input, { flex: 1 }]}
              value={cvv}
              onChangeText={v => {
                const d = v.replace(/\D/g, '').slice(0, 4)
                setCvv(d)
                notify(number, holder, expiry, d)
              }}
              placeholder="•••"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              secureTextEntry={!showCvv}
              maxLength={4}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowCvv(p => !p)} style={{ padding: 4 }}>
              <Ionicons name={showCvv ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap:       { gap: 14 },
  field:      { gap: 6 },
  label:      { fontSize: 11, fontWeight: '600', color: colors.gray600, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 12, height: 48, backgroundColor: colors.white },
  input:      { flex: 1, fontSize: 15, color: colors.black, fontVariant: ['tabular-nums'] },
  inputPadded:{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 12, height: 48, backgroundColor: colors.white },
  brandIcon:  { fontSize: 18, marginRight: 8 },
  row:        { flexDirection: 'row' },
})
