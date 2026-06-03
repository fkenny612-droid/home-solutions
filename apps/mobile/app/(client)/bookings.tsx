import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'

const STATUS_LABEL: Record<string, { label: string; color: string; emoji: string }> = {
  pending:     { label: 'Pending',     color: colors.amber,  emoji: '⏳' },
  accepted:    { label: 'Accepted',    color: colors.accent, emoji: '✅' },
  en_route:    { label: 'En route',    color: colors.accent, emoji: '🚗' },
  in_progress: { label: 'In progress', color: colors.gold,   emoji: '🔧' },
  completed:   { label: 'Completed',   color: colors.accent, emoji: '✔️' },
  cancelled:   { label: 'Cancelled',   color: colors.red,    emoji: '✕'  },
  emergency:   { label: 'Emergency',   color: colors.red,    emoji: '🚨' },
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹',
  hvac: '❄️', gas: '🔥', handyman: '🔧',
}

export default function BookingsTab() {
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState(false)

  const load = async () => {
    try {
      const data = await api.bookings.list()
      setBookings(data.filter(b => !['completed', 'cancelled'].includes(b.status)))
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>My Bookings</Text>
        <Text style={s.sub}>{bookings.length} active</Text>
      </View>

      <ScrollView
        style={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>⚠️ Could not load bookings — pull to retry</Text>
          </View>
        )}

        {!error && bookings.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyTitle}>No active bookings</Text>
            <Text style={s.emptySub}>Book a service from the Home tab</Text>
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/(client)')}>
              <Text style={s.bookBtnText}>Book a service</Text>
            </TouchableOpacity>
          </View>
        )}

        {bookings.map(b => {
          const st = STATUS_LABEL[b.status] ?? { label: b.status, color: colors.textMuted, emoji: '•' }
          return (
            <View key={b.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.icon, { backgroundColor: '#F0F9FF' }]}>
                  <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[b.serviceType] ?? '🔧'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.service}>{b.serviceType.charAt(0).toUpperCase() + b.serviceType.slice(1)}</Text>
                  <Text style={s.address} numberOfLines={1}>{b.address}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.color + '18' }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.emoji} {st.label}</Text>
                </View>
              </View>

              <View style={s.meta}>
                <Text style={s.metaText}>💰 R {b.quotedAmount.toLocaleString()}</Text>
                <Text style={s.metaText}>#{b.id.slice(-6).toUpperCase()}</Text>
                <Text style={s.metaText}>🕐 {new Date(b.createdAt).toLocaleDateString('en-ZA')}</Text>
              </View>
            </View>
          )
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.cream },
  header:      { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  title:       { fontSize: 20, fontWeight: '300', color: '#fff' },
  sub:         { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  body:        { padding: 14 },
  errorBox:    { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText:   { fontSize: 13, color: colors.red },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji:  { fontSize: 44 },
  emptyTitle:  { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySub:    { fontSize: 13, color: colors.textLight },
  bookBtn:     { marginTop: 12, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  bookBtnText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon:        { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  service:     { fontSize: 14, fontWeight: '600', color: colors.text },
  address:     { fontSize: 11, color: colors.textLight, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: '600' },
  meta:        { flexDirection: 'row', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.creamMid },
  metaText:    { fontSize: 11, color: colors.textMuted },
})
