/**
 * Emergency callout screen — fast-track booking that skips provider selection.
 * Selects the nearest available provider automatically and books immediately.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { Linking } from 'react-native'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'
import { useAuth } from '../../context/auth'
import CardInput from '../../components/CardInput'
import type { CardDetails } from '../../lib/api'

const SERVICES = [
  { value: 'plumbing',    label: 'Plumbing',    emoji: '💧' },
  { value: 'electrical',  label: 'Electrical',  emoji: '⚡' },
  { value: 'gas',         label: 'Gas leak',    emoji: '🔥' },
  { value: 'locksmith',   label: 'Locksmith',   emoji: '🔑' },
  { value: 'hvac',        label: 'HVAC / AC',   emoji: '❄️' },
  { value: 'handyman',    label: 'Handyman',    emoji: '🔧' },
]

const EMERGENCY_RATE = 850 // flat call-out fee

export default function EmergencyScreen() {
  const { user } = useAuth()
  const [step,       setStep]       = useState<'select' | 'dispatched'>('select')
  const [service,    setService]    = useState(SERVICES[0])
  const [notes,      setNotes]      = useState('')
  const [card,       setCard]       = useState<CardDetails | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [bookingId,  setBookingId]  = useState<string | null>(null)
  const [eta,        setEta]        = useState(12)
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

  // ETA countdown once dispatched
  useEffect(() => {
    if (step !== 'dispatched') return
    const id = setInterval(() => setEta(e => Math.max(1, e - 1)), 60_000)
    return () => clearInterval(id)
  }, [step])

  const handleDispatch = async () => {
    if (!user) return
    if (!card) { Alert.alert('Card required', 'Please enter your card details.'); return }
    setLoading(true)
    try {
      // Find nearest available provider for this service
      const providers = await api.providers.list(service.value, coords?.lat, coords?.lng)
      const provider  = providers.find(p => p.availability?.emergency) ?? providers[0]

      const booking = await api.bookings.create({
        clientId:      user.id,
        serviceType:   service.value as any,
        location:      coords ? `${coords.lat},${coords.lng}` : '-29.8587,31.0218',
        address:       address || 'Durban, KZN',
        quotedAmount:  EMERGENCY_RATE,
        paymentMethod: 'card',
        notes:         `EMERGENCY: ${notes}`.trim(),
      })

      if (provider) {
        await api.bookings.assignProvider(booking.id, provider.id)
      }

      await api.payments.hold(booking.id, EMERGENCY_RATE, card)
      setBookingId(booking.id)
      setEta(provider?.etaMinutes ?? 12)
      setStep('dispatched')
    } catch {
      Alert.alert('Dispatch failed', 'Could not find an available provider. Please call 081 000 0000 for immediate assistance.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>⚡ Emergency callout</Text>
      </View>

      {step === 'dispatched' ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={s.dispatchedCard}>
            <View style={s.pulseWrap}>
              <View style={s.pulse} />
              <View style={s.pulseInner}>
                <Text style={s.pulseEmoji}>⚡</Text>
              </View>
            </View>
            <Text style={s.dispatchedTitle}>Technician dispatched</Text>
            <Text style={s.etaText}>ETA {eta} min</Text>
            <Text style={s.dispatchedSub}>A {service.label.toLowerCase()} technician is on the way to your location</Text>
          </View>

          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.gray400} />
              <Text style={s.infoText}>{address || 'Your location'}</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.gray400} />
              <Text style={s.infoText}>R {EMERGENCY_RATE.toLocaleString()} emergency call-out held</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
              <Text style={[s.infoText, { color: colors.green }]}>Payment secured by Peach Payments</Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.callBtn}
            onPress={() => Linking.openURL('tel:+27800123456')}
          >
            <Ionicons name="call-outline" size={18} color={colors.white} />
            <Text style={s.callBtnText}>Call provider directly</Text>
          </TouchableOpacity>

          {bookingId && (
            <TouchableOpacity style={s.trackBtn} onPress={() => router.replace(`/(client)/booking-detail?id=${bookingId}` as any)}>
              <Text style={s.trackBtnText}>Track booking →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={s.urgencyBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.red} />
            <Text style={s.urgencyText}>Technician arrives in <Text style={{ fontWeight: '700' }}>10–15 minutes</Text>. R{EMERGENCY_RATE} flat call-out fee.</Text>
          </View>

          {/* Service type */}
          <Text style={s.sectionLabel}>WHAT DO YOU NEED?</Text>
          <View style={s.serviceGrid}>
            {SERVICES.map(svc => (
              <TouchableOpacity
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
          <Text style={s.holdNote}>R{EMERGENCY_RATE} held now · released when job is complete</Text>

          <TouchableOpacity
            style={[s.dispatchBtn, (!card || loading) && { opacity: 0.5 }]}
            onPress={handleDispatch}
            disabled={!card || loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <>
                  <Ionicons name="flash" size={20} color={colors.white} />
                  <Text style={s.dispatchBtnText}>Dispatch now — R{EMERGENCY_RATE}</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.callAlt} onPress={() => Linking.openURL('tel:+27800123456')}>
            <Ionicons name="call-outline" size={16} color={colors.gray400} />
            <Text style={s.callAltText}>Or call us: 081 000 0000</Text>
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

  callAlt:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  callAltText:       { fontSize: 13, color: colors.gray400 },

  // Dispatched state
  dispatchedCard:    { backgroundColor: '#1A0000', borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 20 },
  pulseWrap:         { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pulse:             { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.red + '25' },
  pulseInner:        { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  pulseEmoji:        { fontSize: 30 },
  dispatchedTitle:   { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 8 },
  etaText:           { fontSize: 36, fontWeight: '700', color: colors.red, marginBottom: 8 },
  dispatchedSub:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },

  infoCard:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, gap: 12 },
  infoRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText:          { flex: 1, fontSize: 13, color: colors.black, lineHeight: 18 },

  callBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.green, borderRadius: 14, padding: 16, marginBottom: 10 },
  callBtnText:       { fontSize: 15, fontWeight: '700', color: colors.white },
  trackBtn:          { alignItems: 'center', padding: 14 },
  trackBtnText:      { fontSize: 14, fontWeight: '600', color: colors.gold },
})
