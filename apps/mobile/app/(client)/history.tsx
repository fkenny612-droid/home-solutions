import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, Booking, BookingStatus } from '../../lib/api'
import { colors } from '../../constants/theme'

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹', hvac: '❄️', gas: '🔥',
  handyman: '🔧', tiling: '🪟', painting: '🖌️', landscaping: '🌿', pool: '🏊',
  pest_control: '🐛', locksmith: '🔑', carpentry: '🪚', solar: '☀️',
  security: '🛡️', paving: '🧱', waterproofing: '🌧️', roofing: '🏠',
  gate_motor: '🚪', moving: '📦', tent_hire: '⛺', generator_hire: '⚙️',
  van_hire: '🚐', bakkie_hire: '🛻', furniture_removal: '🛋️',
}

const FILTERS: { label: string; statuses: BookingStatus[] }[] = [
  { label: 'All',       statuses: ['completed', 'cancelled'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
]

function formatService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function warrantyDaysLeft(iso: string | null) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return diff > 0 ? Math.ceil(diff / 86400000) : null
}

export default function HistoryTab() {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState(0)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [completed, cancelled] = await Promise.allSettled([
        api.bookings.list('completed'),
        api.bookings.list('cancelled'),
      ])
      const all: Booking[] = [
        ...(completed.status === 'fulfilled' ? completed.value : []),
        ...(cancelled.status === 'fulfilled' ? cancelled.value : []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setBookings(all)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = bookings.filter(b => FILTERS[filter].statuses.includes(b.status))

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>History</Text>
      </View>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        <Text style={s.sub}>{bookings.length} {bookings.length === 1 ? 'job' : 'jobs'}</Text>
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity key={i} style={[s.tab, filter === i && s.tabActive]} onPress={() => setFilter(i)}>
            <Text style={[s.tabText, filter === i && s.tabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
        contentContainerStyle={displayed.length === 0 ? s.emptyWrap : { padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="time-outline" size={48} color={colors.gray200} />
            <Text style={s.emptyTitle}>No {FILTERS[filter].label.toLowerCase()} jobs</Text>
            <Text style={s.emptySub}>Completed and cancelled bookings appear here</Text>
          </View>
        }
        renderItem={({ item: b }) => {
          const emoji    = SERVICE_EMOJI[b.serviceType] ?? '🔧'
          const wDays    = warrantyDaysLeft(b.warrantyExpiresAt)
          const isCancelled = b.status === 'cancelled'
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(client)/booking-detail', params: { id: b.id } })}
            >
              <View style={s.iconWrap}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={s.topRow}>
                  <Text style={s.serviceName}>{formatService(b.serviceType)}</Text>
                  <Text style={[s.amount, isCancelled && s.amountCancelled]}>
                    {isCancelled ? '—' : `R ${(b.finalAmount ?? b.quotedAmount).toLocaleString('en-ZA')}`}
                  </Text>
                </View>
                <Text style={s.meta}>{formatDate(b.createdAt)} · {b.address}</Text>

                <View style={s.badgeRow}>
                  {isCancelled ? (
                    <View style={[s.badge, s.badgeCancelled]}>
                      <Text style={[s.badgeText, s.badgeTextCancelled]}>CANCELLED</Text>
                    </View>
                  ) : wDays != null ? (
                    <View style={[s.badge, s.badgeWarranty]}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.green} />
                      <Text style={[s.badgeText, s.badgeTextWarranty]}>WARRANTY · {wDays}d left</Text>
                    </View>
                  ) : (
                    <View style={[s.badge, s.badgeDone]}>
                      <Text style={[s.badgeText, s.badgeTextDone]}>COMPLETED</Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color={colors.gray200} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.gray50 },
  header:            { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title:             { fontSize: 24, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },
  sub:               { fontSize: 12, color: colors.gray400, marginTop: 2 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabs:              { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  tab:               { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:         { borderBottomWidth: 2, borderBottomColor: colors.gold },
  tabText:           { fontSize: 13, fontWeight: '500', color: colors.gray400 },
  tabTextActive:     { color: colors.black, fontWeight: '700' },

  emptyWrap:         { flex: 1 },
  empty:             { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle:        { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:          { fontSize: 12, color: colors.gray400, textAlign: 'center', paddingHorizontal: 32 },

  card:              { backgroundColor: colors.white, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  iconWrap:          { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  topRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  serviceName:       { fontSize: 14, fontWeight: '700', color: colors.black, flex: 1 },
  amount:            { fontSize: 14, fontWeight: '700', color: colors.black },
  amountCancelled:   { color: colors.gray400 },
  meta:              { fontSize: 11, color: colors.gray400, marginBottom: 8 },

  badgeRow:          { flexDirection: 'row', gap: 6 },
  badge:             { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:         { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  badgeWarranty:     { backgroundColor: colors.greenBg },
  badgeTextWarranty: { color: colors.green },
  badgeDone:         { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100 },
  badgeTextDone:     { color: colors.gray400 },
  badgeCancelled:    { backgroundColor: '#FFF0F0' },
  badgeTextCancelled:{ color: colors.red },
})
