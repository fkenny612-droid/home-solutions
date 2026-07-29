import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'

const CHAT_STATUSES = ['accepted', 'en_route', 'in_progress', 'completed']

export default function ChatInbox() {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(false)

  const load = async () => {
    try {
      const data = await api.bookings.list()
      setBookings(data.filter(b => CHAT_STATUSES.includes(b.status)))
      setError(false)
    } catch {
      setError(true)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const openChat = (b: Booking) =>
    router.push({
      pathname: '/(client)/conversation',
      params: { bookingId: b.id, providerName: b.providerName ?? 'Provider' },
    })

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <Text style={s.sub}>{bookings.length} conversation{bookings.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={bookings.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          error ? (
            <View style={s.empty}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>Could not load messages</Text>
              <Text style={s.emptySub}>Pull down to retry</Text>
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color={colors.gray200} />
              <Text style={s.emptyTitle}>No active chats</Text>
              <Text style={s.emptySub}>Chats open once a provider accepts your booking</Text>
            </View>
          )
        }
        renderItem={({ item: b }) => (
          <TouchableOpacity style={s.row} onPress={() => openChat(b)} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(b.providerName ?? 'P')[0].toUpperCase()}</Text>
            </View>
            <View style={s.rowBody}>
              <View style={s.rowTop}>
                <Text style={s.provName} numberOfLines={1}>{b.providerName ?? 'Provider'}</Text>
                <Text style={s.rowDate}>{new Date(b.createdAt).toLocaleDateString('en-ZA')}</Text>
              </View>
              <Text style={s.rowSub} numberOfLines={1}>
                {b.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · #{b.id.slice(-6).toUpperCase()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.gray50 },
  header:         { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  title:          { fontSize: 24, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },
  sub:            { fontSize: 12, color: colors.gray400, marginTop: 2 },
  list:           { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty:          { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: colors.black },
  emptySub:       { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingHorizontal: 40 },
  row:            {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 14,
    padding: 14, marginHorizontal: 16, marginBottom: 10,
  },
  avatar:         {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:     { fontSize: 18, fontWeight: '700', color: colors.gold },
  rowBody:        { flex: 1, gap: 3 },
  rowTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  provName:       { fontSize: 14, fontWeight: '700', color: colors.black, flex: 1 },
  rowDate:        { fontSize: 11, color: colors.gray400 },
  rowSub:         { fontSize: 12, color: colors.gray600 },
})
