'use client'
import { useState } from 'react'
import LogoMark from '@/components/Logo'
import { Field, inputCls } from '@/components/truck-loads/forms'
import { login, Side } from '@/lib/truck-loads'

const COPY: Record<Side, { title: string; switchText: string; switchHref: string }> = {
  dispatch: { title: 'Truck Loads · Dispatch', switchText: 'Driving? Open the driver app', switchHref: '/truck-loads/driver' },
  driver:   { title: 'Truck Loads · Driver',   switchText: 'Dispatcher? Open the dispatch board', switchHref: '/truck-loads' },
}

export default function Login({ side, onDone }: { side: Side; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const copy = COPY[side]

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError(null)
    try {
      await login(side, String(f.get('phone')), String(f.get('password')))
      onDone()
    } catch (err: any) {
      setError(err.status === 401 ? 'Wrong phone number or password' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LogoMark size={28} />
            <h1 className="font-semibold text-stone-900">{copy.title}</h1>
          </div>
          {side === 'driver' && (
            <p className="text-sm text-stone-500">Sign in with the phone number your dispatcher has on your truck.</p>
          )}
          <Field label="Phone"><input name="phone" type="tel" required className={inputCls} autoComplete="username" /></Field>
          <Field label="Password"><input name="password" type="password" required className={inputCls} autoComplete="current-password" /></Field>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="press w-full rounded-lg bg-stone-900 text-white py-3 text-sm font-medium disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a href={copy.switchHref} className="block text-center text-sm text-stone-500 underline">{copy.switchText}</a>
      </div>
    </main>
  )
}
