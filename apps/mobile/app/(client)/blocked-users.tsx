import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { Alert } from '../../lib/alert'
import { api, BlockedUser } from '../../lib/api'

export default function BlockedUsers() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)

  const load = useCallback(async () => {
    try { setBlocked(await api.blocks.list()); setFailed(false) }
    catch { setFailed(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const unblock = (user: BlockedUser) => {
    Alert.alert(`Unblock ${user.name}?`, 'You will be able to see and message each other again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            await api.blocks.unblock(user.userId)
            setBlocked(prev => prev.filter(b => b.userId !== user.userId))
          } catch { Alert.alert('Could not unblock', 'Check your connection and try again.') }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Blocked users</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : failed ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Could not load your blocked users</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => { setLoading(true); load() }}>
            <Text style={s.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={b => b.userId}
          contentContainerStyle={s.body}
          ListHeaderComponent={blocked.length > 0 ? (
            <Text style={s.note}>Blocked people cannot message you, and you will not see their listings or each other in search.</Text>
          ) : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="ban-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>No blocked users</Text>
              <Text style={s.emptySub}>Long-press a message, or open a listing, to report or block someone.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.avatar}><Text style={s.avatarText}>{item.name[0]?.toUpperCase() ?? '?'}</Text></View>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity activeOpacity={0.8} style={s.unblockBtn} onPress={() => unblock(item)}>
                <Text style={s.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.gray50 },
  header:      { backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.white },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  body:        { padding: 16 },
  note:        { fontSize: 12, color: colors.gray400, lineHeight: 17, marginBottom: 12 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 24 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:    { fontSize: 13, color: colors.gray400, textAlign: 'center' },
  retry:       { fontSize: 14, fontWeight: '600', color: colors.gold },
  card:        { backgroundColor: colors.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  avatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 14, fontWeight: '700', color: colors.gray600 },
  name:        { flex: 1, fontSize: 15, fontWeight: '600', color: colors.black },
  unblockBtn:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200 },
  unblockText: { fontSize: 13, fontWeight: '600', color: colors.black },
})
