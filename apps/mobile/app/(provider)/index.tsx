/**
 * Provider Earnings Dashboard
 */
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'

const RECENT_JOBS = [
  { emoji: '💧', bg: '#DBEAFE', name: 'Geyser repair',  detail: 'Today · Priya G. · ★★★★★',    amt: 'R 1 000' },
  { emoji: '💧', bg: '#DBEAFE', name: 'Burst pipe fix', detail: 'Yesterday · Ahmed P. · ★★★★★', amt: 'R 1 450' },
  { emoji: '💧', bg: '#DBEAFE', name: 'Drain blockage', detail: '22 May · Mark W. · ★★★★☆',    amt: 'R 650'   },
]

export default function ProviderEarnings() {
  const [online, setOnline] = useState(true)
  const [earnings, setEarnings] = useState({ available: 4840, thisMonth: 28440, total: 892 * 1200 })

  useEffect(() => {
    api.providers.earnings('prov-raj').then(setEarnings).catch(() => {})
  }, [])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerSub}>Your earnings</Text>
        <Text style={s.headerName}>Raj Pillay</Text>
        <View style={s.balanceBox}>
          <Text style={s.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
          <Text style={s.balanceAmt}>R {earnings.available.toLocaleString()}</Text>
          <Text style={s.balanceSub}>7 completed jobs this week</Text>
        </View>
        <View style={s.miniGrid}>
          <View style={s.miniBox}>
            <Text style={s.miniLabel}>This month</Text>
            <Text style={s.miniVal}>R {(earnings.thisMonth / 1000).toFixed(1)}k</Text>
          </View>
          <View style={s.miniBox}>
            <Text style={s.miniLabel}>Jobs done</Text>
            <Text style={s.miniVal}>892 total</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* Online toggle */}
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>Available for jobs</Text>
            <Text style={s.toggleSub}>Toggle to go offline</Text>
          </View>
          <TouchableOpacity style={[s.toggle, !online && s.toggleOff]} onPress={() => setOnline(p => !p)}>
            <View style={[s.toggleThumb, !online && s.toggleThumbOff]} />
          </TouchableOpacity>
        </View>

        {/* Rating summary */}
        <View style={s.ratingBox}>
          <View style={s.ratingLeft}>
            <Text style={s.bigStar}>★</Text>
            <Text style={s.bigRating}>4.9</Text>
            <Text style={s.reviewCount}>214 reviews</Text>
          </View>
          <View style={s.ratingBars}>
            {[{ n: 5, pct: 0.88 }, { n: 4, pct: 0.10 }, { n: 3, pct: 0.02 }].map(r => (
              <View key={r.n} style={s.rbarRow}>
                <Text style={s.rbarN}>{r.n}</Text>
                <View style={s.rbarTrack}><View style={[s.rbarFill, { width: `${r.pct * 100}%` }]} /></View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent jobs */}
        <Text style={s.sectionLabel}>Recent jobs</Text>
        {RECENT_JOBS.map((j, i) => (
          <View key={i} style={s.jobRow}>
            <View style={[s.jobIcon, { backgroundColor: j.bg }]}><Text style={{ fontSize: 16 }}>{j.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobName}>{j.name}</Text>
              <Text style={s.jobDetail}>{j.detail}</Text>
            </View>
            <Text style={s.jobAmt}>{j.amt}</Text>
          </View>
        ))}

        {/* Withdraw button */}
        <TouchableOpacity style={s.withdrawBtn}>
          <Text style={s.withdrawText}>💳  Withdraw R {earnings.available.toLocaleString()} via Peach Payments</Text>
        </TouchableOpacity>
        <Text style={s.withdrawSub}>Transfers within 1–2 business days</Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.cream },
  header:       { backgroundColor: colors.navy, padding: 16, paddingBottom: 20 },
  headerSub:    { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  headerName:   { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  balanceBox:   { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, marginBottom: 10 },
  balanceLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' },
  balanceAmt:   { fontSize: 30, fontWeight: '300', color: '#fff', marginVertical: 2 },
  balanceSub:   { fontSize: 10, color: 'rgba(255,255,255,0.45)' },
  miniGrid:     { flexDirection: 'row', gap: 8 },
  miniBox:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10 },
  miniLabel:    { fontSize: 9, color: 'rgba(255,255,255,0.38)' },
  miniVal:      { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 2 },
  body:         { padding: 13 },
  toggleRow:    { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  toggleLabel:  { fontSize: 13, fontWeight: '600', color: colors.text },
  toggleSub:    { fontSize: 10, color: colors.textLight, marginTop: 2 },
  toggle:       { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.accent, padding: 3 },
  toggleOff:    { backgroundColor: colors.creamMid },
  toggleThumb:  { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff: { alignSelf: 'flex-start' },
  ratingBox:    { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  ratingLeft:   { alignItems: 'center' },
  bigStar:      { fontSize: 28, color: colors.gold },
  bigRating:    { fontSize: 20, fontWeight: '300', color: colors.navy },
  reviewCount:  { fontSize: 9, color: colors.textLight },
  ratingBars:   { flex: 1, gap: 5 },
  rbarRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rbarN:        { fontSize: 11, color: colors.textMuted, width: 10 },
  rbarTrack:    { flex: 1, height: 5, backgroundColor: colors.creamMid, borderRadius: 3, overflow: 'hidden' },
  rbarFill:     { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  sectionLabel: { fontSize: 9, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  jobRow:       { backgroundColor: '#fff', borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7, borderWidth: 1, borderColor: colors.creamMid },
  jobIcon:      { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  jobName:      { fontSize: 13, fontWeight: '600', color: colors.text },
  jobDetail:    { fontSize: 10, color: colors.textLight, marginTop: 1 },
  jobAmt:       { fontSize: 13, fontWeight: '700', color: colors.accent },
  withdrawBtn:  { backgroundColor: colors.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  withdrawText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  withdrawSub:  { textAlign: 'center', fontSize: 10, color: colors.textLight, marginTop: 6 },
})
