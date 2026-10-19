import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Alert } from '../../lib/alert'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api, ApiError, Provider } from '../../lib/api'
import { confirmDeleteAccount } from '../../lib/deleteAccount'
import { useEffect, useState } from 'react'

const MENU = [
  { emoji: '✏️', label: 'Edit profile',        sub: 'Name, email & photo',                route: '/(provider)/edit-profile'  },
  { emoji: '💎', label: 'Provider plan',        sub: 'View & upgrade your plan',           route: '/(provider)/subscription'  },
  { emoji: '🏦', label: 'Bank account',         sub: 'For Peach Payments payouts',         route: '/(provider)/bank-account'  },
  { emoji: '🛡️', label: 'KYC documents',       sub: 'ID, trade cert, bank letter',        route: '/(provider)/onboarding'    },
  { emoji: '📸', label: 'Hire inventory',       sub: 'Add / manage your hire item photos', route: '/(provider)/onboarding'    },
  { emoji: '📍', label: 'Service area',         sub: 'Set your coverage area',             route: '/(provider)/service-area' },
  { emoji: '🕐', label: 'Availability',         sub: 'Mon–Fri, weekends, emergency',       route: '/(provider)/availability' },
  { emoji: '⭐', label: 'Reviews',              sub: 'See what clients say',               route: '/(provider)/reviews'       },
  { emoji: '🔔', label: 'Notifications',        sub: 'New jobs, payments, alerts',         route: '/(provider)/notifications' },
  { emoji: '🚫', label: 'Blocked users',        sub: 'People you have blocked',            route: '/(client)/blocked-users'   },
  { emoji: '❓', label: 'Help & support',       sub: 'Chat, call, email',            route: '/(provider)/help' },
]

export default function ProviderProfile() {
  const { user, logout, switchMode } = useAuth()
  const [balance,      setBalance]      = useState(0)
  const [pending,      setPending]      = useState<{ amount: number } | null>(null)
  const [me,           setMe]           = useState<Provider | null>(null)
  const [withdrawing,  setWithdrawing]  = useState(false)

  useEffect(() => {
    if (user?.id) {
      api.providers.earnings(user.id).then(e => { setBalance(e.available); setPending(e.pendingPayout) }).catch(() => {})
      api.providers.get(user.id).then(setMe).catch(() => {})
    }
  }, [user?.id])

  const handleSwitchToClient = () => {
    switchMode('client')
    router.replace('/(client)')
  }

  const handleWithdraw = () => {
    if (balance <= 0) { Alert.alert('No balance', 'You have no earnings available to withdraw yet.'); return }
    Alert.alert(
      'Request a payout',
      `Ask us to pay R ${balance.toLocaleString('en-ZA')} to your bank account? Your balance stays the same until our team has paid you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request payout', style: 'default',
          onPress: async () => {
            setWithdrawing(true)
            try {
              const r = await api.providers.requestPayout(user!.id, balance)
              setPending({ amount: r.amount })
              Alert.alert('Payout requested', 'Our team will pay it to your bank account. Your balance will go down once it has been paid.')
            } catch (e) {
              Alert.alert("Couldn't request a payout", e instanceof ApiError && e.status !== 0 ? e.message : 'Please check your connection and try again.')
            } finally { setWithdrawing(false) }
          },
        },
      ]
    )
  }

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
            <Text style={s.statVal}>{me && me.reviewCount > 0 ? me.rating.toFixed(1) : '—'}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{me?.jobCount ?? 0}</Text>
            <Text style={s.statLabel}>Jobs done</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{me?.kycStatus === 'approved' ? '✓' : '…'}</Text>
            <Text style={s.statLabel}>{me?.kycStatus === 'approved' ? 'KYC verified' : 'KYC pending'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.body}>
        {/* Payout balance */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Your earnings balance</Text>
          <Text style={s.balanceAmt}>R {balance.toLocaleString('en-ZA')}</Text>
          {pending ? (
            <Text style={s.balanceNote}>Payout of R {pending.amount.toLocaleString('en-ZA')} requested — waiting for our team to pay it.</Text>
          ) : (
            <TouchableOpacity activeOpacity={0.8} style={[s.withdrawBtn, (withdrawing || balance <= 0) && { opacity: 0.5 }]} onPress={handleWithdraw} disabled={withdrawing || balance <= 0}>
              {withdrawing
                ? <ActivityIndicator color={colors.navy} />
                : <Text style={s.withdrawText}>💳  Request a payout</Text>}
            </TouchableOpacity>
          )}
        </View>

        {MENU.map((item, i) => (
          <TouchableOpacity activeOpacity={0.8}
            key={i}
            style={s.menuItem}
            onPress={() => (item as any).route && router.push((item as any).route)}
          >
            <Text style={s.menuEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuSub}>{item.sub}</Text>
            </View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity activeOpacity={0.8} style={s.switchBtn} onPress={handleSwitchToClient}>
          <Ionicons name="swap-horizontal-outline" size={16} color={colors.gold} />
          <Text style={s.switchText}>Switch to client mode</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={s.signout} onPress={handleLogout}>
          <Text style={s.signoutText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} style={s.deleteAcct} onPress={() => confirmDeleteAccount(handleLogout)}>
          <Text style={s.deleteAcctText}>Delete account</Text>
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
  balanceNote:  { fontSize: 12, color: colors.gray400, textAlign: 'center', lineHeight: 18 },
  menuItem:     { backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  menuEmoji:    { fontSize: 20 },
  menuLabel:    { fontSize: 13, fontWeight: '600', color: colors.text },
  menuSub:      { fontSize: 11, color: colors.textLight, marginTop: 2 },
  menuArrow:    { fontSize: 18, color: colors.textLight },
  switchBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black2, borderRadius: 12, padding: 14, marginTop: 8 },
  switchText:   { fontSize: 14, fontWeight: '600', color: colors.gold },
  signout:      { padding: 16, alignItems: 'center', marginTop: 4 },
  signoutText:  { fontSize: 14, color: colors.red, fontWeight: '500' },
  deleteAcct:    { paddingVertical: 8, alignItems: 'center' },
  deleteAcctText:{ fontSize: 12, color: colors.gray400 },
})
