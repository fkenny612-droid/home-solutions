import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'

const STATUS_META: Record<string, { label: string; bg: string; fg: string; step: number }> = {
  pending:     { label: 'Pending',     bg: colors.amberBg, fg: colors.amber, step: 0 },
  accepted:    { label: 'Accepted',    bg: colors.greenBg, fg: colors.green, step: 1 },
  en_route:    { label: 'En route',    bg: colors.greenBg, fg: colors.green, step: 2 },
  in_progress: { label: 'In progress', bg: '#FFF8EC',      fg: colors.gold,  step: 3 },
  completed:   { label: 'Completed',   bg: colors.greenBg, fg: colors.green, step: 4 },
  cancelled:   { label: 'Cancelled',   bg: colors.redBg,   fg: colors.red,   step: -1 },
}

const TIMELINE = [
  { label: 'Booking received',   status: 'pending'     },
  { label: 'Provider accepted',  status: 'accepted'    },
  { label: 'Provider en route',  status: 'en_route'    },
  { label: 'Job in progress',    status: 'in_progress' },
  { label: 'Job complete',       status: 'completed'   },
]

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹', hvac: '❄️', gas: '🔥', handyman: '🔧',
  tiling: '🪟', painting: '🎨', landscaping: '🌿', pool: '🏊', pest_control: '🐜',
  locksmith: '🔑', carpentry: '🪚', solar: '☀️', security: '📷', paving: '🛤️',
  waterproofing: '💦', roofing: '🏠', gate_motor: '🚪', moving: '📦', bricklaying: '🧱',
  borehole: '🌊', septic_tank: '🚽', dstv: '📡', tent_hire: '⛺', chair_table_hire: '🪑',
  decor_hire: '🌸', sound_pa_hire: '🔊', jumping_castle_hire: '🏰', catering_equipment_hire: '🍳',
  cold_room_hire: '🧊', mobile_toilet_hire: '🚻', generator_hire: '⚡', water_bowser_hire: '🚰',
  van_hire: '🚐', bakkie_hire: '🛻', furniture_removal: '🛋️', last_mile_delivery: '📬',
  livestock_transport: '🐄', security_guard_hire: '💂',
}

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [booking,    setBooking]    = useState<Booking | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return
    if (isRefresh) setRefreshing(true)
    try {
      const b = await api.bookings.get(id)
      setBooking(b)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleCancel = () => {
    Alert.alert(
      'Cancel booking?',
      'This action cannot be undone. Any held payment will be released.',
      [
        { text: 'Keep booking', style: 'cancel' },
        { text: 'Cancel booking', style: 'destructive', onPress: async () => {
          setCancelling(true)
          try {
            await api.bookings.updateStatus(id!, 'cancelled')
            setBooking(prev => prev ? { ...prev, status: 'cancelled' } : prev)
          } catch { Alert.alert('Error', 'Could not cancel. Please try again.') }
          finally { setCancelling(false) }
        }},
      ]
    )
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  if (!booking) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><Text style={s.errorText}>Booking not found</Text></View>
    </SafeAreaView>
  )

  const meta    = STATUS_META[booking.status] ?? STATUS_META.pending
  const emoji   = SERVICE_EMOJI[booking.serviceType] ?? '🔧'
  const label   = booking.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const isCancelled = booking.status === 'cancelled'
  const isComplete  = booking.status === 'completed'
  const canChat     = ['accepted', 'en_route', 'in_progress'].includes(booking.status)
  const canCancel   = ['pending', 'accepted'].includes(booking.status)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{emoji} {label}</Text>
          <Text style={s.headerSub}>#{booking.id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[s.statusText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      >
        {/* Timeline */}
        {!isCancelled && (
          <View style={s.card}>
            <Text style={s.cardLabel}>STATUS TIMELINE</Text>
            {TIMELINE.map((step, i) => {
              const done   = meta.step >= i || (isComplete && i < 5)
              const active = meta.step === i
              return (
                <View key={i} style={s.timelineRow}>
                  <View style={s.timelineLeft}>
                    <View style={[s.dot, done ? s.dotDone : active ? s.dotActive : s.dotTodo]}>
                      {done && <Ionicons name="checkmark" size={10} color={colors.white} />}
                    </View>
                    {i < TIMELINE.length - 1 && <View style={[s.line, done && s.lineDone]} />}
                  </View>
                  <Text style={[s.timelineLabel, done && s.timelineDone, active && s.timelineActive]}>{step.label}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Details */}
        <View style={s.card}>
          <Text style={s.cardLabel}>BOOKING DETAILS</Text>
          {[
            { icon: 'location-outline',  label: 'Address',   value: booking.address },
            { icon: 'calendar-outline',  label: 'Booked',    value: new Date(booking.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) },
            { icon: 'construct-outline', label: 'Service',   value: label },
            { icon: 'person-outline',    label: 'Provider',  value: booking.providerId ? `Provider #${booking.providerId.slice(-6).toUpperCase()}` : 'Awaiting assignment' },
          ].map(row => (
            <View key={row.label} style={s.detailRow}>
              <Ionicons name={row.icon as any} size={16} color={colors.gray400} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.detailLabel}>{row.label}</Text>
                <Text style={s.detailValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={s.card}>
          <Text style={s.cardLabel}>PAYMENT</Text>
          <View style={s.payRow}>
            <Text style={s.payLabel}>Quoted amount</Text>
            <Text style={s.payValue}>R {booking.quotedAmount.toLocaleString()}</Text>
          </View>
          {booking.finalAmount && (
            <View style={s.payRow}>
              <Text style={s.payLabel}>Final amount</Text>
              <Text style={[s.payValue, { fontWeight: '700' }]}>R {booking.finalAmount.toLocaleString()}</Text>
            </View>
          )}
          <View style={s.payRow}>
            <Text style={s.payLabel}>Payment status</Text>
            <View style={[s.payStatusBadge, { backgroundColor: booking.paymentReleased ? colors.greenBg : booking.paymentHeld ? colors.amberBg : colors.gray100 }]}>
              <Text style={[s.payStatusText, { color: booking.paymentReleased ? colors.green : booking.paymentHeld ? colors.amber : colors.gray600 }]}>
                {booking.paymentReleased ? 'Released to provider' : booking.paymentHeld ? 'Held securely' : 'Not charged'}
              </Text>
            </View>
          </View>
          {isComplete && booking.warrantyExpiresAt && (
            <View style={s.warrantyRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
              <Text style={s.warrantyText}>90-day warranty active · expires {new Date(booking.warrantyExpiresAt).toLocaleDateString('en-ZA')}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {booking.notes && (
          <View style={s.card}>
            <Text style={s.cardLabel}>NOTES</Text>
            <Text style={s.notesText}>{booking.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          {canChat && (
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push({ pathname: '/(client)/chat', params: { bookingId: booking.id } })}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={s.actionBtnText}>Message provider</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[s.actionBtnSec, cancelling && { opacity: 0.5 }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator color={colors.red} size="small" />
                : <Text style={s.actionBtnSecText}>Cancel booking</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.gray50 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:         { fontSize: 15, color: colors.gray400 },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:           { padding: 2 },
  headerTitle:       { fontSize: 16, fontWeight: '700', color: colors.white },
  headerSub:         { fontSize: 11, color: colors.gray400, marginTop: 2 },
  statusBadge:       { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:        { fontSize: 11, fontWeight: '700' },
  card:              { backgroundColor: colors.white, borderRadius: 14, padding: 16, margin: 16, marginBottom: 0 },
  cardLabel:         { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, marginBottom: 14 },
  // Timeline
  timelineRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft:      { alignItems: 'center', width: 24, marginRight: 12 },
  dot:               { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotDone:           { backgroundColor: colors.green },
  dotActive:         { backgroundColor: colors.gold },
  dotTodo:           { backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  line:              { width: 2, height: 28, backgroundColor: colors.gray100, marginVertical: 2 },
  lineDone:          { backgroundColor: colors.green },
  timelineLabel:     { fontSize: 13, color: colors.gray400, paddingTop: 3, marginBottom: 28 },
  timelineDone:      { color: colors.green, fontWeight: '500' },
  timelineActive:    { color: colors.black, fontWeight: '700' },
  // Details
  detailRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  detailLabel:       { fontSize: 11, color: colors.gray400, marginBottom: 2 },
  detailValue:       { fontSize: 14, color: colors.black, fontWeight: '500' },
  // Payment
  payRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  payLabel:          { fontSize: 13, color: colors.gray600 },
  payValue:          { fontSize: 13, color: colors.black },
  payStatusBadge:    { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  payStatusText:     { fontSize: 11, fontWeight: '600' },
  warrantyRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  warrantyText:      { fontSize: 12, color: colors.green, flex: 1 },
  notesText:         { fontSize: 13, color: colors.gray600, lineHeight: 20 },
  // Actions
  actions:           { margin: 16, marginBottom: 0, gap: 10 },
  actionBtn:         { backgroundColor: colors.black, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  actionBtnText:     { fontSize: 15, fontWeight: '600', color: colors.white },
  actionBtnSec:      { borderRadius: 12, borderWidth: 1, borderColor: colors.red, alignItems: 'center', paddingVertical: 14 },
  actionBtnSecText:  { fontSize: 15, fontWeight: '600', color: colors.red },
})
