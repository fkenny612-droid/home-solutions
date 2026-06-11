import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, Review } from '../../lib/api'
import { useAuth } from '../../context/auth'
import { colors } from '../../constants/theme'

const TAGS_COLOR: Record<string, string> = {
  'On time':       '#0D4F2E',
  'Professional':  '#1A1A2E',
  'Clean work':    '#0D3B4F',
  'Good value':    '#2E1A0D',
  'Communicative': '#2E0D4F',
}

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= n ? 'star' : 'star-outline'} size={13} color={colors.gold} />
      ))}
    </View>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1) return 'today'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

export default function ProviderReviews() {
  const { user } = useAuth()
  const [reviews,    setReviews]    = useState<Review[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [provider,   setProvider]   = useState<{ rating: number; reviewCount: number } | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    try {
      const [p, r] = await Promise.all([
        api.providers.get(user.id),
        api.providers.reviews(user.id),
      ])
      setProvider({ rating: p.rating, reviewCount: p.reviewCount })
      setReviews(r)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const avgByStars = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.stars === star).length,
    pct:   reviews.length ? reviews.filter(r => r.stars === star).length / reviews.length : 0,
  }))

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>My Reviews</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
          ListHeaderComponent={
            provider && (
              <View style={s.summary}>
                <View style={s.summaryLeft}>
                  <Text style={s.bigRating}>{provider.rating.toFixed(1)}</Text>
                  <Stars n={Math.round(provider.rating)} />
                  <Text style={s.reviewCount}>{provider.reviewCount} reviews</Text>
                </View>
                <View style={s.bars}>
                  {avgByStars.map(({ star, count, pct }) => (
                    <View key={star} style={s.barRow}>
                      <Text style={s.barLabel}>{star}</Text>
                      <Ionicons name="star" size={10} color={colors.gold} />
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct * 100}%` as any }]} />
                      </View>
                      <Text style={s.barCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          }
          contentContainerStyle={reviews.length === 0 ? s.emptyWrap : { paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="star-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>No reviews yet</Text>
              <Text style={s.emptySub}>Reviews from clients will appear here</Text>
            </View>
          }
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{r.clientId.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardTopRow}>
                    <Stars n={r.stars} />
                    <Text style={s.cardTime}>{timeAgo(r.createdAt)}</Text>
                  </View>
                  {r.tags.length > 0 && (
                    <View style={s.tagRow}>
                      {r.tags.map(t => (
                        <View key={t} style={[s.tag, { backgroundColor: (TAGS_COLOR[t] ?? '#222') + '22' }]}>
                          <Text style={[s.tagText, { color: TAGS_COLOR[t] ?? colors.black }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              {!!r.comment && <Text style={s.comment}>{r.comment}</Text>}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.gray50 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.black },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },

  summary:     { flexDirection: 'row', backgroundColor: colors.white, margin: 16, borderRadius: 16, padding: 20, gap: 20, borderWidth: 1, borderColor: colors.gray100 },
  summaryLeft: { alignItems: 'center', gap: 4, minWidth: 72 },
  bigRating:   { fontSize: 42, fontWeight: '700', color: colors.black, lineHeight: 48 },
  reviewCount: { fontSize: 11, color: colors.gray400, marginTop: 4 },
  bars:        { flex: 1, gap: 6, justifyContent: 'center' },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel:    { fontSize: 11, color: colors.gray600, width: 8, textAlign: 'right' },
  barTrack:    { flex: 1, height: 6, backgroundColor: colors.gray100, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  barCount:    { fontSize: 11, color: colors.gray400, width: 20, textAlign: 'right' },

  emptyWrap:   { flex: 1 },
  empty:       { flex: 1, alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:    { fontSize: 12, color: colors.gray400 },

  card:        { backgroundColor: colors.white, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.gray100 },
  cardTop:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.black2, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, fontWeight: '700', color: colors.gold },
  cardTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTime:    { fontSize: 11, color: colors.gray400 },
  tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:         { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:     { fontSize: 10, fontWeight: '600' },
  comment:     { fontSize: 13, color: colors.gray600, lineHeight: 19, marginTop: 10 },
})
