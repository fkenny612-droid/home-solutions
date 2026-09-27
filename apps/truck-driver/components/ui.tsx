import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors } from '../lib/theme'
import { hazmatLabel } from '../lib/format'

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  assigned:   { label: 'Up next',     bg: colors.blueBg,   fg: colors.blueText },
  in_transit: { label: 'On the road', bg: colors.yellowBg, fg: colors.yellowText },
  delivered:  { label: 'Delivered',   bg: colors.greenBg,  fg: colors.greenText },
  cancelled:  { label: 'Cancelled',   bg: '#FEF2F2',       fg: colors.red },
}

export function StatusPill({ status }: { status: string }) {
  const st = STATUS[status] ?? { label: status, bg: colors.border, fg: colors.text }
  return (
    <View style={[s.pill, { backgroundColor: st.bg }]}>
      <Text style={[s.pillText, { color: st.fg }]}>{st.label}</Text>
    </View>
  )
}

export function HazmatBanner({ types }: { types: string[] }) {
  if (!types.length) return null
  return (
    <View style={s.hazmat}>
      <Text style={s.hazmatText}>⚠ Hazmat: {types.map(hazmatLabel).join(', ')}</Text>
    </View>
  )
}

export function Button({ title, onPress, variant = 'primary', busy, disabled }: {
  title: string
  onPress: () => void
  variant?: 'primary' | 'dark' | 'silver' | 'outline'
  busy?: boolean
  disabled?: boolean
}) {
  const bg = { primary: colors.brand, dark: colors.brandDark, silver: colors.silver, outline: 'transparent' }[variant]
  const fg = variant === 'silver' || variant === 'outline' ? colors.text : '#fff'
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: busy || disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === 'outline' && s.buttonOutline,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '600' },
  hazmat: { backgroundColor: colors.orangeBg, borderColor: colors.orangeBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  hazmatText: { color: colors.orangeText, fontWeight: '600', fontSize: 15 },
  button: { borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  buttonOutline: { borderWidth: 1, borderColor: colors.silverMid },
  buttonText: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 12, color: colors.faint, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
})
