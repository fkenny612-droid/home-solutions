'use client'
import { useCallback, useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import Login from '@/components/truck-loads/Login'
import { CarrierBadgePill } from '@/components/truck-loads/Company'
import { Field, HazmatPicker, inputCls, Modal } from '@/components/truck-loads/forms'
import {
  ApiError, fmtDate, fmtDistance, fmtMoney, fmtWeight, getToken, hazmatLabel, setToken, shipper,
  ShipmentInput, ShipmentStatus, ShipperProfile, ShipperShipmentDetail, ShipperShipmentRow, truckTypeLabel,
} from '@/lib/truck-loads'

const STATUS: Record<ShipmentStatus, { label: string; cls: string }> = {
  open:       { label: 'Taking bids', cls: 'bg-blue-100 text-blue-800' },
  awarded:    { label: 'Awarded',     cls: 'bg-brand-100 text-brand-800' },
  in_transit: { label: 'In transit',  cls: 'bg-yellow-100 text-yellow-800' },
  delivered:  { label: 'Delivered',   cls: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelled',   cls: 'bg-red-50 text-red-700' },
}
const Pill = ({ s }: { s: ShipmentStatus }) =>
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS[s].cls}`}>{STATUS[s].label}</span>

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const REFRESH_MS = 30_000

const errBox = (e: string | null) => e && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{e}</p>
const btn = 'press rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium disabled:opacity-50'

// ─── Sign-up & company onboarding ─────────────────────────────────────────────

function SignUp({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    if (str('password') !== str('password2')) return setError('Passwords do not match')
    setBusy(true); setError(null)
    try {
      await shipper.register({ phone: str('phone'), password: str('password'), firstName: str('firstName'), lastName: str('lastName') })
      onDone()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <main className="min-h-screen bg-silver-100 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1"><TruckLoadsMark size={28} /><h1 className="font-semibold">Create a shipper account</h1></div>
        <p className="text-sm text-silver-500">Post loads and get quotes from verified carriers.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input name="firstName" required className={inputCls} /></Field>
          <Field label="Last name"><input name="lastName" required className={inputCls} /></Field>
        </div>
        <Field label="Cellphone"><input name="phone" type="tel" required className={inputCls} autoComplete="username" /></Field>
        <Field label="Password"><input name="password" type="password" minLength={8} required className={inputCls} autoComplete="new-password" /></Field>
        <Field label="Repeat password"><input name="password2" type="password" minLength={8} required className={inputCls} autoComplete="new-password" /></Field>
        {errBox(error)}
        <button disabled={busy} className={`${btn} w-full py-3`}>{busy ? 'Creating…' : 'Create account'}</button>
        <button type="button" onClick={onCancel} className="block w-full text-center text-sm text-silver-500 underline">I already have an account</button>
      </form>
    </main>
  )
}

function CompanyForm({ initial, onSaved }: { initial?: ShipperProfile | null; onSaved: (p: ShipperProfile) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true); setError(null)
    try {
      onSaved(await shipper.saveProfile({
        companyName: str('companyName'), contactName: str('contactName'), contactPhone: str('contactPhone'),
        contactEmail: str('contactEmail') || undefined, vatNumber: str('vatNumber') || undefined, address: str('address') || undefined,
      }))
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-silver-200 p-6 space-y-3 max-w-xl mx-auto">
      <h1 className="text-lg font-semibold">Your company</h1>
      <p className="text-sm text-silver-500">Carriers see your company name on your shipments. Contact details are only shared with the carrier you award.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Company name *"><input name="companyName" required defaultValue={initial?.companyName} className={inputCls} /></Field>
        <Field label="Contact person *"><input name="contactName" required defaultValue={initial?.contactName} className={inputCls} /></Field>
        <Field label="Contact phone *"><input name="contactPhone" type="tel" required defaultValue={initial?.contactPhone} className={inputCls} /></Field>
        <Field label="Contact email"><input name="contactEmail" type="email" defaultValue={initial?.contactEmail ?? ''} className={inputCls} /></Field>
        <Field label="VAT number"><input name="vatNumber" defaultValue={initial?.vatNumber ?? ''} className={inputCls} /></Field>
        <Field label="Address"><input name="address" defaultValue={initial?.address ?? ''} className={inputCls} /></Field>
      </div>
      {errBox(error)}
      <button disabled={busy} className={`${btn} px-4 py-2`}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  )
}

// ─── Post a shipment ──────────────────────────────────────────────────────────

function ShipmentForm({ truckTypes, hazmatTypes, onCreated }: { truckTypes: string[]; hazmatTypes: string[]; onCreated: () => void }) {
  const [hazmat, setHazmat] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    const iso = (k: string) => (str(k) ? new Date(str(k)).toISOString() : undefined)
    const input: ShipmentInput = {
      commodity: str('commodity'), weightKg: Math.round(Number(str('weightKg'))), hazmatTypes: hazmat,
      truckType: str('truckType') || undefined, originAddress: str('originAddress'), destAddress: str('destAddress'),
      pickupAt: iso('pickupAt'), deliverBy: iso('deliverBy'), notes: str('notes') || undefined,
      targetRate: str('targetRate') ? Number(str('targetRate')) : undefined,
      verifiedOnly: f.get('verifiedOnly') === 'on', biddingClosesAt: iso('biddingClosesAt'),
    }
    setBusy(true); setError(null)
    try { await shipper.create(input); onCreated() } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Pickup address *"><input name="originAddress" required className={inputCls} placeholder="12 Jet Park Rd, Boksburg" /></Field>
      <Field label="Delivery address *"><input name="destAddress" required className={inputCls} placeholder="1 Bayhead Rd, Durban" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cargo *"><input name="commodity" required className={inputCls} placeholder="Palletised beverages" /></Field>
        <Field label="Weight (kg) *"><input name="weightKg" type="number" min="1" max="60000" required className={inputCls} /></Field>
        <Field label="Pickup"><input name="pickupAt" type="datetime-local" className={inputCls} /></Field>
        <Field label="Deliver by"><input name="deliverBy" type="datetime-local" className={inputCls} /></Field>
        <Field label="Truck type">
          <select name="truckType" className={inputCls} defaultValue="">
            <option value="">Any</option>
            {truckTypes.map(t => <option key={t} value={t}>{truckTypeLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="Target rate (R)" hint="Optional — shown to carriers"><input name="targetRate" type="number" min="0" step="1" className={inputCls} /></Field>
        <Field label="Bids close"><input name="biddingClosesAt" type="datetime-local" className={inputCls} /></Field>
      </div>
      <Field label="Hazardous goods"><HazmatPicker types={hazmatTypes} value={hazmat} onChange={setHazmat} /></Field>
      <Field label="Notes for carriers"><textarea name="notes" rows={2} className={inputCls} placeholder="Loading hours, special handling…" /></Field>
      <label className="flex items-center gap-2 text-sm text-silver-700">
        <input name="verifiedOnly" type="checkbox" defaultChecked className="h-4 w-4 accent-brand-700" />
        Only accept bids from verified carriers
      </label>
      {errBox(error)}
      <button disabled={busy} className={`${btn} w-full py-2.5`}>{busy ? 'Posting…' : 'Post shipment'}</button>
    </form>
  )
}

// ─── Shipment detail: compare bids, award, track ──────────────────────────────

function Detail({ s, onChanged }: { s: ShipperShipmentDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null)
    try { await fn(); onChanged() } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  const activeBids = s.bids.filter(b => b.status === 'active')
  const awarded = s.bids.find(b => b.status === 'accepted')

  return (
    <div className="screen-enter space-y-4" key={s.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{s.originAddress} → {s.destAddress}</h2><Pill s={s.status} /></div>
          <p className="text-sm text-silver-500">
            {s.reference} · {s.commodity} · {fmtWeight(s.weightKg)}{s.truckType && ` · ${truckTypeLabel(s.truckType)}`}
            {s.hazmatTypes.length > 0 && ` · Hazmat: ${s.hazmatTypes.map(hazmatLabel).join(', ')}`}
          </p>
          <p className="text-xs text-silver-500">Pickup {fmtDate(s.pickupAt)} · deliver by {fmtDate(s.deliverBy)}{s.targetRate != null && ` · target ${fmtMoney(s.targetRate)}`}</p>
        </div>
        {(s.status === 'open' || s.status === 'awarded') && (
          <button disabled={busy} onClick={() => confirm(`Cancel ${s.reference}?${s.status === 'awarded' ? ' The carrier will be told.' : ''}`) && run(() => shipper.cancel(s.id))}
            className="press rounded-lg border border-silver-300 px-3 py-1.5 text-sm text-silver-700 disabled:opacity-50">Cancel shipment</button>
        )}
      </div>
      {errBox(error)}

      {s.status === 'open' && (
        <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
          <div className="font-medium">Bids ({activeBids.length})</div>
          {activeBids.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-silver-500 border-b border-silver-200">
                  <tr><th className="py-2 pr-3 font-medium">Carrier</th><th className="py-2 pr-3 font-medium">Track record</th><th className="py-2 pr-3 font-medium">Price</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {activeBids.map((b, i) => (
                    <tr key={b.id} className="align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{b.carrier?.companyName}</div>
                        {b.carrier && <CarrierBadgePill badge={b.carrier.badge} size="xs" />}
                        {b.message && <div className="text-xs text-silver-600 mt-1">&ldquo;{b.message}&rdquo;</div>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-silver-600">
                        {plural(b.carrier?.completedLoads ?? 0, 'load')} delivered<br />{plural(b.carrier?.fleetSize ?? 0, 'truck')}
                        {b.carrier?.memberSince && <><br />on Truck Loads since {new Date(b.carrier.memberSince).getFullYear()}</>}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <div className="font-semibold">{fmtMoney(b.amount)}</div>
                        {i === 0 && activeBids.length > 1 && <div className="text-[11px] text-brand-700">Lowest</div>}
                      </td>
                      <td className="py-3 text-right">
                        <button disabled={busy} onClick={() => confirm(`Award ${s.reference} to ${b.carrier?.companyName} at ${fmtMoney(b.amount)}?`) && run(() => shipper.accept(s.id, b.id))}
                          className={`${btn} px-3 py-1.5`}>Accept</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-silver-500">No bids yet. Carriers on the load board can see this shipment{s.verifiedOnly ? ' (verified carriers only)' : ''}.</p>}
        </div>
      )}

      {awarded && (
        <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase text-silver-400">Awarded to</div>
              <div className="font-medium">{awarded.carrier?.companyName} {awarded.carrier && <CarrierBadgePill badge={awarded.carrier.badge} size="xs" />}</div>
            </div>
            <div className="text-right"><div className="text-xs uppercase text-silver-400">Price</div><div className="font-semibold">{fmtMoney(awarded.amount)}</div></div>
          </div>
          {s.progress && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-silver-400">Truck</div>{s.progress.truck ? `${s.progress.truck.name} · ${s.progress.truck.plate}` : 'Not assigned yet'}</div>
                <div><div className="text-xs text-silver-400">Driver</div>{s.progress.truck?.driverName ?? '—'}</div>
                <div><div className="text-xs text-silver-400">Route</div>{s.progress.routeDistanceM != null ? fmtDistance(s.progress.routeDistanceM) : '—'}</div>
              </div>
              <ol className="space-y-1.5 border-t border-silver-100 pt-3">
                {s.progress.events.map(ev => (
                  <li key={ev.id} className="flex gap-3 text-xs"><span className="text-silver-400 w-28 shrink-0">{fmtDate(ev.createdAt)}</span><span>{ev.message}</span></li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShipperPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [signUp, setSignUp] = useState(false)
  const [profile, setProfile] = useState<ShipperProfile | null | undefined>(undefined)
  const [truckTypes, setTruckTypes] = useState<string[]>([])
  const [hazmatTypes, setHazmatTypes] = useState<string[]>([])
  const [rows, setRows] = useState<ShipperShipmentRow[]>([])
  const [selected, setSelected] = useState<ShipperShipmentDetail | null>(null)
  const [modal, setModal] = useState<'post' | 'company' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setAuthed(!!getToken('shipper')) }, [])
  const signOut = () => { setToken('shipper', null); setAuthed(false); setProfile(undefined); setSelected(null) }

  const refresh = useCallback(async () => {
    try {
      const p = await shipper.profile()
      setProfile(p.profile); setTruckTypes(p.truckTypes); setHazmatTypes(p.hazmatTypes)
      if (p.profile) setRows(await shipper.shipments())
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut()
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    refresh()
    // New bids arrive while the shipper is looking
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [authed, refresh])

  const open = async (id: string) => {
    try { setSelected(await shipper.shipment(id)); refresh() } catch (e: any) { setError(e.message) }
  }

  if (authed === null) return null
  if (!authed) {
    return signUp
      ? <SignUp onDone={() => { setSignUp(false); setAuthed(true) }} onCancel={() => setSignUp(false)} />
      : <Login side="shipper" onDone={() => setAuthed(true)}
          footer={<button onClick={() => setSignUp(true)} className="block w-full text-center text-sm text-brand-700 underline">New shipper? Create an account</button>} />
  }

  return (
    <main className="min-h-screen bg-silver-100 text-silver-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <TruckLoadsMark size={26} onDark />
          <span className="font-semibold">Truck Loads</span>
          <span className="text-xs rounded-full bg-white/15 px-2 py-0.5">Shippers</span>
          {profile && <button onClick={() => setModal('company')} className="ml-auto text-sm text-white/70 hover:text-white truncate">{profile.companyName}</button>}
          <button onClick={signOut} className={`${profile ? 'ml-3' : 'ml-auto'} text-sm text-white/60 hover:text-white`}>Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {errBox(error)}
        {profile === undefined ? <p className="text-center text-silver-500 py-10">Loading…</p>
          : profile === null ? <CompanyForm onSaved={p => { setProfile(p); refresh() }} />
          : (
            <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h1 className="font-semibold">Your shipments</h1>
                  <button onClick={() => setModal('post')} className={`${btn} px-3 py-1.5`}>+ Post a shipment</button>
                </div>
                <ul className="space-y-2">
                  {rows.map(r => (
                    <li key={r.id}>
                      <button onClick={() => open(r.id)}
                        className={`press w-full text-left rounded-xl border bg-white p-3 ${selected?.id === r.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-silver-200 hover:border-silver-300'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{r.originAddress} → {r.destAddress}</span>
                          <Pill s={r.status} />
                        </div>
                        <div className="text-xs text-silver-600 mt-1">{r.commodity} · {fmtWeight(r.weightKg)}</div>
                        <div className="text-[11px] text-silver-400 mt-1">
                          {r.reference} · {r.status === 'open'
                            ? `${r.bidCount} bid${r.bidCount === 1 ? '' : 's'}${r.lowestBid != null ? ` · lowest ${fmtMoney(r.lowestBid)}` : ''}`
                            : r.awardedAmount != null ? `awarded ${fmtMoney(r.awardedAmount)}` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                  {!rows.length && <li className="rounded-xl border border-dashed border-silver-300 p-8 text-center text-sm text-silver-500">Post your first shipment to get quotes from carriers.</li>}
                </ul>
              </section>
              <section>
                {selected
                  ? <Detail s={selected} onChanged={() => { refresh(); open(selected.id) }} />
                  : <div className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">Select a shipment to compare bids.</div>}
              </section>
            </div>
          )}
      </div>

      {modal === 'post' && (
        <Modal title="Post a shipment" onClose={() => setModal(null)}>
          <ShipmentForm truckTypes={truckTypes} hazmatTypes={hazmatTypes} onCreated={() => { setModal(null); refresh() }} />
        </Modal>
      )}
      {modal === 'company' && profile && (
        <Modal title="Company details" onClose={() => setModal(null)}>
          <CompanyForm initial={profile} onSaved={p => { setProfile(p); setModal(null) }} />
        </Modal>
      )}
    </main>
  )
}
