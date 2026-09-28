'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  ApplicationStatus, applications, fmtDate, fmtDay, fmtFileSize, fmtLength, fmtWeight, hazmatLabel,
  TruckApplication, truckTypeLabel,
} from '@/lib/truck-loads'

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending:  'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
}
const DOC_LABELS: Record<string, string> = {
  driver_id: 'Driver ID', drivers_licence: "Driver's licence", prdp: 'PrDP', vehicle_registration: 'Vehicle registration',
  licence_disc: 'Licence disc', roadworthy: 'Roadworthy (COR)', operator_card: 'Operator card',
  git_insurance: 'GIT insurance', hazmat_certificate: 'Dangerous goods certificate', truck_photo: 'Truck photo',
}

function Pill({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[status]}`}>{status}</span>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-silver-400">{label}</div>
      <div className="text-sm text-silver-900">{value || '—'}</div>
    </div>
  )
}

function ShareLink({ onRotated }: { onRotated: () => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { applications.link().then(l => setToken(l.token)).catch(e => setError(e.message)) }, [])

  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/truck-loads/apply/${token}` : ''
  const message = `Apply to haul with us — submit your truck, driver details and documents here: ${url}`

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  async function rotate() {
    if (!confirm('Create a new link? The current link will stop working for anyone who has it.')) return
    try { setToken((await applications.rotate()).token); onRotated() } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="rounded-xl bg-white border border-silver-200 p-4 space-y-3">
      <div>
        <div className="font-medium text-silver-900">Your application link</div>
        <p className="text-sm text-silver-500">Share it with carriers and owner-drivers. They submit truck, driver and document details — no account needed.</p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <input readOnly value={url} className="flex-1 min-w-[240px] rounded-lg border border-silver-300 bg-silver-50 px-3 py-2 text-sm text-silver-700" onFocus={e => e.target.select()} />
        <button onClick={copy} disabled={!url} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 text-sm disabled:opacity-50">
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
          className={`press rounded-lg border border-silver-300 px-3 py-2 text-sm text-silver-800 ${url ? '' : 'pointer-events-none opacity-50'}`}>
          Share on WhatsApp
        </a>
        <button onClick={rotate} className="text-sm text-silver-500 underline">New link</button>
      </div>
    </div>
  )
}

function Detail({ app, onChanged }: { app: TruckApplication; onChanged: (a: TruckApplication, msg?: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function openDoc(docId: string) {
    // Open the tab synchronously so popup blockers allow it, then load the file
    const tab = window.open('', '_blank')
    try {
      const blob = await applications.document(app.id, docId)
      const url = URL.createObjectURL(blob)
      if (tab) tab.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      tab?.close()
      setError(e.message)
    }
  }

  async function approve() {
    if (!confirm(`Approve ${app.reference}? ${app.plate} will be added to your fleet with ${app.driverName} as driver.`)) return
    setBusy('approve'); setError(null)
    try {
      const r = await applications.approve(app.id)
      onChanged(await applications.get(app.id), r.driverAccount === 'created'
        ? `Approved. ${app.plate} is in your fleet, and ${app.driverName} can sign in to the driver app with ${app.driverPhone} and the password from their application.`
        : `Approved. ${app.plate} is in your fleet. ${app.driverPhone} already had an account, so the driver signs in with their existing password.`)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  async function reject() {
    const note = prompt(`Reject ${app.reference}? Optional reason (for your records):`)
    if (note === null) return
    setBusy('reject'); setError(null)
    try { onChanged(await applications.get((await applications.reject(app.id, note || undefined)).id)) }
    catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  return (
    <div className="screen-enter space-y-4" key={app.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-silver-900">{app.companyName || app.contactName}</h2>
            <Pill status={app.status} />
          </div>
          <p className="text-sm text-silver-500">{app.reference} · submitted {fmtDate(app.createdAt)}</p>
        </div>
        {app.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={approve} disabled={!!busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm disabled:opacity-50">
              {busy === 'approve' ? 'Approving…' : 'Approve & add truck'}
            </button>
            <button onClick={reject} disabled={!!busy} className="press rounded-lg border border-silver-300 px-3 py-1.5 text-sm text-silver-700 disabled:opacity-50">
              Reject
            </button>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      {app.checks && app.checks.warnings.length > 0 && (
        <ul className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 space-y-0.5">
          {app.checks.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
        </ul>
      )}
      {app.status === 'rejected' && app.reviewNote && (
        <p className="rounded-lg bg-silver-50 border border-silver-200 px-3 py-2 text-sm text-silver-700">Rejected: {app.reviewNote}</p>
      )}

      <div className="rounded-xl border border-silver-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Row label="Contact" value={app.contactName} />
        <Row label="Phone" value={<a className="underline" href={`tel:${app.contactPhone}`}>{app.contactPhone}</a>} />
        <Row label="Email" value={app.contactEmail && <a className="underline" href={`mailto:${app.contactEmail}`}>{app.contactEmail}</a>} />
        <Row label="Company" value={app.companyName} />
      </div>

      <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
        <div className="font-medium text-silver-900">Driver</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Row label="Name" value={app.driverName} />
          <Row label="Cellphone" value={app.driverPhone} />
          <Row label="ID / passport" value={app.driverIdNumber} />
          <Row label="Licence" value={`Code ${app.licenceCode} · exp ${fmtDay(app.licenceExpiry)}`} />
          <Row label="PrDP expiry" value={fmtDay(app.prdpExpiry)} />
          <Row label="Driver app account" value={app.checks?.driverHasAccount ? 'Already exists' : app.status === 'pending' ? 'Created on approval' : '—'} />
        </div>
      </div>

      <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
        <div className="font-medium text-silver-900">Truck</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Row label="Type" value={truckTypeLabel(app.truckType)} />
          <Row label="Make / model" value={[app.make, app.model, app.year].filter(Boolean).join(' ')} />
          <Row label="Plate" value={app.plate} />
          <Row label="VIN" value={app.vin} />
          <Row label="H × W × L" value={`${fmtLength(app.heightMm)} × ${fmtLength(app.widthMm)} × ${fmtLength(app.lengthMm)}`} />
          <Row label="Gross / tare" value={`${fmtWeight(app.grossWeightKg)} / ${fmtWeight(app.tareWeightKg)}`} />
          <Row label="Axles" value={app.axleCount} />
          <Row label="Hazmat" value={app.hazmatTypes.map(hazmatLabel).join(', ')} />
        </div>
      </div>

      <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-2">
        <div className="font-medium text-silver-900">Documents</div>
        <ul className="divide-y divide-silver-100">
          {app.documents?.map(doc => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="text-silver-900">{DOC_LABELS[doc.kind] ?? doc.kind}</div>
                <div className="text-xs text-silver-500 truncate">{doc.fileName} · {fmtFileSize(doc.size)}</div>
              </div>
              <button onClick={() => openDoc(doc.id)} className="press shrink-0 rounded-md border border-silver-300 px-2.5 py-1 text-xs">View</button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-silver-400">POPIA consent given {fmtDate(app.consentAt)}.</p>
      </div>
    </div>
  )
}

const FILTERS: (ApplicationStatus | 'all')[] = ['pending', 'approved', 'rejected', 'all']

export default function Applications({ onFleetChanged }: { onFleetChanged: () => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending')
  const [rows, setRows] = useState<TruckApplication[] | null>(null)
  const [selected, setSelected] = useState<TruckApplication | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setRows(await applications.list(filter === 'all' ? undefined : filter)); setError(null) }
    catch (e: any) { setError(e.message) }
  }, [filter])
  useEffect(() => { refresh() }, [refresh])

  async function open(id: string) {
    setNotice(null)
    try { setSelected(await applications.get(id)) } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="space-y-5">
      <ShareLink onRotated={refresh} />
      {notice && <p className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-2 text-sm text-brand-800">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        <section className="space-y-3">
          <h1 className="font-semibold">Applications</h1>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-xs capitalize ${filter === f ? 'bg-brand-700 text-white' : 'bg-white text-silver-600 border border-silver-200'}`}>
                {f}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {rows?.map(a => (
              <li key={a.id}>
                <button onClick={() => open(a.id)}
                  className={`press w-full text-left rounded-xl border bg-white p-3 ${selected?.id === a.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-silver-200 hover:border-silver-300'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{a.companyName || a.contactName}</span>
                    <Pill status={a.status} />
                  </div>
                  <div className="text-xs text-silver-600 mt-1">{truckTypeLabel(a.truckType)} · {a.make} · {a.plate}</div>
                  <div className="text-[11px] text-silver-400 mt-1">{a.reference} · {a.driverName} · {a.documentCount} docs · {fmtDate(a.createdAt)}</div>
                </button>
              </li>
            ))}
            {rows && !rows.length && <li className="text-sm text-silver-500 text-center py-8">No {filter === 'all' ? '' : filter} applications.</li>}
          </ul>
        </section>
        <section>
          {selected
            ? <Detail app={selected} onChanged={(a, msg) => { setSelected(a); setNotice(msg ?? null); refresh(); if (a.status === 'approved') onFleetChanged() }} />
            : <div className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">Select an application to review it.</div>}
        </section>
      </div>
    </div>
  )
}
