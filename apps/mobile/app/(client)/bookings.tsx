import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'

export default function BookingsTab() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.title}>My Bookings</Text></View>
      <View style={s.empty}>
        <Text style={s.emptyEmoji}>📋</Text>
        <Text style={s.emptyTitle}>No active bookings</Text>
        <Text style={s.emptySub}>Bookings you create will appear here</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.cream },
  header:     { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  title:      { fontSize: 20, fontWeight: '300', color: '#fff' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySub:   { fontSize: 13, color: colors.textLight },
})
