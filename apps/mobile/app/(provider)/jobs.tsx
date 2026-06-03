import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'
import { useAuth } from '../../context/auth'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: colors.amber  },
  accepted:    { label: 'Accepted',    color: colors.accent },
  en_route:    { label: 'En route',    color: colors.accent },
  in_progress: { label: 'In progress', color: colors.gold   },
  completed:   { label: 'Completed',   color: colors.accent },
  emergency:   { label: 'Emergency',   color: colors.red    },
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹',
  hvac: '❄️', gas: '🔥', handyman: '🔧',
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

  const activeJobs  = jobs.filter(j => !['pending', 'completed', 'cancelled'].includes(j.status))
  const pendingJobs = jobs.filter(j => j.status === 'pending' && !j.providerId)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>My Jobs</Text>
        <Text style={s.sub}>{activeJobs.length} active · {pendingJobs.length} available</Text>
      </View>

      <ScrollView
        style={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {activeJobs.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Active</Text>
            {activeJobs.map(j => (
              <JobCard key={j.id} job={j} onUpdateStatus={(s) => updateStatus(j.id, s)} />
            ))}
          </>
        )}

        {pendingJobs.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 8 }]}>Available to accept</Text>
            {pendingJobs.map(j => (
              <View key={j.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.icon, { backgroundColor: '#F0F9FF' }]}>
                    <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[j.serviceType] ?? '🔧'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.service}>{j.serviceType.charAt(0).toUpperCase() + j.serviceType.slice(1)}</Text>
                    <Text style={s.address} numberOfLines={1}>{j.address}</Text>
                  </View>
                  <Text style={s.amt}>R {j.quotedAmount.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={s.acceptBtn} onPress={() => acceptJob(j.id)}>
                  <Text style={s.acceptBtnText}>Accept job</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {jobs.length === 0 && !refreshing && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔧</Text>
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
  accepted:    { label: '🚗  I\'m on my way',    next: 'en_route'    },
  en_route:    { label: '🔧  Start job',          next: 'in_progress' },
  in_progress: { label: '✅  Mark complete',       next: 'completed'   },
}

function JobCard({ job, onUpdateStatus }: { job: Booking; onUpdateStatus: (s: 'en_route' | 'in_progress' | 'completed') => void }) {
  const st   = STATUS_META[job.status] ?? { label: job.status, color: colors.textMuted }
  const next = STATUS_NEXT[job.status]
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={[s.icon, { backgroundColor: '#F0F9FF' }]}>
          <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[job.serviceType] ?? '🔧'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.service}>{job.serviceType.charAt(0).toUpperCase() + job.serviceType.slice(1)}</Text>
          <Text style={s.address} numberOfLines={1}>{job.address}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: st.color + '18' }]}>
          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <View style={s.cardMeta}>
        <Text style={s.metaText}>💰 R {job.quotedAmount.toLocaleString()}</Text>
        <Text style={s.metaText}>#{job.id.slice(-6).toUpperCase()}</Text>
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL('tel:+27821234567')}>
          <Text style={s.actionBtnText}>📞 Call client</Text>
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
  safe:              { flex: 1, backgroundColor: colors.cream },
  header:            { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  title:             { fontSize: 20, fontWeight: '300', color: '#fff' },
  sub:               { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  body:              { padding: 14 },
  sectionLabel:      { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: '500' },
  empty:             { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji:        { fontSize: 44 },
  emptyTitle:        { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySub:          { fontSize: 13, color: colors.textLight },
  card:              { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  cardTop:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon:              { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  service:           { fontSize: 14, fontWeight: '600', color: colors.text },
  address:           { fontSize: 11, color: colors.textLight, marginTop: 2 },
  amt:               { fontSize: 14, fontWeight: '700', color: colors.accent },
  statusBadge:       { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:        { fontSize: 11, fontWeight: '600' },
  cardMeta:          { flexDirection: 'row', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.creamMid, marginBottom: 10 },
  metaText:          { fontSize: 11, color: colors.textMuted },
  cardActions:       { flexDirection: 'row', gap: 8 },
  actionBtn:         { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, alignItems: 'center' },
  actionBtnText:     { fontSize: 12, color: colors.text },
  actionPrimary:     { backgroundColor: colors.accent, borderColor: colors.accent },
  actionPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  acceptBtn:         { backgroundColor: colors.gold, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  acceptBtnText:     { fontSize: 13, fontWeight: '600', color: colors.navy },
})
