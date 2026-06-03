/**
 * Client Home Screen — book a service, emergency callout, recent jobs
 */
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'

const SERVICES = [
  { id: 'plumbing',   label: 'Plumbing',   price: 'From R350', emoji: '💧', bg: '#DBEAFE' },
  { id: 'electrical', label: 'Electrical', price: 'From R400', emoji: '⚡', bg: '#FEF3C7' },
  { id: 'cleaning',   label: 'Cleaning',   price: 'From R250', emoji: '🧹', bg: '#D1FAE5' },
  { id: 'hvac',       label: 'AC & HVAC',  price: 'From R500', emoji: '❄️', bg: '#EDE9FE' },
  { id: 'gas',        label: 'Gas',        price: 'From R450', emoji: '🔥', bg: '#FEE2E2' },
  { id: 'handyman',   label: 'Handyman',   price: 'From R300', emoji: '🔧', bg: '#FEF3C7' },
]

const RECENT = [
  { icon: '⚡', bg: '#FEF3C7', name: 'Electrical — DB board', date: '15 May · Kevin M. · ★★★★★', amt: 'R 850' },
  { icon: '💧', bg: '#DBEAFE', name: 'Plumbing — Geyser',    date: '2 May · Raj P. · ★★★★☆',  amt: 'R 2 200' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export default function ClientHome() {
  const { user } = useAuth()
  const displayName = user?.phone ?? 'there'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.greeting}>{greeting()}</Text>
        <Text style={s.name}>{displayName}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>👑 Premium Home · Active</Text>
        </View>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Book a service</Text>
        <View style={s.serviceGrid}>
          {SERVICES.map(svc => (
            <TouchableOpacity
              key={svc.id}
              style={s.svcCard}
              onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: svc.id } })}
            >
              <View style={[s.svcIconBg, { backgroundColor: svc.bg }]}>
                <Text style={s.svcEmoji}>{svc.emoji}</Text>
              </View>
              <Text style={s.svcName}>{svc.label}</Text>
              <Text style={s.svcPrice}>{svc.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={s.emergency}
          onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: 'emergency' } })}
        >
          <View style={s.emergIcon}><Text style={{ fontSize: 20 }}>🚨</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.emergTitle}>Emergency callout</Text>
            <Text style={s.emergSub}>Nearest tech in &lt;15 min</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        <Text style={[s.sectionLabel, { marginTop: 4 }]}>Recent jobs</Text>
        {RECENT.map((job, i) => (
          <View key={i} style={s.historyItem}>
            <View style={[s.histIcon, { backgroundColor: job.bg }]}>
              <Text style={{ fontSize: 16 }}>{job.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.histName}>{job.name}</Text>
              <Text style={s.histDate}>{job.date}</Text>
            </View>
            <Text style={s.histAmt}>{job.amt}</Text>
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.cream },
  header:       { backgroundColor: colors.navy, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
  greeting:     { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  name:         { fontSize: 22, fontWeight: '300', color: '#fff', marginBottom: 10 },
  badge:        { backgroundColor: 'rgba(200,146,42,0.2)', borderColor: 'rgba(200,146,42,0.4)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText:    { fontSize: 11, color: colors.goldLight },
  body:         { flex: 1, padding: 14 },
  sectionLabel: { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: '500' },
  serviceGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  svcCard:      { width: '31%', backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.creamMid },
  svcIconBg:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  svcEmoji:     { fontSize: 20 },
  svcName:      { fontSize: 10, fontWeight: '500', color: colors.text, textAlign: 'center' },
  svcPrice:     { fontSize: 9, color: colors.textLight, marginTop: 2, textAlign: 'center' },
  emergency:    { backgroundColor: colors.red, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  emergIcon:    { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emergTitle:   { fontSize: 13, fontWeight: '600', color: '#fff' },
  emergSub:     { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  historyItem:  { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  histIcon:     { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  histName:     { fontSize: 13, fontWeight: '500', color: colors.text },
  histDate:     { fontSize: 10, color: colors.textLight, marginTop: 2 },
  histAmt:      { fontSize: 13, fontWeight: '600', color: colors.accent },
})
