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

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹', hvac: '❄️', gas: '🔥',
  handyman: '🔧', tiling: '🪟', painting: '🖌️', landscaping: '🌿', pool: '🏊',
  pest_control: '🐛', locksmith: '🔑', carpentry: '🪚', solar: '☀️',
  security: '🛡️', roofing: '🏠', gate_motor: '🚪', moving: '📦',
}

function formatService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function WarrantyBar({ expires }: { expires: string }) {
  const total = 90
  const left  = Math.max(0, daysLeft(expires))
  const pct   = Math.min(1, left / total)
  const color = pct > 0.5 ? colors.green : pct > 0.2 ? colors.gold : colors.red
  return (
    <View style={w.barWrap}>
      <View style={w.barTrack}>
        <View style={[w.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[w.barLabel, { color }]}>{left}d left</Text>
    </View>
  )
}

const w = StyleSheet.create({
  barWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  barTrack: { flex: 1, height: 5, backgroundColor: colors.gray100, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },
  barLabel: { fontSize: 11, fontWeight: '700', minWidth: 48, textAlign: 'right' },
})

export default function WarrantiesScreen() {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const completed = await api.bookings.list('completed')
      const withWarranty = completed.filter(
        b => b.warrantyExpiresAt && daysLeft(b.warrantyExpiresAt) > 0
      )
      withWarranty.sort((a, b) =>
        new Date(a.warrantyExpiresAt!).getTime() - new Date(b.warrantyExpiresAt!).getTime()
      )
      setBookings(withWarranty)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Active Warranties</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
          contentContainerStyle={bookings.length === 0 ? s.emptyWrap : { padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            bookings.length > 0 ? (
              <View style={s.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
                <Text style={s.infoText}>
                  All completed jobs include a 90-day workmanship warranty. If anything goes wrong, contact us and we'll send the provider back at no charge.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="shield-outline" size={52} color={colors.gray200} />
              <Text style={s.emptyTitle}>No active warranties</Text>
              <Text style={s.emptySub}>Completed jobs include a 90-day warranty. Book a service to get started.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.replace('/(client)')}>
                <Text style={s.emptyBtnText}>Browse services</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: b }) => {
            const days    = daysLeft(b.warrantyExpiresAt!)
            const urgent  = days <= 14
            return (
              <TouchableOpacity
                style={[s.card, urgent && s.cardUrgent]}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(client)/booking-detail', params: { id: b.id } })}
              >
                <View style={s.cardTop}>
                  <View style={s.iconWrap}>
                    <Text style={{ fontSize: 22 }}>{SERVICE_EMOJI[b.serviceType] ?? '🔧'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.serviceName}>{formatService(b.serviceType)}</Text>
                    <Text style={s.address} numberOfLines={1}>{b.address}</Text>
                  </View>
                  {urgent && (
                    <View style={s.urgentBadge}>
                      <Text style={s.urgentText}>EXPIRING SOON</Text>
                    </View>
                  )}
                </View>

                <WarrantyBar expires={b.warrantyExpiresAt!} />

                <View style={s.metaRow}>
                  <Text style={s.meta}>Completed {formatDate(b.createdAt)}</Text>
                  <Text style={s.meta}>Expires {formatDate(b.warrantyExpiresAt!)}</Text>
                </View>

                <TouchableOpacity
                  style={s.claimBtn}
                  onPress={() => router.push({ pathname: '/(client)/booking-detail', params: { id: b.id } })}
                >
                  <Ionicons name="construct-outline" size={14} color={colors.gold} />
                  <Text style={s.claimBtnText}>Report an issue</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.gray50 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { padding: 2 },
  title:        { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.greenBg, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.green + '30' },
  infoText:     { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 18 },

  emptyWrap:    { flex: 1 },
  empty:        { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: colors.black },
  emptySub:     { fontSize: 13, color: colors.gray400, textAlign: 'center', lineHeight: 19 },
  emptyBtn:     { marginTop: 8, backgroundColor: colors.gold, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: colors.black },

  card:         { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.gray100 },
  cardUrgent:   { borderColor: colors.gold + '60', backgroundColor: '#FFFBF0' },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconWrap:     { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  serviceName:  { fontSize: 14, fontWeight: '700', color: colors.black },
  address:      { fontSize: 11, color: colors.gray400, marginTop: 2 },
  urgentBadge:  { backgroundColor: colors.gold + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.gold + '50' },
  urgentText:   { fontSize: 8, fontWeight: '700', color: colors.gold, letterSpacing: 0.6 },
  metaRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta:         { fontSize: 11, color: colors.gray400 },
  claimBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  claimBtnText: { fontSize: 13, fontWeight: '600', color: colors.gold },
})
