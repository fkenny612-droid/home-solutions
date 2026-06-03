/**
 * Provider profile / KYC onboarding screen
 */
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '../../constants/theme'

const SKILLS = [
  { id: 'plumbing',   label: 'Plumbing',   emoji: '💧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'cleaning',   label: 'Cleaning',   emoji: '🧹' },
  { id: 'handyman',   label: 'Handyman',   emoji: '🔧' },
]

export default function ProviderOnboarding() {
  const [skills, setSkills]     = useState<string[]>(['plumbing', 'cleaning'])
  const [uploads, setUploads]   = useState({ id: true, cert: false, bank: false })
  const [avail, setAvail]       = useState({ monFri: true, sat: true, sun: false, emergency: true })

  const toggleSkill = (id: string) =>
    setSkills(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])

  return (
    <SafeAreaView style={s.safe}>
      {/* KYC header */}
      <View style={s.header}>
        <Text style={s.step}>Step 2 of 4</Text>
        <Text style={s.title}>Verify your identity</Text>
        <Text style={s.sub}>Upload docs to start earning</Text>
        <View style={s.progressDots}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[s.dot, i === 0 && s.dotDone, i === 1 && s.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* Skills */}
        <Text style={s.sectionLabel}>Your skills</Text>
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

        {/* KYC uploads */}
        <Text style={s.sectionLabel}>KYC documents</Text>
        {[
          { key: 'id',   label: 'SA ID / Passport',          sub: 'ID_front.jpg uploaded ✓', tapSub: 'Tap to upload' },
          { key: 'cert', label: 'Trade certificate',          sub: 'pirb_cert.pdf ✓',         tapSub: 'Tap to upload PDF' },
          { key: 'bank', label: 'Bank confirmation letter',   sub: 'bank_letter.pdf ✓',       tapSub: 'For payout processing' },
        ].map(doc => {
          const done = uploads[doc.key as keyof typeof uploads]
          return (
            <TouchableOpacity
              key={doc.key}
              style={[s.uploadBox, done && s.uploadDone]}
              onPress={() => !done && setUploads(p => ({ ...p, [doc.key]: true }))}
            >
              <Text style={[s.uploadEmoji]}>{done ? '✅' : '📁'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.uploadLabel, done && s.uploadLabelDone]}>{doc.label}</Text>
                <Text style={[s.uploadSub, done && s.uploadSubDone]}>{done ? doc.sub : doc.tapSub}</Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* Availability */}
        <Text style={[s.sectionLabel, { marginTop: 4 }]}>Availability</Text>
        <View style={s.availCard}>
          {([
            { key: 'monFri', label: 'Mon – Fri' },
            { key: 'sat',    label: 'Saturday' },
            { key: 'sun',    label: 'Sunday' },
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

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaBtn}>
          <Text style={s.ctaBtnText}>Continue to step 3</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.signout} onPress={() => router.replace('/')}>
          <Text style={s.signoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.cream },
  header:          { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  step:            { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title:           { fontSize: 20, fontWeight: '300', color: '#fff', marginBottom: 2 },
  sub:             { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  progressDots:    { flexDirection: 'row', gap: 5 },
  dot:             { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotDone:         { backgroundColor: colors.gold },
  dotActive:       { backgroundColor: 'rgba(200,146,42,0.55)' },
  body:            { padding: 13 },
  sectionLabel:    { fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 8 },
  skillGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  skillChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff', width: '47%' },
  skillChipSel:    { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  skillLabel:      { fontSize: 12, color: colors.textMuted },
  skillLabelSel:   { color: colors.gold, fontWeight: '600' },
  uploadBox:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.creamMid, borderStyle: 'dashed', borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  uploadDone:      { borderColor: colors.accent, borderStyle: 'solid', backgroundColor: '#EAF5EE' },
  uploadEmoji:     { fontSize: 22 },
  uploadLabel:     { fontSize: 12, fontWeight: '600', color: colors.text },
  uploadLabelDone: { color: colors.accent },
  uploadSub:       { fontSize: 10, color: colors.textLight, marginTop: 2 },
  uploadSubDone:   { color: colors.accent },
  availCard:       { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.creamMid, marginBottom: 8 },
  availRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  availRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  availLabel:      { fontSize: 13, color: colors.text },
  toggle:          { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.accent, padding: 3, justifyContent: 'center' },
  toggleOff:       { backgroundColor: colors.creamMid },
  toggleThumb:     { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff:  { alignSelf: 'flex-start' },
  ctaBar:          { padding: 13, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.creamMid, gap: 8 },
  ctaBtn:          { backgroundColor: colors.gold, borderRadius: 12, padding: 14, alignItems: 'center' },
  ctaBtnText:      { fontSize: 14, fontWeight: '600', color: colors.navy },
  signout:         { alignItems: 'center', padding: 8 },
  signoutText:     { fontSize: 13, color: colors.textLight },
})
