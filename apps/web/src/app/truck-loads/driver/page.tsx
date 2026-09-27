'use client'
import { useCallback, useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import Login from '@/components/truck-loads/Login'
import RouteMap from '@/components/truck-loads/RouteMap'
import { inputCls } from '@/components/truck-loads/forms'
import {
  ApiError, driver, DriverLoad, DriverTruck, fmtDate, fmtDuration, fmtLength, fmtWeight, fmtDistance, getToken,
  hazmatLabel, setToken,
} from '@/lib/truck-loads'

const REFRESH_MS = 60_000

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  assigned:   { label: 'Up next',    cls: 'bg-blue-100 text-blue-800' },
  in_transit: { label: 'On the road', cls: 'bg-yellow-100 text-yellow-800' },
  delivered:  { label: 'Delivered',  cls: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50 text-red-700' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_COPY[status] ?? { label: status, cls: 'bg-silver-100 text-silver-700' }
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function HazmatBanner({ types }: { types: string[] }) {
  if (!types.length) return null
  return (
    <div className="rounded-xl bg-orange-100 border border-orange-300 px-4 py-3 text-orange-900 text-sm font-medium flex items-center gap-2">
      <i className="ti ti-alert-triangle text-lg" />
      Hazmat: {types.map(hazmatLabel).join(', ')}
    </div>
  )
}

function LoadCard({ load, onOpen }: { load: DriverLoad; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="press w-full text-left rounded-2xl bg-white border border-silver-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-silver-900">{load.reference}</span>
        <StatusPill status={load.status} />
      </div>
      <div className="text-sm text-silver-700">
        <div className="flex gap-2"><span className="text-silver-400 w-4">A</span><span className="truncate">{load.originAddress}</span></div>
        <div className="flex gap-2"><span className="text-silver-400 w-4">B</span><span className="truncate">{load.destAddress}</span></div>
      </div>
      <div className="text-xs text-silver-500">
        {load.pickupAt ? `Pickup ${fmtDate(load.pickupAt)}` : 'Pickup time not set'} · {fmtWeight(load.weightKg)}
        {load.routeDistanceM != null && ` · ${fmtDistance(load.routeDistanceM)}`}
        {load.hazmatTypes.length > 0 && ' · hazmat'}
      </div>
    </button>
  )
}

// ─── Load detail ──────────────────────────────────────────────────────────────

function LoadView({ load, onBack, onChange }: { load: DriverLoad; onBack: () => void; onChange: (l: DriverLoad) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function act(status: 'in_transit' | 'delivered') {
    const prompt = status === 'in_transit'
      ? `Start trip for ${load.reference}? Dispatch will see you're on the road.`
      : `Mark ${load.reference} delivered?`
    if (!confirm(prompt)) return
    setBusy(true); setError(null)
    try {
      onChange(await driver.setStatus(load.id, status, status === 'delivered' ? note : undefined))
      setNote('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const canAct = load.status === 'assigned' || load.status === 'in_transit'

  // The action bar sits outside .screen-enter: its transform would otherwise
  // become the containing block and un-fix the bar from the viewport.
  return (
    <>
    <div className="screen-enter pb-40">
      <div className="px-4 pt-4 space-y-4">
        <button onClick={onBack} className="text-sm text-silver-600 flex items-center gap-1"><i className="ti ti-chevron-left" />My loads</button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-silver-900">{load.reference}</h1>
          <StatusPill status={load.status} />
        </div>

        <HazmatBanner types={load.hazmatTypes} />

        <section className="rounded-2xl bg-white border border-silver-200 divide-y divide-silver-100">
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-silver-400">A · Pickup · {fmtDate(load.pickupAt)}</div>
            <div className="text-base text-silver-900 mt-1">{load.originAddress}</div>
            <div className="text-sm text-silver-500">{load.shipperName}</div>
          </div>
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-silver-400">B · Deliver by · {fmtDate(load.deliverBy)}</div>
            <div className="text-base text-silver-900 mt-1">{load.destAddress}</div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-silver-200 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-medium text-silver-900">Truck route</span>
            {load.routeDistanceM != null && (
              <span className="text-sm text-silver-600">{fmtDistance(load.routeDistanceM)} · {fmtDuration(load.routeDurationS ?? 0)}</span>
            )}
          </div>
          {load.routeWarnings.length > 0 && (
            <ul className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 space-y-0.5">
              {load.routeWarnings.map((w, i) => <li key={i}><i className="ti ti-alert-circle mr-1" />{w}</li>)}
            </ul>
          )}
          <div className="h-[280px]">
            <RouteMap
              polyline={load.routePolyline}
              origin={load.originLat != null ? { lat: load.originLat, lng: load.originLng! } : null}
              destination={load.destLat != null ? { lat: load.destLat, lng: load.destLng! } : null}
            />
          </div>
          {load.routePolyline
            ? <p className="text-xs text-silver-500">Planned for your rig&apos;s height, weight and cargo. Car navigation apps may send you under low bridges or onto restricted roads.</p>
            : <p className="text-xs text-silver-500">Dispatch hasn&apos;t planned a truck route yet.</p>}
        </section>

        <section className="rounded-2xl bg-white border border-silver-200 p-4 grid grid-cols-2 gap-y-3 text-sm">
          <div><div className="text-xs text-silver-400">Cargo</div><div className="text-silver-900">{load.commodity}</div></div>
          <div><div className="text-xs text-silver-400">Weight</div><div className="text-silver-900">{fmtWeight(load.weightKg)}</div></div>
          {load.truck && <>
            <div><div className="text-xs text-silver-400">Truck</div><div className="text-silver-900">{load.truck.name} · {load.truck.plate}</div></div>
            <div><div className="text-xs text-silver-400">Height · length</div><div className="text-silver-900">{fmtLength(load.truck.heightMm)} · {fmtLength(load.truck.lengthMm)}</div></div>
            <div className="col-span-2"><div className="text-xs text-silver-400">Laden weight</div><div className="text-silver-900">{fmtWeight(load.truck.tareWeightKg + load.weightKg)}</div></div>
          </>}
          {load.notes && <div className="col-span-2"><div className="text-xs text-silver-400">Notes from dispatch</div><div className="text-silver-900 whitespace-pre-wrap">{load.notes}</div></div>}
        </section>

        {load.events && load.events.length > 0 && (
          <section className="rounded-2xl bg-white border border-silver-200 p-4">
            <div className="font-medium text-silver-900 mb-2">History</div>
            <ol className="space-y-1.5">
              {load.events.map(ev => (
                <li key={ev.id} className="text-xs"><span className="text-silver-400">{fmtDate(ev.createdAt)}</span> <span className="text-silver-700">{ev.message}</span></li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>

      {canAct && (
        <div className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-white border-t border-silver-200 p-4 space-y-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {load.status === 'in_transit' && (
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={500}
              placeholder="Delivery note (optional) — who signed, dock #…" className={inputCls} />
          )}
          {load.status === 'assigned'
            ? <button onClick={() => act('in_transit')} disabled={busy}
                className="press w-full rounded-xl bg-brand-700 hover:bg-brand-800 text-white py-4 text-base font-semibold disabled:opacity-50">
                <i className="ti ti-truck mr-2" />{busy ? 'Starting…' : 'Start trip'}
              </button>
            : <button onClick={() => act('delivered')} disabled={busy}
                className="press w-full rounded-xl bg-green-700 text-white py-4 text-base font-semibold disabled:opacity-50">
                <i className="ti ti-circle-check mr-2" />{busy ? 'Saving…' : 'Mark delivered'}
              </button>}
        </div>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [trucks, setTrucks] = useState<DriverTruck[]>([])
  const [loads, setLoads] = useState<DriverLoad[] | null>(null)
  const [open, setOpen] = useState<DriverLoad | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setAuthed(!!getToken('driver')) }, [])

  const signOut = useCallback(() => { setToken('driver', null); setAuthed(false); setOpen(null); setLoads(null) }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await driver.loads()
      setTrucks(r.trucks); setLoads(r.loads); setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut()
      setError((e as Error).message)
    }
  }, [signOut])

  // Keep the list fresh while the app is open and whenever the driver returns to it
  useEffect(() => {
    if (!authed) return
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [authed, refresh])

  async function openLoad(id: string) {
    try { setOpen(await driver.load(id)); window.scrollTo(0, 0) } catch (e: any) { setError(e.message) }
  }

  if (authed === null) return null
  if (!authed) return <Login side="driver" onDone={() => setAuthed(true)} />

  const onRoad   = loads?.filter(l => l.status === 'in_transit') ?? []
  const upNext   = loads?.filter(l => l.status === 'assigned') ?? []
  const recent   = loads?.filter(l => l.status === 'delivered').reverse() ?? []

  return (
    <main className="min-h-screen bg-silver-100 text-silver-900 max-w-lg mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white px-4 h-14 flex items-center gap-2 sticky top-0 z-10">
        <TruckLoadsMark size={24} onDark />
        <span className="font-semibold">Truck Loads</span>
        <span className="text-xs rounded-full bg-white/15 text-white px-2 py-0.5">Driver</span>
        <button onClick={signOut} className="ml-auto text-sm text-white/60">Sign out</button>
      </header>

      {error && <p className="mx-4 mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      {open ? (
        <LoadView
          load={open}
          onBack={() => { setOpen(null); refresh() }}
          onChange={l => { setOpen(l); refresh() }}
        />
      ) : loads === null ? (
        <p className="p-8 text-center text-sm text-silver-500">Loading…</p>
      ) : (
        <div className="p-4 space-y-6 screen-enter">
          {trucks.length === 0 ? (
            <div className="rounded-2xl bg-white border border-silver-200 p-6 text-center space-y-2">
              <i className="ti ti-truck-off text-3xl text-silver-400" />
              <p className="font-medium">No truck is linked to your phone</p>
              <p className="text-sm text-silver-500">Ask dispatch to add your phone number to your truck, then tap Refresh.</p>
              <button onClick={refresh} className="press mt-2 rounded-lg border border-silver-300 px-4 py-2 text-sm">Refresh</button>
            </div>
          ) : (
            <p className="text-sm text-silver-500">
              <i className="ti ti-truck mr-1" />{trucks.map(t => `${t.name} · ${t.plate}`).join(', ')}
            </p>
          )}

          {onRoad.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-silver-500 font-medium">On the road</h2>
              {onRoad.map(l => <LoadCard key={l.id} load={l} onOpen={() => openLoad(l.id)} />)}
            </section>
          )}

          {trucks.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-silver-500 font-medium">Up next</h2>
              {upNext.length
                ? upNext.map(l => <LoadCard key={l.id} load={l} onOpen={() => openLoad(l.id)} />)
                : onRoad.length === 0 && <p className="text-sm text-silver-500">No loads assigned right now.</p>}
            </section>
          )}

          {recent.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-silver-500 font-medium">Delivered (last 14 days)</h2>
              {recent.map(l => <LoadCard key={l.id} load={l} onOpen={() => openLoad(l.id)} />)}
            </section>
          )}
        </div>
      )}
    </main>
  )
}
