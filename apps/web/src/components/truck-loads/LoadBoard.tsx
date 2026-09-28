'use client'
import { useCallback, useEffect, useState } from 'react'
import { CarrierBadgePill } from '@/components/truck-loads/Company'
import { inputCls } from '@/components/truck-loads/forms'
import {
  BoardShipment, CarrierBadge, fmtDate, fmtMoney, fmtWeight, hazmatLabel, market, MyBid, truckTypeLabel,
} from '@/lib/truck-loads'

const BID_STATUS: Record<MyBid['status'], string> = {
  active:    'bg-blue-100 text-blue-800',
  accepted:  'bg-green-100 text-green-800',
  declined:  'bg-silver-100 text-silver-600',
  withdrawn: 'bg-silver-100 text-silver-600',
}

function BidBox({ s, onChanged }: { s: BoardShipment; onChanged: () => void }) {
  const [amount, setAmount] = useState(s.myBid ? String(s.myBid.amount) : '')
  const [message, setMessage] = useState(s.myBid?.message ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await market.bid(s.id, Number(amount), message.trim() || undefined); onChanged() }
    catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  async function withdraw() {
    if (!confirm(`Withdraw your bid on ${s.reference}?`)) return
    setBusy(true); setError(null)
    try { await market.withdraw(s.id); onChanged() } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  if (!s.canBid) {
    return <p className="text-xs text-silver-500">This shipper only accepts bids from <strong>verified carriers</strong>. Get verified on the Company tab.</p>
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-silver-600">Your price (R)
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" step="1" required
            className={`${inputCls} mt-0.5 w-36`} placeholder={s.targetRate ? String(s.targetRate) : ''} />
        </label>
        <label className="text-xs text-silver-600 flex-1 min-w-[180px]">Note to shipper (optional)
          <input value={message} onChange={e => setMessage(e.target.value)} maxLength={500} className={`${inputCls} mt-0.5`}
            placeholder="Truck type, availability…" />
        </label>
        <button disabled={busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 text-sm disabled:opacity-50">
          {s.myBid ? 'Update bid' : 'Place bid'}
        </button>
        {s.myBid && <button type="button" onClick={withdraw} disabled={busy} className="text-xs text-silver-500 underline">Withdraw</button>}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  )
}

export default function LoadBoard({ onWon }: { onWon: () => void }) {
  const [q, setQ] = useState('')
  const [data, setData] = useState<{ badge: CarrierBadge; shipments: BoardShipment[] } | null>(null)
  const [bids, setBids] = useState<MyBid[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (query?: string) => {
    try {
      const [b, mine] = await Promise.all([market.board(query), market.myBids()])
      setData(b); setBids(mine); setError(null)
      if (mine.some(x => x.status === 'accepted')) onWon()
    } catch (e: any) { setError(e.message) }
  }, [onWon])
  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">Load board</h1>
            {data && <CarrierBadgePill badge={data.badge} size="xs" />}
          </div>
          <form onSubmit={e => { e.preventDefault(); refresh(q.trim() || undefined) }} className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search town or cargo" className={`${inputCls} w-56 py-1.5`} />
            <button className="press rounded-lg border border-silver-300 bg-white px-3 py-1.5 text-sm">Search</button>
          </form>
        </div>
        <p className="text-sm text-silver-500">Shipments posted by shippers on Truck Loads. Bids are sealed — other carriers can&apos;t see your price.</p>
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ul className="space-y-3">
          {data?.shipments.map(s => (
            <li key={s.id} className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-silver-900">{s.originAddress} → {s.destAddress}</div>
                  <div className="text-sm text-silver-600">
                    {s.commodity} · {fmtWeight(s.weightKg)}{s.truckType && ` · ${truckTypeLabel(s.truckType)}`}
                    {s.hazmatTypes.length > 0 && <span className="text-orange-700"> · Hazmat: {s.hazmatTypes.map(hazmatLabel).join(', ')}</span>}
                  </div>
                  <div className="text-xs text-silver-500 mt-0.5">
                    {s.reference} · {s.shipperName} · pickup {fmtDate(s.pickupAt)}{s.deliverBy && ` · deliver by ${fmtDate(s.deliverBy)}`}
                    {s.biddingClosesAt && ` · bids close ${fmtDate(s.biddingClosesAt)}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {s.targetRate != null && <div className="text-sm"><span className="text-silver-500">Target </span><span className="font-semibold">{fmtMoney(s.targetRate)}</span></div>}
                  <div className="text-xs text-silver-500">{s.bidCount} bid{s.bidCount === 1 ? '' : 's'}{s.verifiedOnly && ' · verified carriers only'}</div>
                  <div className={`text-xs ${s.fittingTrucks ? 'text-green-700' : 'text-amber-700'}`}>
                    {s.fittingTrucks ? `${s.fittingTrucks} of your trucks fit` : 'None of your trucks fit this load'}
                  </div>
                </div>
              </div>
              {s.notes && <p className="text-sm text-silver-600 bg-silver-50 rounded-lg px-3 py-2">{s.notes}</p>}
              {s.myBid && <p className="text-xs text-blue-800">Your bid: <strong>{fmtMoney(s.myBid.amount)}</strong></p>}
              <BidBox s={s} onChanged={() => refresh(q.trim() || undefined)} />
            </li>
          ))}
          {data && !data.shipments.length && <li className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-silver-500">No open shipments right now.</li>}
        </ul>
      </section>

      <aside className="rounded-xl border border-silver-200 bg-white p-4 space-y-2">
        <div className="font-medium text-silver-900">My bids</div>
        {bids.length ? (
          <ul className="divide-y divide-silver-100">
            {bids.map(b => (
              <li key={b.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{b.shipment.originAddress} → {b.shipment.destAddress}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${BID_STATUS[b.status]}`}>{b.status === 'accepted' ? 'Won' : b.status}</span>
                </div>
                <div className="text-xs text-silver-500">{b.shipment.reference} · {fmtMoney(b.amount)} · {b.shipment.shipperName}</div>
                {b.status === 'accepted' && <div className="text-xs text-green-700">Added to your Loads — assign a truck.</div>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-silver-500">You haven&apos;t bid on anything yet.</p>}
      </aside>
    </div>
  )
}
