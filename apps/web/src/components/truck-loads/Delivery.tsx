'use client'
import { useEffect, useState } from 'react'
import { Field, inputCls } from '@/components/truck-loads/forms'
import { fmtDate, fmtFileSize, Pod, PodInput, RatingSummary } from '@/lib/truck-loads'

const MAX_PHOTOS = 3
const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`

function minutesAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtDate(iso)
}

/** Current position from the browser, or null if unavailable/denied. */
export function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 })
  })
}

/** Proof of delivery capture: receiver, note, photos of the signed delivery note, GPS. */
export function DeliverForm({ onSubmit, defaultLocation = true, submitLabel = 'Confirm delivery' }: {
  onSubmit: (input: PodInput, photos: File[]) => Promise<void>
  defaultLocation?: boolean
  submitLabel?: string
}) {
  const [photos, setPhotos] = useState<File[]>([])
  const [useLocation, setUseLocation] = useState(defaultLocation)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const input: PodInput = { receiverName: String(f.get('receiverName') ?? '').trim(), note: String(f.get('note') ?? '').trim() || undefined }
    setBusy(true); setError(null)
    try {
      if (useLocation) {
        const pos = await currentPosition()
        if (pos) Object.assign(input, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy) })
      }
      await onSubmit(input, photos)
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Received by *" hint="Name of the person who signed for the goods">
        <input name="receiverName" required minLength={2} maxLength={120} className={inputCls} autoComplete="off" />
      </Field>
      <Field label="Delivery note (optional)"><input name="note" maxLength={500} className={inputCls} placeholder="Dock number, condition, anything to note…" /></Field>
      <div>
        <div className="text-xs font-medium text-silver-600 mb-1">Photos of the signed delivery note ({photos.length}/{MAX_PHOTOS})</div>
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
              <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPhotos([...photos, f]) }} />
            </label>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-silver-700">
        <input type="checkbox" checked={useLocation} onChange={e => setUseLocation(e.target.checked)} className="h-4 w-4 accent-brand-700" />
        Record my current location
      </label>
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="press w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-2.5 text-sm font-medium disabled:opacity-50">
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

/** Show a proof of delivery with its photos (fetched with the viewer's token). */
export function PodView({ pod, loadPhoto }: { pod: Pod; loadPhoto: (photoId: string) => Promise<Blob> }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    let alive = true
    const made: string[] = []
    Promise.all(pod.photos.map(async p => {
      try { const u = URL.createObjectURL(await loadPhoto(p.id)); made.push(u); return [p.id, u] as const } catch { return null }
    })).then(rows => { if (alive) setUrls(Object.fromEntries(rows.filter(Boolean) as [string, string][])) })
    return () => { alive = false; made.forEach(u => URL.revokeObjectURL(u)) }
  }, [pod, loadPhoto])

  return (
    <div className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-silver-900">Proof of delivery</div>
        <span className="text-xs text-silver-500">{fmtDate(pod.deliveredAt)} · recorded by the {pod.capturedBy}</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div><div className="text-xs text-silver-400">Received by</div>{pod.receiverName}</div>
        <div><div className="text-xs text-silver-400">Note</div>{pod.note ?? '—'}</div>
        <div>
          <div className="text-xs text-silver-400">Location</div>
          {pod.lat != null && pod.lng != null
            ? <a className="underline" href={mapsLink(pod.lat, pod.lng)} target="_blank" rel="noreferrer">View on map{pod.accuracyM ? ` (±${Math.round(pod.accuracyM)} m)` : ''}</a>
            : 'Not recorded'}
        </div>
      </div>
      {pod.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pod.photos.map(p => urls[p.id] ? (
            <a key={p.id} href={urls[p.id]} target="_blank" rel="noreferrer" className="block">
              {p.mimeType.startsWith('image/')
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={urls[p.id]} alt={`Delivery photo ${p.fileName}`} className="h-24 w-24 object-cover rounded-lg border border-silver-200" />
                : <span className="flex h-24 w-24 items-center justify-center rounded-lg border border-silver-200 text-xs text-silver-600">PDF</span>}
            </a>
          ) : <span key={p.id} className="h-24 w-24 rounded-lg bg-silver-100 animate-pulse" />)}
        </div>
      )}
    </div>
  )
}

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={`${size === 'lg' ? 'text-xl' : 'text-sm'} text-amber-500`} aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(Math.round(value))}<span className="text-silver-300">{'★'.repeat(5 - Math.round(value))}</span>
    </span>
  )
}

export function RatingBadge({ rating, empty = 'No ratings yet' }: { rating: RatingSummary | null | undefined; empty?: string }) {
  if (!rating || !rating.count) return <span className="text-xs text-silver-400">{empty}</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-silver-600">
      <Stars value={rating.average ?? 0} /> {rating.average?.toFixed(1)} ({rating.count})
      {rating.onTimePercent != null && <span>· {rating.onTimePercent}% on time</span>}
    </span>
  )
}

export function RatingForm({ subject, onTimeLabel, onSubmit }: {
  subject: string
  onTimeLabel: string
  onSubmit: (r: { stars: number; onTime?: boolean; comment?: string }) => Promise<void>
}) {
  const [stars, setStars] = useState(0)
  const [onTime, setOnTime] = useState<boolean | undefined>(undefined)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!stars) return setError('Choose a star rating')
    setBusy(true); setError(null)
    try { await onSubmit({ stars, onTime, comment: comment.trim() || undefined }) } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="rounded-xl border border-silver-200 bg-white p-4 space-y-3">
      <div className="font-medium text-silver-900">Rate {subject}</div>
      <div className="flex gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} stars`}
            className={`text-3xl leading-none ${n <= stars ? 'text-amber-500' : 'text-silver-300 hover:text-amber-300'}`}>★</button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-silver-700">
        <span>{onTimeLabel}</span>
        {[true, false].map(v => (
          <label key={String(v)} className="flex items-center gap-1">
            <input type="radio" name="onTime" checked={onTime === v} onChange={() => setOnTime(v)} className="accent-brand-700" /> {v ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={2} className={inputCls} placeholder="Comment (optional)" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="press rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Submit rating'}</button>
    </form>
  )
}

export function LastSeen({ at, lat, lng, speedKmh }: { at: string | null; lat: number | null; lng: number | null; speedKmh?: number | null }) {
  if (!at || lat == null || lng == null) return <span className="text-silver-500">No position reported yet</span>
  return (
    <span>
      Last seen {minutesAgo(at)}{speedKmh ? ` · ${Math.round(speedKmh)} km/h` : ''} ·{' '}
      <a className="underline" href={mapsLink(lat, lng)} target="_blank" rel="noreferrer">open map</a>
    </span>
  )
}
