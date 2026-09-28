'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessage, ChatThread } from '@/lib/truck-loads'

const POLL_MS = 10_000

function when(iso: string) {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return d.toLocaleString('en-ZA', today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** A shipment conversation between the shipper and one carrier. Polls while open. */
export default function Chat({ threadKey, me, otherName, load, send, onRead, className = 'h-[360px]' }: {
  /** Identifies the thread; the chat reloads when it changes */
  threadKey: string
  me: 'shipper' | 'carrier'
  otherName: string
  load: () => Promise<ChatThread>
  send: (body: string) => Promise<ChatMessage>
  /** Called after the thread is fetched (it marks the thread read) */
  onRead?: () => void
  className?: string
}) {
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const count = useRef(0)
  const fns = useRef({ load, onRead })
  fns.current = { load, onRead }

  const refresh = useCallback(async () => {
    try { setThread(await fns.current.load()); setError(null); fns.current.onRead?.() } catch (e: any) { setError(e.message) }
  }, [])
  useEffect(() => {
    setThread(null)
    refresh()
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [refresh, threadKey])
  useEffect(() => {
    const n = thread?.messages.length ?? 0
    if (n !== count.current && list.current) list.current.scrollTop = list.current.scrollHeight
    count.current = n
  }, [thread])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true); setError(null)
    try {
      const msg = await send(body)
      setDraft('')
      setThread(t => t ? { ...t, messages: [...t.messages, msg] } : { messages: [msg], otherReadAt: null })
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  const msgs = thread?.messages ?? []
  const lastMine = [...msgs].reverse().find(m => m.fromRole === me)
  const seen = lastMine && thread?.otherReadAt && new Date(thread.otherReadAt) >= new Date(lastMine.createdAt)

  return (
    <div className="flex flex-col rounded-xl border border-silver-200 bg-white overflow-hidden">
      <div ref={list} className={`${className} overflow-y-auto p-3 space-y-2 bg-silver-50`}>
        {!thread && !error && <p className="text-center text-sm text-silver-400 py-6">Loading…</p>}
        {thread && !msgs.length && <p className="text-center text-sm text-silver-500 py-6">No messages yet. Say hello to {otherName}.</p>}
        {msgs.map(m => {
          const mine = m.fromRole === me
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                mine ? 'bg-brand-700 text-white rounded-br-sm' : m.fromRole === 'admin' ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-white border border-silver-200 text-silver-900 rounded-bl-sm'}`}>
                {m.fromRole === 'admin' && <div className="text-[11px] font-semibold mb-0.5">Truck Loads support</div>}
                {m.body}
                <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/70 text-right' : 'text-silver-400'}`}>{when(m.createdAt)}</div>
              </div>
            </div>
          )
        })}
        {seen && <div className="text-right text-[11px] text-silver-400">Seen</div>}
      </div>
      {error && <p className="px-3 py-1.5 text-xs text-red-700 bg-red-50 border-t border-red-100">{error}</p>}
      <form onSubmit={submit} className="flex gap-2 border-t border-silver-200 p-2">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} maxLength={2000}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={`Message ${otherName}…`} aria-label={`Message ${otherName}`}
          className="flex-1 resize-none rounded-lg border border-silver-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30" />
        <button disabled={busy || !draft.trim()} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-4 text-sm disabled:opacity-50">Send</button>
      </form>
      <p className="px-3 pb-2 text-[11px] text-silver-400">Keep payment on Truck Loads — escrow only protects money paid through the platform.</p>
    </div>
  )
}

export function UnreadDot({ n }: { n: number }) {
  if (!n) return null
  return <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white" aria-label={`${n} unread`}>{n}</span>
}
