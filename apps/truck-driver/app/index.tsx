import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { api, type DriverLoad, type DriverTruck } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDate, fmtLb, fmtMiles } from '../lib/format'
import { colors } from '../lib/theme'
import { Card, Label, StatusPill } from '../components/ui'

const REFRESH_MS = 60_000

function LoadCard({ load }: { load: DriverLoad }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/load/[id]', params: { id: load.id } })}>
      {({ pressed }) => (
        <Card style={{ opacity: pressed ? 0.85 : 1, gap: 8 }}>
          <View style={s.row}>
            <Text style={s.ref}>{load.reference}</Text>
            <StatusPill status={load.status} />
          </View>
          <Text style={s.addr} numberOfLines={1}><Text style={s.ab}>A  </Text>{load.originAddress}</Text>
          <Text style={s.addr} numberOfLines={1}><Text style={s.ab}>B  </Text>{load.destAddress}</Text>
          <Text style={s.meta}>
            {load.pickupAt ? `Pickup ${fmtDate(load.pickupAt)}` : 'Pickup time not set'} · {fmtLb(load.weightKg)}
            {load.routeDistanceM != null ? ` · ${fmtMiles(load.routeDistanceM)}` : ''}
            {load.hazmatTypes.length ? ' · hazmat' : ''}
          </Text>
        </Card>
      )}
    </Pressable>
  )
}

export default function Loads() {
  const { signOut } = useAuth()
  const [trucks, setTrucks] = useState<DriverTruck[]>([])
  const [loads, setLoads] = useState<DriverLoad[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await api.loads()
      setTrucks(r.trucks); setLoads(r.loads); setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const onRoad = loads?.filter(l => l.status === 'in_transit') ?? []
  const upNext = loads?.filter(l => l.status === 'assigned') ?? []
  const recent = loads?.filter(l => l.status === 'delivered').reverse() ?? []

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>My loads</Text>
        <Pressable onPress={signOut} hitSlop={12}><Text style={s.signOut}>Sign out</Text></Pressable>
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false) }} />}
      >
        {error && <Text style={s.error}>{error}</Text>}
        {loads === null ? (
          <Text style={s.empty}>Loading…</Text>
        ) : trucks.length === 0 && loads.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Text style={s.emptyTitle}>No truck is linked to your phone</Text>
            <Text style={s.emptyText}>Ask dispatch to add your phone number to your truck, then pull down to refresh.</Text>
          </Card>
        ) : (
          <>
            {trucks.length > 0 && <Text style={s.truck}>🚛 {trucks.map(t => `${t.name} · ${t.plate}`).join(', ')}</Text>}
            {onRoad.length > 0 && <View style={s.section}><Label>On the road</Label>{onRoad.map(l => <LoadCard key={l.id} load={l} />)}</View>}
            <View style={s.section}>
              <Label>Up next</Label>
              {upNext.length ? upNext.map(l => <LoadCard key={l.id} load={l} />)
                : onRoad.length === 0 && <Text style={s.emptyText}>No loads assigned right now.</Text>}
            </View>
            {recent.length > 0 && <View style={s.section}><Label>Delivered (last 14 days)</Label>{recent.map(l => <LoadCard key={l.id} load={l} />)}</View>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.brandDark },
  signOut: { color: colors.muted, fontSize: 15 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 18, fontWeight: '700', color: colors.text },
  addr: { fontSize: 15, color: colors.text },
  ab: { color: colors.faint, fontWeight: '600' },
  meta: { fontSize: 13, color: colors.muted },
  truck: { fontSize: 14, color: colors.muted },
  error: { color: colors.red, fontSize: 14 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
})
