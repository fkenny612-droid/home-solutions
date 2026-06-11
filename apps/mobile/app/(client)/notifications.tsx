import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, AppNotification } from '../../lib/api'
import { colors } from '../../constants/theme'

const TYPE_ICON: Record<string, { icon: string; bg: string }> = {
  booking_created:    { icon: 'clipboard-outline',      bg: '#1A1A2E' },
  provider_assigned:  { icon: 'person-outline',          bg: '#0D4F2E' },
  job_complete:       { icon: 'checkmark-circle-outline', bg: '#0D3B4F' },
  chat_message:       { icon: 'chatbubble-outline',      bg: '#2E1A4F' },
  payment:            { icon: 'card-outline',             bg: '#4F2E0D' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationsScreen() {
  const [items,     setItems]     = useState<AppNotification[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const data = await api.notifications.list()
      setItems(data)
      // Mark all read after viewing
      const unread = data.filter(n => !n.read).map(n => n.id)
      if (unread.length) api.notifications.markRead(unread).catch(() => {})
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleTap = (item: AppNotification) => {
    const bookingId = item.data?.bookingId
    if (!bookingId) return
    if (item.type === 'chat_message') {
      router.push({ pathname: '/(client)/chat', params: { bookingId } })
    } else {
      router.push({ pathname: '/(client)/bookings' })
    }
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => api.notifications.markRead().then(() => load())}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
        contentContainerStyle={items.length === 0 ? s.emptyWrap : { paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.gray400} />
            <Text style={s.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = TYPE_ICON[item.type] ?? { icon: 'notifications-outline', bg: '#222' }
          return (
            <TouchableOpacity style={[s.row, !item.read && s.rowUnread]} onPress={() => handleTap(item)} activeOpacity={0.8}>
              <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={20} color={colors.gold} />
              </View>
              <View style={s.content}>
                <View style={s.topRow}>
                  <Text style={[s.notifTitle, !item.read && s.notifTitleUnread]} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={s.body} numberOfLines={2}>{item.body}</Text>
              </View>
              {!item.read && <View style={s.dot} />}
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.black },
  back:          { marginRight: 12 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  markAll:       { fontSize: 13, color: colors.gold },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap:     { flex: 1 },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyText:     { fontSize: 15, color: colors.gray400 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100, backgroundColor: colors.white },
  rowUnread:     { backgroundColor: '#FFFBF0' },
  iconWrap:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:       { flex: 1 },
  topRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  notifTitle:    { fontSize: 14, fontWeight: '500', color: colors.gray600, flex: 1, marginRight: 8 },
  notifTitleUnread: { color: colors.black, fontWeight: '700' },
  body:          { fontSize: 13, color: colors.gray400, lineHeight: 18 },
  time:          { fontSize: 11, color: colors.gray400 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginLeft: 8 },
})
