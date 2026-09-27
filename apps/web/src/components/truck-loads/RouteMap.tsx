'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Renders a load's truck route on a Google Map. Google Maps Platform terms
 * require Routes API results to be displayed on a Google map, so this uses
 * the Maps JavaScript API (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — a browser key
 * restricted by HTTP referrer) rather than the Leaflet map used elsewhere.
 */

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

let loader: Promise<any> | null = null
function loadGoogleMaps(): Promise<any> {
  const w = window as any
  if (w.google?.maps?.geometry) return Promise.resolve(w.google)
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const cb = '__truckLoadsMapsReady'
      w[cb] = () => resolve(w.google)
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=geometry&loading=async&callback=${cb}`
      s.async = true
      s.onerror = () => { loader = null; reject(new Error('Failed to load Google Maps')) }
      document.head.appendChild(s)
    })
  }
  return loader
}

type LatLng = { lat: number; lng: number }

export default function RouteMap({ polyline, origin, destination }: {
  polyline: string | null
  origin: LatLng | null
  destination: LatLng | null
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const overlays = useRef<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!KEY || !el.current) return
    let cancelled = false
    loadGoogleMaps().then(google => {
      if (cancelled || !el.current) return
      if (!map.current) {
        map.current = new google.maps.Map(el.current, {
          center: { lat: -28.8, lng: 24.9 }, // South Africa
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
      }
      overlays.current.forEach(o => o.setMap(null))
      overlays.current = []

      const bounds = new google.maps.LatLngBounds()
      if (polyline) {
        const path = google.maps.geometry.encoding.decodePath(polyline)
        overlays.current.push(new google.maps.Polyline({
          map: map.current, path, strokeColor: '#1A7340', strokeWeight: 5, strokeOpacity: 0.9,
        }))
        path.forEach((p: any) => bounds.extend(p))
      }
      for (const [pos, label] of [[origin, 'A'], [destination, 'B']] as const) {
        if (!pos) continue
        overlays.current.push(new google.maps.Marker({ map: map.current, position: pos, label }))
        bounds.extend(pos)
      }
      if (!bounds.isEmpty()) map.current.fitBounds(bounds, 40)
    }).catch(e => setError(e.message))
    return () => { cancelled = true }
    // Depend on coordinates, not object identity, so re-renders don't redraw
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polyline, origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  if (!KEY || error) {
    return (
      <div className="h-full min-h-[260px] rounded-xl bg-silver-100 border border-silver-200 flex items-center justify-center text-center p-6 text-sm text-silver-500">
        {error ?? 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the route map.'}
      </div>
    )
  }
  return <div ref={el} className="h-full min-h-[260px] rounded-xl overflow-hidden border border-silver-200" />
}
