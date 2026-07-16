import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, Booking } from '../../lib/api'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'

const COMMISSION_PCT = 0.15

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹', hvac: '❄️', gas: '🔥', handyman: '🔧',
  tiling: '🪟', painting: '🎨', landscaping: '🌿', pool: '🏊', pest_control: '🐜',
  locksmith: '🔑', carpentry: '🪚', solar: '☀️', security: '📷', paving: '🛤️',
  waterproofing: '💦', roofing: '🏠', gate_motor: '🚪', moving: '📦', bricklaying: '🧱',
}

function formatService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isThisMonth(iso: string) {
  const d = new Date(iso), now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function EarningsHistoryScreen() {
  const { user } = useAuth()
  const [jobs,       setJobs]       = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    try {
      const completed = await api.bookings.list('completed')
      const mine = completed
        .filter(b => b.providerId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setJobs(mine)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const grossTotal     = jobs.reduce((sum, b) => sum + (b.finalAmount ?? b.quotedAmount), 0)
  const netTotal        = grossTotal * (1 - COMMISSION_PCT)
  const monthJobs       = jobs.filter(b => isThisMonth(b.createdAt))
  const monthNet         = monthJobs.reduce((sum, b) => sum + (b.finalAmount ?? b.quotedAmount), 0) * (1 - COMMISSION_PCT)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Earnings history</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={b => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
          contentContainerStyle={jobs.length === 0 ? s.emptyWrap : { padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            jobs.length > 0 ? (
              <>
                <View style={s.summaryRow}>
                  <View style={s.summaryBox}>
                    <Text style={s.summaryLabel}>This month (net)</Text>
                    <Text style={s.summaryVal}>R {monthNet.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
                    <Text style={s.summarySub}>{monthJobs.length} jobs</Text>
                  </View>
                  <View style={s.summaryBox}>
                    <Text style={s.summaryLabel}>All-time (net)</Text>
                    <Text style={s.summaryVal}>R {netTotal.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
                    <Text style={s.summarySub}>{jobs.length} jobs · {Math.round(COMMISSION_PCT * 100)}% fee</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.upgradePrompt} onPress={() => router.push('/(provider)/subscription')}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.upgradeTitle}>💎 Lower your commission</Text>
                    <Text style={s.upgradeSub}>Pro plan: 10% · Elite plan: 7% — keep more of every job</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.gold} />
                </TouchableOpacity>
              </>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>No completed jobs yet</Text>
              <Text style={s.emptySub}>Completed jobs and earnings will appear here</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const gross = b.finalAmount ?? b.quotedAmount
            const fee   = gross * COMMISSION_PCT
            const net   = gross - fee
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.iconWrap}>
                    <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[b.serviceType] ?? '🔧'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.serviceName}>{formatService(b.serviceType)}</Text>
                    <Text style={s.meta}>{formatDate(b.createdAt)} · {b.address}</Text>
                  </View>
                  <Text style={s.netAmt}>+R {net.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownText}>Gross R {gross.toLocaleString('en-ZA')}</Text>
                  <Text style={s.breakdownDot}>·</Text>
                  <Text style={s.breakdownText}>Fee R {fee.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} (15%)</Text>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { padding: 2 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },

  summaryRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryBox:    { flex: 1, backgroundColor: colors.navy, borderRadius: 14, padding: 14 },
  summaryLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: '600' },
  summaryVal:    { fontSize: 20, fontWeight: '700', color: '#fff' },
  summarySub:    { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  emptyWrap:     { flex: 1 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:      { fontSize: 12, color: colors.gray400, textAlign: 'center', paddingHorizontal: 32 },

  card:          { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:      { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  serviceName:   { fontSize: 13, fontWeight: '700', color: colors.black },
  meta:          { fontSize: 11, color: colors.gray400, marginTop: 2 },
  netAmt:        { fontSize: 14, fontWeight: '700', color: colors.green },
  breakdownRow:  { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.gray100 },
  breakdownText: { fontSize: 11, color: colors.gray400 },
  breakdownDot:  { fontSize: 11, color: colors.gray200 },
  upgradePrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.black, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: colors.gold + '60' },
  upgradeTitle:  { fontSize: 13, fontWeight: '700', color: colors.gold, marginBottom: 2 },
  upgradeSub:    { fontSize: 11, color: colors.gray400, lineHeight: 16 },
})
