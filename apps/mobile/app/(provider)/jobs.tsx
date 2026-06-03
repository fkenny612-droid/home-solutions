import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'

const JOBS = [
  { id: 'B-1042', emoji: '⚡', bg: '#FEF3C7', service: 'Electrical fault', address: '14 Marine Drive, Umhlanga', client: 'Thabo Nkosi', amt: 'R 1 250', status: 'En route', statusColor: colors.accent },
  { id: 'B-1039', emoji: '💧', bg: '#DBEAFE', service: 'Geyser repair',    address: '22 Glenwood Road, Durban', client: 'Priya Govender', amt: 'R 1 000', status: 'Pending',  statusColor: colors.amber },
]

export default function ProviderJobs() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.title}>My Jobs</Text><Text style={s.sub}>2 active today</Text></View>
      <ScrollView style={s.body}>
        {JOBS.map(j => (
          <View key={j.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.icon, { backgroundColor: j.bg }]}><Text style={{ fontSize: 20 }}>{j.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.service}>{j.service}</Text>
                <Text style={s.address}>{j.address}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: j.statusColor + '20' }]}>
                <Text style={[s.statusText, { color: j.statusColor }]}>{j.status}</Text>
              </View>
            </View>
            <View style={s.cardMeta}>
              <Text style={s.metaText}>👤 {j.client}</Text>
              <Text style={s.metaText}>💰 {j.amt}</Text>
              <Text style={s.metaText}>#{j.id}</Text>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity style={s.actionBtn}><Text style={s.actionBtnText}>📞 Call client</Text></TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]}><Text style={s.actionBtnPrimaryText}>Mark complete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.cream },
  header:             { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  title:              { fontSize: 20, fontWeight: '300', color: '#fff' },
  sub:                { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  body:               { padding: 14 },
  card:               { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.creamMid },
  cardTop:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon:               { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  service:            { fontSize: 14, fontWeight: '600', color: colors.text },
  address:            { fontSize: 11, color: colors.textLight, marginTop: 2 },
  statusBadge:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:         { fontSize: 11, fontWeight: '600' },
  cardMeta:           { flexDirection: 'row', gap: 12, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.creamMid },
  metaText:           { fontSize: 11, color: colors.textMuted },
  cardActions:        { flexDirection: 'row', gap: 8 },
  actionBtn:          { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, alignItems: 'center' },
  actionBtnText:      { fontSize: 12, color: colors.text },
  actionBtnPrimary:   { backgroundColor: colors.accent, borderColor: colors.accent },
  actionBtnPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
})
