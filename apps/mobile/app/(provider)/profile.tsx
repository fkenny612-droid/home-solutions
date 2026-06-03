import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'

const MENU = [
  { emoji: '🏦', label: 'Bank account',      sub: 'For Peach Payments payouts' },
  { emoji: '🛡️', label: 'KYC documents',     sub: 'ID, trade cert, bank letter' },
  { emoji: '📍', label: 'Service area',       sub: 'Durban, Umhlanga, Ballito' },
  { emoji: '⭐', label: 'Reviews',            sub: '214 reviews · 4.9 avg' },
  { emoji: '🔔', label: 'Notifications',      sub: 'New jobs, payments, alerts' },
  { emoji: '❓', label: 'Help & support',     sub: 'Chat, call, email' },
]

export default function ProviderProfile() {
  const { user, logout } = useAuth()

  const initials = user?.phone
    ? user.phone.replace('+27', '').replace(/\s/g, '').slice(0, 2)
    : '?'

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials.toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user?.phone ?? '—'}</Text>
        <Text style={s.role}>Service provider</Text>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>4.9</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>892</Text>
            <Text style={s.statLabel}>Jobs done</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>✓</Text>
            <Text style={s.statLabel}>KYC verified</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.body}>
        {/* Payout balance */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Available to withdraw</Text>
          <Text style={s.balanceAmt}>R 4,840</Text>
          <TouchableOpacity style={s.withdrawBtn}>
            <Text style={s.withdrawText}>💳  Withdraw via Peach Payments</Text>
          </TouchableOpacity>
        </View>

        {MENU.map((item, i) => (
          <TouchableOpacity key={i} style={s.menuItem}>
            <Text style={s.menuEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuSub}>{item.sub}</Text>
            </View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.signout} onPress={handleLogout}>
          <Text style={s.signoutText}>Sign out</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.cream },
  header:       { backgroundColor: colors.navy, padding: 24, alignItems: 'center', paddingBottom: 20 },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText:   { fontSize: 24, fontWeight: '700', color: colors.navy },
  name:         { fontSize: 18, fontWeight: '300', color: '#fff', marginBottom: 2 },
  role:         { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, gap: 0, width: '100%' },
  statBox:      { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 20, fontWeight: '600', color: '#fff' },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  body:         { padding: 14 },
  balanceCard:  { backgroundColor: colors.navy, borderRadius: 14, padding: 16, marginBottom: 16 },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  balanceAmt:   { fontSize: 30, fontWeight: '300', color: '#fff', marginBottom: 12 },
  withdrawBtn:  { backgroundColor: colors.gold, borderRadius: 10, padding: 12, alignItems: 'center' },
  withdrawText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  menuItem:     { backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  menuEmoji:    { fontSize: 20 },
  menuLabel:    { fontSize: 13, fontWeight: '600', color: colors.text },
  menuSub:      { fontSize: 11, color: colors.textLight, marginTop: 2 },
  menuArrow:    { fontSize: 18, color: colors.textLight },
  signout:      { padding: 16, alignItems: 'center', marginTop: 8 },
  signoutText:  { fontSize: 14, color: colors.red, fontWeight: '500' },
})
