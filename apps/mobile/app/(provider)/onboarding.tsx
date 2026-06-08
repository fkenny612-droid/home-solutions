/**
 * Provider KYC Onboarding
 * - Required docs: ID, company reg, bank letter
 * - Optional: trade certificate (unlocks plumbing, electrical, gas, etc.)
 * - Hire inventory photos: required when provider selects any hire service
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { api } from '../../lib/api'

// ─── Document types ───────────────────────────────────────────────────────────
type DocType = 'id' | 'company_reg' | 'bank_letter' | 'trade_cert'

interface DocStatus {
  uploaded:  boolean
  uploading: boolean
  fileName:  string | null
  fileUrl:   string | null
}

interface HirePhoto {
  uploading: boolean
  fileName:  string | null
  fileUrl:   string | null
  localUri?: string
}

// ─── Hire services — no trade cert needed, but inventory photos required ──────
const HIRE_SERVICE_IDS = new Set([
  'tent_hire', 'chair_table_hire', 'decor_hire', 'sound_pa_hire',
  'jumping_castle_hire', 'catering_equipment_hire', 'cold_room_hire', 'mobile_toilet_hire',
  'generator_hire', 'water_bowser_hire',
  'van_hire', 'bakkie_hire', 'furniture_removal', 'last_mile_delivery', 'livestock_transport',
  'security_guard_hire',
])

const MIN_HIRE_PHOTOS = 3

// ─── Required documents ───────────────────────────────────────────────────────
const DOCS: { key: DocType; label: string; sub: string; accept: 'image' | 'pdf'; optional?: boolean }[] = [
  { key: 'id',          label: 'SA ID / Passport',        sub: 'Photo of your ID document',              accept: 'image' },
  { key: 'company_reg', label: 'Company registration',     sub: 'CIPC certificate (PDF or photo)',        accept: 'pdf'   },
  { key: 'bank_letter', label: 'Bank confirmation letter', sub: 'Bank letterhead, within 3 months',       accept: 'pdf'   },
  { key: 'trade_cert',  label: 'Trade certificate',        sub: 'Optional · unlocks trade job categories',accept: 'pdf', optional: true },
]

// ─── Skills catalogue ─────────────────────────────────────────────────────────
type SkillCategory = { label: string; skills: { id: string; label: string; emoji: string }[] }

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    label: 'Home Services',
    skills: [
      { id: 'plumbing',       label: 'Plumbing',       emoji: '💧' },
      { id: 'electrical',     label: 'Electrical',     emoji: '⚡' },
      { id: 'cleaning',       label: 'Cleaning',       emoji: '🧹' },
      { id: 'hvac',           label: 'AC & HVAC',      emoji: '❄️' },
      { id: 'gas',            label: 'Gas',            emoji: '🔥' },
      { id: 'handyman',       label: 'Handyman',       emoji: '🔧' },
      { id: 'tiling',         label: 'Tiling',         emoji: '🪟' },
      { id: 'painting',       label: 'Painting',       emoji: '🎨' },
      { id: 'landscaping',    label: 'Landscaping',    emoji: '🌿' },
      { id: 'pool',           label: 'Pool',           emoji: '🏊' },
      { id: 'pest_control',   label: 'Pest Control',   emoji: '🐜' },
      { id: 'locksmith',      label: 'Locksmith',      emoji: '🔑' },
      { id: 'carpentry',      label: 'Carpentry',      emoji: '🪚' },
      { id: 'solar',          label: 'Solar',          emoji: '☀️' },
      { id: 'security',       label: 'Security Systems', emoji: '📷' },
      { id: 'paving',         label: 'Paving',         emoji: '🛤️' },
      { id: 'waterproofing',  label: 'Waterproofing',  emoji: '💦' },
      { id: 'roofing',        label: 'Roofing',        emoji: '🏠' },
      { id: 'gate_motor',     label: 'Gate & Garage',  emoji: '🚪' },
      { id: 'moving',         label: 'Moving',         emoji: '📦' },
      { id: 'bricklaying',    label: 'Bricklaying',    emoji: '🧱' },
      { id: 'borehole',       label: 'Borehole',       emoji: '🌊' },
      { id: 'septic_tank',    label: 'Septic Tank',    emoji: '🚽' },
      { id: 'dstv',           label: 'DSTV / Satellite', emoji: '📡' },
    ],
  },
  {
    label: 'Event Hire',
    skills: [
      { id: 'tent_hire',               label: 'Tent Hire',          emoji: '⛺' },
      { id: 'chair_table_hire',        label: 'Chairs & Tables',    emoji: '🪑' },
      { id: 'decor_hire',              label: 'Décor Hire',         emoji: '🌸' },
      { id: 'sound_pa_hire',           label: 'Sound / PA',         emoji: '🔊' },
      { id: 'jumping_castle_hire',     label: 'Jumping Castle',     emoji: '🏰' },
      { id: 'catering_equipment_hire', label: 'Catering Equipment', emoji: '🍳' },
      { id: 'cold_room_hire',          label: 'Cold Room',          emoji: '🧊' },
      { id: 'mobile_toilet_hire',      label: 'Mobile Toilets',     emoji: '🚻' },
    ],
  },
  {
    label: 'Plant & Equipment',
    skills: [
      { id: 'generator_hire',    label: 'Generator Hire', emoji: '⚡' },
      { id: 'water_bowser_hire', label: 'Water Bowser',   emoji: '🚰' },
    ],
  },
  {
    label: 'Transport & Logistics',
    skills: [
      { id: 'van_hire',           label: 'Van Hire',            emoji: '🚐' },
      { id: 'bakkie_hire',        label: 'Bakkie Hire',         emoji: '🛻' },
      { id: 'furniture_removal',  label: 'Furniture Removal',   emoji: '🛋️' },
      { id: 'last_mile_delivery', label: 'Last-Mile Delivery',  emoji: '📬' },
      { id: 'livestock_transport',label: 'Livestock Transport', emoji: '🐄' },
    ],
  },
  {
    label: 'Security',
    skills: [
      { id: 'security_guard_hire', label: 'Security Guard', emoji: '💂' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProviderOnboarding() {
  const { user } = useAuth()
  const [skills, setSkills] = useState<string[]>([])
  const [avail,  setAvail]  = useState({ monFri: true, sat: true, sun: false, emergency: true })
  const [docs,   setDocs]   = useState<Record<DocType, DocStatus>>({
    id:          { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    company_reg: { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    bank_letter: { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    trade_cert:  { uploaded: false, uploading: false, fileName: null, fileUrl: null },
  })
  const [hirePhotos, setHirePhotos] = useState<HirePhoto[]>([])

  // Load existing documents
  useEffect(() => {
    if (!user) return
    api.providers.getDocuments(user.id).then((existing: any[]) => {
      const photoEntries: HirePhoto[] = []
      existing.forEach(doc => {
        if (doc.type === 'hire_photo') {
          photoEntries.push({ uploading: false, fileName: doc.fileName, fileUrl: doc.fileUrl })
        } else if (doc.type in docs) {
          setDocs(prev => ({
            ...prev,
            [doc.type]: { uploaded: true, uploading: false, fileName: doc.fileName, fileUrl: doc.fileUrl },
          }))
        }
      })
      if (photoEntries.length > 0) setHirePhotos(photoEntries)
    }).catch(() => {})
  }, [user])

  const toggleSkill = (id: string) =>
    setSkills(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])

  const setUploading = (key: DocType, uploading: boolean) =>
    setDocs(prev => ({ ...prev, [key]: { ...prev[key], uploading } }))

  const pickAndUpload = async (docDef: typeof DOCS[0]) => {
    if (!user) return
    const { key, accept } = docDef
    try {
      setUploading(key, true)
      let uri: string, fileName: string, mimeType: string

      if (accept === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Allow photo access to upload your ID.')
          setUploading(key, false); return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8, allowsEditing: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri; fileName = asset.fileName ?? `${key}_${Date.now()}.jpg`; mimeType = asset.mimeType ?? 'image/jpeg'
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'], copyToCacheDirectory: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri; fileName = asset.name; mimeType = asset.mimeType ?? 'application/pdf'
      }

      const { url } = await uploadToCloudinary(uri, fileName, mimeType)
      await api.providers.saveDocument(user.id, key, fileName, url)
      setDocs(prev => ({ ...prev, [key]: { uploaded: true, uploading: false, fileName, fileUrl: url } }))
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.')
      setUploading(key, false)
    }
  }

  const addHirePhoto = async () => {
    if (!user) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload inventory photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [4, 3],
    })
    if (result.canceled) return

    const asset = result.assets[0]
    const idx = hirePhotos.length
    const newPhoto: HirePhoto = {
      uploading: true, fileName: null, fileUrl: null, localUri: asset.uri,
    }
    setHirePhotos(prev => [...prev, newPhoto])

    try {
      const fileName = asset.fileName ?? `hire_photo_${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'
      const { url } = await uploadToCloudinary(asset.uri, fileName, mimeType)
      await api.providers.saveDocument(user.id, 'hire_photo' as any, fileName, url)
      setHirePhotos(prev => prev.map((p, i) =>
        i === idx ? { uploading: false, fileName, fileUrl: url, localUri: asset.uri } : p
      ))
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.')
      setHirePhotos(prev => prev.filter((_, i) => i !== idx))
    }
  }

  const removeHirePhoto = (idx: number) => {
    Alert.alert('Remove photo', 'Remove this inventory photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setHirePhotos(prev => prev.filter((_, i) => i !== idx)) },
    ])
  }

  // ─── Derived state ────────────────────────────────────────────────────────
  const isHireProvider   = skills.some(s => HIRE_SERVICE_IDS.has(s))
  const uploadedPhotos   = hirePhotos.filter(p => !p.uploading && p.fileUrl)
  const requiredDocs     = DOCS.filter(d => !d.optional)
  const uploadedDocCount = requiredDocs.filter(d => docs[d.key].uploaded).length
  const allDocsUploaded  = uploadedDocCount === requiredDocs.length
  const hirePhotosOk     = !isHireProvider || uploadedPhotos.length >= MIN_HIRE_PHOTOS
  const hasTradeCert     = docs.trade_cert.uploaded
  const isComplete       = allDocsUploaded && hirePhotosOk

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.progressDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i < uploadedDocCount && s.dotDone, i === uploadedDocCount && s.dotActive]} />
          ))}
        </View>
        <Text style={s.step}>KYC Verification · {uploadedDocCount}/3 documents</Text>
        <Text style={s.title}>Verify your identity</Text>
        <Text style={s.sub}>Upload documents to start earning</Text>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

        {/* ── Required documents ─────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Required documents</Text>
        {DOCS.filter(d => !d.optional).map(doc => {
          const d = docs[doc.key]
          return (
            <TouchableOpacity
              key={doc.key}
              style={[s.uploadBox, d.uploaded && s.uploadDone]}
              onPress={() => pickAndUpload(doc)}
              disabled={d.uploading}
            >
              {d.uploading
                ? <ActivityIndicator color={colors.accent} style={{ width: 32 }} />
                : <Text style={s.uploadEmoji}>{d.uploaded ? '✅' : '📁'}</Text>}
              <View style={{ flex: 1 }}>
                <Text style={[s.uploadLabel, d.uploaded && s.uploadLabelDone]}>{doc.label}</Text>
                <Text style={[s.uploadSub, d.uploaded && s.uploadSubDone]}>
                  {d.uploading ? 'Uploading…' : d.uploaded ? `✓ ${d.fileName}` : doc.sub}
                </Text>
              </View>
              {!d.uploaded && !d.uploading && <Text style={s.uploadArrow}>›</Text>}
            </TouchableOpacity>
          )
        })}

        {/* ── Trade certificate (optional) ───────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Optional documents</Text>
        {!hasTradeCert && (
          <View style={s.tradeBanner}>
            <Text style={s.tradeBannerText}>
              🔧 Without a trade certificate you qualify for <Text style={{ fontWeight: '700' }}>Handyman</Text>, <Text style={{ fontWeight: '700' }}>Cleaning</Text> and all <Text style={{ fontWeight: '700' }}>hire services</Text>.
              Upload your certificate to also unlock Plumbing, Electrical, Gas, HVAC and more.
            </Text>
          </View>
        )}
        {DOCS.filter(d => d.optional).map(doc => {
          const d = docs[doc.key]
          return (
            <TouchableOpacity
              key={doc.key}
              style={[s.uploadBox, s.uploadBoxOptional, d.uploaded && s.uploadDone]}
              onPress={() => pickAndUpload(doc)}
              disabled={d.uploading}
            >
              {d.uploading
                ? <ActivityIndicator color={colors.accent} style={{ width: 32 }} />
                : <Text style={s.uploadEmoji}>{d.uploaded ? '✅' : '📄'}</Text>}
              <View style={{ flex: 1 }}>
                <View style={s.optionalRow}>
                  <Text style={[s.uploadLabel, d.uploaded && s.uploadLabelDone]}>{doc.label}</Text>
                  <View style={s.optionalBadge}><Text style={s.optionalBadgeText}>Optional</Text></View>
                </View>
                <Text style={[s.uploadSub, d.uploaded && s.uploadSubDone]}>
                  {d.uploading ? 'Uploading…' : d.uploaded ? `✓ ${d.fileName}` : doc.sub}
                </Text>
              </View>
              {!d.uploaded && !d.uploading && <Text style={s.uploadArrow}>›</Text>}
            </TouchableOpacity>
          )
        })}

        {/* ── Skills ─────────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Your skills & services</Text>
        <Text style={s.skillsHint}>Select everything you offer — hire services are available without a trade certificate</Text>

        {SKILL_CATEGORIES.map(cat => (
          <View key={cat.label} style={{ marginBottom: 12 }}>
            <View style={s.catRow}>
              <Text style={s.catLabel}>{cat.label}</Text>
              {cat.skills.some(sk => HIRE_SERVICE_IDS.has(sk.id)) && (
                <View style={s.hireBadge}><Text style={s.hireBadgeText}>No cert needed</Text></View>
              )}
            </View>
            <View style={s.skillGrid}>
              {cat.skills.map(sk => {
                const sel     = skills.includes(sk.id)
                const isHire  = HIRE_SERVICE_IDS.has(sk.id)
                return (
                  <TouchableOpacity
                    key={sk.id}
                    style={[s.skillChip, sel && s.skillChipSel, isHire && sel && s.skillChipHire]}
                    onPress={() => toggleSkill(sk.id)}
                  >
                    <Text style={{ fontSize: 15 }}>{sk.emoji}</Text>
                    <Text style={[s.skillLabel, sel && s.skillLabelSel]} numberOfLines={1}>{sk.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* ── Hire inventory photos (shown when hire skill selected) ─── */}
        {isHireProvider && (
          <>
            <View style={s.hirePhotoHeader}>
              <Text style={s.sectionLabel}>Hire inventory photos</Text>
              <View style={[s.hireBadge, { marginBottom: 10 }]}>
                <Text style={s.hireBadgeText}>Required</Text>
              </View>
            </View>
            <View style={s.hirePhotoBanner}>
              <Text style={s.hirePhotoBannerText}>
                📸 Upload at least <Text style={{ fontWeight: '700' }}>{MIN_HIRE_PHOTOS} clear photos</Text> of the items you have available for hire.
                Clients will see these when browsing providers — good photos mean more bookings.
              </Text>
            </View>

            <View style={s.photoGrid}>
              {hirePhotos.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.photoThumb}
                  onLongPress={() => !p.uploading && removeHirePhoto(idx)}
                  activeOpacity={0.85}
                >
                  {p.uploading ? (
                    <View style={s.photoThumbLoading}>
                      <ActivityIndicator color={colors.gold} />
                      <Text style={s.photoThumbLoadingText}>Uploading…</Text>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={{ uri: p.fileUrl ?? p.localUri ?? '' }}
                        style={s.photoThumbImage}
                        resizeMode="cover"
                      />
                      <View style={s.photoThumbBadge}>
                        <Text style={s.photoThumbBadgeText}>✓</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              ))}

              {/* Add photo button */}
              <TouchableOpacity style={s.photoAddBtn} onPress={addHirePhoto}>
                <Text style={s.photoAddIcon}>+</Text>
                <Text style={s.photoAddLabel}>Add photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.photoHint}>
              {uploadedPhotos.length >= MIN_HIRE_PHOTOS
                ? `✅ ${uploadedPhotos.length} photo${uploadedPhotos.length !== 1 ? 's' : ''} uploaded — long-press any photo to remove`
                : `${uploadedPhotos.length}/${MIN_HIRE_PHOTOS} photos uploaded — add ${MIN_HIRE_PHOTOS - uploadedPhotos.length} more to continue`}
            </Text>
          </>
        )}

        {/* ── Availability ────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Availability</Text>
        <View style={s.availCard}>
          {([
            { key: 'monFri',    label: 'Mon – Fri' },
            { key: 'sat',       label: 'Saturday' },
            { key: 'sun',       label: 'Sunday' },
            { key: 'emergency', label: 'Emergency callouts' },
          ] as { key: keyof typeof avail; label: string }[]).map((a, i) => (
            <View key={a.key} style={[s.availRow, i < 3 && s.availRowBorder]}>
              <Text style={s.availLabel}>{a.label}</Text>
              <TouchableOpacity
                style={[s.toggle, !avail[a.key] && s.toggleOff]}
                onPress={() => setAvail(p => ({ ...p, [a.key]: !p[a.key] }))}
              >
                <View style={[s.toggleThumb, !avail[a.key] && s.toggleThumbOff]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── Status banner ───────────────────────────────────────────── */}
        {isComplete ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✅ All documents submitted — under review within 24hrs</Text>
          </View>
        ) : (
          <View style={s.infoBanner}>
            <Text style={s.infoText}>
              {!allDocsUploaded
                ? `📋 Upload all 3 required documents to complete verification.`
                : `📸 Add ${MIN_HIRE_PHOTOS - uploadedPhotos.length} more hire inventory photo${MIN_HIRE_PHOTOS - uploadedPhotos.length !== 1 ? 's' : ''} to complete your profile.`}
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.cream },
  header:             { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  step:               { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 10 },
  title:              { fontSize: 20, fontWeight: '300', color: '#fff', marginBottom: 2 },
  sub:                { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  progressDots:       { flexDirection: 'row', gap: 5 },
  dot:                { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotDone:            { backgroundColor: colors.accent },
  dotActive:          { backgroundColor: colors.gold },
  body:               { padding: 14 },
  sectionLabel:       { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: '500' },

  uploadBox:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.creamMid, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: '#fff' },
  uploadDone:         { borderColor: colors.accent, borderStyle: 'solid', backgroundColor: '#EAF5EE' },
  uploadEmoji:        { fontSize: 24, width: 32, textAlign: 'center' },
  uploadLabel:        { fontSize: 13, fontWeight: '600', color: colors.text },
  uploadLabelDone:    { color: '#1A5C38' },
  uploadSub:          { fontSize: 11, color: colors.textLight, marginTop: 2 },
  uploadSubDone:      { color: colors.accent },
  uploadArrow:        { fontSize: 18, color: colors.textLight },
  uploadBoxOptional:  { borderStyle: 'dashed', borderColor: colors.creamMid },
  optionalRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalBadge:      { backgroundColor: colors.creamMid, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionalBadgeText:  { fontSize: 9, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  tradeBanner:        { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB74D40' },
  tradeBannerText:    { fontSize: 12, color: '#7C4A00', lineHeight: 18 },

  skillsHint:         { fontSize: 11, color: colors.textMuted, marginBottom: 12, marginTop: -6, lineHeight: 16 },
  catRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catLabel:           { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  hireBadge:          { backgroundColor: '#FFF3CD', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F0C060' },
  hireBadgeText:      { fontSize: 9, color: '#92600A', fontWeight: '700', textTransform: 'uppercase' },
  skillGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff', width: '47%' },
  skillChipSel:       { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  skillChipHire:      { borderColor: '#F0C060', backgroundColor: '#FFFBF0' },
  skillLabel:         { fontSize: 11, color: colors.textMuted, flex: 1 },
  skillLabelSel:      { color: colors.gold, fontWeight: '600' },

  hirePhotoHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  hirePhotoBanner:    { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F0C060' },
  hirePhotoBannerText:{ fontSize: 12, color: '#7C4A00', lineHeight: 18 },

  photoGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoThumb:         { width: '30%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.creamMid },
  photoThumbImage:    { width: '100%', height: '100%' },
  photoThumbLoading:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoThumbLoadingText: { fontSize: 9, color: colors.textMuted },
  photoThumbBadge:    { position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  photoThumbBadgeText:{ fontSize: 10, color: '#fff', fontWeight: '700' },
  photoAddBtn:        { width: '30%', aspectRatio: 4 / 3, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF0', gap: 2 },
  photoAddIcon:       { fontSize: 22, color: colors.gold, fontWeight: '300' },
  photoAddLabel:      { fontSize: 10, color: colors.gold, fontWeight: '600' },
  photoHint:          { fontSize: 11, color: colors.textMuted, marginBottom: 14, textAlign: 'center', lineHeight: 16 },

  availCard:          { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.creamMid, marginBottom: 14 },
  availRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  availRowBorder:     { borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  availLabel:         { fontSize: 13, color: colors.text },
  toggle:             { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.accent, padding: 3, justifyContent: 'center' },
  toggleOff:          { backgroundColor: colors.creamMid },
  toggleThumb:        { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff:     { alignSelf: 'flex-start' },

  successBanner:      { backgroundColor: '#EAF5EE', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accent },
  successText:        { fontSize: 13, color: '#1A5C38', lineHeight: 20 },
  infoBanner:         { backgroundColor: '#FFF9EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gold + '40' },
  infoText:           { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
})
