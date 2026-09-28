'use client'
import { useCallback, useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import RouteMap from '@/components/truck-loads/RouteMap'
import { LastSeen } from '@/components/truck-loads/Delivery'
import { fmtDate, publicTracking, PublicTracking, ShipmentStatus } from '@/lib/truck-loads'

const REFRESH_MS = 60_000

const STEPS: { key: ShipmentStatus; label: string }[] = [
  { key: 'awarded', label: 'Carrier booked' },
  { key: 'in_transit', label: 'On the road' },
  { key: 'delivered', label: 'Delivered' },
]
const stepIndex = (s: ShipmentStatus) => s === 'delivered' ? 2 : s === 'in_transit' ? 1 : s === 'awarded' ? 0 : -1

/** Public, read-only tracking page the shipper can send to the receiver. */
export default function TrackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicTracking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setData(await publicTracking(params.token)); setError(null) } catch (e: any) { setError(e.message) }
  }, [params.token])
  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const step = data ? stepIndex(data.status) : -1

  return (
    <main className="min-h-screen bg-silver-100 text-silver-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
          <TruckLoadsMark size={26} onDark />
          <span className="font-semibold">Truck Loads</span>
          <span className="text-white/60 text-sm">· Shipment tracking</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && !data && (
          <div className="rounded-2xl bg-white border border-silver-200 p-8 text-center">
            <div className="font-medium">{error}</div>
            <p className="text-sm text-silver-500 mt-1">Check the link with whoever sent it to you.</p>
          </div>
        )}
        {!data && !error && <div className="h-40 rounded-2xl bg-white border border-silver-200 animate-pulse" />}
        {data && (
          <>
            <section className="rounded-2xl bg-white border border-silver-200 p-5 space-y-4">
              <div>
                <div className="text-xs text-silver-500">{data.reference}{data.shipperName && ` · from ${data.shipperName}`}</div>
                <h1 className="text-lg font-semibold mt-0.5">{data.originAddress} → {data.destAddress}</h1>
                <div className="text-sm text-silver-600">{data.commodity}{data.deliverBy && ` · due ${fmtDate(data.deliverBy)}`}</div>
              </div>
              {data.status === 'cancelled' ? (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">This shipment was cancelled.</p>
              ) : step < 0 ? (
                <p className="text-sm text-silver-600">The shipper is still booking a carrier for this load.</p>
              ) : (
                <ol className="grid grid-cols-3 gap-2">
                  {STEPS.map((s, i) => (
                    <li key={s.key} className="space-y-1.5">
                      <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-silver-200'}`} />
                      <div className={`text-xs ${i === step ? 'font-semibold text-brand-800' : i < step ? 'text-silver-700' : 'text-silver-400'}`}>{s.label}</div>
                    </li>
                  ))}
                </ol>
              )}
              {data.delivered && (
                <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  Delivered {fmtDate(data.delivered.at)} · received by {data.delivered.receiverName}
                </p>
              )}
              {data.status === 'in_transit' && (
                <p className="text-sm text-silver-600">
                  {data.truckName && <>{data.truckName} · </>}
                  <LastSeen at={data.last?.at ?? null} lat={data.last?.lat ?? null} lng={data.last?.lng ?? null} speedKmh={data.last?.speedKmh} />
                </p>
              )}
            </section>
            {(data.last || data.origin) && data.status !== 'cancelled' && (
              <section className="rounded-2xl bg-white border border-silver-200 p-3">
                <div className="h-[340px]">
                  <RouteMap polyline={null} origin={data.origin} destination={data.destination}
                    truck={data.status === 'in_transit' && data.last ? { lat: data.last.lat, lng: data.last.lng } : null}
                    trail={data.trail} />
                </div>
              </section>
            )}
            <p className="text-center text-xs text-silver-400">Updates every minute · shared by the shipper via Truck Loads</p>
          </>
        )}
      </div>
    </main>
  )
}
