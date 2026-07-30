import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'

const MENU = [
  { label: 'Edit profile',      sub: 'Name, email & photo',          route: '/(client)/edit-profile'  },
  { label: 'Subscription',      sub: 'View & manage your plan',      route: '/(client)/subscription'  },
  { label: 'Payment methods',   sub: 'Visa •••• 4242',                route: '/(client)/payment-methods' },
  { label: 'Active warranties', sub: '2 warranties · expiring Jul 2026', route: '/(client)/warranties'      },
  { label: 'Saved addresses',   sub: 'Manage your saved locations',   route: '/(client)/addresses'          },
  { label: 'Refer a friend',    sub: 'Share your code, earn points',  route: '/(client)/referral'           },
  { label: 'Notifications',     sub: 'Push, SMS enabled',             route: '/(client)/notifications'      },
  { label: 'Help & support',    sub: 'Chat, call, email',             route: '/(client)/help'               },
]

const NEXT_REWARD_POINTS = 500

export default function ProfileTab() {
  const { user, logout, switchMode } = useAuth()
  const [points,      setPoints]      = useState(0)
  const [idVerified,  setIdVerified]  = useState(false)

  useEffect(() => {
    api.loyalty.balance().then(b => setPoints(b.points)).catch(() => {})
    api.auth.me().then(me => setIdVerified(me.idVerified)).catch(() => {})
  }, [])

  const progress = Math.min(1, (points % NEXT_REWARD_POINTS) / NEXT_REWARD_POINTS)
  const pointsToNext = NEXT_REWARD_POINTS - (points % NEXT_REWARD_POINTS)

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
        <TouchableOpacity activeOpacity={0.8} style={s.avatar} onPress={() => router.push('/(client)/edit-profile')}>
          <Text style={s.avatarText}>{initials.toUpperCase()}</Text>
          <View style={s.avatarEditBadge}>
            <Ionicons name="pencil" size={10} color={colors.black} />
          </View>
        </TouchableOpacity>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.role}>Client account</Text>
        <View style={s.badgeRow}>
          <View style={s.premiumBadge}>
            <Text style={s.premiumText}>PREMIUM HOME</Text>
          </View>
          {idVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.green} />
              <Text style={s.verifiedText}>ID VERIFIED</Text>
            </View>
          )}
          {!idVerified && (
            <TouchableOpacity activeOpacity={0.8} style={s.unverifiedBadge} onPress={() => router.push('/(client)/verify-id' as any)}>
              <Ionicons name="shield-outline" size={11} color={colors.gray400} />
              <Text style={s.unverifiedText}>Verify ID →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={s.body}>
        {/* Loyalty */}
        <TouchableOpacity activeOpacity={0.8} style={s.loyaltyBox} onPress={() => router.push('/(client)/loyalty')}>
          <View style={s.loyaltyTop}>
            <Text style={s.loyaltyLabel}>Loyalty points</Text>
            <Text style={s.loyaltyVal}>{points.toLocaleString('en-ZA')} pts</Text>
          </View>
          <View style={s.loyaltyTrack}>
            <View style={[s.loyaltyFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={s.loyaltySub}>{pointsToNext} pts until your next reward</Text>
        </TouchableOpacity>

        {/* Menu */}
        <View style={s.menuSection}>
          {MENU.map((item, i) => (
            <TouchableOpacity activeOpacity={0.8}
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
          <TouchableOpacity activeOpacity={0.8} style={s.switchBtn} onPress={handleSwitchToProvider}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.black} />
            <Text style={s.switchText}>Switch to provider mode</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.8} style={s.signout} onPress={handleLogout}>
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
  badgeRow:      { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  premiumBadge:  { backgroundColor: colors.gold + '20', borderWidth: 1, borderColor: colors.gold + '60', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  premiumText:   { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.green + '40', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText:  { fontSize: 9, color: colors.green, fontWeight: '700', letterSpacing: 0.8 },
  unverifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray100, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  unverifiedText:  { fontSize: 9, color: colors.gray400, fontWeight: '600' },

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
