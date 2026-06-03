import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'

const MENU = [
  { emoji: '🏅', label: 'Subscription',     sub: 'Premium Home · R 299/mo' },
  { emoji: '💳', label: 'Payment methods',  sub: 'Visa •••• 4242' },
  { emoji: '🛡️', label: 'Active warranties', sub: '2 warranties · expiring Jul 2026' },
  { emoji: '📍', label: 'Saved addresses',  sub: '22 Glenwood Road, Durban' },
  { emoji: '🔔', label: 'Notifications',    sub: 'Push, SMS enabled' },
  { emoji: '❓', label: 'Help & support',   sub: 'Chat, call, email' },
]

export default function ProfileTab() {
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
        <Text style={s.role}>Client account</Text>
        <View style={s.badge}><Text style={s.badgeText}>👑 Premium Home</Text></View>
      </View>

      <ScrollView style={s.body}>
        <View style={s.pointsBox}>
          <Text style={s.pointsLabel}>Loyalty points</Text>
          <Text style={s.pointsVal}>340 pts</Text>
          <View style={s.pointsBar}>
            <View style={[s.pointsFill, { width: '68%' }]} />
          </View>
          <Text style={s.pointsSub}>160 pts until your next reward</Text>
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
  safe:        { flex: 1, backgroundColor: colors.cream },
  header:      { backgroundColor: colors.navy, padding: 24, alignItems: 'center', paddingBottom: 28 },
  avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText:  { fontSize: 24, fontWeight: '700', color: colors.navy },
  name:        { fontSize: 18, fontWeight: '300', color: '#fff', marginBottom: 2 },
  role:        { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  badge:       { backgroundColor: 'rgba(200,146,42,0.2)', borderColor: 'rgba(200,146,42,0.4)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText:   { fontSize: 12, color: colors.goldLight },
  body:        { padding: 14 },
  pointsBox:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.creamMid },
  pointsLabel: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  pointsVal:   { fontSize: 28, fontWeight: '300', color: colors.navy, marginBottom: 8 },
  pointsBar:   { height: 6, backgroundColor: colors.creamMid, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  pointsFill:  { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  pointsSub:   { fontSize: 11, color: colors.textLight },
  menuItem:    { backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  menuEmoji:   { fontSize: 20 },
  menuLabel:   { fontSize: 13, fontWeight: '600', color: colors.text },
  menuSub:     { fontSize: 11, color: colors.textLight, marginTop: 2 },
  menuArrow:   { fontSize: 18, color: colors.textLight },
  signout:     { padding: 16, alignItems: 'center', marginTop: 8 },
  signoutText: { fontSize: 14, color: colors.red, fontWeight: '500' },
})
