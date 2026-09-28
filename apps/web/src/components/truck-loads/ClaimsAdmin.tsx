'use client'
import { useCallback, useEffect, useState } from 'react'
import { inputCls } from '@/components/truck-loads/forms'
import { PodView } from '@/components/truck-loads/Delivery'
import { ClaimCard } from '@/components/truck-loads/Claims'
import { AdminClaim, AdminClaimDetail, CLAIM_TYPE_LABEL, ClaimOutcome, fmtDate, fmtMoney, PAYMENT_LABEL, platformAdmin } from '@/lib/truck-loads'

const FILTERS = [
  { id: 'open', label: 'Open' }, { id: 'refund_due', label: 'Refunds due' }, { id: 'closed', label: 'Closed' }, { id: '', label: 'All' },
]

function Decide({ c, onDone }: { c: AdminClaim; onDone: () => void }) {
  const [outcome, setOutcome] = useState<ClaimOutcome>('carrier')
  const [refund, setRefund] = useState(c.amountClaimed != null ? String(Math.min(c.amountClaimed, c.payment?.payoutAmount ?? 0)) : '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const p = c.payment
  const options: { id: ClaimOutcome; label: string; hint: string }[] = [
    { id: 'carrier', label: 'Pay the carrier', hint: `Decline the claim · ${fmtMoney(p?.payoutAmount ?? 0)} payout` },
    { id: 'shipper', label: 'Refund the shipper', hint: `Uphold the claim · ${fmtMoney(p?.amount ?? 0)} back to the shipper, no payout` },
    { id: 'split', label: 'Split', hint: 'Partial refund to the shipper, taken from the carrier payout' },
  ]
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const summary = outcome === 'split' ? `refund ${fmtMoney(Number(refund))} to the shipper` : options.find(o => o.id === outcome)!.label.toLowerCase()
    if (!confirm(`Decide ${c.shipment.reference}: ${summary}? Both parties get an SMS.`)) return
    setBusy(true); setError(null)
    try {
      await platformAdmin.resolveClaim(c.id, { outcome, ...(outcome === 'split' ? { refundAmount: Number(refund) } : {}), note: note.trim() || undefined })
      onDone()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
      <div className="font-medium">Decision</div>
      <div className="grid sm:grid-cols-3 gap-2">
        {options.map(o => (
          <label key={o.id} className={`cursor-pointer rounded-lg border p-3 text-sm ${outcome === o.id ? 'border-brand-600 bg-brand-50' : 'border-silver-200'}`}>
            <input type="radio" name="outcome" className="sr-only" checked={outcome === o.id} onChange={() => setOutcome(o.id)} />
            <div className="font-medium">{o.label}</div>
            <div className="text-xs text-silver-500 mt-0.5">{o.hint}</div>
          </label>
        ))}
      </div>
      {outcome === 'split' && (
        <label className="block text-sm">
          <span className="text-xs text-silver-600">Refund to shipper (R) — less than {fmtMoney(p?.payoutAmount ?? 0)}</span>
          <input type="number" min={0.01} step="0.01" required value={refund} onChange={e => setRefund(e.target.value)} className={inputCls} />
        </label>
      )}
      <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2} className={inputCls} placeholder="Reason (shown to both parties)" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Confirm decision'}</button>
    </form>
  )
}

export default function ClaimsAdmin() {
  const [filter, setFilter] = useState('open')
  const [rows, setRows] = useState<AdminClaim[] | null>(null)
  const [selected, setSelected] = useState<AdminClaim | null>(null)
  const [detail, setDetail] = useState<AdminClaimDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await platformAdmin.claims(filter || undefined)
      setRows(list); setError(null)
      setSelected(sel => sel && (list.find(r => r.id === sel.id) ?? sel))
    } catch (e: any) { setError(e.message) }
  }, [filter])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    setDetail(null)
    if (selected) platformAdmin.claim(selected.id).then(setDetail).catch(e => setError(e.message))
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const podPhoto = useCallback((photoId: string) => platformAdmin.claimPodPhoto(selected!.id, photoId), [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markRefunded(c: AdminClaim) {
    const ref = prompt(`Mark ${fmtMoney(c.refundAmount ?? 0)} as refunded to ${c.shipper?.companyName}? Enter the EFT reference:`)
    if (!ref) return
    try { await platformAdmin.claimRefunded(c.id, ref); refresh() } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
      <section className="space-y-3">
        <h1 className="font-semibold">Claims</h1>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${filter === f.id ? 'bg-brand-700 text-white' : 'bg-white text-silver-600 border border-silver-200'}`}>{f.label}</button>
          ))}
        </div>
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ul className="space-y-2">
          {rows?.map(r => (
            <li key={r.id}>
              <button onClick={() => setSelected(r)}
                className={`press w-full text-left rounded-xl border bg-white p-3 ${selected?.id === r.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-silver-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{r.shipment.reference} · {CLAIM_TYPE_LABEL[r.type]}</span>
                  {r.amountClaimed != null && <span className="text-xs">{fmtMoney(r.amountClaimed)}</span>}
                </div>
                <div className="text-[11px] text-silver-500 mt-1">{r.shipper?.companyName} vs {r.carrier?.companyName} · {fmtDate(r.createdAt)}</div>
              </button>
            </li>
          ))}
          {rows && !rows.length && <li className="text-sm text-silver-500 text-center py-8">No claims here.</li>}
        </ul>
      </section>
      <section className="space-y-4">
        {!selected ? <div className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">Select a claim to review.</div> : (
          <>
            <div>
              <h2 className="text-lg font-semibold">{selected.shipment.reference} · {selected.shipment.originAddress} → {selected.shipment.destAddress}</h2>
              <div className="grid sm:grid-cols-3 gap-3 text-sm mt-2">
                <div><div className="text-xs text-silver-400">Shipper</div>{selected.shipper?.companyName}<div className="text-xs text-silver-500">{selected.shipper?.contactPhone}</div></div>
                <div><div className="text-xs text-silver-400">Carrier</div>{selected.carrier?.companyName}<div className="text-xs text-silver-500">{selected.carrier?.contactPhone}</div></div>
                <div><div className="text-xs text-silver-400">Payment</div>{fmtMoney(selected.payment?.amount ?? 0)} · payout {fmtMoney(selected.payment?.payoutAmount ?? 0)}
                  <div className="text-xs text-silver-500">{selected.payment && PAYMENT_LABEL[selected.payment.status]}</div></div>
              </div>
            </div>
            <ClaimCard claim={selected} loadPhoto={photoId => platformAdmin.claimPhoto(selected.id, photoId)} />
            {selected.status === 'open' && <Decide key={selected.id} c={selected} onDone={refresh} />}
            {selected.status === 'refund_due' && (
              <button onClick={() => markRefunded(selected)} className="press rounded-lg bg-brand-700 text-white px-4 py-2 text-sm">
                Mark {fmtMoney(selected.refundAmount ?? 0)} refunded to shipper
              </button>
            )}
            {detail?.pod ? <PodView pod={detail.pod} loadPhoto={podPhoto} /> : detail && <p className="text-sm text-silver-500">No proof of delivery on file.</p>}
            {detail && (
              <div className="rounded-xl border border-silver-200 bg-white p-4">
                <div className="font-medium mb-2">Chat between shipper and carrier ({detail.messages.length})</div>
                {detail.messages.length ? (
                  <ol className="space-y-1.5 max-h-80 overflow-y-auto">
                    {detail.messages.map(m => (
                      <li key={m.id} className="text-sm"><span className="text-xs text-silver-400 w-32 inline-block">{fmtDate(m.createdAt)}</span>
                        <span className={`font-medium capitalize ${m.fromRole === 'shipper' ? 'text-blue-800' : 'text-brand-800'}`}>{m.fromRole}:</span> {m.body}</li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-silver-500">They haven&apos;t messaged on Truck Loads.</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
