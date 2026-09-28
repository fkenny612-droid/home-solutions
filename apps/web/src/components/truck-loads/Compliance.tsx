'use client'
import { useState } from 'react'
import { Field, inputCls, Modal } from '@/components/truck-loads/forms'
import {
  ComplianceOverview, dispatch, fmtDay, ItemStatus, Truck, TruckCompliance, TruckExpiryField,
} from '@/lib/truck-loads'

const PILL: Record<ItemStatus, { label: string; cls: string }> = {
  ok:       { label: 'Compliant', cls: 'bg-green-100 text-green-800' },
  expiring: { label: 'Expiring',  cls: 'bg-amber-100 text-amber-800' },
  expired:  { label: 'Expired',   cls: 'bg-red-100 text-red-700' },
  missing:  { label: 'Dates missing', cls: 'bg-silver-100 text-silver-700' },
}

export function CompliancePill({ compliance }: { compliance?: TruckCompliance }) {
  if (!compliance) return null
  const p = PILL[compliance.overall]
  const detail = compliance.items.filter(i => i.status !== 'ok')
    .map(i => `${i.label}: ${i.status === 'missing' ? 'no date' : i.status === 'expired' ? 'expired' : `${i.daysLeft} days left`}`).join('\n')
  return <span title={detail || 'All documents in date'} className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${p.cls}`}>{p.label}</span>
}

export function ComplianceBanner({ overview, onReview }: { overview: ComplianceOverview | null; onReview: () => void }) {
  if (!overview) return null
  const { expired, expiring, missing } = overview.counts
  if (!expired && !expiring && !missing) return null
  const parts = [
    expired && `${expired} expired`,
    expiring && `${expiring} expiring within 30 days`,
    missing && `${missing} without an expiry date`,
  ].filter(Boolean)
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2 ${expired ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      <span>⚠ Compliance: {parts.join(' · ')}.{expired ? ' Trucks with an expired licence disc, driver’s licence or PrDP can’t be dispatched.' : ''}</span>
      <button onClick={onReview} className="underline font-medium">Review</button>
    </div>
  )
}

export function CompliancePanel({ overview }: { overview: ComplianceOverview | null }) {
  if (!overview || !overview.issues.length) return null
  return (
    <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-2">
      <div className="font-medium text-silver-900">Documents needing attention</div>
      <ul className="divide-y divide-silver-100 text-sm">
        {overview.issues.map((i, n) => (
          <li key={n} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <span className="text-silver-900">{i.label}</span>
              <span className="text-silver-500"> · {i.subject}</span>
            </div>
            <span className={`shrink-0 text-xs font-medium ${i.status === 'expired' ? 'text-red-700' : i.status === 'expiring' ? 'text-amber-700' : 'text-silver-500'}`}>
              {i.status === 'expired' ? `Expired ${fmtDay(i.expiresAt)}` : i.status === 'expiring' ? `${i.daysLeft} days left (${fmtDay(i.expiresAt)})` : 'No expiry date recorded'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DATE_FIELDS: { key: TruckExpiryField; label: string; driver?: boolean }[] = [
  { key: 'licenceDiscExpiry',   label: 'Licence disc' },
  { key: 'roadworthyExpiry',    label: 'Roadworthy (COR)' },
  { key: 'insuranceExpiry',     label: 'Insurance' },
  { key: 'driverLicenceExpiry', label: "Driver's licence", driver: true },
  { key: 'driverPrdpExpiry',    label: 'PrDP', driver: true },
]

const toInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

/** Edit a truck's document expiry dates (renewals). */
export function TruckDatesModal({ truck, onClose, onSaved }: { truck: Truck; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const patch: Partial<Record<TruckExpiryField, string | null>> = {}
    for (const { key } of DATE_FIELDS) patch[key] = String(f.get(key) ?? '') || null
    setBusy(true); setError(null)
    try {
      await dispatch.updateTruck(truck.id, patch)
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Document dates · ${truck.name} (${truck.plate})`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {DATE_FIELDS.map(d => (
            <Field key={d.key} label={`${d.label} expiry`} hint={d.driver && !truck.driverName ? 'No driver on this truck' : undefined}>
              <input name={d.key} type="date" defaultValue={toInput(truck[d.key])} className={inputCls} />
            </Field>
          ))}
        </div>
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="press w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-2.5 text-sm font-medium disabled:opacity-50">
          {busy ? 'Saving…' : 'Save dates'}
        </button>
      </form>
    </Modal>
  )
}
