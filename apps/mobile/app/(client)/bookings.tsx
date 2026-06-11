import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending:     { label: 'Pending',     bg: colors.amberBg,  fg: colors.amber  },
  accepted:    { label: 'Accepted',    bg: colors.greenBg,  fg: colors.green  },
  en_route:    { label: 'En route',    bg: colors.greenBg,  fg: colors.green  },
  in_progress: { label: 'In progress', bg: '#FFF8EC',       fg: colors.gold   },
  completed:   { label: 'Completed',   bg: colors.greenBg,  fg: colors.green  },
  cancelled:   { label: 'Cancelled',   bg: colors.redBg,    fg: colors.red    },
  emergency:   { label: 'Emergency',   bg: colors.redBg,    fg: colors.red    },
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹',
  hvac: '❄️', gas: '🔥', handyman: '🔧',
  tiling: '🪟', painting: '🎨', landscaping: '🌿', pool: '🏊',
  pest_control: '🐜', locksmith: '🔑', carpentry: '🪚', solar: '☀️',
  security: '📷', paving: '🛤️', waterproofing: '💦', roofing: '🏠',
  gate_motor: '🚪', moving: '📦', bricklaying: '🧱', borehole: '🌊',
  septic_tank: '🚽', dstv: '📡',
  tent_hire: '⛺', chair_table_hire: '🪑', decor_hire: '🌸',
  sound_pa_hire: '🔊', jumping_castle_hire: '🏰',
  catering_equipment_hire: '🍳', cold_room_hire: '🧊', mobile_toilet_hire: '🚻',
  generator_hire: '⚡', water_bowser_hire: '🚰',
  van_hire: '🚐', bakkie_hire: '🛻', furniture_removal: '🛋️',
  last_mile_delivery: '📬', livestock_transport: '🐄',
  security_guard_hire: '💂',
}

export default function BookingsTab() {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(false)

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
        <Text style={s.title}>Bookings</Text>
        <Text style={s.sub}>{bookings.length} active</Text>
      </View>

      <ScrollView
        style={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>Could not load bookings — pull to retry</Text>
          </View>
        )}

        {!error && bookings.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No active bookings</Text>
            <Text style={s.emptySub}>Book a service from the Home tab</Text>
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/(client)')}>
              <Text style={s.bookBtnText}>Book a service</Text>
            </TouchableOpacity>
          </View>
        )}

        {bookings.map(b => {
          const st = STATUS_META[b.status] ?? { label: b.status, bg: colors.gray50, fg: colors.gray600 }
          return (
            <TouchableOpacity
              key={b.id}
              style={s.card}
              onPress={() => router.push({ pathname: '/(client)/booking-detail', params: { id: b.id } })}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <View style={s.icon}>
                  <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[b.serviceType] ?? '🔧'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.service}>{b.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                  <Text style={s.address} numberOfLines={1}>{b.address}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>

              <View style={s.meta}>
                <Text style={s.metaText}>R {b.quotedAmount.toLocaleString()}</Text>
                <Text style={s.metaDivider}>·</Text>
                <Text style={s.metaText}>#{b.id.slice(-6).toUpperCase()}</Text>
                <Text style={s.metaDivider}>·</Text>
                <Text style={s.metaText}>{new Date(b.createdAt).toLocaleDateString('en-ZA')}</Text>
              </View>

              {['accepted','en_route','in_progress'].includes(b.status) && (
                <View style={s.chatBtn}>
                  <Text style={s.chatBtnText}>Tap to view & message provider →</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.gray50 },
  header:      { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  title:       { fontSize: 24, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },
  sub:         { fontSize: 12, color: colors.gray400, marginTop: 2 },
  body:        { padding: 16 },
  errorBox:    { backgroundColor: colors.redBg, borderRadius: 10, padding: 14, marginBottom: 12 },
  errorText:   { fontSize: 13, color: colors.red },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: colors.black },
  emptySub:    { fontSize: 14, color: colors.gray400 },
  bookBtn:     { marginTop: 8, backgroundColor: colors.black, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13 },
  bookBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  card:        { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 10 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon:        { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  service:     { fontSize: 14, fontWeight: '700', color: colors.black },
  address:     { fontSize: 11, color: colors.gray400, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  meta:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  metaText:    { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  metaDivider: { fontSize: 12, color: colors.gray200 },
  chatBtn:     { marginTop: 10, backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  chatBtnText: { fontSize: 13, fontWeight: '600', color: colors.black },
})
