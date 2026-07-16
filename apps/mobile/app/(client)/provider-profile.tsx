import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Provider, Review } from '../../lib/api'

const AVATAR_COLORS = [
  { bg: '#E8F5E9', fg: '#1B5E20' }, { bg: '#E3F2FD', fg: '#0D47A1' },
  { bg: '#FFF3E0', fg: '#E65100' }, { bg: '#F3E5F5', fg: '#4A148C' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSkill(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [provider,   setProvider]   = useState<Provider | null>(null)
  const [reviews,    setReviews]    = useState<Review[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [p, r] = await Promise.all([
        api.providers.get(id!),
        api.providers.reviews(id!),
      ])
      setProvider(p)
      setReviews(r)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  if (!provider) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><Text style={s.errText}>Provider not found</Text></View>
    </SafeAreaView>
  )

  const initials = provider.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const ac = AVATAR_COLORS[provider.id.charCodeAt(0) % AVATAR_COLORS.length]
  const stars = Math.round(provider.rating)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Provider profile</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={[s.avatar, { backgroundColor: ac.bg }]}>
            <Text style={[s.avatarText, { color: ac.fg }]}>{initials}</Text>
          </View>
          <Text style={s.name}>{provider.name}</Text>
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={18} color={colors.gold} />
            ))}
            <Text style={s.ratingText}>{provider.rating.toFixed(1)} · {provider.reviewCount} reviews</Text>
          </View>
          <View style={s.badgeRow}>
            <View style={s.badge}><Text style={s.badgeText}>🏅 Certified</Text></View>
            <View style={s.badge}><Text style={s.badgeText}>✓ Insured</Text></View>
            {provider.kycStatus === 'approved' && <View style={[s.badge, s.badgeGreen]}><Text style={[s.badgeText, { color: colors.green }]}>✓ Verified</Text></View>}
            {provider.availability?.emergency && <View style={[s.badge, s.badgeRed]}><Text style={[s.badgeText, { color: colors.red }]}>⚡ Emergency</Text></View>}
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>{provider.jobCount}</Text>
            <Text style={s.statLabel}>Jobs done</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{provider.rating.toFixed(1)}</Text>
            <Text style={s.statLabel}>Avg rating</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statVal}>{provider.reviewCount}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Skills */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SKILLS & SERVICES</Text>
          <View style={s.skillsWrap}>
            {provider.skills.map(skill => (
              <View key={skill} style={s.skillChip}>
                <Text style={s.skillText}>{formatSkill(skill)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>AVAILABILITY</Text>
          <View style={s.availCard}>
            {[
              { label: 'Mon – Fri', active: provider.availability?.monFri },
              { label: 'Saturday',  active: provider.availability?.saturday },
              { label: 'Sunday',    active: provider.availability?.sunday },
              { label: 'Emergency', active: provider.availability?.emergency },
            ].map(a => (
              <View key={a.label} style={s.availRow}>
                <Text style={s.availLabel}>{a.label}</Text>
                <Ionicons
                  name={a.active ? 'checkmark-circle' : 'close-circle-outline'}
                  size={18}
                  color={a.active ? colors.green : colors.gray200}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Service areas */}
        {provider.serviceAreas?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>SERVICE AREAS</Text>
            <View style={s.skillsWrap}>
              {provider.serviceAreas.map(area => (
                <View key={area} style={s.areaChip}>
                  <Ionicons name="location-outline" size={12} color={colors.gray400} />
                  <Text style={s.areaText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RECENT REVIEWS</Text>
          {reviews.length === 0 ? (
            <Text style={s.emptyText}>No reviews yet</Text>
          ) : (
            <View style={s.reviewsCard}>
              {reviews.slice(0, 8).map((r, i) => (
                <View key={r.id} style={[s.reviewRow, i < reviews.length - 1 && s.reviewDivider]}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewStars}>
                      {[1,2,3,4,5].map(n => (
                        <Ionicons key={n} name={n <= r.stars ? 'star' : 'star-outline'} size={13} color={colors.gold} />
                      ))}
                    </View>
                    <Text style={s.reviewDate}>{formatDate(r.createdAt)}</Text>
                  </View>
                  {r.tags?.length > 0 && (
                    <View style={s.tagRow}>
                      {r.tags.map(t => <View key={t} style={s.reviewTag}><Text style={s.reviewTagText}>{t}</Text></View>)}
                    </View>
                  )}
                  {r.comment && <Text style={s.reviewComment}>{r.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.gray50 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errText:      { fontSize: 15, color: colors.gray400 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { padding: 2 },
  title:        { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  heroCard:     { backgroundColor: colors.black, padding: 24, alignItems: 'center', paddingBottom: 28 },
  avatar:       { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:   { fontSize: 26, fontWeight: '700' },
  name:         { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 8 },
  starsRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  ratingText:   { fontSize: 13, color: colors.gray400, marginLeft: 4 },
  badgeRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge:        { backgroundColor: colors.black2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeGreen:   { backgroundColor: colors.greenBg },
  badgeRed:     { backgroundColor: colors.redBg },
  badgeText:    { fontSize: 11, fontWeight: '600', color: colors.gray400 },

  statsRow:     { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100, paddingVertical: 16 },
  statBox:      { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 22, fontWeight: '700', color: colors.black },
  statLabel:    { fontSize: 11, color: colors.gray400, marginTop: 3 },
  statDivider:  { width: 1, backgroundColor: colors.gray100 },

  section:      { padding: 16, paddingBottom: 0 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },

  skillsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  skillChip:    { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.gray100 },
  skillText:    { fontSize: 12, color: colors.black, fontWeight: '600' },

  availCard:    { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100, marginBottom: 16 },
  availRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  availLabel:   { fontSize: 13, color: colors.black },

  areaChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.gray100 },
  areaText:     { fontSize: 12, color: colors.gray600 },

  reviewsCard:  { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100, marginBottom: 16 },
  reviewRow:    { padding: 14 },
  reviewDivider:{ borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewStars:  { flexDirection: 'row', gap: 2 },
  reviewDate:   { fontSize: 11, color: colors.gray400 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  reviewTag:    { backgroundColor: colors.gray50, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  reviewTagText:{ fontSize: 10, color: colors.gray600, fontWeight: '600' },
  reviewComment:{ fontSize: 13, color: colors.gray600, lineHeight: 18 },
  emptyText:    { fontSize: 13, color: colors.gray400, paddingBottom: 16 },
})
