import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'
import { useAuth } from '../../context/auth'

const RECENT_JOBS = [
  { emoji: '💧', name: 'Geyser repair',  detail: 'Today · Priya G. · ★★★★★',    amt: 'R 1 000' },
  { emoji: '💧', name: 'Burst pipe fix', detail: 'Yesterday · Ahmed P. · ★★★★★', amt: 'R 1 450' },
  { emoji: '💧', name: 'Drain blockage', detail: '22 May · Mark W. · ★★★★☆',    amt: 'R 650'   },
]

export default function ProviderEarnings() {
  const { user, logout } = useAuth()
  const [online,      setOnline]      = useState(true)
  const [earnings,    setEarnings]    = useState({ available: 4840, thisMonth: 28440, total: 892 })
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user?.id) api.providers.earnings(user.id).then(setEarnings).catch(() => {})
    api.notifications.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {})
    const id = setInterval(() => {
      api.notifications.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {})
    }, 30000)
    return () => clearInterval(id)
  }, [user?.id])

  const firstName = user?.firstName || 'Provider'

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerSub}>Your earnings</Text>
            <Text style={s.headerName}>{firstName}</Text>
          </View>
          {/* Bell */}
          <TouchableOpacity onPress={() => router.push('/(provider)/notifications')} style={s.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Online toggle */}
          <TouchableOpacity style={[s.onlineToggle, !online && s.offlineToggle]} onPress={() => setOnline(p => !p)}>
            <View style={[s.toggleThumb, !online && s.toggleThumbOff]} />
            <Text style={[s.onlineLabel, !online && s.offlineLabel]}>{online ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
          <Text style={s.balanceAmt}>R {earnings.available.toLocaleString()}</Text>
          <Text style={s.balanceSub}>7 completed jobs this week</Text>
        </View>

        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>R {(earnings.thisMonth / 1000).toFixed(1)}k</Text>
            <Text style={s.statLabel}>This month</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{earnings.total}</Text>
            <Text style={s.statLabel}>Jobs done</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: colors.gold }]}>★ 4.9</Text>
            <Text style={s.statLabel}>214 reviews</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

        {/* Rating breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Rating breakdown</Text>
          {[{ n: 5, pct: 0.88 }, { n: 4, pct: 0.10 }, { n: 3, pct: 0.02 }].map(r => (
            <View key={r.n} style={s.rbarRow}>
              <Text style={s.rbarN}>{r.n} ★</Text>
              <View style={s.rbarTrack}>
                <View style={[s.rbarFill, { width: `${r.pct * 100}%` as any }]} />
              </View>
              <Text style={s.rbarPct}>{Math.round(r.pct * 100)}%</Text>
            </View>
          ))}
        </View>

        {/* Recent jobs */}
        <Text style={s.sectionLabel}>RECENT JOBS</Text>
        <View style={s.card}>
          {RECENT_JOBS.map((j, i) => (
            <View key={i} style={[s.jobRow, i < RECENT_JOBS.length - 1 && s.jobRowBorder]}>
              <View style={s.jobIcon}>
                <Text style={{ fontSize: 18 }}>{j.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobName}>{j.name}</Text>
                <Text style={s.jobDetail}>{j.detail}</Text>
              </View>
              <Text style={s.jobAmt}>{j.amt}</Text>
            </View>
          ))}
        </View>

        {/* Withdraw */}
        <TouchableOpacity style={s.withdrawBtn}>
          <Text style={s.withdrawText}>Withdraw R {earnings.available.toLocaleString()} via Peach Payments</Text>
        </TouchableOpacity>
        <Text style={s.withdrawSub}>Transfers within 1–2 business days</Text>

        <TouchableOpacity style={s.logoutRow} onPress={async () => { await logout(); router.replace('/login') }}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },

  // Header
  header:        { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerSub:     { fontSize: 11, color: colors.gray400, marginBottom: 2 },
  headerName:    { fontSize: 22, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },

  // Online toggle
  bellBtn:       { position: 'relative', padding: 2 },
  bellBadge:     { position: 'absolute', top: -2, right: -2, backgroundColor: colors.gold, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, color: colors.black, fontWeight: '800' },
  onlineToggle:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  offlineToggle: { backgroundColor: colors.black2 },
  toggleThumb:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  toggleThumbOff:{ backgroundColor: colors.gray400 },
  onlineLabel:   { fontSize: 12, fontWeight: '700', color: colors.white },
  offlineLabel:  { color: colors.gray400 },

  // Balance
  balanceCard:   { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  balanceLabel:  { fontSize: 9, color: colors.gray400, letterSpacing: 1.2, fontWeight: '700', marginBottom: 4 },
  balanceAmt:    { fontSize: 36, fontWeight: '700', color: colors.white, letterSpacing: -1, marginBottom: 4 },
  balanceSub:    { fontSize: 11, color: colors.gray400 },

  // Stats row
  statRow:       { flexDirection: 'row', alignItems: 'center' },
  statBox:       { flex: 1, alignItems: 'center' },
  statVal:       { fontSize: 16, fontWeight: '700', color: colors.white },
  statLabel:     { fontSize: 10, color: colors.gray400, marginTop: 2 },
  statDivider:   { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

  body:          { padding: 16 },

  // Cards
  card:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle:     { fontSize: 13, fontWeight: '700', color: colors.black, marginBottom: 12, letterSpacing: -0.1 },

  // Rating bars
  rbarRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rbarN:         { fontSize: 12, color: colors.gray600, width: 28, fontWeight: '500' },
  rbarTrack:     { flex: 1, height: 5, backgroundColor: colors.gray100, borderRadius: 3, overflow: 'hidden' },
  rbarFill:      { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  rbarPct:       { fontSize: 11, color: colors.gray400, width: 30, textAlign: 'right' },

  // Section label
  sectionLabel:  { fontSize: 10, color: colors.gray400, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },

  // Job rows
  jobRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  jobRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  jobIcon:       { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  jobName:       { fontSize: 13, fontWeight: '600', color: colors.black },
  jobDetail:     { fontSize: 11, color: colors.gray400, marginTop: 2 },
  jobAmt:        { fontSize: 13, fontWeight: '700', color: colors.black },

  // Withdraw
  withdrawBtn:   { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  withdrawText:  { fontSize: 14, fontWeight: '700', color: colors.black },
  withdrawSub:   { textAlign: 'center', fontSize: 11, color: colors.gray400, marginBottom: 12 },

  logoutRow:     { alignItems: 'center', padding: 14 },
  logoutText:    { fontSize: 13, color: colors.gray400 },
})
