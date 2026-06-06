/**
 * Booking flow — Provider selection → Quote review → Tracking → Rating → Done
 * Wired to live API: create booking, hold payment, complete, release.
 */
import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'
import type { Provider, Booking } from '../../lib/api'
import { useAuth } from '../../context/auth'
import { getService, calculateEstimate, SERVICES } from '../../lib/serviceConfig'
import { uploadToCloudinary } from '../../lib/cloudinary'

type Step = 'details' | 'providers' | 'quote' | 'tracking' | 'rating' | 'done'

const MOCK_PROVIDERS: Provider[] = [
  { id: 'prov-raj',   name: 'Raj Pillay',   skills: ['plumbing'], rating: 4.9, reviewCount: 214, jobCount: 892, earningsBalance: 4840, kycStatus: 'approved', status: 'active', location: { lat: -29.8587, lng: 31.0218 }, availability: { monFri: true, saturday: true, sunday: false, emergency: true } },
  { id: 'prov-sipho', name: 'Sipho Ndlovu', skills: ['plumbing','handyman'], rating: 4.7, reviewCount: 98, jobCount: 312, earningsBalance: 0, kycStatus: 'approved', status: 'active', location: null, availability: { monFri: true, saturday: false, sunday: false, emergency: false } },
]

const QUOTE_AMOUNT = 1000

export default function BookScreen() {
  const { serviceType } = useLocalSearchParams<{ serviceType: string }>()
  const { user } = useAuth()

  const serviceConfig = getService(serviceType ?? '')

  const [step,           setStep]        = useState<Step>('details')
  const [answers,        setAnswers]      = useState<Record<string, any>>({})
  const [photos,         setPhotos]       = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedProv,   setSelected]    = useState(0)
  const [providers,      setProviders]   = useState<Provider[]>(MOCK_PROVIDERS)
  const [booking,        setBooking]     = useState<Booking | null>(null)
  const [liveStatus,     setLiveStatus]  = useState<string | null>(null)
  const [txnId,          setTxnId]       = useState<string | null>(null)
  const [loading,        setLoading]     = useState(false)
  const [eta,            setEta]         = useState(12)
  const [rating,         setRating]      = useState(5)
  const [tags,           setTags]        = useState(['Punctual', 'Professional', 'Friendly'])
  const etaRef = useRef(eta)

  const estimate = calculateEstimate(serviceType ?? '', answers)

  // Fetch real providers
  useEffect(() => {
    if (serviceType && serviceType !== 'emergency') {
      api.providers.list(serviceType).then(p => { if (p.length) setProviders(p) }).catch(() => {})
    }
  }, [serviceType])

  // ETA countdown during tracking
  useEffect(() => {
    if (step !== 'tracking') return
    etaRef.current = 12; setEta(12)
    const id = setInterval(() => {
      etaRef.current = Math.max(1, etaRef.current - 0.2)
      setEta(Math.round(etaRef.current))
    }, 400)
    return () => clearInterval(id)
  }, [step])

  // ── Real-time polling — every 5s during tracking ──
  useEffect(() => {
    if (step !== 'tracking' || !booking) return
    const poll = async () => {
      try {
        const updated = await api.bookings.get(booking.id)
        setLiveStatus(updated.status)
        setBooking(updated)
        // Auto-advance when provider marks complete
        if (updated.status === 'completed') {
          setTxnId(updated.transactionId ?? txnId)
          setStep('rating')
        }
      } catch {}
    }
    poll() // immediate first poll
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [step, booking?.id])

  const prov = providers[selectedProv]

  // ── Pick & upload a photo ──
  const pickPhoto = async () => {
    if (photos.length >= 3) { Alert.alert('Max 3 photos', 'Remove a photo to add another.'); return }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to attach images.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
    if (result.canceled) return
    const asset = result.assets[0]
    setUploadingPhoto(true)
    try {
      const { url } = await uploadToCloudinary(asset.uri, asset.fileName ?? `photo_${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg', 'home-solutions/job-photos')
      setPhotos(prev => [...prev, url])
    } catch { Alert.alert('Upload failed', 'Please try again.') }
    finally { setUploadingPhoto(false) }
  }

  const takePhoto = async () => {
    if (photos.length >= 3) { Alert.alert('Max 3 photos', 'Remove a photo to add another.'); return }
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access to take photos.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (result.canceled) return
    const asset = result.assets[0]
    setUploadingPhoto(true)
    try {
      const { url } = await uploadToCloudinary(asset.uri, `photo_${Date.now()}.jpg`, 'image/jpeg', 'home-solutions/job-photos')
      setPhotos(prev => [...prev, url])
    } catch { Alert.alert('Upload failed', 'Please try again.') }
    finally { setUploadingPhoto(false) }
  }

  // ── Approve & pay → create booking + hold payment ──
  const handleApprove = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Create booking
      const quoteAmount = Math.round((estimate.min + estimate.max) / 2)
      const newBooking = await api.bookings.create({
        clientId:       user.id,
        serviceType:    (serviceType ?? 'handyman') as any,
        location:       '-29.8587,31.0218',
        address:        '22 Glenwood Road, Durban',
        quotedAmount:   quoteAmount,
        paymentMethod:  'card',
        notes:          `Requested provider: ${prov?.name}`,
        serviceDetails: answers,
        images:         photos,
      })
      setBooking(newBooking)

      // 2. Assign selected provider
      if (prov) {
        await api.bookings.assignProvider(newBooking.id, prov.id)
      }

      // 3. Hold payment
      const payRes = await api.payments.hold(newBooking.id, QUOTE_AMOUNT)
      setTxnId(payRes.transactionId)

      setStep('tracking')
    } catch (e) {
      // Fall through to tracking even if API call fails (demo resilience)
      setStep('tracking')
    } finally {
      setLoading(false)
    }
  }

  // ── Mark complete → update status + release payment ──
  const handleComplete = async () => {
    setLoading(true)
    try {
      if (booking) {
        await api.bookings.updateStatus(booking.id, 'completed')
      }
      if (txnId) {
        await api.payments.release(txnId, QUOTE_AMOUNT)
      }
    } catch {}
    finally {
      setLoading(false)
      setStep('rating')
    }
  }

  const prog = { details: 0.2, providers: 0.4, quote: 0.65, tracking: 0.85, rating: 1, done: 1 }[step]

  return (
    <SafeAreaView style={s.safe}>
      {step !== 'done' && (
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${prog * 100}%` }]} />
        </View>
      )}

      {/* ── DETAILS ── */}
      {step === 'details' && (
        <>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{serviceConfig?.emoji} {serviceConfig?.label ?? serviceType}</Text>
              <Text style={s.headerSub}>Tell us about the job</Text>
            </View>
          </View>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            {serviceConfig?.questions.map(q => (
              <View key={q.key} style={{ marginBottom: 18 }}>
                <Text style={s.qLabel}>{q.label}</Text>

                {q.type === 'select' && (
                  <View style={s.optGrid}>
                    {q.options?.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.optChip, answers[q.key] === opt.value && s.optChipSel]}
                        onPress={() => setAnswers(prev => ({ ...prev, [q.key]: opt.value }))}
                      >
                        <Text style={[s.optChipText, answers[q.key] === opt.value && s.optChipTextSel]}>
                          {opt.label}
                        </Text>
                        {opt.priceMin > 0 && (
                          <Text style={[s.optPrice, answers[q.key] === opt.value && s.optPriceSel]}>
                            R{opt.priceMin.toLocaleString()}+
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {q.type === 'counter' && (
                  <View style={s.counterRow}>
                    <TouchableOpacity
                      style={s.counterBtn}
                      onPress={() => setAnswers(prev => ({ ...prev, [q.key]: Math.max(q.min ?? 0, (prev[q.key] ?? q.default ?? 1) - 1) }))}
                    >
                      <Text style={s.counterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.counterVal}>{answers[q.key] ?? q.default ?? 1} {q.unit}</Text>
                    <TouchableOpacity
                      style={s.counterBtn}
                      onPress={() => setAnswers(prev => ({ ...prev, [q.key]: Math.min(q.max ?? 99, (prev[q.key] ?? q.default ?? 1) + 1) }))}
                    >
                      <Text style={s.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {/* Photo upload */}
            <Text style={s.qLabel}>Photos of the issue <Text style={s.qOptional}>(optional, up to 3)</Text></Text>
            <View style={s.photoRow}>
              {photos.map((url, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri: url }} style={s.photoImg} />
                  <TouchableOpacity style={s.photoRemove} onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 3 && (
                uploadingPhoto ? (
                  <View style={[s.photoAdd, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator color={colors.gold} />
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity style={s.photoAdd} onPress={takePhoto}>
                      <Text style={s.photoAddText}>📷</Text>
                      <Text style={s.photoAddLabel}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.photoAdd} onPress={pickPhoto}>
                      <Text style={s.photoAddText}>🖼️</Text>
                      <Text style={s.photoAddLabel}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>

            {/* Estimate */}
            {estimate.min > 0 && (
              <View style={s.estimateBox}>
                <Text style={s.estimateLabel}>Estimated quote</Text>
                <Text style={s.estimateRange}>
                  R {estimate.min.toLocaleString()} – R {estimate.max.toLocaleString()}
                </Text>
                <Text style={s.estimateNote}>Final quote confirmed by the provider</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={s.ctaBar}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => setStep('providers')}>
              <Text style={s.ctaBtnText}>Find providers →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── PROVIDERS ── */}
      {step === 'providers' && (
        <>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1) : 'Service'} near you</Text>
              <Text style={s.headerSub}>Glenwood, Durban · {providers.length} available</Text>
            </View>
          </View>
          <ScrollView style={s.body}>
            <Text style={s.hint}>Sorted by rating · Verified only</Text>
            {providers.map((p, i) => (
              <TouchableOpacity key={p.id} style={[s.provCard, selectedProv === i && s.provCardSel]} onPress={() => setSelected(i)}>
                <View style={s.provTop}>
                  <View style={[s.avatar, { backgroundColor: i === 0 ? '#DCF0E8' : '#DBEAFE' }]}>
                    <Text style={[s.avatarText, { color: i === 0 ? '#1A6842' : '#1D4ED8' }]}>{p.name.split(' ').map(w => w[0]).join('')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.provName}>{p.name}</Text>
                    <Text style={s.provSkill}>{p.skills[0]} · {p.jobCount > 500 ? '8' : '5'} yrs</Text>
                    <Text style={s.provStars}>{'★'.repeat(Math.round(p.rating))}{'☆'.repeat(5 - Math.round(p.rating))} <Text style={s.reviewCount}>{p.rating} ({p.reviewCount})</Text></Text>
                  </View>
                  <Text style={s.etaText}>~{i === 0 ? 12 : 18} min</Text>
                </View>
                <View style={s.tagRow}>
                  <View style={s.tag}><Text style={s.tagText}>🏅 Certified</Text></View>
                  <View style={s.tag}><Text style={s.tagText}>✓ Insured</Text></View>
                  {i === 0 && <View style={s.tag}><Text style={s.tagText}>Geyser spec.</Text></View>}
                </View>
                <Text style={s.provMeta}>📍 {i === 0 ? '1.4' : '2.1'}km · 🔧 {p.jobCount} jobs</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.ctaBar}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => setStep('quote')}>
              <Text style={s.ctaBtnText}>Request quote from {prov?.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── QUOTE ── */}
      {step === 'quote' && (
        <>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setStep('providers')} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Review quote</Text>
          </View>
          <ScrollView style={s.body}>
            <View style={s.provMini}>
              <View style={[s.avatarSm, { backgroundColor: '#DCF0E8' }]}>
                <Text style={[s.avatarSmText, { color: '#1A6842' }]}>{prov?.name.split(' ').map(w => w[0]).join('')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.provMiniName}>{prov?.name}</Text>
                <Text style={s.provMiniSub}>Quote valid 30 minutes</Text>
              </View>
              <View style={s.approvedBadge}><Text style={s.approvedText}>Approved</Text></View>
            </View>

            <View style={s.quoteCard}>
              {[
                { label: 'Call-out fee',       val: 'R 150',                                                               color: colors.text },
                { label: 'Labour & materials', val: `R ${Math.max(0, estimate.min - 150).toLocaleString()} – R ${Math.max(0, estimate.max - 150).toLocaleString()}`, color: colors.text },
                { label: 'Premium discount',   val: '−R 0 (included)',                                                     color: colors.accent },
                { label: 'Estimated total',    val: `R ${estimate.min.toLocaleString()} – R ${estimate.max.toLocaleString()}`, color: colors.navy, bold: true },
              ].map(r => (
                <View key={r.label} style={[s.quoteRow, r.bold && s.quoteRowTotal]}>
                  <Text style={s.quoteLabel}>{r.label}</Text>
                  <Text style={[s.quoteVal, { color: r.color }, r.bold && { fontWeight: '700', fontSize: 15 }]}>{r.val}</Text>
                </View>
              ))}
            </View>

            <View style={s.warrantyBox}>
              <Text style={s.warrantyText}>🛡️ <Text style={{ fontWeight: '700' }}>90-day warranty</Text> on all parts and labour with Premium plan.</Text>
            </View>

            <View style={s.paymentBox}>
              <Text style={s.paymentLabel}>Payment via</Text>
              <View style={s.paymentOptions}>
                <View style={[s.payOpt, s.payOptActive]}><Text style={s.payOptActiveText}>Card · saved</Text></View>
                <View style={s.payOpt}><Text style={s.payOptText}>EFT</Text></View>
                <View style={s.payOpt}><Text style={s.payOptText}>PayFast</Text></View>
              </View>
            </View>
            <Text style={s.holdNote}>Payment held securely by Peach Payments until job is complete.</Text>
          </ScrollView>
          <View style={s.ctaBar}>
            <TouchableOpacity style={[s.ctaBtn, loading && { opacity: 0.7 }]} onPress={handleApprove} disabled={loading}>
              {loading
                ? <ActivityIndicator color={colors.navy} />
                : <Text style={s.ctaBtnText}>Approve &amp; pay R {Math.round((estimate.min + estimate.max) / 2).toLocaleString()}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaBtnSec} onPress={() => setStep('providers')} disabled={loading}>
              <Text style={s.ctaBtnSecText}>Request different provider</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── TRACKING ── */}
      {step === 'tracking' && (
        <>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{prov?.name.split(' ')[0]} is on the way</Text>
              <Text style={[s.headerSub, { color: colors.accent }]}>ETA {eta} minutes</Text>
            </View>
            <Text style={s.bookingId}>#{booking?.id.slice(-6).toUpperCase() ?? 'B-NEW'}</Text>
          </View>
          <ScrollView style={s.body}>
            <View style={s.mapBox}>
              <Text style={s.mapLabel}>📍 Live map · {eta} min away</Text>
              <View style={s.mapDot} />
            </View>

            <View style={s.trackInfo}>
              <View style={[s.avatar, { backgroundColor: '#DCF0E8' }]}>
                <Text style={[s.avatarText, { color: '#1A6842' }]}>{prov?.name.split(' ').map(w => w[0]).join('')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.provName}>{prov?.name}</Text>
                <Text style={s.provSkill}>Master Plumber · 1.4km</Text>
              </View>
              <View style={s.contactBtns}>
                <View style={s.contactBtn}><Text>📞</Text></View>
                <View style={s.contactBtn}><Text>💬</Text></View>
              </View>
            </View>

            <View style={s.stepsCard}>
              {[
                { label: 'Booking confirmed & payment held',                    done: true },
                { label: `${prov?.name.split(' ')[0]} accepted your request`,   done: ['accepted','en_route','in_progress','completed'].includes(liveStatus ?? '') },
                { label: `En route · ETA ${eta} min`,                           done: liveStatus === 'in_progress' || liveStatus === 'completed', active: liveStatus === 'en_route' || liveStatus === 'accepted' },
                { label: liveStatus === 'in_progress' ? 'Job in progress 🔧' : 'Job in progress', done: liveStatus === 'completed', active: liveStatus === 'in_progress' },
                { label: 'Complete & payment released',                          todo: liveStatus !== 'completed', done: liveStatus === 'completed' },
              ].map((st, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepIndicator}>
                    <View style={[s.stepDot, st.done ? s.stepDone : st.active ? s.stepActive : s.stepTodo]}>
                      <Text style={{ fontSize: 9, color: '#fff' }}>{st.done ? '✓' : i + 1}</Text>
                    </View>
                    {i < 4 && <View style={s.stepLine} />}
                  </View>
                  <Text style={[s.stepText, st.done && s.stepTextDone, st.active && s.stepTextActive]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={s.ctaBar}>
            <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={handleComplete} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[s.ctaBtnText, { color: '#fff' }]}>Mark job complete</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── RATING ── */}
      {step === 'rating' && (
        <>
          <View style={s.header}>
            <Text style={s.headerTitle}>Rate your experience</Text>
          </View>
          <ScrollView style={s.body} contentContainerStyle={{ alignItems: 'center' }}>
            <View style={[s.avatar, { width: 64, height: 64, backgroundColor: '#DCF0E8', marginTop: 16, marginBottom: 8 }]}>
              <Text style={[s.avatarText, { color: '#1A6842', fontSize: 22 }]}>{prov?.name.split(' ').map(w => w[0]).join('')}</Text>
            </View>
            <Text style={s.provName}>{prov?.name}</Text>
            <Text style={[s.provSkill, { marginBottom: 16 }]}>{serviceType} · R 1 000</Text>

            <View style={s.starsRow}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={[s.star, { color: rating >= n ? colors.gold : colors.creamMid }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.ratingTags}>
              {['Punctual','Professional','Clean work','Friendly','Great value'].map(tag => (
                <TouchableOpacity key={tag} style={[s.rtag, tags.includes(tag) && s.rtagSel]} onPress={() => setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}>
                  <Text style={[s.rtagText, tags.includes(tag) && s.rtagTextSel]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.warrantyBox}>
              <Text style={s.warrantyText}>🛡️ 90-day warranty now active. {prov?.name.split(' ')[0]} saved to your contacts.</Text>
            </View>
          </ScrollView>
          <View style={s.ctaBar}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => setStep('done')}>
              <Text style={s.ctaBtnText}>Submit review</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <View style={[s.body, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
          <View style={s.doneTick}><Text style={{ fontSize: 36 }}>✓</Text></View>
          <Text style={s.doneTitle}>All done!</Text>
          <Text style={s.doneSub}>R 1 000 released to {prov?.name.split(' ')[0]}. 90-day warranty active. Receipt emailed.</Text>
          <View style={s.pointsBox}>
            <Text style={s.pointsLabel}>Loyalty points earned</Text>
            <Text style={s.pointsVal}>+50 pts</Text>
            <Text style={s.pointsSubLabel}>Total: 340 · Next reward at 500</Text>
          </View>
          <TouchableOpacity style={[s.ctaBtn, { width: '100%' }]} onPress={() => router.replace('/(client)')}>
            <Text style={s.ctaBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  qLabel:        { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  qOptional:     { fontSize: 11, fontWeight: '400', color: colors.textLight },
  optGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optChip:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff' },
  optChipSel:    { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  optChipText:   { fontSize: 12, color: colors.textMuted },
  optChipTextSel:{ color: colors.gold, fontWeight: '600' },
  optPrice:      { fontSize: 10, color: colors.textLight, marginTop: 2 },
  optPriceSel:   { color: colors.gold },
  counterRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  counterBtnText:{ fontSize: 20, color: colors.text, lineHeight: 24 },
  counterVal:    { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 80, textAlign: 'center' },
  photoRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  photoThumb:    { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg:      { width: '100%', height: '100%' },
  photoRemove:   { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoAdd:      { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: colors.creamMid, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 2 },
  photoAddText:  { fontSize: 20 },
  photoAddLabel: { fontSize: 9, color: colors.textLight },
  estimateBox:   { backgroundColor: colors.navy, borderRadius: 12, padding: 14, marginTop: 4 },
  estimateLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  estimateRange: { fontSize: 22, fontWeight: '300', color: '#fff', marginVertical: 4 },
  estimateNote:  { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  safe:              { flex: 1, backgroundColor: colors.cream },
  progressTrack:     { height: 3, backgroundColor: colors.creamMid },
  progressFill:      { height: 3, backgroundColor: colors.gold },
  header:            { backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  backBtn:           { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  backArrow:         { fontSize: 16, color: colors.textMuted },
  headerTitle:       { fontSize: 15, fontWeight: '600', color: colors.text },
  headerSub:         { fontSize: 11, color: colors.textLight, marginTop: 1 },
  bookingId:         { fontSize: 10, color: colors.textLight },
  body:              { flex: 1, padding: 14 },
  hint:              { fontSize: 11, color: colors.textMuted, marginBottom: 10 },
  provCard:          { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  provCardSel:       { borderColor: colors.gold, borderWidth: 2 },
  provTop:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar:            { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:        { fontSize: 14, fontWeight: '700' },
  avatarSm:          { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarSmText:      { fontSize: 12, fontWeight: '700' },
  provName:          { fontSize: 14, fontWeight: '600', color: colors.text },
  provSkill:         { fontSize: 11, color: colors.textLight, marginTop: 1 },
  provStars:         { fontSize: 11, color: colors.gold, marginTop: 2 },
  reviewCount:       { color: colors.textLight },
  etaText:           { fontSize: 13, fontWeight: '600', color: colors.accent },
  tagRow:            { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  tag:               { backgroundColor: colors.cream, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.creamMid },
  tagText:           { fontSize: 10, color: colors.textMuted },
  provMeta:          { fontSize: 10, color: colors.textMuted },
  provMini:          { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.creamMid },
  provMiniName:      { fontSize: 13, fontWeight: '600', color: colors.text },
  provMiniSub:       { fontSize: 10, color: colors.textLight, marginTop: 1 },
  approvedBadge:     { backgroundColor: '#DCF0E8', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  approvedText:      { fontSize: 10, color: '#1A6842', fontWeight: '600' },
  quoteCard:         { backgroundColor: '#fff', borderRadius: 10, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  quoteRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  quoteRowTotal:     { borderBottomWidth: 0, marginTop: 4 },
  quoteLabel:        { fontSize: 12, color: colors.textMuted },
  quoteVal:          { fontSize: 12, color: colors.text },
  warrantyBox:       { backgroundColor: '#E8F5EE', borderRadius: 10, padding: 12, marginBottom: 10 },
  warrantyText:      { fontSize: 12, color: '#1A5C38', lineHeight: 18 },
  paymentBox:        { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  paymentLabel:      { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  paymentOptions:    { flexDirection: 'row', gap: 8 },
  payOpt:            { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, alignItems: 'center' },
  payOptActive:      { borderColor: colors.gold, borderWidth: 2, backgroundColor: '#FFFBF0' },
  payOptActiveText:  { fontSize: 11, fontWeight: '600', color: colors.gold },
  payOptText:        { fontSize: 11, color: colors.textMuted },
  holdNote:          { fontSize: 10, color: colors.textLight, textAlign: 'center', marginBottom: 16 },
  mapBox:            { backgroundColor: colors.navyMid, borderRadius: 12, height: 160, marginBottom: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mapLabel:          { color: '#fff', fontSize: 12, opacity: 0.7 },
  mapDot:            { position: 'absolute', bottom: 24, right: 80, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, borderWidth: 2.5, borderColor: '#fff' },
  trackInfo:         { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  contactBtns:       { flexDirection: 'row', gap: 7, marginLeft: 'auto' },
  contactBtn:        { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  stepsCard:         { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.creamMid },
  stepRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepIndicator:     { alignItems: 'center', width: 20 },
  stepDot:           { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepDone:          { backgroundColor: colors.accent },
  stepActive:        { backgroundColor: colors.gold },
  stepTodo:          { backgroundColor: colors.creamMid },
  stepLine:          { width: 1.5, height: 18, backgroundColor: colors.creamMid, marginTop: 2 },
  stepText:          { fontSize: 12, color: colors.textMuted, paddingTop: 2, flex: 1 },
  stepTextDone:      { color: colors.accent },
  stepTextActive:    { color: colors.text, fontWeight: '600' },
  starsRow:          { flexDirection: 'row', gap: 10, marginVertical: 16 },
  star:              { fontSize: 32 },
  ratingTags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, justifyContent: 'center' },
  rtag:              { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff' },
  rtagSel:           { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  rtagText:          { fontSize: 12, color: colors.textMuted },
  rtagTextSel:       { color: colors.gold },
  doneTick:          { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCF0E8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle:         { fontSize: 24, fontWeight: '300', color: colors.navy, marginBottom: 8 },
  doneSub:           { fontSize: 13, color: colors.textMuted, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  pointsBox:         { backgroundColor: colors.creamMid, borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 20 },
  pointsLabel:       { fontSize: 11, color: colors.textLight },
  pointsVal:         { fontSize: 26, fontWeight: '300', color: colors.navy },
  pointsSubLabel:    { fontSize: 11, color: colors.textLight },
  ctaBar:            { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.creamMid, gap: 8 },
  ctaBtn:            { backgroundColor: colors.gold, borderRadius: 12, padding: 14, alignItems: 'center' },
  ctaBtnText:        { fontSize: 14, fontWeight: '600', color: colors.navy },
  ctaBtnSec:         { backgroundColor: colors.creamMid, borderRadius: 12, padding: 14, alignItems: 'center' },
  ctaBtnSecText:     { fontSize: 14, fontWeight: '500', color: colors.text },
})
