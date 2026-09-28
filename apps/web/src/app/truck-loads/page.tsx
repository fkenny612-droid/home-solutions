'use client'
import { useCallback, useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import RouteMap from '@/components/truck-loads/RouteMap'
import Login from '@/components/truck-loads/Login'
import Applications from '@/components/truck-loads/Applications'
import LoadBoard from '@/components/truck-loads/LoadBoard'
import Company, { CarrierBadgePill } from '@/components/truck-loads/Company'
import { ComplianceBanner, CompliancePanel, CompliancePill, TruckDatesModal } from '@/components/truck-loads/Compliance'
import { LoadForm, Modal, TruckForm } from '@/components/truck-loads/forms'
import {
  ApiError, carrier, CarrierBadge, ComplianceOverview, fmtDate, fmtDuration, fmtLength, fmtWeight, fmtDistance, fmtMoney,
  dispatch, getToken, hazmatLabel, Load, LoadStatus, setToken, Summary, Truck, truckFitProblems,
} from '@/lib/truck-loads'

const STATUS_STYLE: Record<LoadStatus, string> = {
  booked:     'bg-silver-100 text-silver-700',
  assigned:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-50 text-red-700',
}
const TRUCK_STYLE: Record<Truck['status'], string> = {
  available:      'bg-green-100 text-green-800',
  on_load:        'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-silver-200 text-silver-600',
}
const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${className}`}>{children}</span>
}

// ─── Load detail ──────────────────────────────────────────────────────────────

function LoadDetail({ load, trucks, routingEnabled, onChange }: {
  load: Load
  trucks: Truck[]
  routingEnabled: boolean
  onChange: (l: Load) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Load | null>(null)
  useEffect(() => { setPreview(null); setError(null) }, [load.id])

  async function run(key: string, fn: () => Promise<Load>, keepPreview = false) {
    setBusy(key); setError(null)
    try {
      const next = await fn()
      if (next.preview) setPreview(next)
      else { onChange(next); if (!keepPreview) setPreview(null) }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const shown = preview ?? load
  const editable = load.status === 'booked' || load.status === 'assigned'
  const fits = trucks
    .filter(t => t.id !== load.truckId)
    .map(t => ({ truck: t, problems: truckFitProblems(t, load) }))
    .sort((a, b) => a.problems.length - b.problems.length)

  return (
    <div className="screen-enter space-y-4" key={load.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-silver-900">{load.reference}</h2>
            <Pill className={STATUS_STYLE[load.status]}>{statusLabel(load.status)}</Pill>
            {load.hazmatTypes.length > 0 && <Pill className="bg-orange-100 text-orange-800"><i className="ti ti-alert-triangle mr-1" />Hazmat</Pill>}
          </div>
          <p className="text-sm text-silver-500 mt-0.5">{load.shipperName} · {load.commodity} · {fmtWeight(load.weightKg)}{load.rate != null && ` · ${fmtMoney(load.rate)}`}</p>
        </div>
        <div className="flex gap-2">
          {load.status === 'assigned' && (
            <button onClick={() => run('transit', () => dispatch.setStatus(load.id, 'in_transit'))} disabled={!!busy}
              className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm disabled:opacity-50">
              <i className="ti ti-truck mr-1" />Dispatch
            </button>
          )}
          {load.status === 'in_transit' && (
            <button onClick={() => run('deliver', () => dispatch.setStatus(load.id, 'delivered'))} disabled={!!busy}
              className="press rounded-lg bg-green-700 text-white px-3 py-1.5 text-sm disabled:opacity-50">
              <i className="ti ti-check mr-1" />Mark delivered
            </button>
          )}
          {editable && (
            <button onClick={() => confirm(`Cancel load ${load.reference}?`) && run('cancel', () => dispatch.setStatus(load.id, 'cancelled'))}
              disabled={!!busy} className="press rounded-lg border border-silver-300 px-3 py-1.5 text-sm text-silver-600 disabled:opacity-50">
              Cancel load
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Lane */}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-silver-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-silver-400 mb-1">A · Pickup · {fmtDate(load.pickupAt)}</div>
          <div className="text-silver-800">{load.originAddress}</div>
        </div>
        <div className="rounded-xl border border-silver-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-silver-400 mb-1">B · Deliver by · {fmtDate(load.deliverBy)}</div>
          <div className="text-silver-800">{load.destAddress}</div>
        </div>
      </div>

      {/* Route */}
      <div className="rounded-xl border border-silver-200 bg-white p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium text-silver-900">Truck route</span>
            {preview && <span className="ml-2 text-brand-700">Preview with {preview.previewTruck?.name} — not saved</span>}
            {shown.routeDistanceM != null && (
              <span className="ml-2 text-silver-600">{fmtDistance(shown.routeDistanceM)} · {fmtDuration(shown.routeDurationS ?? 0)} drive</span>
            )}
          </div>
          {load.truck && (load.status === 'assigned' || load.status === 'in_transit') && (
            <button
              onClick={() => run('route', () => dispatch.route(load.id))}
              disabled={!!busy || !routingEnabled}
              title={routingEnabled ? '' : 'GOOGLE_MAPS_API_KEY is not set on the API'}
              className="press rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <i className="ti ti-route mr-1" />{busy === 'route' ? 'Routing…' : load.routePolyline ? 'Re-route' : 'Compute truck route'}
            </button>
          )}
        </div>
        {shown.routeWarnings.length > 0 && (
          <ul className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 space-y-0.5">
            {shown.routeWarnings.map((w, i) => <li key={i}><i className="ti ti-alert-circle mr-1" />{w}</li>)}
          </ul>
        )}
        <div className="h-[320px]">
          <RouteMap
            polyline={shown.routePolyline}
            origin={shown.originLat != null ? { lat: shown.originLat, lng: shown.originLng! } : null}
            destination={shown.destLat != null ? { lat: shown.destLat, lng: shown.destLng! } : null}
          />
        </div>
        {!load.truck && <p className="text-xs text-silver-500">Assign a truck (or preview one below) — Google routes around low bridges, weight limits and hazmat restrictions using the rig&apos;s dimensions.</p>}
      </div>

      {/* Truck */}
      <div className="rounded-xl border border-silver-200 bg-white p-3 space-y-3">
        <div className="text-sm font-medium text-silver-900">Truck</div>
        {load.truck ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-medium">{load.truck.name}</span> <span className="text-silver-500">{load.truck.plate}</span>
              {load.truck.driverName && <span className="text-silver-500"> · {load.truck.driverName}</span>}
              <div className="text-xs text-silver-500">{fmtLength(load.truck.heightMm)} tall · {fmtLength(load.truck.lengthMm)} long · {load.truck.axleCount} axles · laden {fmtWeight(load.truck.tareWeightKg + load.weightKg)}</div>
            </div>
            {load.status === 'assigned' && (
              <button onClick={() => run('unassign', () => dispatch.unassign(load.id))} disabled={!!busy}
                className="press text-sm text-silver-600 underline disabled:opacity-50">Unassign</button>
            )}
          </div>
        ) : <p className="text-sm text-silver-500">No truck assigned.</p>}

        {editable && fits.length > 0 && (
          <div className="border-t border-silver-100 pt-3">
            <div className="text-xs text-silver-500 mb-2">{load.truck ? 'Reassign to' : 'Assign to'}</div>
            <ul className="divide-y divide-silver-100">
              {fits.map(({ truck, problems }) => (
                <li key={truck.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{truck.name}</span> <span className="text-silver-500">{truck.plate}</span>
                    {problems.length
                      ? <div className="text-xs text-red-700">{problems.join(' · ')}</div>
                      : <div className="text-xs text-green-700">Fits · payload {fmtWeight(truck.grossWeightKg - truck.tareWeightKg)}</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {routingEnabled && (
                      <button onClick={() => run(`p-${truck.id}`, () => dispatch.route(load.id, truck.id), true)} disabled={!!busy}
                        className="press rounded-md border border-silver-300 px-2 py-1 text-xs disabled:opacity-50">
                        {busy === `p-${truck.id}` ? '…' : 'Preview route'}
                      </button>
                    )}
                    <button onClick={() => run(`a-${truck.id}`, () => dispatch.assign(load.id, truck.id))} disabled={!!busy || problems.length > 0}
                      className="press rounded-md bg-brand-700 hover:bg-brand-800 text-white px-2 py-1 text-xs disabled:opacity-40">
                      Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {load.notes && <p className="text-sm text-silver-600 whitespace-pre-wrap rounded-xl border border-silver-200 bg-white p-3">{load.notes}</p>}

      {/* History */}
      {load.events && load.events.length > 0 && (
        <div className="rounded-xl border border-silver-200 bg-white p-3">
          <div className="text-sm font-medium text-silver-900 mb-2">History</div>
          <ol className="space-y-1.5">
            {load.events.map(ev => (
              <li key={ev.id} className="flex gap-3 text-xs">
                <span className="text-silver-400 w-28 shrink-0">{fmtDate(ev.createdAt)}</span>
                <span className="text-silver-700">{ev.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ─── Fleet ────────────────────────────────────────────────────────────────────

function Fleet({ trucks, onChanged, onDates }: { trucks: Truck[]; onChanged: () => void; onDates: (t: Truck) => void }) {
  const [error, setError] = useState<string | null>(null)
  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try { await fn(); onChanged() } catch (e: any) { setError(e.message) }
  }
  if (!trucks.length) return <p className="text-sm text-silver-500 p-6 text-center">No trucks yet — add your first rig.</p>
  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-silver-200 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-silver-500 border-b border-silver-200">
            <tr>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Driver</th>
              <th className="px-3 py-2 font-medium">H × L</th>
              <th className="px-3 py-2 font-medium">Payload</th>
              <th className="px-3 py-2 font-medium">Hazmat</th>
              <th className="px-3 py-2 font-medium">Documents</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {trucks.map(t => (
              <tr key={t.id}>
                <td className="px-3 py-2"><div className="font-medium">{t.name}</div><div className="text-xs text-silver-500">{t.plate}</div></td>
                <td className="px-3 py-2 text-silver-600">{t.driverName ?? '—'}</td>
                <td className="px-3 py-2 text-silver-600 whitespace-nowrap">{fmtLength(t.heightMm)} × {fmtLength(t.lengthMm)}</td>
                <td className="px-3 py-2 text-silver-600 whitespace-nowrap">{fmtWeight(t.grossWeightKg - t.tareWeightKg)}</td>
                <td className="px-3 py-2 text-xs text-silver-600">{t.hazmatTypes.map(hazmatLabel).join(', ') || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <CompliancePill compliance={t.compliance} />
                  <button onClick={() => onDates(t)} className="ml-2 text-xs text-silver-500 underline">Dates</button>
                </td>
                <td className="px-3 py-2"><Pill className={TRUCK_STYLE[t.status]}>{statusLabel(t.status)}</Pill></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {t.status === 'available' && (
                    <button onClick={() => act(() => dispatch.updateTruck(t.id, { status: 'out_of_service' }))} className="text-xs text-silver-500 underline">Take out of service</button>
                  )}
                  {t.status === 'out_of_service' && (
                    <>
                      <button onClick={() => act(() => dispatch.updateTruck(t.id, { status: 'available' }))} className="text-xs text-silver-500 underline mr-3">Return to service</button>
                      <button onClick={() => confirm(`Delete ${t.name}?`) && act(() => dispatch.deleteTruck(t.id))} className="text-xs text-red-600 underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'loads' | 'market' | 'fleet' | 'applications' | 'company'
const TABS: { id: Tab; label: string }[] = [
  { id: 'loads', label: 'Loads' }, { id: 'market', label: 'Load board' }, { id: 'fleet', label: 'Fleet' },
  { id: 'applications', label: 'Applications' }, { id: 'company', label: 'Company' },
]

const FILTERS: (LoadStatus | 'active' | 'all')[] = ['active', 'booked', 'assigned', 'in_transit', 'delivered', 'cancelled', 'all']

export default function DispatchPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('loads')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('active')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loads, setLoads] = useState<Load[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [hazmatTypes, setHazmatTypes] = useState<string[]>([])
  const [selected, setSelected] = useState<Load | null>(null)
  const [modal, setModal] = useState<'load' | 'truck' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compliance, setCompliance] = useState<ComplianceOverview | null>(null)
  const [badge, setBadge] = useState<CarrierBadge | null>(null)
  const [datesTruck, setDatesTruck] = useState<Truck | null>(null)

  useEffect(() => { setAuthed(!!getToken('dispatch')) }, [])

  const refresh = useCallback(async () => {
    try {
      const [s, l, t] = await Promise.all([dispatch.summary(), dispatch.loads(), dispatch.trucks()])
      setSummary(s); setLoads(l); setTrucks(t); setError(null)
      // Secondary panels: don't fail the board if these do
      carrier.compliance().then(setCompliance).catch(() => {})
      carrier.profile().then(v => setBadge(v.badge)).catch(() => {})
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setToken('dispatch', null); setAuthed(false); return }
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    refresh()
    dispatch.hazmatTypes().then(setHazmatTypes).catch(() => {})
  }, [authed, refresh])

  async function select(id: string) {
    try { setSelected(await dispatch.load(id)) } catch (e: any) { setError(e.message) }
  }

  function onLoadChanged(l: Load) {
    setSelected(l)
    refresh()
  }

  if (authed === null) return null
  if (!authed) return <Login side="dispatch" onDone={() => setAuthed(true)} />

  const visible = loads.filter(l =>
    filter === 'all' ? true : filter === 'active' ? !['delivered', 'cancelled'].includes(l.status) : l.status === filter)
  const count = (s: LoadStatus) => summary?.loads[s]?.count ?? 0

  const kpis = [
    { label: 'Unassigned', value: count('booked'), icon: 'ti-inbox' },
    { label: 'Assigned',   value: count('assigned'), icon: 'ti-clipboard-check' },
    { label: 'In transit', value: count('in_transit'), icon: 'ti-truck-delivery' },
    { label: 'Trucks available', value: `${summary?.trucks.available ?? 0} / ${trucks.length}`, icon: 'ti-truck' },
    { label: 'Delivered revenue', value: fmtMoney(summary?.loads.delivered?.revenue ?? 0), icon: 'ti-cash' },
  ]

  return (
    <main className="min-h-screen bg-silver-100 text-silver-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <TruckLoadsMark size={26} onDark />
          <span className="font-semibold hidden sm:inline">Truck Loads</span>
          {badge === 'verified' && <span className="hidden md:inline"><CarrierBadgePill badge={badge} size="xs" /></span>}
          <nav className="sm:ml-4 flex gap-1 overflow-x-auto">
            {TABS.map(({ id: t, label }) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${tab === t ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </nav>
          <a href="/truck-loads/driver" className="ml-auto text-sm text-white/60 hover:text-white whitespace-nowrap hidden sm:inline">Driver app</a>
          <button onClick={() => { setToken('dispatch', null); setAuthed(false) }} className="ml-2 sm:ml-4 text-sm text-white/60 hover:text-white whitespace-nowrap">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {summary && !summary.routingEnabled && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Truck routing is off — set <code>GOOGLE_MAPS_API_KEY</code> on the API (Routes API enabled) to compute truck-legal routes.
          </p>
        )}
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ComplianceBanner overview={compliance} onReview={() => setTab('fleet')} />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl bg-white border border-silver-200 p-3">
              <div className="text-xs text-silver-500 flex items-center gap-1"><i className={`ti ${k.icon}`} />{k.label}</div>
              <div className="text-xl font-semibold mt-1 tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>

        {tab === 'loads' ? (
          <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="font-semibold">Loads</h1>
                <button onClick={() => setModal('load')} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm">
                  <i className="ti ti-plus mr-1" />New load
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-xs ${filter === f ? 'bg-brand-700 hover:bg-brand-800 text-white' : 'bg-white text-silver-600 border border-silver-200'}`}>
                    {statusLabel(f)}
                  </button>
                ))}
              </div>
              <ul className="space-y-2">
                {visible.map(l => (
                  <li key={l.id}>
                    <button onClick={() => select(l.id)}
                      className={`press w-full text-left rounded-xl border bg-white p-3 transition-colors ${selected?.id === l.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-silver-200 hover:border-silver-300'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">
                          {l.reference}
                          {l.shipmentId && <span className="ml-1.5 rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.5 text-[10px] font-medium align-middle">Marketplace</span>}
                        </span>
                        <Pill className={STATUS_STYLE[l.status]}>{statusLabel(l.status)}</Pill>
                      </div>
                      <div className="text-xs text-silver-600 mt-1 truncate">{l.originAddress}</div>
                      <div className="text-xs text-silver-600 truncate">→ {l.destAddress}</div>
                      <div className="text-[11px] text-silver-400 mt-1">
                        {fmtDate(l.pickupAt)} · {fmtWeight(l.weightKg)}
                        {l.truck && ` · ${l.truck.name}`}
                        {l.routeDistanceM != null && ` · ${fmtDistance(l.routeDistanceM)}`}
                        {l.hazmatTypes.length > 0 && ' · hazmat'}
                      </div>
                    </button>
                  </li>
                ))}
                {!visible.length && <li className="text-sm text-silver-500 text-center py-8">No loads here.</li>}
              </ul>
            </section>
            <section>
              {selected
                ? <LoadDetail load={selected} trucks={trucks} routingEnabled={!!summary?.routingEnabled} onChange={onLoadChanged} />
                : <div className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">Select a load to assign a truck and plan its route.</div>}
            </section>
          </div>
        ) : tab === 'market' ? (
          <LoadBoard onWon={refresh} />
        ) : tab === 'applications' ? (
          <Applications onFleetChanged={refresh} />
        ) : tab === 'company' ? (
          <Company onChanged={v => { setBadge(v.badge); refresh() }} />
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold">Fleet</h1>
              <button onClick={() => setModal('truck')} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm">
                <i className="ti ti-plus mr-1" />Add truck
              </button>
            </div>
            <CompliancePanel overview={compliance} />
            <Fleet trucks={trucks} onChanged={refresh} onDates={setDatesTruck} />
          </section>
        )}
      </div>

      {modal === 'load' && (
        <Modal title="Book a load" onClose={() => setModal(null)}>
          <LoadForm hazmatTypes={hazmatTypes} onSubmit={async input => {
            const l = await dispatch.createLoad(input)
            setModal(null); setSelected(l); refresh()
          }} />
        </Modal>
      )}
      {datesTruck && (
        <TruckDatesModal truck={datesTruck} onClose={() => setDatesTruck(null)} onSaved={() => { setDatesTruck(null); refresh() }} />
      )}
      {modal === 'truck' && (
        <Modal title="Add a truck" onClose={() => setModal(null)}>
          <TruckForm hazmatTypes={hazmatTypes} onSubmit={async input => {
            await dispatch.createTruck(input)
            setModal(null); refresh()
          }} />
        </Modal>
      )}
    </main>
  )
}
