/**
 * Emergency callout — fast-track request that skips provider selection.
 * We pick the nearest emergency-available technician and REQUEST them: nothing is promised until they accept.
 * If nobody confirms in time the server cancels the request and returns the payment (see EMERGENCY_ACCEPT_WINDOW_MIN
 * in apps/api/src/modules/bookings/booking-expiry.ts — keep the two in step).
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native'
import { Alert } from '../../lib/alert'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { colors } from '../../constants/theme'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../context/auth'
import CardInput from '../../components/CardInput'
import type { Booking, CardDetails, Provider } from '../../lib/api'

const SERVICES = [
  { value: 'plumbing',    label: 'Plumbing',    emoji: '💧' },
  { value: 'electrical',  label: 'Electrical',  emoji: '⚡' },
  { value: 'gas',         label: 'Gas leak',    emoji: '🔥' },
  { value: 'locksmith',   label: 'Locksmith',   emoji: '🔑' },
  { value: 'hvac',        label: 'HVAC / AC',   emoji: '❄️' },
  { value: 'handyman',    label: 'Handyman',    emoji: '🔧' },
]

const ACCEPT_WINDOW_MIN = 15 // mirrors EMERGENCY_ACCEPT_WINDOW_MIN on the API
const EMERGENCY_RATE = 850 // flat call-out fee shown to the customer — the server charges its own EMERGENCY_CALLOUT_FEE and rejects a mismatch

// The API returns a flat `emergency` flag on each provider (not the nested `availability` object the type describes).
const takesEmergencies = (p: Provider) =>
  (p as unknown as { emergency?: boolean }).emergency === true || p.availability?.emergency === true

export default function EmergencyScreen() {
  const { user } = useAuth()
  const [step,       setStep]       = useState<'select' | 'waiting'>('select')
  const [service,    setService]    = useState(SERVICES[0])
  const [notes,      setNotes]      = useState('')
  const [card,       setCard]       = useState<CardDetails | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [bookingId,  setBookingId]  = useState<string | null>(null)
  const [liveStatus, setLiveStatus]  = useState<string>('pending')
  const [techName,   setTechName]   = useState('Your technician')
  const [tried,      setTried]      = useState<string[]>([])   // technicians who didn't take a previous attempt
  const [techId,     setTechId]     = useState<string | null>(null)
  const [address,    setAddress]    = useState('')
  const [coords,     setCoords]     = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude })
        Location.reverseGeocodeAsync(loc.coords).then(res => {
          if (res[0]) {
            const r = res[0]
            setAddress([r.street, r.city, r.region].filter(Boolean).join(', '))
          }
        }).catch(() => {})
      }).catch(() => {})
    })
  }, [])

  // Follow the real booking until it's accepted, under way, finished or cancelled.
  useEffect(() => {
    if (step !== 'waiting' || !bookingId) return
    let stopped = false
    const poll = async () => {
      try {
        const b = await api.bookings.get(bookingId)
        if (stopped) return
        setLiveStatus(b.status)
        if (b.status === 'cancelled') {
          stopped = true
          if (techId) setTried(prev => [...prev, techId])
          Alert.alert(
            'Emergency request cancelled',
            "No technician confirmed this request, so it was cancelled. The call-out fee on your card has been released — nothing was charged. You can try again.",
          )
          setStep('select'); setBookingId(null); setLiveStatus('pending')
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { stopped = true; clearInterval(id) }
  }, [step, bookingId])

  const handleDispatch = async () => {
    if (!user) return
    if (!card) { Alert.alert('Card required', 'Please enter your card details.'); return }
    setLoading(true)
    let booking: Booking | null = null
    try {
      // Find a technician FIRST. Nobody is charged for a call-out that nobody can attend.
      const providers = await api.providers.list(service.value, coords?.lat, coords?.lng)
      const provider  = providers.find(p => takesEmergencies(p) && !tried.includes(p.id))
      if (!provider) {
        Alert.alert('No technician available', "We couldn't find an emergency technician for this service near you right now. You have not been charged.")
        return
      }

      booking = await api.bookings.create({
        serviceType:    service.value as any,
        location:       coords ? `${coords.lat},${coords.lng}` : '-29.8587,31.0218',
        address:        address || 'Durban, KZN',
        paymentMethod:  'card',
        notes:          `EMERGENCY: ${notes}`.trim(),
        emergency:      true,
        expectedAmount: EMERGENCY_RATE,
      })

      // Secure the payment before the technician is asked — then ask them. They have to accept; we promise nothing yet.
      await api.payments.hold(booking.id, card)
      await api.bookings.assignProvider(booking.id, provider.id)

      setBookingId(booking.id)
      setTechId(provider.id)
      setTechName(provider.name)
      setLiveStatus('pending')
      setStep('waiting')
    } catch (e) {
      // Undo anything we started (cancelling also returns a held payment) and say why — never claim a dispatch that didn't happen.
      if (booking) { try { await api.bookings.updateStatus(booking.id, 'cancelled') } catch {} }
      Alert.alert('Request failed', e instanceof ApiError && e.status !== 0 ? e.message : 'Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!bookingId) return
    Alert.alert('Cancel this emergency request?', 'The call-out fee held on your card will be released.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: async () => {
        setLoading(true)
        try {
          await api.bookings.updateStatus(bookingId, 'cancelled')
          setStep('select'); setBookingId(null); setLiveStatus('pending')
        } catch (e) {
          Alert.alert("Couldn't cancel", e instanceof ApiError && e.status !== 0 ? e.message : 'Please check your connection and try again.')
        } finally { setLoading(false) }
      } },
    ])
  }

  const first = techName.split(' ')[0]
  const headline =
    liveStatus === 'accepted'    ? `${first} accepted`
    : liveStatus === 'en_route'    ? `${first} is on the way`
    : liveStatus === 'in_progress' ? 'Work has started'
    : liveStatus === 'completed'   ? 'Job complete'
    : `Waiting for ${first} to confirm`
  const subline =
    liveStatus === 'pending'     ? `If no technician confirms within ${ACCEPT_WINDOW_MIN} minutes, this request is cancelled and your payment is released.`
    : liveStatus === 'accepted'    ? 'They have confirmed. You will see when they set off.'
    : liveStatus === 'en_route'    ? 'Your technician has set off.'
    : liveStatus === 'in_progress' ? 'Your technician is working on it.'
    : 'Payment has been taken for the completed job.'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>⚡ Emergency callout</Text>
      </View>

      {step === 'waiting' ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={s.dispatchedCard}>
            <View style={s.pulseWrap}>
              <View style={s.pulse} />
              <View style={s.pulseInner}>
                {liveStatus === 'pending' ? <ActivityIndicator color={colors.white} /> : <Text style={s.pulseEmoji}>⚡</Text>}
              </View>
            </View>
            <Text style={s.dispatchedTitle}>{headline}</Text>
            <Text style={s.dispatchedSub}>{subline}</Text>
          </View>

          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.gray400} />
              <Text style={s.infoText}>{address || 'Your location'}</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.gray400} />
              <Text style={s.infoText}>R {EMERGENCY_RATE.toLocaleString()} call-out fee {liveStatus === 'completed' ? 'paid' : 'held on your card — not charged until the job is done'}</Text>
            </View>
          </View>

          {bookingId && liveStatus !== 'completed' && (
            <TouchableOpacity activeOpacity={0.8} style={s.callBtn}
              onPress={() => router.push({ pathname: '/(client)/conversation', params: { bookingId, providerName: techName } } as any)}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={s.callBtnText}>Message {first}</Text>
            </TouchableOpacity>
          )}

          {bookingId && ['pending', 'accepted', 'en_route'].includes(liveStatus) && (
            <TouchableOpacity activeOpacity={0.8} style={[s.trackBtn, loading && { opacity: 0.5 }]} onPress={handleCancel} disabled={loading}>
              <Text style={[s.trackBtnText, { color: colors.red }]}>Cancel request</Text>
            </TouchableOpacity>
          )}

          {bookingId && (
            <TouchableOpacity activeOpacity={0.8} style={s.trackBtn} onPress={() => router.replace(`/(client)/booking-detail?id=${bookingId}` as any)}>
              <Text style={s.trackBtnText}>View booking details →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={s.urgencyBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.red} />
            <Text style={s.urgencyText}>We'll ask the nearest emergency technician to take your job. You pay a flat <Text style={{ fontWeight: '700' }}>R{EMERGENCY_RATE}</Text> call-out fee. If nobody confirms within {ACCEPT_WINDOW_MIN} minutes, your request is cancelled and your card is not charged.</Text>
          </View>

          {/* Service type */}
          <Text style={s.sectionLabel}>WHAT DO YOU NEED?</Text>
          <View style={s.serviceGrid}>
            {SERVICES.map(svc => (
              <TouchableOpacity activeOpacity={0.8}
                key={svc.value}
                style={[s.serviceCard, service.value === svc.value && s.serviceCardActive]}
                onPress={() => setService(svc)}
              >
                <Text style={s.serviceEmoji}>{svc.emoji}</Text>
                <Text style={[s.serviceLabel, service.value === svc.value && s.serviceLabelActive]}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Location */}
          <Text style={s.sectionLabel}>YOUR LOCATION</Text>
          <View style={s.locationBox}>
            <Ionicons name="location" size={16} color={coords ? colors.green : colors.gray400} />
            <Text style={[s.locationText, !coords && { color: colors.gray400 }]}>
              {coords ? (address || 'Location detected') : 'Detecting your location…'}
            </Text>
          </View>

          {/* Notes */}
          <Text style={s.sectionLabel}>BRIEF DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Burst pipe in bathroom, water everywhere"
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={3}
          />

          {/* Card */}
          <Text style={s.sectionLabel}>PAYMENT</Text>
          <CardInput onChange={setCard} />
          <Text style={s.holdNote}>R{EMERGENCY_RATE} is held on your card now and only charged once the job is complete</Text>

          <TouchableOpacity activeOpacity={0.8}
            style={[s.dispatchBtn, (!card || loading) && { opacity: 0.5 }]}
            onPress={handleDispatch}
            disabled={!card || loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <>
                  <Ionicons name="flash" size={20} color={colors.white} />
                  <Text style={s.dispatchBtnText}>Request a technician — R{EMERGENCY_RATE}</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.gray50 },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A0000', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:           { padding: 2 },
  title:             { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  urgencyBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.redBg, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.red + '30' },
  urgencyText:       { flex: 1, fontSize: 13, color: colors.red, lineHeight: 18 },

  sectionLabel:      { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },

  serviceGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  serviceCard:       { width: '30%', backgroundColor: colors.white, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.gray100 },
  serviceCardActive: { borderColor: colors.red, backgroundColor: '#FFF5F5' },
  serviceEmoji:      { fontSize: 22 },
  serviceLabel:      { fontSize: 11, fontWeight: '600', color: colors.gray600, textAlign: 'center' },
  serviceLabelActive:{ color: colors.red },

  locationBox:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.gray100 },
  locationText:      { flex: 1, fontSize: 13, color: colors.black },

  notesInput:        { backgroundColor: colors.white, borderRadius: 12, padding: 14, fontSize: 13, color: colors.black, borderWidth: 1, borderColor: colors.gray100, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },

  holdNote:          { fontSize: 11, color: colors.gray400, textAlign: 'center', marginBottom: 16 },

  dispatchBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#C0392B', borderRadius: 14, padding: 18, marginBottom: 12 },
  dispatchBtnText:   { fontSize: 16, fontWeight: '700', color: colors.white },


  // Dispatched state
  dispatchedCard:    { backgroundColor: '#1A0000', borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 20 },
  pulseWrap:         { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pulse:             { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.red + '25' },
  pulseInner:        { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  pulseEmoji:        { fontSize: 30 },
  dispatchedTitle:   { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 8 },
  dispatchedSub:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },

  infoCard:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, gap: 12 },
  infoRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText:          { flex: 1, fontSize: 13, color: colors.black, lineHeight: 18 },

  callBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.green, borderRadius: 14, padding: 16, marginBottom: 10 },
  callBtnText:       { fontSize: 15, fontWeight: '700', color: colors.white },
  trackBtn:          { alignItems: 'center', padding: 14 },
  trackBtnText:      { fontSize: 14, fontWeight: '600', color: colors.gold },
})
