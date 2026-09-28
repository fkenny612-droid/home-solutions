'use client'
import { useEffect, useState } from 'react'
import { Field, inputCls } from '@/components/truck-loads/forms'
import {
  carrier, CarrierBadge, CarrierDocSpec, CarrierProfileView, fmtDate, fmtDay, fmtFileSize, openInNewTab,
} from '@/lib/truck-loads'

const BADGE: Record<CarrierBadge, { label: string; cls: string; hint: string }> = {
  verified:   { label: '✓ Verified carrier', cls: 'bg-brand-100 text-brand-800 border-brand-300', hint: 'Company documents checked by Truck Loads' },
  lapsed:     { label: 'Verification lapsed', cls: 'bg-amber-100 text-amber-800 border-amber-300', hint: 'A required document has expired — upload the renewal' },
  pending:    { label: 'Verification pending', cls: 'bg-blue-100 text-blue-800 border-blue-300', hint: 'Waiting for Truck Loads to check your documents' },
  unverified: { label: 'Not verified', cls: 'bg-silver-100 text-silver-700 border-silver-300', hint: 'Submit your company documents to get verified' },
}

export function CarrierBadgePill({ badge, size = 'sm' }: { badge: CarrierBadge; size?: 'sm' | 'xs' }) {
  const b = BADGE[badge]
  return (
    <span title={b.hint} className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${b.cls} ${size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
      {b.label}
    </span>
  )
}

function DocRow({ spec, view, onChange }: { spec: CarrierDocSpec; view: CarrierProfileView; onChange: (v: CarrierProfileView) => void }) {
  const doc = view.profile?.documents?.find(d => d.kind === spec.kind)
  const [file, setFile] = useState<File | null>(null)
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!file) return
    setBusy(true); setError(null)
    try { onChange(await carrier.uploadDoc(spec.kind, file, expiry || undefined)); setFile(null); setExpiry('') }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const expired = doc?.expiresAt && new Date(doc.expiresAt) < new Date()
  return (
    <li className="py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-silver-900">{spec.label} {spec.required && <span className="text-red-600">*</span>}</div>
          {doc ? (
            <div className="text-xs text-silver-500">
              <button className="underline" onClick={() => openInNewTab(() => carrier.document(doc.id)).catch(e => setError(e.message))}>{doc.fileName}</button>
              {' · '}{fmtFileSize(doc.size)} · uploaded {fmtDate(doc.createdAt)}
              {doc.expiresAt && <span className={expired ? 'text-red-700 font-medium' : ''}> · expires {fmtDay(doc.expiresAt)}</span>}
            </div>
          ) : <div className="text-xs text-silver-500">Not uploaded</div>}
        </div>
        <label className="press cursor-pointer rounded-lg border border-silver-300 bg-white px-3 py-1.5 text-sm">
          {doc ? 'Replace' : 'Upload'}
          <input type="file" className="sr-only" accept="application/pdf,image/*" onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </label>
      </div>
      {file && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-silver-50 p-2">
          <span className="text-xs text-silver-700 flex-1 min-w-[140px] truncate">{file.name} · {fmtFileSize(file.size)}</span>
          {spec.expires && (
            <label className="text-xs text-silver-600">Expiry date
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={`${inputCls} mt-0.5 py-1`} />
            </label>
          )}
          <button onClick={save} disabled={busy || (spec.expires && !expiry)} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm disabled:opacity-50">
            {busy ? 'Uploading…' : 'Save'}
          </button>
          <button onClick={() => setFile(null)} className="text-xs text-silver-500 underline">Cancel</button>
        </div>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </li>
  )
}

export default function Company({ onChanged }: { onChanged: (v: CarrierProfileView) => void }) {
  const [view, setView] = useState<CarrierProfileView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { carrier.profile().then(setView).catch(e => setError(e.message)) }, [])
  const update = (v: CarrierProfileView) => { setView(v); onChanged(v) }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true); setError(null); setSaved(false)
    try {
      update(await carrier.save({
        companyName: str('companyName'), registrationNumber: str('registrationNumber'),
        vatNumber: str('vatNumber') || undefined, contactName: str('contactName'), contactPhone: str('contactPhone'),
        contactEmail: str('contactEmail') || undefined, address: str('address') || undefined,
      }))
      setSaved(true)
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  async function submit() {
    setBusy(true); setError(null)
    try { update(await carrier.submit()) } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  if (!view) return <p className="text-sm text-silver-500 p-6 text-center">{error ?? 'Loading…'}</p>
  const p = view.profile
  const canSubmit = p && (p.status === 'draft' || p.status === 'rejected')

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <section className="space-y-4">
        <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-semibold">Carrier verification</h1>
            <CarrierBadgePill badge={view.badge} />
          </div>
          <p className="text-sm text-silver-600">
            Shippers only see the <strong>Verified carrier</strong> badge once Truck Loads has checked your company
            registration, insurance, tax status and bank details. Keep insurance and tax status in date — the badge lapses when they expire.
          </p>
          {p?.status === 'rejected' && p.reviewNote && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">Not approved: {p.reviewNote}</p>
          )}
          {p?.status === 'pending' && <p className="text-sm text-blue-800">Submitted {fmtDate(p.submittedAt)} — we&apos;ll check your documents shortly.</p>}
          {p?.status === 'verified' && <p className="text-sm text-brand-800">Verified {fmtDate(p.verifiedAt)}.</p>}
        </div>

        <form onSubmit={save} className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
          <div className="font-medium text-silver-900">Company details</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Company name *"><input name="companyName" required defaultValue={p?.companyName} className={inputCls} /></Field>
            <Field label="CIPC registration no. *"><input name="registrationNumber" required defaultValue={p?.registrationNumber} placeholder="2019/123456/07" className={inputCls} /></Field>
            <Field label="VAT number"><input name="vatNumber" defaultValue={p?.vatNumber ?? ''} className={inputCls} /></Field>
            <Field label="Contact person *"><input name="contactName" required defaultValue={p?.contactName} className={inputCls} /></Field>
            <Field label="Contact phone *" hint="Compliance alerts are sent here by SMS."><input name="contactPhone" type="tel" required defaultValue={p?.contactPhone} className={inputCls} /></Field>
            <Field label="Contact email"><input name="contactEmail" type="email" defaultValue={p?.contactEmail ?? ''} className={inputCls} /></Field>
          </div>
          <Field label="Business address"><input name="address" defaultValue={p?.address ?? ''} className={inputCls} /></Field>
          {p?.status === 'verified' && <p className="text-xs text-silver-500">Changing the company name or registration number sends your profile back for verification.</p>}
          <div className="flex items-center gap-3">
            <button disabled={busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 text-sm disabled:opacity-50">Save details</button>
            {saved && <span className="text-sm text-brand-700">Saved ✓</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-silver-200 bg-white p-4 space-y-2">
        <div className="font-medium text-silver-900">Company documents</div>
        {!p ? (
          <p className="text-sm text-silver-500">Save your company details first, then upload documents here.</p>
        ) : (
          <>
            <ul className="divide-y divide-silver-100">
              {view.documentSpecs.map(spec => <DocRow key={spec.kind} spec={spec} view={view} onChange={update} />)}
            </ul>
            {canSubmit && (
              <button onClick={submit} disabled={busy} className="press w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-2.5 text-sm font-medium disabled:opacity-50">
                {p.status === 'rejected' ? 'Resubmit for verification' : 'Submit for verification'}
              </button>
            )}
          </>
        )}
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  )
}
