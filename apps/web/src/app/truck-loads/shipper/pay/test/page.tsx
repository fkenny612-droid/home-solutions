'use client'
import { useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import { fmtMoney, getToken, shipper } from '@/lib/truck-loads'

/**
 * Test checkout (PAYMENTS_MODE is not "peach"): stands in for the payment
 * provider's hosted page so the escrow flow can be exercised end to end.
 * No money moves.
 */
export default function TestCheckout() {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setParams(new URLSearchParams(window.location.search)) }, [])
  if (!params) return null

  const paymentId = params.get('payment') ?? ''
  const amount = Number(params.get('amount') ?? 0)
  // Only ever send the shopper back into our own app (no open redirect)
  const back = (() => {
    try {
      const u = new URL(params.get('return') ?? '/truck-loads/shipper', window.location.origin)
      return u.origin === window.location.origin ? u.pathname + u.search : '/truck-loads/shipper'
    } catch { return '/truck-loads/shipper' }
  })()

  async function finish(succeed: boolean) {
    if (!getToken('shipper')) return setError('Sign in to the shipper portal first.')
    setBusy(true); setError(null)
    try { await shipper.testPay(paymentId, succeed); window.location.href = back }
    catch (e: any) { setError(e.message); setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-silver-100 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 text-sm text-amber-900 text-center font-medium">
          TEST MODE — no real money moves
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 text-center">
          <div className="flex items-center justify-center gap-2"><TruckLoadsMark size={28} /><span className="font-semibold">Truck Loads checkout</span></div>
          <div>
            <div className="text-sm text-silver-500">Amount to hold in escrow</div>
            <div className="text-3xl font-semibold text-brand-800">{fmtMoney(amount)}</div>
          </div>
          <p className="text-xs text-silver-500">In production this page is Peach Payments&apos; secure hosted checkout.</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} onClick={() => finish(true)} className="press w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-3 font-medium disabled:opacity-50">
            Pay {fmtMoney(amount)} (test)
          </button>
          <button disabled={busy} onClick={() => finish(false)} className="w-full text-sm text-silver-600 underline">Simulate a declined card</button>
        </div>
      </div>
    </main>
  )
}
