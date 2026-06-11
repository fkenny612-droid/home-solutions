import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'

const MENU = [
  { label: 'Edit profile',      sub: 'Name, email & photo',          route: '/(client)/edit-profile'  },
  { label: 'Subscription',      sub: 'View & manage your plan',      route: '/(client)/subscription'  },
  { label: 'Payment methods',   sub: 'Visa •••• 4242' },
  { label: 'Active warranties', sub: '2 warranties · expiring Jul 2026' },
  { label: 'Saved addresses',   sub: 'Manage your saved locations',   route: '/(client)/addresses'     },
  { label: 'Notifications',     sub: 'Push, SMS enabled',             route: '/(client)/notifications' },
  { label: 'Help & support',    sub: 'Chat, call, email' },
]

export default function ProfileTab() {
  const { user, logout, switchMode } = useAuth()

  const handleSwitchToProvider = () => {
    switchMode('provider')
    router.replace('/(provider)')
  }

  const firstName = user?.firstName || ''
  const lastName  = user?.lastName  || ''
  const initials  = (firstName[0] ?? '') + (lastName[0] ?? '') || '?'
  const fullName  = [firstName, lastName].filter(Boolean).join(' ') || user?.phone || '—'

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Profile header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.avatar} onPress={() => router.push('/(client)/edit-profile')}>
          <Text style={s.avatarText}>{initials.toUpperCase()}</Text>
          <View style={s.avatarEditBadge}>
            <Ionicons name="pencil" size={10} color={colors.black} />
          </View>
        </TouchableOpacity>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.role}>Client account</Text>
        <View style={s.premiumBadge}>
          <Text style={s.premiumText}>PREMIUM HOME</Text>
        </View>
      </View>

      <ScrollView style={s.body}>
        {/* Loyalty */}
        <View style={s.loyaltyBox}>
          <View style={s.loyaltyTop}>
            <Text style={s.loyaltyLabel}>Loyalty points</Text>
            <Text style={s.loyaltyVal}>340 pts</Text>
          </View>
          <View style={s.loyaltyTrack}>
            <View style={[s.loyaltyFill, { width: '68%' }]} />
          </View>
          <Text style={s.loyaltySub}>160 pts until your next reward</Text>
        </View>

        {/* Menu */}
        <View style={s.menuSection}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.menuItem, i < MENU.length - 1 && s.menuItemBorder]}
              onPress={() => (item as any).route && router.push((item as any).route)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {user?.role === 'provider' && (
          <TouchableOpacity style={s.switchBtn} onPress={handleSwitchToProvider}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.black} />
            <Text style={s.switchText}>Switch to provider mode</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.signout} onPress={handleLogout}>
          <Text style={s.signoutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  header:        { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 28, alignItems: 'center' },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.black2, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.gold, borderRadius: 10, padding: 3 },
  avatarText:    { fontSize: 24, fontWeight: '700', color: colors.gold },
  name:          { fontSize: 20, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },
  role:          { fontSize: 12, color: colors.gray400, marginTop: 2, marginBottom: 10 },
  premiumBadge:  { backgroundColor: colors.gold + '20', borderWidth: 1, borderColor: colors.gold + '60', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  premiumText:   { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 1 },

  body:          { padding: 16 },

  loyaltyBox:    { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  loyaltyTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  loyaltyLabel:  { fontSize: 12, color: colors.gray400, fontWeight: '600' },
  loyaltyVal:    { fontSize: 26, fontWeight: '700', color: colors.black, letterSpacing: -0.3 },
  loyaltyTrack:  { height: 4, backgroundColor: colors.gray100, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  loyaltyFill:   { height: '100%', backgroundColor: colors.gold, borderRadius: 2 },
  loyaltySub:    { fontSize: 11, color: colors.gray400 },

  menuSection:   { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  menuItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  menuItemBorder:{ borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  menuLabel:     { fontSize: 14, fontWeight: '600', color: colors.black },
  menuSub:       { fontSize: 11, color: colors.gray400, marginTop: 2 },
  menuArrow:     { fontSize: 20, color: colors.gray200 },

  switchBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: 12, padding: 14 },
  switchText:    { fontSize: 14, fontWeight: '600', color: colors.black },
  signout:       { padding: 16, alignItems: 'center' },
  signoutText:   { fontSize: 14, color: colors.red, fontWeight: '500' },
})
