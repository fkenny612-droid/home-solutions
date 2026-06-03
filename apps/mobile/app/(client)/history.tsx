import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'

const HISTORY = [
  { emoji: '⚡', bg: '#FEF3C7', name: 'Electrical — DB board', sub: '15 May · Kevin M.', stars: '★★★★★', amt: 'R 850',   warranty: true },
  { emoji: '💧', bg: '#DBEAFE', name: 'Plumbing — Geyser',    sub: '2 May · Raj P.',   stars: '★★★★☆', amt: 'R 2 200', warranty: true },
  { emoji: '🧹', bg: '#D1FAE5', name: 'Deep clean',           sub: '18 Apr · Zanele D.',stars: '★★★★★', amt: 'R 550',   warranty: false },
]

export default function HistoryTab() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.title}>Job History</Text></View>
      <ScrollView style={s.body}>
        {HISTORY.map((j, i) => (
          <View key={i} style={s.item}>
            <View style={[s.icon, { backgroundColor: j.bg }]}><Text style={{ fontSize: 18 }}>{j.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{j.name}</Text>
              <Text style={s.sub}>{j.sub} · {j.stars}</Text>
              {j.warranty && <View style={s.warrantBadge}><Text style={s.warrantText}>🛡️ Warranty active</Text></View>}
            </View>
            <Text style={s.amt}>{j.amt}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.cream },
  header:       { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  title:        { fontSize: 20, fontWeight: '300', color: '#fff' },
  body:         { padding: 14 },
  item:         { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  icon:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name:         { fontSize: 13, fontWeight: '600', color: colors.text },
  sub:          { fontSize: 10, color: colors.textLight, marginTop: 2 },
  warrantBadge: { backgroundColor: '#E8F5EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  warrantText:  { fontSize: 9, color: '#1A5C38' },
  amt:          { fontSize: 13, fontWeight: '700', color: colors.accent },
})
