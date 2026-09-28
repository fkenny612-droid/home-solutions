/**
 * Live position sharing and the delivery GPS fix, via expo-location.
 */
import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { api, type PodInput } from './api'

const LOCATION_EVERY_MS = 30_000

/** Report the phone's position to dispatch and the shipper while the load is active. */
export function useLocationSharing(loadId: string | undefined, active: boolean) {
  const [sharing, setSharing] = useState<'off' | 'on' | 'denied'>('off')
  useEffect(() => {
    if (!loadId || !active) { setSharing('off'); return }
    let sub: Location.LocationSubscription | null = null
    let cancelled = false
    let last = 0
    ;(async () => {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (cancelled) return
      if (perm.status !== 'granted') { setSharing('denied'); return }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: LOCATION_EVERY_MS, distanceInterval: 50 },
        pos => {
          setSharing('on')
          if (Date.now() - last < LOCATION_EVERY_MS) return
          last = Date.now()
          const { latitude, longitude, speed, heading, accuracy } = pos.coords
          api.location(loadId, {
            lat: latitude, lng: longitude,
            ...(accuracy != null ? { accuracyM: Math.round(accuracy) } : {}),
            ...(speed != null && speed >= 0 ? { speedKmh: Math.min(300, Math.round(speed * 3.6)) } : {}),
            ...(heading != null && heading >= 0 ? { heading: Math.round(heading) } : {}),
          }).catch(() => { last = 0 })
        },
      )
      if (cancelled) sub.remove()
    })().catch(() => setSharing('off'))
    return () => { cancelled = true; sub?.remove() }
  }, [loadId, active])
  return sharing
}

/** Where the driver is at delivery — a recent fix is fine; never block delivery on GPS. */
export async function deliveryFix(): Promise<Pick<PodInput, 'lat' | 'lng' | 'accuracyM'>> {
  try {
    const perm = await Location.getForegroundPermissionsAsync()
    if (perm.status !== 'granted') return {}
    const pos = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
      ?? await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>(r => setTimeout(() => r(null), 8_000)),
      ])
    if (!pos) return {}
    return {
      lat: pos.coords.latitude, lng: pos.coords.longitude,
      ...(pos.coords.accuracy != null ? { accuracyM: Math.round(pos.coords.accuracy) } : {}),
    }
  } catch {
    return {}
  }
}
