import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'
import { useAuth } from '../../context/auth'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const REVIEW_TAGS = ['On time', 'Professional', 'Great work', 'Tidy', 'Friendly', 'Highly skilled', 'Good value']

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
  const { user } = useAuth()
  const [booking,    setBooking]    = useState<Booking | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [providerKm,     setProviderKm]     = useState<number | null>(null)
  const [clientCoords,   setClientCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [photoIndex,     setPhotoIndex]     = useState<number | null>(null)

  const [hasReviewed,    setHasReviewed]    = useState(false)
  const [checkedReview,  setCheckedReview]  = useState(false)
  const [ratingOpen,     setRatingOpen]     = useState(false)
  const [autoPrompted,   setAutoPrompted]   = useState(false)
  const [stars,          setStars]          = useState(0)
  const [selectedTags,   setSelectedTags]   = useState<string[]>([])
  const [comment,        setComment]        = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

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

  useEffect(() => {
    if (!booking || booking.status !== 'completed' || !booking.providerId) { setCheckedReview(true); return }
    api.providers.reviews(booking.providerId)
      .then(reviews => setHasReviewed(reviews.some(r => r.bookingId === booking.id)))
      .catch(() => {})
      .finally(() => setCheckedReview(true))
  }, [booking?.id, booking?.status, booking?.providerId])

  // Get client location once for distance calc
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
        setClientCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      }).catch(() => {})
    })
  }, [])

  // Poll provider location every 20s when en_route
  useEffect(() => {
    if (booking?.status !== 'en_route' || !booking.providerId) return
    const fetchLocation = () => {
      api.providers.get(booking.providerId!).then(p => {
        if (p.lat != null && p.lng != null && clientCoords) {
          setProviderKm(haversineKm(clientCoords.lat, clientCoords.lng, p.lat, p.lng))
        }
      }).catch(() => {})
    }
    fetchLocation()
    const id = setInterval(fetchLocation, 20_000)
    return () => clearInterval(id)
  }, [booking?.status, booking?.providerId, clientCoords])

  useEffect(() => {
    if (checkedReview && booking?.status === 'completed' && booking.providerId && !hasReviewed && !autoPrompted) {
      setAutoPrompted(true)
      setRatingOpen(true)
    }
  }, [checkedReview, hasReviewed, autoPrompted, booking?.status, booking?.providerId])

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const closeRating = () => {
    setRatingOpen(false)
    setStars(0); setSelectedTags([]); setComment('')
  }

  const submitReview = async () => {
    if (!booking?.providerId || stars === 0) { Alert.alert('Add a rating', 'Please select a star rating.'); return }
    setSubmittingReview(true)
    try {
      await api.providers.addReview(booking.providerId, stars, selectedTags, comment.trim() || undefined, user?.id, booking.id)
      setHasReviewed(true)
      closeRating()
      Alert.alert('Thank you!', 'Your review has been submitted.')
    } catch {
      Alert.alert('Error', 'Could not submit your review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

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
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
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

        {/* Live location card — en_route only */}
        {booking.status === 'en_route' && (
          <View style={s.locationCard}>
            <View style={s.locationCardLeft}>
              <View style={s.locationPulseWrap}>
                <View style={s.locationPulse} />
                <Ionicons name="car" size={20} color={colors.green} />
              </View>
              <View>
                <Text style={s.locationTitle}>Provider on the way</Text>
                {providerKm != null
                  ? <Text style={s.locationSub}>{providerKm < 1 ? `${Math.round(providerKm * 1000)} m away` : `${providerKm.toFixed(1)} km away`} · ~{Math.max(1, Math.round(providerKm * 2))} min ETA</Text>
                  : <Text style={s.locationSub}>Locating provider…</Text>
                }
              </View>
            </View>
            <View style={s.locationDot} />
          </View>
        )}

        {/* Details */}
        <View style={s.card}>
          <Text style={s.cardLabel}>BOOKING DETAILS</Text>
          {[
            { icon: 'location-outline',  label: 'Address',   value: booking.address },
            { icon: 'calendar-outline',  label: 'Booked',    value: new Date(booking.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) },
            { icon: 'construct-outline', label: 'Service',   value: label },
            { icon: 'person-outline',    label: 'Provider',  value: booking.providerName ?? (booking.providerId ? `Provider #${booking.providerId.slice(-6).toUpperCase()}` : 'Awaiting assignment') },
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
          {isComplete && booking.paymentReleased && (
            <TouchableOpacity activeOpacity={0.8} style={s.receiptLink} onPress={() => router.push({ pathname: '/(client)/receipt', params: { id: booking.id } })}>
              <Ionicons name="receipt-outline" size={14} color={colors.gray600} />
              <Text style={s.receiptLinkText}>View receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rate this job */}
        {isComplete && booking.providerId && checkedReview && (
          hasReviewed ? (
            <View style={s.card}>
              <View style={s.ratedRow}>
                <Ionicons name="star" size={16} color={colors.gold} />
                <Text style={s.ratedText}>You've rated this job. Thanks for the feedback!</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.8} style={s.rateCard} onPress={() => setRatingOpen(true)}>
              <View style={{ flex: 1 }}>
                <Text style={s.rateTitle}>How was your service?</Text>
                <Text style={s.rateSub}>Rate this job to help other clients</Text>
              </View>
              <View style={s.rateBtn}>
                <Text style={s.rateBtnText}>Rate now</Text>
              </View>
            </TouchableOpacity>
          )
        )}

        {/* Job photos gallery */}
        {booking.images && booking.images.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>JOB PHOTOS</Text>
            <View style={s.photoGrid}>
              {booking.images.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
            <TouchableOpacity activeOpacity={0.8}
              style={s.actionBtn}
              onPress={() => router.push({ pathname: '/(client)/conversation', params: { bookingId: booking.id } })}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={s.actionBtnText}>Message provider</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity activeOpacity={0.8}
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

      {/* Full-screen photo viewer */}
      <Modal visible={photoIndex !== null} transparent animationType="fade" onRequestClose={() => setPhotoIndex(null)}>
        <View style={s.photoModal}>
          <TouchableOpacity activeOpacity={0.8} style={s.photoModalClose} onPress={() => setPhotoIndex(null)}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          {photoIndex !== null && booking.images?.[photoIndex] && (
            <Image source={{ uri: booking.images[photoIndex] }} style={s.photoFull} resizeMode="contain" />
          )}
          {booking.images && booking.images.length > 1 && (
            <View style={s.photoNavRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPhotoIndex(i => Math.max(0, (i ?? 0) - 1))} style={s.photoNavBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.white} />
              </TouchableOpacity>
              <Text style={s.photoCounter}>{(photoIndex ?? 0) + 1} / {booking.images.length}</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPhotoIndex(i => Math.min((booking.images?.length ?? 1) - 1, (i ?? 0) + 1))} style={s.photoNavBtn}>
                <Ionicons name="chevron-forward" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Rating modal */}
      <Modal visible={ratingOpen} animationType="slide" transparent onRequestClose={closeRating}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Rate your service</Text>
            <Text style={s.modalSub}>{label} · #{booking.id.slice(-8).toUpperCase()}</Text>

            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity activeOpacity={0.8} key={n} onPress={() => setStars(n)} style={{ padding: 4 }}>
                  <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color={colors.gold} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.tagsWrap}>
              {REVIEW_TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <TouchableOpacity activeOpacity={0.8}
                    key={tag}
                    style={[s.tagChip, active && s.tagChipActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[s.tagChipText, active && s.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TextInput
              style={s.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={colors.gray300}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity activeOpacity={0.8} style={s.skipBtn} onPress={closeRating}>
                <Text style={s.skipBtnText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8}
                style={[s.submitBtn, (submittingReview || stars === 0) && { opacity: 0.5 }]}
                onPress={submitReview}
                disabled={submittingReview || stars === 0}
              >
                {submittingReview
                  ? <ActivityIndicator color={colors.black} size="small" />
                  : <Text style={s.submitBtnText}>Submit review</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Receipt link
  receiptLink:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  receiptLinkText:   { fontSize: 13, color: colors.gray600, fontWeight: '600' },
  // Rate card
  rateCard:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, margin: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.gold + '40' },
  rateTitle:         { fontSize: 14, fontWeight: '700', color: colors.black },
  rateSub:           { fontSize: 11, color: colors.gray400, marginTop: 2 },
  rateBtn:           { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  rateBtnText:       { fontSize: 12, fontWeight: '700', color: colors.black },
  ratedRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratedText:         { fontSize: 13, color: colors.gray600, flex: 1 },
  // Rating modal
  modalOverlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:        { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHandle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 16 },
  modalTitle:        { fontSize: 17, fontWeight: '700', color: colors.black, textAlign: 'center' },
  modalSub:          { fontSize: 12, color: colors.gray400, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  starsRow:          { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 18 },
  tagsWrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, justifyContent: 'center' },
  tagChip:           { borderWidth: 1, borderColor: colors.gray200, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  tagChipActive:     { backgroundColor: colors.gold + '20', borderColor: colors.gold },
  tagChipText:       { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  tagChipTextActive: { color: colors.gold, fontWeight: '700' },
  commentInput:      { backgroundColor: colors.gray50, borderRadius: 10, borderWidth: 1, borderColor: colors.gray100, padding: 12, fontSize: 13, color: colors.black, minHeight: 70, textAlignVertical: 'top', marginBottom: 18 },
  modalBtns:         { flexDirection: 'row', gap: 10 },
  skipBtn:           { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 13, alignItems: 'center' },
  skipBtnText:       { fontSize: 14, fontWeight: '600', color: colors.gray400 },
  submitBtn:         { flex: 2, backgroundColor: colors.gold, borderRadius: 10, padding: 13, alignItems: 'center' },
  submitBtnText:     { fontSize: 14, fontWeight: '700', color: colors.black },

  // Location card
  locationCard:      { backgroundColor: colors.greenBg, borderRadius: 14, marginHorizontal: 16, marginBottom: 0, marginTop: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.green + '30' },
  locationCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationPulseWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  locationPulse:     { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green + '25' },
  locationTitle:     { fontSize: 13, fontWeight: '700', color: colors.green },
  locationSub:       { fontSize: 11, color: colors.green + 'CC', marginTop: 2 },
  locationDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },

  // Photo gallery
  photoGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoThumb:        { width: 90, height: 90, borderRadius: 10, backgroundColor: colors.gray100 },

  // Full-screen photo modal
  photoModal:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  photoModalClose:   { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  photoFull:         { width: '100%', height: '70%' },
  photoNavRow:       { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20 },
  photoNavBtn:       { padding: 12 },
  photoCounter:      { fontSize: 14, color: colors.white, fontWeight: '600' },
})
