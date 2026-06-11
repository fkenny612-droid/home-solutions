import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'
import { useAuth } from '../../context/auth'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending:     { label: 'Pending',     bg: colors.amberBg,  fg: colors.amber  },
  accepted:    { label: 'Accepted',    bg: colors.greenBg,  fg: colors.green  },
  en_route:    { label: 'En route',    bg: colors.greenBg,  fg: colors.green  },
  in_progress: { label: 'In progress', bg: '#FFF8EC',       fg: colors.gold   },
  completed:   { label: 'Completed',   bg: colors.greenBg,  fg: colors.green  },
  emergency:   { label: 'Emergency',   bg: colors.redBg,    fg: colors.red    },
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹',
  hvac: '❄️', gas: '🔥', handyman: '🔧',
  tiling: '🪟', painting: '🎨', landscaping: '🌿', pool: '🏊',
  pest_control: '🐜', locksmith: '🔑', carpentry: '🪚', solar: '☀️',
  security: '📷', paving: '🛤️', waterproofing: '💦', roofing: '🏠',
  gate_motor: '🚪', moving: '📦', bricklaying: '🧱', borehole: '🌊',
  septic_tank: '🚽', dstv: '📡',
  tent_hire: '⛺', chair_table_hire: '🪑', decor_hire: '🌸',
  sound_pa_hire: '🔊', jumping_castle_hire: '🏰',
  catering_equipment_hire: '🍳', cold_room_hire: '🧊', mobile_toilet_hire: '🚻',
  generator_hire: '⚡', water_bowser_hire: '🚰',
  van_hire: '🚐', bakkie_hire: '🛻', furniture_removal: '🛋️',
  last_mile_delivery: '📬', livestock_transport: '🐄',
  security_guard_hire: '💂',
}

export default function ProviderJobs() {
  const { user } = useAuth()
  const [jobs,       setJobs]       = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const all = await api.bookings.list()
      setJobs(all.filter(b =>
        b.providerId === user?.id ||
        (b.status === 'pending' && !b.providerId)
      ))
    } catch {}
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const updateStatus = async (id: string, status: 'en_route' | 'in_progress' | 'completed') => {
    try { await api.bookings.updateStatus(id, status); await load() } catch {}
  }

  const acceptJob = async (id: string) => {
    if (!user) return
    try { await api.bookings.assignProvider(id, user.id); await load() } catch {}
  }

  const declineJob = async (id: string) => {
    try { await api.bookings.updateStatus(id, 'cancelled'); await load() } catch {}
  }

  const activeJobs  = jobs.filter(j => j.providerId === user?.id && !['completed', 'cancelled'].includes(j.status))
  const pendingJobs = jobs.filter(j => j.status === 'pending' && !j.providerId)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Jobs</Text>
        <Text style={s.sub}>{activeJobs.length} active · {pendingJobs.length} available</Text>
      </View>

      <ScrollView
        style={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {activeJobs.length > 0 && (
          <>
            <Text style={s.sectionLabel}>ACTIVE</Text>
            {activeJobs.map(j => (
              <JobCard key={j.id} job={j} onUpdateStatus={(st) => updateStatus(j.id, st)} />
            ))}
          </>
        )}

        {pendingJobs.length > 0 && (
          <>
            <Text style={[s.sectionLabel, activeJobs.length > 0 && { marginTop: 8 }]}>AVAILABLE TO ACCEPT</Text>
            {pendingJobs.map(j => (
              <View key={j.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.icon}>
                    <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[j.serviceType] ?? '🔧'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.service}>{j.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                    <Text style={s.address} numberOfLines={1}>{j.address}</Text>
                  </View>
                  <Text style={s.amt}>R {j.quotedAmount.toLocaleString()}</Text>
                </View>

                {/* Job meta */}
                <View style={s.jobMeta}>
                  <View style={s.jobMetaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
                    <Text style={s.jobMetaText}>{new Date(j.createdAt).toLocaleDateString('en-ZA')}</Text>
                  </View>
                  <View style={s.jobMetaItem}>
                    <Ionicons name="cash-outline" size={12} color={colors.gray400} />
                    <Text style={s.jobMetaText}>R {j.quotedAmount.toLocaleString()} quoted</Text>
                  </View>
                  {j.notes && (
                    <View style={[s.jobMetaItem, { marginTop: 4 }]}>
                      <Ionicons name="document-text-outline" size={12} color={colors.gray400} />
                      <Text style={[s.jobMetaText, { flex: 1 }]} numberOfLines={2}>{j.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={s.jobActions}>
                  <TouchableOpacity style={s.declineBtn} onPress={() => declineJob(j.id)}>
                    <Text style={s.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => acceptJob(j.id)}>
                    <Text style={s.acceptBtnText}>Accept →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {jobs.length === 0 && !refreshing && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No jobs yet</Text>
            <Text style={s.emptySub}>Pull down to refresh</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const STATUS_NEXT: Record<string, { label: string; next: 'en_route' | 'in_progress' | 'completed' } | null> = {
  accepted:    { label: "I'm on my way",  next: 'en_route'    },
  en_route:    { label: 'Start job',      next: 'in_progress' },
  in_progress: { label: 'Mark complete',  next: 'completed'   },
}

function JobCard({ job, onUpdateStatus }: { job: Booking; onUpdateStatus: (s: 'en_route' | 'in_progress' | 'completed') => void }) {
  const st   = STATUS_META[job.status] ?? { label: job.status, bg: colors.gray50, fg: colors.gray600 }
  const next = STATUS_NEXT[job.status]
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.icon}>
          <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[job.serviceType] ?? '🔧'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.service}>{job.serviceType.charAt(0).toUpperCase() + job.serviceType.slice(1)}</Text>
          <Text style={s.address} numberOfLines={1}>{job.address}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>

      <View style={s.cardMeta}>
        <Text style={s.metaText}>R {job.quotedAmount.toLocaleString()}</Text>
        <Text style={s.metaDivider}>·</Text>
        <Text style={s.metaText}>#{job.id.slice(-6).toUpperCase()}</Text>
      </View>

      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL('tel:+27821234567')}>
          <Text style={s.actionBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push({ pathname: '/(client)/chat', params: { bookingId: job.id, providerName: 'Client' } } as any)}
        >
          <Text style={s.actionBtnText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push({ pathname: '/(provider)/materials', params: { bookingId: job.id, serviceType: job.serviceType } } as any)}
        >
          <Text style={s.actionBtnText}>Materials</Text>
        </TouchableOpacity>
        {next && (
          <TouchableOpacity style={[s.actionBtn, s.actionPrimary]} onPress={() => onUpdateStatus(next.next)}>
            <Text style={s.actionPrimaryText}>{next.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.gray50 },
  header:            { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  title:             { fontSize: 24, fontWeight: '700', color: colors.white, letterSpacing: -0.3 },
  sub:               { fontSize: 12, color: colors.gray400, marginTop: 2 },
  body:              { padding: 16 },
  sectionLabel:      { fontSize: 10, color: colors.gray400, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  empty:             { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle:        { fontSize: 17, fontWeight: '700', color: colors.black },
  emptySub:          { fontSize: 14, color: colors.gray400 },
  card:              { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 10 },
  cardTop:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon:              { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  service:           { fontSize: 14, fontWeight: '700', color: colors.black },
  address:           { fontSize: 11, color: colors.gray400, marginTop: 2 },
  amt:               { fontSize: 14, fontWeight: '700', color: colors.black },
  statusBadge:       { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:        { fontSize: 11, fontWeight: '700' },
  cardMeta:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100, marginBottom: 12 },
  metaText:          { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  metaDivider:       { fontSize: 12, color: colors.gray200 },
  cardActions:       { flexDirection: 'row', gap: 8 },
  actionBtn:         { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.gray100, alignItems: 'center', backgroundColor: colors.gray50 },
  actionBtnText:     { fontSize: 12, color: colors.black, fontWeight: '500' },
  actionPrimary:     { backgroundColor: colors.black, borderColor: colors.black },
  actionPrimaryText: { fontSize: 12, color: colors.white, fontWeight: '600' },
  jobMeta:           { borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 10, marginTop: 10, gap: 6 },
  jobMetaItem:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobMetaText:       { fontSize: 12, color: colors.gray600 },
  jobActions:        { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineBtn:        { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 12, alignItems: 'center' },
  declineBtnText:    { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  acceptBtn:         { flex: 2, backgroundColor: colors.gold, borderRadius: 10, padding: 12, alignItems: 'center' },
  acceptBtnText:     { fontSize: 14, fontWeight: '700', color: colors.black },
})
