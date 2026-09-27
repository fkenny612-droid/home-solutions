/**
 * Turn-by-turn truck navigation with Google's Navigation SDK.
 *
 * The API computes a Routes API route token for this rig (height, weight,
 * axles, hazmat) from the driver's current position to the next stop; the
 * SDK follows that route and its re-routes keep the same truck restrictions.
 * If a truck route can't be produced we stop — never fall back to car routing.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import * as Location from 'expo-location'
import {
  NavigationSessionStatus, NavigationView, RouteStatus, useNavigation,
  type ArrivalEvent, type Location as NavLocation,
} from '@googlemaps/react-native-navigation-sdk'
import { api, ApiError, type NavigationPlan } from '../../lib/api'
import { fmtDuration, fmtMiles } from '../../lib/format'
import { colors } from '../../lib/theme'
import { Button } from '../../components/ui'

type Phase =
  | { kind: 'preparing'; step: string }
  | { kind: 'guiding' }
  | { kind: 'arrived' }
  | { kind: 'error'; message: string; action?: { label: string; run: () => void } }

const FIRST_FIX_TIMEOUT_MS = 20_000

const SESSION_ERRORS: Partial<Record<NavigationSessionStatus, string>> = {
  [NavigationSessionStatus.NOT_AUTHORIZED]:
    "This build's Google API key isn't authorized for the Navigation SDK. Ask your admin to enable it in Google Cloud.",
  [NavigationSessionStatus.TERMS_NOT_ACCEPTED]: 'Google navigation terms must be accepted to navigate.',
  [NavigationSessionStatus.NETWORK_ERROR]: 'No connection — navigation needs data to start.',
  [NavigationSessionStatus.LOCATION_PERMISSION_MISSING]: 'Location permission is needed for navigation.',
}

const ROUTE_ERRORS: Partial<Record<RouteStatus, string>> = {
  [RouteStatus.NO_ROUTE_FOUND]: 'Google found no truck-legal route for this rig. Call dispatch.',
  [RouteStatus.NETWORK_ERROR]: 'No connection — could not load the route.',
  [RouteStatus.QUOTA_CHECK_FAILED]: 'Navigation quota exceeded. Tell dispatch.',
  [RouteStatus.LOCATION_DISABLED]: 'Turn on location services to navigate.',
  [RouteStatus.LOCATION_UNKNOWN]: "Couldn't get a GPS fix. Move to open sky and retry.",
  [RouteStatus.WAYPOINT_ERROR]: "Google couldn't use this stop's location. Call dispatch.",
}

export default function Navigate() {
  useKeepAwake()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { navigationController: nav, setOnArrival, setOnLocationChanged, removeAllListeners } = useNavigation()

  const [phase, setPhase] = useState<Phase>({ kind: 'preparing', step: 'Checking location permission…' })
  const [plan, setPlan] = useState<NavigationPlan | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const lastFix = useRef<NavLocation | null>(null)
  const firstFixWaiters = useRef<((l: NavLocation) => void)[]>([])
  const sessionReady = useRef(false)
  const started = useRef(false)

  const fail = useCallback((message: string, action?: { label: string; run: () => void }) => {
    setPhase({ kind: 'error', message, action })
  }, [])

  /** The SDK must have a location before setDestinations, so wait for its first fix. */
  const waitForFix = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    if (lastFix.current) return lastFix.current
    const fromSdk = new Promise<NavLocation | null>(resolve => {
      firstFixWaiters.current.push(resolve)
      setTimeout(() => resolve(null), FIRST_FIX_TIMEOUT_MS)
    })
    const fix = await fromSdk
    if (fix) return fix
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }, [])

  const startSession = useCallback(async (): Promise<boolean> => {
    if (sessionReady.current) return true

    setPhase({ kind: 'preparing', step: 'Checking location permission…' })
    const perm = await Location.requestForegroundPermissionsAsync()
    if (perm.status !== 'granted') {
      fail('Location permission is needed for navigation.', { label: 'Open settings', run: () => Linking.openSettings() })
      return false
    }

    const accepted = (await nav.areTermsAccepted()) || (await nav.showTermsAndConditionsDialog())
    if (!accepted) {
      fail(SESSION_ERRORS[NavigationSessionStatus.TERMS_NOT_ACCEPTED]!)
      return false
    }

    setPhase({ kind: 'preparing', step: 'Starting navigation…' })
    const status = await nav.init()
    if (status !== NavigationSessionStatus.OK) {
      fail(SESSION_ERRORS[status] ?? `Navigation could not start (${status}).`)
      return false
    }
    sessionReady.current = true
    return true
  }, [nav, fail])

  /** Fetch a fresh truck route token for the next stop and start guidance. */
  const guideToNextStop = useCallback(async () => {
    try {
      if (!(await startSession())) return

      setPhase({ kind: 'preparing', step: 'Getting a GPS fix…' })
      const here = await waitForFix()

      setPhase({ kind: 'preparing', step: 'Planning a truck-legal route…' })
      const next = await api.navigation(id, { lat: here.lat, lng: here.lng })
      setPlan(next)

      const status = await nav.setDestinations(
        [{ title: next.destination.title, position: { lat: next.destination.lat, lng: next.destination.lng } }],
        // No travelMode: keep the truck profile encoded in the route token
        { routeTokenOptions: { routeToken: next.routeToken }, displayOptions: { showDestinationMarkers: true } },
      )
      if (status !== RouteStatus.OK) {
        fail(ROUTE_ERRORS[status] ?? `Route could not be loaded (${status}).`, { label: 'Try again', run: guideToNextStop })
        return
      }
      await nav.startGuidance()
      setPhase({ kind: 'guiding' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : `Navigation failed: ${(e as Error).message}`
      fail(msg, { label: 'Try again', run: guideToNextStop })
    }
  }, [id, nav, startSession, waitForFix, fail])

  useEffect(() => {
    setOnLocationChanged(loc => {
      lastFix.current = loc
      const waiters = firstFixWaiters.current
      firstFixWaiters.current = []
      waiters.forEach(w => w(loc))
    })
    setOnArrival((event: ArrivalEvent) => {
      if (!event.isFinalDestination) return
      nav.stopGuidance()
      setPhase({ kind: 'arrived' })
    })
    if (!started.current) {
      started.current = true
      guideToNextStop()
    }
    return () => {
      removeAllListeners()
      nav.stopGuidance().catch(() => {})
      nav.clearDestinations().catch(() => {})
      // Releases the SDK's location service / foreground notification
      if (sessionReady.current) nav.cleanup().catch(() => {})
    }
    // Mount-only: guidance lifecycle is tied to this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exit() {
    if (phase.kind !== 'guiding') return router.back()
    Alert.alert('End navigation?', undefined, [
      { text: 'Keep navigating', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => router.back() },
    ])
  }

  async function startTripThenGuide() {
    setBusy(true)
    try {
      await api.setStatus(id, 'in_transit')
      await nav.clearDestinations()
      await guideToNextStop()
    } catch (e) {
      fail((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function markDelivered() {
    setBusy(true)
    try {
      await api.setStatus(id, 'delivered', note.trim() || undefined)
      router.dismissTo('/')
    } catch (e) {
      Alert.alert("Couldn't mark delivered", (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.screen}>
      <NavigationView
        style={StyleSheet.absoluteFill}
        headerEnabled
        footerEnabled
        tripProgressBarEnabled
        speedometerEnabled
        speedLimitIconEnabled
        recenterButtonEnabled
        trafficIncidentCardsEnabled
        reportIncidentButtonEnabled={false}
      />

      <SafeAreaView style={s.overlay} pointerEvents="box-none">
        <View style={s.topBar} pointerEvents="box-none">
          <Pressable onPress={exit} style={s.exit} accessibilityLabel="End navigation" hitSlop={10}>
            <Text style={s.exitText}>{phase.kind === 'guiding' ? 'End' : 'Close'}</Text>
          </Pressable>
          {phase.kind === 'guiding' && plan && plan.warnings.length > 0 && (
            <Pressable style={s.notes} onPress={() => Alert.alert('Route notes', plan.warnings.join('\n\n'))}>
              <Text style={s.notesText}>⚠ Route notes ({plan.warnings.length})</Text>
            </Pressable>
          )}
          {__DEV__ && phase.kind === 'guiding' && (
            <Pressable style={s.notes} onPress={() => nav.simulator.simulateLocationsAlongExistingRoute({ speedMultiplier: 5 })}>
              <Text style={s.notesText}>Simulate</Text>
            </Pressable>
          )}
        </View>

        {phase.kind === 'preparing' && (
          <View style={s.sheet}>
            <ActivityIndicator color={colors.brand} />
            <Text style={s.sheetText}>{phase.step}</Text>
          </View>
        )}

        {phase.kind === 'error' && (
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Can&apos;t navigate</Text>
            <Text style={s.sheetText}>{phase.message}</Text>
            {phase.action && <Button title={phase.action.label} onPress={phase.action.run} />}
            <Button title="Back to load" variant="outline" onPress={() => router.back()} />
          </View>
        )}

        {phase.kind === 'arrived' && plan?.leg === 'pickup' && (
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Arrived at pickup</Text>
            <Text style={s.sheetText}>{plan.destination.title}</Text>
            <Button title="Loaded — start trip to delivery" onPress={startTripThenGuide} busy={busy} />
            <Button title="Back to load" variant="outline" onPress={() => router.back()} />
          </View>
        )}

        {phase.kind === 'arrived' && plan?.leg === 'delivery' && (
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Arrived at delivery</Text>
            <Text style={s.sheetText}>{plan.destination.title}</Text>
            <TextInput
              style={s.note} value={note} onChangeText={setNote} maxLength={500}
              placeholder="Delivery note (optional) — who signed, dock #…" placeholderTextColor={colors.faint}
            />
            <Button title="Mark delivered" variant="dark" onPress={markDelivered} busy={busy} />
            <Button title="Back to load" variant="outline" onPress={() => router.back()} />
          </View>
        )}

        {phase.kind === 'guiding' && plan && (
          <View style={s.planChip} pointerEvents="none">
            <Text style={s.planChipText}>
              To {plan.leg} · {fmtMiles(plan.distanceMeters)} · {fmtDuration(plan.durationSeconds)} · truck route
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', gap: 8, padding: 12, marginTop: 84, flexWrap: 'wrap' },
  exit: { backgroundColor: colors.brandDark, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  exitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  notes: { backgroundColor: colors.amberBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  notesText: { color: colors.amberText, fontWeight: '600', fontSize: 14 },
  sheet: {
    backgroundColor: '#fff', margin: 12, borderRadius: 20, padding: 20, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  sheetText: { fontSize: 16, color: colors.muted },
  note: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  planChip: {
    alignSelf: 'center', marginBottom: 96, backgroundColor: 'rgba(12,10,9,0.8)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
  },
  planChipText: { color: '#fff', fontSize: 13 },
})
