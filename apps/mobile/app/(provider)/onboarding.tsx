/**
 * Provider KYC Onboarding — real document uploads to Cloudinary
 */
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { api } from '../../lib/api'

type DocType = 'id' | 'company_reg' | 'bank_letter' | 'trade_cert'

interface DocStatus {
  uploaded:  boolean
  uploading: boolean
  fileName:  string | null
  fileUrl:   string | null
}

const DOCS: { key: DocType; label: string; sub: string; accept: 'image' | 'pdf'; optional?: boolean }[] = [
  { key: 'id',          label: 'SA ID / Passport',        sub: 'Photo of your ID document',              accept: 'image' },
  { key: 'company_reg', label: 'Company registration',     sub: 'CIPC certificate (PDF or photo)',        accept: 'pdf'   },
  { key: 'bank_letter', label: 'Bank confirmation letter', sub: 'Bank letterhead, within 3 months',       accept: 'pdf'   },
  { key: 'trade_cert',  label: 'Trade certificate',        sub: 'Optional · unlocks all job categories',  accept: 'pdf', optional: true },
]

const SKILLS = [
  { id: 'plumbing',   label: 'Plumbing',   emoji: '💧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'cleaning',   label: 'Cleaning',   emoji: '🧹' },
  { id: 'hvac',       label: 'AC & HVAC',  emoji: '❄️' },
  { id: 'gas',        label: 'Gas',        emoji: '🔥' },
  { id: 'handyman',   label: 'Handyman',   emoji: '🔧' },
]

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

  // Load existing documents
  useEffect(() => {
    if (!user) return
    api.providers.getDocuments(user.id).then((existing: any[]) => {
      existing.forEach(doc => {
        setDocs(prev => ({
          ...prev,
          [doc.type]: { uploaded: true, uploading: false, fileName: doc.fileName, fileUrl: doc.fileUrl },
        }))
      })
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
          setUploading(key, false)
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri
        fileName = asset.fileName ?? `${key}_${Date.now()}.jpg`
        mimeType = asset.mimeType ?? 'image/jpeg'
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri
        fileName = asset.name
        mimeType = asset.mimeType ?? 'application/pdf'
      }

      const { url } = await uploadToCloudinary(uri, fileName, mimeType)
      await api.providers.saveDocument(user.id, key, fileName, url)

      setDocs(prev => ({
        ...prev,
        [key]: { uploaded: true, uploading: false, fileName, fileUrl: url },
      }))
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.')
      setUploading(key, false)
    }
  }

  const requiredDocs  = DOCS.filter(d => !d.optional)
  const uploadedCount = requiredDocs.filter(d => docs[d.key].uploaded).length
  const allUploaded   = uploadedCount === requiredDocs.length
  const hasTradeCert  = docs.trade_cert.uploaded

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.progressDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i < uploadedCount && s.dotDone, i === uploadedCount && s.dotActive]} />
          ))}
        </View>
        <Text style={s.step}>KYC Verification · {uploadedCount}/3 documents</Text>
        <Text style={s.title}>Verify your identity</Text>
        <Text style={s.sub}>Upload documents to start earning</Text>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

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

        {/* Trade certificate — optional */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Optional documents</Text>
        {!hasTradeCert && (
          <View style={s.tradeBanner}>
            <Text style={s.tradeBannerText}>
              🔧 Without a trade certificate you will only qualify for <Text style={{ fontWeight: '700' }}>Handyman</Text> and <Text style={{ fontWeight: '700' }}>Cleaning</Text> jobs.
              Upload your certificate to unlock Plumbing, Electrical, Gas, HVAC and more.
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

        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Your skills</Text>
        <View style={s.skillGrid}>
          {SKILLS.map(sk => (
            <TouchableOpacity
              key={sk.id}
              style={[s.skillChip, skills.includes(sk.id) && s.skillChipSel]}
              onPress={() => toggleSkill(sk.id)}
            >
              <Text style={{ fontSize: 16 }}>{sk.emoji}</Text>
              <Text style={[s.skillLabel, skills.includes(sk.id) && s.skillLabelSel]}>{sk.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Availability</Text>
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

        {allUploaded ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✅ All documents submitted — under review within 24hrs</Text>
          </View>
        ) : (
          <View style={s.infoBanner}>
            <Text style={s.infoText}>📋 Upload all 3 documents to complete verification and start accepting jobs.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.cream },
  header:          { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  step:            { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 10 },
  title:           { fontSize: 20, fontWeight: '300', color: '#fff', marginBottom: 2 },
  sub:             { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  progressDots:    { flexDirection: 'row', gap: 5 },
  dot:             { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotDone:         { backgroundColor: colors.accent },
  dotActive:       { backgroundColor: colors.gold },
  body:            { padding: 14 },
  sectionLabel:    { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: '500' },
  uploadBox:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.creamMid, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: '#fff' },
  uploadDone:      { borderColor: colors.accent, borderStyle: 'solid', backgroundColor: '#EAF5EE' },
  uploadEmoji:     { fontSize: 24, width: 32, textAlign: 'center' },
  uploadLabel:     { fontSize: 13, fontWeight: '600', color: colors.text },
  uploadLabelDone: { color: '#1A5C38' },
  uploadSub:       { fontSize: 11, color: colors.textLight, marginTop: 2 },
  uploadSubDone:   { color: colors.accent },
  uploadArrow:     { fontSize: 18, color: colors.textLight },
  skillGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  skillChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff', width: '47%' },
  skillChipSel:    { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  skillLabel:      { fontSize: 12, color: colors.textMuted },
  skillLabelSel:   { color: colors.gold, fontWeight: '600' },
  availCard:       { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.creamMid, marginBottom: 14 },
  availRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  availRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  availLabel:      { fontSize: 13, color: colors.text },
  toggle:          { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.accent, padding: 3, justifyContent: 'center' },
  toggleOff:       { backgroundColor: colors.creamMid },
  toggleThumb:     { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff:  { alignSelf: 'flex-start' },
  successBanner:    { backgroundColor: '#EAF5EE', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accent },
  successText:      { fontSize: 13, color: '#1A5C38', lineHeight: 20 },
  infoBanner:       { backgroundColor: '#FFF9EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gold + '40' },
  infoText:         { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  tradeBanner:      { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB74D40' },
  tradeBannerText:  { fontSize: 12, color: '#7C4A00', lineHeight: 18 },
  uploadBoxOptional:{ borderStyle: 'dashed', borderColor: colors.creamMid },
  optionalRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalBadge:    { backgroundColor: colors.creamMid, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionalBadgeText:{ fontSize: 9, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
})
