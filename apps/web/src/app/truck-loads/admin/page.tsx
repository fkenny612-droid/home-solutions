'use client'
import { useCallback, useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import Login from '@/components/truck-loads/Login'
import { CarrierBadgePill } from '@/components/truck-loads/Company'
import { CompliancePill } from '@/components/truck-loads/Compliance'
import {
  AdminCarrierDetail, AdminCarrierRow, AdminPayment, ApiError, fmtDate, fmtDay, fmtFileSize, fmtMoney, getToken,
  openInNewTab, PAYMENT_LABEL, platformAdmin, setToken,
} from '@/lib/truck-loads'

const FILTERS = ['pending', 'verified', 'rejected', 'all'] as const

function Detail({ d, onChanged }: { d: AdminCarrierDetail; onChanged: (d: AdminCarrierDetail) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const p = d.profile

  async function run(fn: () => Promise<AdminCarrierDetail>) {
    setBusy(true); setError(null)
    try { onChanged(await fn()) } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="screen-enter space-y-4" key={p.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{p.companyName}</h2>
            <CarrierBadgePill badge={d.badge} />
          </div>
          <p className="text-sm text-silver-500">CIPC {p.registrationNumber}{p.vatNumber && ` · VAT ${p.vatNumber}`} · submitted {fmtDate(p.submittedAt)}</p>
        </div>
        <div className="flex gap-2">
          {p.status === 'pending' && (
            <button disabled={busy} onClick={() => confirm(`Verify ${p.companyName}? Shippers will see the Verified carrier badge.`) && run(() => platformAdmin.verify(p.id))}
              className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm disabled:opacity-50">Verify carrier</button>
          )}
          {p.status !== 'rejected' && (
            <button disabled={busy} onClick={() => {
              const note = prompt(p.status === 'verified' ? 'Revoke verification? Reason (shown to the carrier):' : 'Reason for rejecting (shown to the carrier):')
              if (note !== null) run(() => platformAdmin.reject(p.id, note || undefined))
            }} className="press rounded-lg border border-silver-300 px-3 py-1.5 text-sm text-silver-700 disabled:opacity-50">
              {p.status === 'verified' ? 'Revoke' : 'Reject'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      {p.reviewNote && <p className="rounded-lg bg-silver-50 border border-silver-200 px-3 py-2 text-sm">Note: {p.reviewNote}</p>}

      <div className="rounded-xl border border-silver-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><div className="text-[11px] uppercase text-silver-400">Contact</div>{p.contactName}</div>
        <div><div className="text-[11px] uppercase text-silver-400">Phone</div><a className="underline" href={`tel:${p.contactPhone}`}>{p.contactPhone}</a></div>
        <div><div className="text-[11px] uppercase text-silver-400">Email</div>{p.contactEmail ?? '—'}</div>
        <div><div className="text-[11px] uppercase text-silver-400">Account phone</div>{d.owner?.phone ?? '—'}</div>
        <div className="col-span-2 md:col-span-4"><div className="text-[11px] uppercase text-silver-400">Address</div>{p.address ?? '—'}</div>
      </div>

      <div className="rounded-xl border border-silver-200 bg-white p-4">
        <div className="font-medium mb-2">Company documents</div>
        <ul className="divide-y divide-silver-100 text-sm">
          {d.documentSpecs.map(spec => {
            const doc = p.documents.find(x => x.kind === spec.kind)
            const expired = doc?.expiresAt && new Date(doc.expiresAt) < new Date()
            return (
              <li key={spec.kind} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div>{spec.label} {spec.required && <span className="text-red-600">*</span>}</div>
                  <div className="text-xs text-silver-500">
                    {doc ? <>{doc.fileName} · {fmtFileSize(doc.size)}{doc.expiresAt && <span className={expired ? 'text-red-700 font-medium' : ''}> · expires {fmtDay(doc.expiresAt)}</span>}</> : 'Not uploaded'}
                  </div>
                </div>
                {doc && <button onClick={() => openInNewTab(() => platformAdmin.document(p.id, doc.id)).catch(e => setError(e.message))}
                  className="press shrink-0 rounded-md border border-silver-300 px-2.5 py-1 text-xs">View</button>}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-silver-200 bg-white p-4">
        <div className="font-medium mb-2">Fleet ({d.fleet.length})</div>
        {d.fleet.length ? (
          <ul className="divide-y divide-silver-100 text-sm">
            {d.fleet.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span>{t.name} <span className="text-silver-500">{t.plate}</span>{t.driverName && <span className="text-silver-500"> · {t.driverName}</span>}</span>
                <CompliancePill compliance={t.compliance} />
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-silver-500">No trucks yet.</p>}
      </div>
    </div>
  )
}

const PAY_FILTERS = [
  { id: 'payout_due', label: 'Payouts due' }, { id: 'refund_due', label: 'Refunds due' },
  { id: 'held', label: 'Held' }, { id: 'release_pending', label: 'Claim window' },
  { id: 'paid_out', label: 'Paid out' }, { id: 'refunded', label: 'Refunded' }, { id: '', label: 'All' },
]

function Payments() {
  const [filter, setFilter] = useState('payout_due')
  const [rows, setRows] = useState<AdminPayment[] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setRows(await platformAdmin.payments(filter || undefined)); setError(null) } catch (e: any) { setError(e.message) }
  }, [filter])
  useEffect(() => { refresh() }, [refresh])

  async function settle(p: AdminPayment, kind: 'payout' | 'refund') {
    const what = kind === 'payout'
      ? `Mark ${fmtMoney(p.payoutAmount)} as paid to ${p.carrier?.companyName}? Enter the EFT reference:`
      : `Mark ${fmtMoney(p.amount)} as refunded to ${p.shipper?.companyName}? Enter the refund reference:`
    const ref = prompt(what)
    if (!ref) return
    try {
      await (kind === 'payout' ? platformAdmin.paidOut(p.id, ref) : platformAdmin.refunded(p.id, ref))
      refresh()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {PAY_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${filter === f.id ? 'bg-brand-700 text-white' : 'bg-white text-silver-600 border border-silver-200'}`}>{f.label}</button>
          ))}
        </div>
        <button onClick={async () => {
          try { const r = await platformAdmin.releaseDue(); setNotice(`${r.released} payment(s) released from the claim window`); refresh() } catch (e: any) { setError(e.message) }
        }} className="text-sm text-silver-600 underline">Release payments past the claim window now</button>
      </div>
      {notice && <p className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-2 text-sm text-brand-900">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-silver-200 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-silver-500 border-b border-silver-200">
            <tr>
              <th className="px-3 py-2 font-medium">Shipment</th><th className="px-3 py-2 font-medium">Carrier</th>
              <th className="px-3 py-2 font-medium">Shipper</th><th className="px-3 py-2 font-medium">Paid / fee / payout</th>
              <th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {rows?.map(p => (
              <tr key={p.id} className="align-top">
                <td className="px-3 py-2"><div className="font-medium">{p.shipment.reference}</div><div className="text-xs text-silver-500">{p.shipment.originAddress} → {p.shipment.destAddress}</div></td>
                <td className="px-3 py-2">
                  <div>{p.carrier?.companyName ?? '—'}</div>
                  {p.carrier?.bankDocumentId && (
                    <button className="text-xs underline text-silver-600"
                      onClick={() => openInNewTab(() => platformAdmin.document(p.carrier!.profileId, p.carrier!.bankDocumentId!)).catch(e => setError(e.message))}>
                      Bank confirmation letter
                    </button>
                  )}
                </td>
                <td className="px-3 py-2"><div>{p.shipper?.companyName ?? '—'}</div><div className="text-xs text-silver-500">{p.shipper?.contactPhone}</div></td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(p.amount)} / {fmtMoney(p.feeAmount)} / <strong>{fmtMoney(p.payoutAmount)}</strong>{p.provider === 'mock' && <div className="text-[11px] text-amber-700">test payment</div>}</td>
                <td className="px-3 py-2 text-xs">
                  {PAYMENT_LABEL[p.status]}
                  {p.status === 'release_pending' && p.releaseAfter && <div className="text-silver-500">until {fmtDate(p.releaseAfter)}</div>}
                  {p.payoutReference && <div className="text-silver-500">ref {p.payoutReference}</div>}
                  {p.refundReference && <div className="text-silver-500">ref {p.refundReference}</div>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {p.status === 'payout_due' && <button onClick={() => settle(p, 'payout')} className="press rounded-md bg-brand-700 text-white px-2.5 py-1 text-xs">Mark paid out</button>}
                  {p.status === 'refund_due' && <button onClick={() => settle(p, 'refund')} className="press rounded-md bg-brand-700 text-white px-2.5 py-1 text-xs">Mark refunded</button>}
                </td>
              </tr>
            ))}
            {rows && !rows.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-silver-500">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PlatformAdminPage() {
  const [section, setSection] = useState<'carriers' | 'payments'>('carriers')
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending')
  const [rows, setRows] = useState<AdminCarrierRow[] | null>(null)
  const [selected, setSelected] = useState<AdminCarrierDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setAuthed(!!getToken('admin')) }, [])

  const refresh = useCallback(async () => {
    try { setRows(await platformAdmin.carriers(filter === 'all' ? undefined : filter)); setError(null) }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setToken('admin', null); setAuthed(false)
        if (e.status === 403) setError('That account is not a Truck Loads platform admin.')
        return
      }
      setError((e as Error).message)
    }
  }, [filter])

  useEffect(() => { if (authed) refresh() }, [authed, refresh])

  if (authed === null) return null
  if (!authed) {
    return (
      <>
        {error && <p className="fixed top-4 inset-x-4 mx-auto max-w-sm rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 z-10">{error}</p>}
        <Login side="admin" onDone={() => { setError(null); setAuthed(true) }} />
      </>
    )
  }

  return (
    <main className="min-h-screen bg-silver-100 text-silver-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <TruckLoadsMark size={26} onDark />
          <span className="font-semibold">Truck Loads</span>
          <span className="text-xs rounded-full bg-white/15 px-2 py-0.5">Platform admin</span>
          <nav className="ml-4 flex gap-1">
            {(['carriers', 'payments'] as const).map(t => (
              <button key={t} onClick={() => setSection(t)}
                className={`rounded-md px-3 py-1.5 text-sm capitalize ${section === t ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}>{t}</button>
            ))}
          </nav>
          <button onClick={() => { setToken('admin', null); setAuthed(false) }} className="ml-auto text-sm text-white/60 hover:text-white">Sign out</button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        {section === 'payments' ? <Payments /> : (
        <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
          <section className="space-y-3">
            <h1 className="font-semibold">Carrier verification</h1>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-2.5 py-1 text-xs capitalize ${filter === f ? 'bg-brand-700 text-white' : 'bg-white text-silver-600 border border-silver-200'}`}>{f}</button>
              ))}
            </div>
            <ul className="space-y-2">
              {rows?.map(r => (
                <li key={r.id}>
                  <button onClick={() => platformAdmin.carrier(r.id).then(setSelected).catch(e => setError(e.message))}
                    className={`press w-full text-left rounded-xl border bg-white p-3 ${selected?.profile.id === r.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-silver-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{r.companyName}</span>
                      <CarrierBadgePill badge={r.badge} size="xs" />
                    </div>
                    <div className="text-[11px] text-silver-500 mt-1">{r.registrationNumber} · {r.fleetSize} truck(s) · {r.documentCount} docs · {fmtDate(r.submittedAt)}</div>
                  </button>
                </li>
              ))}
              {rows && !rows.length && <li className="text-sm text-silver-500 text-center py-8">No {filter === 'all' ? '' : filter} carriers.</li>}
            </ul>
          </section>
          <section>
            {selected
              ? <Detail d={selected} onChanged={d => { setSelected(d); refresh() }} />
              : <div className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">Select a carrier to review.</div>}
          </section>
        </div>
        )}
      </div>
    </main>
  )
}
