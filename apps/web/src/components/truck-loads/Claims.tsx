'use client'
import { useState } from 'react'
import { Field, inputCls } from '@/components/truck-loads/forms'
import { PhotoStrip } from '@/components/truck-loads/Delivery'
import { Claim, CLAIM_TYPE_LABEL, ClaimInput, ClaimType, fmtDate, fmtFileSize, fmtMoney } from '@/lib/truck-loads'

const MAX_PHOTOS = 5

const STATUS: Record<Claim['status'], { label: string; cls: string }> = {
  open:       { label: 'Under review', cls: 'bg-amber-100 text-amber-800' },
  refund_due: { label: 'Decided — refund on its way', cls: 'bg-brand-100 text-brand-800' },
  closed:     { label: 'Closed', cls: 'bg-silver-100 text-silver-700' },
}

export function outcomeText(c: Claim) {
  if (c.outcome === 'carrier') return 'Claim declined — the carrier is paid in full'
  if (c.outcome === 'shipper') return `Upheld — full refund${c.refundAmount != null ? ` of ${fmtMoney(c.refundAmount)}` : ''} to the shipper`
  if (c.outcome === 'split') return `Settled — ${fmtMoney(c.refundAmount ?? 0)} refunded to the shipper, the rest paid to the carrier`
  return null
}

/** Shipper's problem report, inside the claim window. */
export function ClaimForm({ maxAmount, onSubmit }: { maxAmount: number; onSubmit: (input: ClaimInput, photos: File[]) => Promise<void> }) {
  const [photos, setPhotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const amount = String(f.get('amountClaimed') ?? '').trim()
    const input: ClaimInput = {
      type: f.get('type') as ClaimType,
      description: String(f.get('description') ?? '').trim(),
      ...(amount ? { amountClaimed: Number(amount) } : {}),
    }
    setBusy(true); setError(null)
    try { await onSubmit(input, photos) } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-silver-600">The carrier&apos;s payment stays on hold while Truck Loads reviews your claim. We&apos;ll look at the proof of delivery, photos and your chat with the carrier.</p>
      <Field label="What went wrong? *">
        <select name="type" required className={inputCls} defaultValue="damaged">
          {(Object.keys(CLAIM_TYPE_LABEL) as ClaimType[]).map(t => <option key={t} value={t}>{CLAIM_TYPE_LABEL[t]}</option>)}
        </select>
      </Field>
      <Field label="Describe the problem *" hint="What was damaged or missing, how much, and who you spoke to">
        <textarea name="description" required minLength={10} maxLength={2000} rows={4} className={inputCls} />
      </Field>
      <Field label="Amount you're claiming (R, optional)" hint={`Up to ${fmtMoney(maxAmount)}`}>
        <input name="amountClaimed" type="number" min={0} max={maxAmount} step="0.01" className={inputCls} />
      </Field>
      <div>
        <div className="text-xs font-medium text-silver-600 mb-1">Photos ({photos.length}/{MAX_PHOTOS})</div>
        <div className="flex flex-wrap gap-2 items-center">
          {photos.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-silver-100 px-2 py-1 text-xs">
              {p.name.slice(0, 24)} · {fmtFileSize(p.size)}
              <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="text-silver-500" aria-label="Remove">✕</button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="press cursor-pointer rounded-lg border border-silver-300 bg-white px-3 py-1.5 text-sm">
              + Add photo
              <input type="file" accept="image/*,application/pdf" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPhotos([...photos, f]) }} />
            </label>
          )}
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="press w-full rounded-lg bg-red-700 hover:bg-red-800 text-white py-2.5 text-sm font-medium disabled:opacity-50">
        {busy ? 'Submitting…' : 'Submit claim and hold payment'}
      </button>
    </form>
  )
}

/** One claim as the shipper, carrier or admin sees it. The carrier can answer while it's open. */
export function ClaimCard({ claim, loadPhoto, onRespond }: {
  claim: Claim
  loadPhoto: (photoId: string) => Promise<Blob>
  onRespond?: (response: string) => Promise<void>
}) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const st = STATUS[claim.status]
  const outcome = outcomeText(claim)
  return (
    <div className="rounded-xl border border-red-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-silver-900">Claim · {CLAIM_TYPE_LABEL[claim.type]}</div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
      </div>
      <p className="text-sm text-silver-700 whitespace-pre-wrap">{claim.description}</p>
      <div className="text-xs text-silver-500">
        Raised {fmtDate(claim.createdAt)}{claim.amountClaimed != null && ` · claiming ${fmtMoney(claim.amountClaimed)}`}
      </div>
      <PhotoStrip photos={claim.photos} loadPhoto={loadPhoto} alt="Claim photo" />
      {claim.carrierResponse && (
        <div className="rounded-lg bg-silver-50 px-3 py-2 text-sm"><div className="text-xs text-silver-500 mb-0.5">Carrier&apos;s response</div>{claim.carrierResponse}</div>
      )}
      {onRespond && claim.status === 'open' && !claim.carrierResponse && (
        <form onSubmit={async e => {
          e.preventDefault(); setBusy(true); setError(null)
          try { await onRespond(reply.trim()) } catch (err: any) { setError(err.message) } finally { setBusy(false) }
        }} className="space-y-2">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} minLength={2} maxLength={2000} required className={inputCls}
            placeholder="Your side of the story — the admin reads this before deciding" />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-sm disabled:opacity-50">{busy ? 'Sending…' : 'Send response'}</button>
        </form>
      )}
      {outcome && (
        <div className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-2 text-sm text-brand-900">
          {outcome}{claim.adminNote && <div className="text-xs text-brand-800 mt-0.5">&ldquo;{claim.adminNote}&rdquo;</div>}
          {claim.refundReference && <div className="text-xs text-brand-800 mt-0.5">Refund paid · ref {claim.refundReference}</div>}
        </div>
      )}
    </div>
  )
}
