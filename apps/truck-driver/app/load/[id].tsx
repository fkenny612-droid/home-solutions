import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { api, type DriverLoad } from '../../lib/api'
import { fmtDate, fmtDuration, fmtLength, fmtWeight, fmtDistance } from '../../lib/format'
import { colors } from '../../lib/theme'
import { Button, Card, HazmatBanner, Label, StatusPill } from '../../components/ui'
import { DeliverForm } from '../../components/DeliverForm'
import { useLocationSharing } from '../../lib/tracking'

export default function LoadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [load, setLoad] = useState<DriverLoad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const sharing = useLocationSharing(load?.id, load?.status === 'assigned' || load?.status === 'in_transit')

  useFocusEffect(useCallback(() => {
    api.load(id).then(setLoad).catch(e => setError(e.message))
  }, [id]))

  function startTrip() {
    if (!load) return
    Alert.alert('Start trip?', `Dispatch will see ${load.reference} is on the road.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start trip',
        onPress: async () => {
          setBusy(true); setError(null)
          try {
            setLoad(await api.setStatus(load.id, 'in_transit'))
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  if (!load) {
    return (
      <SafeAreaView style={s.screen}>
        <Pressable onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹ My loads</Text></Pressable>
        <Text style={s.centered}>{error ?? 'Loading…'}</Text>
      </SafeAreaView>
    )
  }

  const active = load.status === 'assigned' || load.status === 'in_transit'
  const nextStop = load.status === 'assigned' ? 'pickup' : 'delivery'

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={12}><Text style={s.backText}>‹ My loads</Text></Pressable>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <Text style={s.ref}>{load.reference}</Text>
          <StatusPill status={load.status} />
        </View>

        <HazmatBanner types={load.hazmatTypes} />

        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Label>A · Pickup · {fmtDate(load.pickupAt)}</Label>
            <Text style={s.addr}>{load.originAddress}</Text>
            <Text style={s.muted}>{load.shipperName}</Text>
          </View>
          <View style={s.divider} />
          <View style={{ gap: 4 }}>
            <Label>B · Deliver by · {fmtDate(load.deliverBy)}</Label>
            <Text style={s.addr}>{load.destAddress}</Text>
          </View>
        </Card>

        {load.routeDistanceM != null && (
          <Card style={{ gap: 6 }}>
            <Label>Planned truck route (pickup → delivery)</Label>
            <Text style={s.addr}>{fmtDistance(load.routeDistanceM)} · {fmtDuration(load.routeDurationS ?? 0)}</Text>
            {load.routeWarnings.map((w, i) => <Text key={i} style={s.warning}>⚠ {w}</Text>)}
          </Card>
        )}

        <Card style={s.grid}>
          <View style={s.cell}><Label>Cargo</Label><Text style={s.value}>{load.commodity}</Text></View>
          <View style={s.cell}><Label>Weight</Label><Text style={s.value}>{fmtWeight(load.weightKg)}</Text></View>
          {load.truck && <>
            <View style={s.cell}><Label>Truck</Label><Text style={s.value}>{load.truck.name} · {load.truck.plate}</Text></View>
            <View style={s.cell}><Label>Height · length</Label><Text style={s.value}>{fmtLength(load.truck.heightMm)} · {fmtLength(load.truck.lengthMm)}</Text></View>
            <View style={s.cell}><Label>Laden weight</Label><Text style={s.value}>{fmtWeight(load.truck.tareWeightKg + load.weightKg)}</Text></View>
          </>}
          {load.notes && <View style={[s.cell, { width: '100%' }]}><Label>Notes from dispatch</Label><Text style={s.value}>{load.notes}</Text></View>}
        </Card>

        {load.events && load.events.length > 0 && (
          <Card style={{ gap: 6 }}>
            <Label>History</Label>
            {load.events.map(e => <Text key={e.id} style={s.event}><Text style={s.muted}>{fmtDate(e.createdAt)}  </Text>{e.message}</Text>)}
          </Card>
        )}
      </ScrollView>

      {active && (
        <View style={s.actions}>
          {error && <Text style={s.error}>{error}</Text>}
          <Button
            title={`Navigate to ${nextStop}`}
            variant="primary"
            onPress={() => router.push({ pathname: '/navigate/[id]', params: { id: load.id } })}
          />
          <Text style={s.sharing}>
            {sharing === 'on' ? '● Sharing your location with dispatch and the shipper'
              : sharing === 'denied' ? 'Location is off — allow it so dispatch can see where you are' : ' '}
          </Text>
          {load.status === 'assigned'
            ? <Button title="Start trip" variant="silver" onPress={startTrip} busy={busy} />
            : delivering
              ? <DeliverForm loadId={load.id} onDelivered={l => { setLoad(l); setDelivering(false) }} onError={setError} />
              : <Button title="Mark delivered" variant="dark" onPress={() => setDelivering(true)} />}
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: 20, paddingVertical: 10 },
  backText: { fontSize: 16, color: colors.muted },
  centered: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 28, fontWeight: '800', color: colors.brandDark },
  addr: { fontSize: 17, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border },
  warning: { fontSize: 13, color: colors.amberText, backgroundColor: colors.amberBg, padding: 8, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  cell: { width: '50%', gap: 2 },
  value: { fontSize: 15, color: colors.text },
  event: { fontSize: 13, color: colors.text },
  actions: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  sharing: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  error: { color: colors.red, fontSize: 14 },
})
